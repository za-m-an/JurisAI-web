import { NextRequest, NextResponse } from "next/server";
import { adminJsonResponse, requireAdminConsole } from "@/lib/admin-auth";
import { verifyCsrfOrigin } from "@/lib/auth";
import { decryptSecret } from "@/lib/crypto";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: { slug: string } }
) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    await requireAdminConsole(req);
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
      return adminJsonResponse(
        { error: "not_found", message: "Integration not found." },
        { status: 404 }
      );
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
    } else if (slug === "openrouter" && process.env.OPENROUTER_API_KEY) {
      apiKey = process.env.OPENROUTER_API_KEY.trim();
    } else if (slug === "openai" && process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY.trim();
    } else if (slug === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      apiKey = process.env.ANTHROPIC_API_KEY.trim();
    } else if (slug === "deepseek" && process.env.DEEPSEEK_API_KEY) {
      apiKey = process.env.DEEPSEEK_API_KEY.trim();
    } else if (slug === "gemini" && process.env.GEMINI_API_KEY) {
      apiKey = process.env.GEMINI_API_KEY.trim();
    } else if (slug === "aws" && process.env.AWS_API_KEY) {
      apiKey = process.env.AWS_API_KEY.trim();
    }

    const aiSlugs = ["anthropic", "openai", "deepseek", "openrouter", "gemini", "aws"];
    if (aiSlugs.includes(slug) && !apiKey) {
      const latencyMs = 0;
      const statusText = "No API key configured (enter & hot-swap key)";
      await query(
        "UPDATE integrations SET last_status = $1, last_checked_at = NOW() WHERE slug = $2",
        [statusText, slug]
      );
      return adminJsonResponse({
        slug,
        status: statusText,
        ok: false,
        latencyMs,
        details: { error: "missing_key", message: "No API key has been entered or saved for this provider." },
      });
    }

    let targetUrl = `${row.base_url.replace(/\/+$/, "")}${
      row.health_path.startsWith("/") ? row.health_path : `/${row.health_path}`
    }`;
    if (slug === "gemini" && apiKey) {
      targetUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`;
    }

    const t0 = Date.now();
    let statusText = "ok";
    let ok = false;
    let details: any = null;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const headers: Record<string, string> = { Accept: "application/json" };
      if (slug === "anthropic") {
        if (apiKey) headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01";
      } else if (slug === "openai" || slug === "deepseek" || slug === "openrouter") {
        if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
        if (slug === "openrouter") {
          headers["HTTP-Referer"] = "http://localhost:3000";
          headers["X-Title"] = "Juris AI";
        }
      } else if (slug === "aws") {
        if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
      } else if (slug === "rag") {
        if (apiKey) headers["X-API-Key"] = apiKey;
      } else {
        if (apiKey) {
          headers["X-API-Key"] = apiKey;
          headers["Authorization"] = `Bearer ${apiKey}`;
        }
      }
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

      return adminJsonResponse({
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
      return adminJsonResponse({
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
