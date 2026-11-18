import { NextRequest, NextResponse } from "next/server";
import { adminJsonResponse, requireAdminConsole } from "@/lib/admin-auth";
import { getClientIp, verifyCsrfOrigin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";
import { getSystemSettings } from "@/lib/quota";
import { AdminSettingsPutSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await ensureMigrated();
    await requireAdminConsole(req);
    const settings = await getSystemSettings();
    return adminJsonResponse({ settings });
  } catch (err) {
    return handleRouteError(err, true);
  }
}

export async function PUT(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const admin = await requireAdminConsole(req);
    const rawBody = await req.json();

    // Clamp max_upload_mb to 1..4 if provided before/after validation
    if (rawBody && typeof rawBody.max_upload_mb === "number") {
      rawBody.max_upload_mb = Math.min(4, Math.max(1, rawBody.max_upload_mb));
    }

    const parsed = AdminSettingsPutSchema.parse(rawBody);

    for (const [k, v] of Object.entries(parsed)) {
      if (v === undefined) continue;
      await query(
        `INSERT INTO settings (key, value)
         VALUES ($1, $2::jsonb)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [k, JSON.stringify(v)]
      );
    }

    await logAudit({
      userId: admin.id,
      action: "admin_settings_updated",
      target: "system_settings",
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      meta: { console: true, ...parsed as Record<string, unknown> },
    });

    const updated = await getSystemSettings();
    return adminJsonResponse({ settings: updated });
  } catch (err) {
    return handleRouteError(err, true);
  }
}
