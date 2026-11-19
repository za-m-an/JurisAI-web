import { NextRequest, NextResponse } from "next/server";
import { adminJsonResponse, requireAdminConsole } from "@/lib/admin-auth";
import { getClientIp, verifyCsrfOrigin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { decryptSecret, encryptSecret, maskApiKey } from "@/lib/crypto";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";
import { invalidateRagConfigCache } from "@/lib/rag-client";
import { AdminIntegrationPutSchema } from "@/lib/validation";

export const runtime = "nodejs";

function serializeIntegrationRow(row: {
  id: string;
  slug: string;
  name: string;
  base_url: string;
  api_key_enc: string | null;
  health_path: string;
  enabled: boolean;
  last_status: string | null;
  last_checked_at: string | null;
}) {
  let maskedKey: string | null = null;
  if (row.api_key_enc) {
    try {
      const dec = decryptSecret(row.api_key_enc);
      maskedKey = maskApiKey(dec);
    } catch {
      maskedKey = "••••";
    }
  } else if (row.slug === "rag" && process.env.RAG_API_KEY) {
    maskedKey = maskApiKey(process.env.RAG_API_KEY);
  }

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    baseUrl: row.base_url,
    hasApiKey: Boolean(row.api_key_enc || (row.slug === "rag" && process.env.RAG_API_KEY)),
    apiKeyMasked: maskedKey,
    healthPath: row.health_path,
    enabled: row.enabled,
    lastStatus: row.last_status,
    lastCheckedAt: row.last_checked_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    await ensureMigrated();
    await requireAdminConsole(req);

    const res = await query<{
      id: string;
      slug: string;
      name: string;
      base_url: string;
      api_key_enc: string | null;
      health_path: string;
      enabled: boolean;
      last_status: string | null;
      last_checked_at: string | null;
    }>("SELECT id, slug, name, base_url, api_key_enc, health_path, enabled, last_status, last_checked_at FROM integrations ORDER BY slug ASC");

    return adminJsonResponse({
      integrations: res.rows.map(serializeIntegrationRow),
    });
  } catch (err) {
    return handleRouteError(err, true);
  }
}

export async function PUT(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const admin = await requireAdminConsole(req);
    const body = await req.json();
    const parsed = AdminIntegrationPutSchema.parse(body);

    const existing = await query<{ api_key_enc: string | null }>(
      "SELECT api_key_enc FROM integrations WHERE slug = $1 LIMIT 1",
      [parsed.slug]
    );

    let nextEncKey = existing.rows[0]?.api_key_enc ?? null;
    if (typeof parsed.apiKey === "string" && parsed.apiKey.trim() !== "") {
      nextEncKey = encryptSecret(parsed.apiKey.trim());
    }

    const upserted = await query<{
      id: string;
      slug: string;
      name: string;
      base_url: string;
      api_key_enc: string | null;
      health_path: string;
      enabled: boolean;
      last_status: string | null;
      last_checked_at: string | null;
    }>(
      `INSERT INTO integrations (slug, name, base_url, api_key_enc, health_path, enabled)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name,
           base_url = EXCLUDED.base_url,
           api_key_enc = EXCLUDED.api_key_enc,
           health_path = EXCLUDED.health_path,
           enabled = EXCLUDED.enabled
       RETURNING id, slug, name, base_url, api_key_enc, health_path, enabled, last_status, last_checked_at`,
      [
        parsed.slug,
        parsed.name,
        parsed.baseUrl.replace(/\/+$/, ""),
        nextEncKey,
        parsed.healthPath.startsWith("/") ? parsed.healthPath : `/${parsed.healthPath}`,
        parsed.enabled,
      ]
    );

    // Invalidate cached AI headers and RAG config so hot-swapped keys apply immediately
    invalidateRagConfigCache();

    await logAudit({
      userId: admin.id,
      action: "admin_integration_updated",
      target: parsed.slug,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      meta: {
        console: true,
        baseUrl: parsed.baseUrl,
        enabled: parsed.enabled,
        apiKeyUpdated: Boolean(parsed.apiKey && parsed.apiKey.trim()),
      },
    });

    return adminJsonResponse({
      integration: serializeIntegrationRow(upserted.rows[0]),
    });
  } catch (err) {
    return handleRouteError(err, true);
  }
}
