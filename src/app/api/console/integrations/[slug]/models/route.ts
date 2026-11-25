import { NextRequest } from "next/server";
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

    let bodyApiKey = "";
    try {
      const body = await req.json();
      if (body && typeof body.apiKey === "string") {
        bodyApiKey = body.apiKey.trim();
      }
    } catch {
      // empty body ok
    }

    const res = await query<{
      slug: string;
      base_url: string;
      api_key_enc: string | null;
      config: any;
    }>("SELECT slug, base_url, api_key_enc, config FROM integrations WHERE slug = $1 LIMIT 1", [
      slug,
    ]);

    const row = res.rows[0];
    if (!row) {
      return adminJsonResponse({ error: "not_found", message: "Provider not found." }, { status: 404 });
    }

    let apiKey = bodyApiKey;
    if (!apiKey && row.api_key_enc) {
      try {
        apiKey = decryptSecret(row.api_key_enc);
      } catch {
        apiKey = "";
      }
    }
    if (!apiKey) {
      const envMap: Record<string, string | undefined> = {
        openrouter: process.env.OPENROUTER_API_KEY,
        openai: process.env.OPENAI_API_KEY,
        anthropic: process.env.ANTHROPIC_API_KEY,
        deepseek: process.env.DEEPSEEK_API_KEY,
        gemini: process.env.GEMINI_API_KEY,
      };
      apiKey = (envMap[slug] || "").trim();
    }

    if (!apiKey) {
      return adminJsonResponse(
        { ok: false, error: "missing_key", message: "Please enter and save an API key first." },
        { status: 400 }
      );
    }

    let models: string[] = [];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    try {
      if (slug === "gemini") {
        const resp = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
          { signal: controller.signal }
        );
        if (!resp.ok) {
          return adminJsonResponse(
            { ok: false, message: `Provider rejected key (HTTP ${resp.status}).` },
            { status: 400 }
          );
        }
        const data = await resp.json();
        models = (data.models || [])
          .filter((m: any) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
          .map((m: any) => String(m.name || "").replace(/^models\//, ""))
          .filter(Boolean);
      } else if (slug === "anthropic") {
        const resp = await fetch("https://api.anthropic.com/v1/models", {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            Accept: "application/json",
          },
          signal: controller.signal,
        });
        if (!resp.ok) {
          return adminJsonResponse(
            { ok: false, message: `Provider rejected key (HTTP ${resp.status}).` },
            { status: 400 }
          );
        }
        const data = await resp.json();
        models = (data.data || []).map((m: any) => m.id).filter(Boolean);
      } else {
        const base = row.base_url.replace(/\/+$/, "");
        const headers: Record<string, string> = {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        };
        if (slug === "openrouter") {
          headers["HTTP-Referer"] = "http://localhost:3000";
          headers["X-Title"] = "Juris AI";
        }
        const resp = await fetch(`${base}/models`, { headers, signal: controller.signal });
        if (!resp.ok) {
          return adminJsonResponse(
            { ok: false, message: `Provider rejected key (HTTP ${resp.status}).` },
            { status: 400 }
          );
        }
        const data = await resp.json();
        models = (data.data || [])
          .map((m: any) => m.id)
          .filter((id: string) => Boolean(id) && !id.toLowerCase().includes("embedding"));
      }
    } finally {
      clearTimeout(timer);
    }

    const sortedModels = Array.from(new Set(models)).sort();
    const updatedConfig = { ...(row.config || {}), models: sortedModels };
    await query("UPDATE integrations SET config = $1::jsonb, last_status = $2, last_checked_at = NOW() WHERE slug = $3", [
      JSON.stringify(updatedConfig),
      `ok (${sortedModels.length} models loaded)`,
      slug,
    ]);

    return adminJsonResponse({ ok: true, models: sortedModels });
  } catch (err) {
    return handleRouteError(err);
  }
}
