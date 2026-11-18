import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, verifyCsrfOrigin } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http-error";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: { slug: string } }
) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    await requireAdmin(req);
    const slug = context.params.slug;

    const res = await query<{
      slug: string;
      base_url: string;
      api_key_enc: string | null;
      health_path: string;
    }>("SELECT slug, base_url, api_key_enc, health_path FROM integrations WHERE slug = $1 LIMIT 1", [
      slug,
    ]);

    const row = res.rows[0];
    if (!row) {
      return jsonError(404, "not_found", "Integration not found.");
    }

    let apiKey = "";
    if (row.api_key_enc) {
      try {
        apiKey = decryptSecret(row.api_key_enc);
      } catch {
        apiKey = "";
      }
    } else if (slug === "rag") {
      apiKey = process.env.RAG_API_KEY || "dev-rag-key";
    }

    const targetUrl = `${row.base_url.replace(/\/+$/, "")}${
      row.health_path.startsWith("/") ? row.health_path : `/${row.health_path}`
    }`;

    const t0 = Date.now();
    let statusText = "ok";
    let ok = false;
    let details: any = null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (apiKey) headers["X-API-Key"] = apiKey;
      const resp = await fetch(targetUrl, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);
      const latencyMs = Date.now() - t0;
      if (resp.ok) {
        ok = true;
        statusText = `ok (${latencyMs}ms)`;
        try {
          details = await resp.json();
        } catch {
          details = null;
        }
      } else {
        statusText = `error: HTTP ${resp.status}`;
      }

      await query(
        "UPDATE integrations SET last_status = $2, last_checked_at = NOW() WHERE slug = $1",
        [slug, statusText]
      );

      return NextResponse.json({
        ok,
        slug,
        status: statusText,
        latencyMs,
        checkedAt: new Date().toISOString(),
        details,
      });
    } catch {
      clearTimeout(timer);
      const latencyMs = Date.now() - t0;
      statusText = "unreachable";
      await query(
        "UPDATE integrations SET last_status = $2, last_checked_at = NOW() WHERE slug = $1",
        [slug, statusText]
      );
      return NextResponse.json({
        ok: false,
        slug,
        status: statusText,
        latencyMs,
        checkedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    return handleRouteError(err, true);
  }
}
