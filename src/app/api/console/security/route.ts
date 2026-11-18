import { NextRequest, NextResponse } from "next/server";
import {
  adminJsonResponse,
  generateRecoveryCodes,
  hashRecoveryCodes,
  requireAdminConsole,
} from "@/lib/admin-auth";
import { getClientIp, verifyCsrfOrigin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";
import { z } from "zod";

export const runtime = "nodejs";

const SecurityActionSchema = z.object({
  action: z.enum(["regenerate_recovery_codes", "reset_totp", "logout_all"]),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdminConsole(req);

    const loginsRes = await query<{
      id: string;
      action: string;
      ip: string | null;
      user_agent: string | null;
      created_at: string;
      meta: any;
    }>(
      `SELECT id, action, ip, user_agent, created_at, meta
       FROM audit_logs
       WHERE (target = $1 OR user_id = $2) AND action IN ('login_success', 'login_failed', 'totp_enrolled', 'password_changed')
       ORDER BY created_at DESC
       LIMIT 10`,
      [admin.email, admin.id]
    );

    return adminJsonResponse({
      totpEnabled: admin.totp_enabled,
      recoveryCodesRemaining: (admin.totp_recovery_hashes || []).length,
      mustChangePassword: admin.must_change_password,
      recentLogins: loginsRes.rows,
    });
  } catch (err) {
    return handleRouteError(err, true);
  }
}

export async function POST(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    const admin = await requireAdminConsole(req);
    const body = await req.json();
    const { action } = SecurityActionSchema.parse(body);

    if (action === "regenerate_recovery_codes") {
      const recoveryCodes = generateRecoveryCodes(8);
      const recoveryHashes = await hashRecoveryCodes(recoveryCodes);
      await query("UPDATE users SET totp_recovery_hashes = $1 WHERE id = $2", [
        recoveryHashes,
        admin.id,
      ]);
      await logAudit({
        userId: admin.id,
        action: "admin_settings_updated",
        target: "recovery_codes_regenerated",
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
        meta: { console: true },
      });
      return adminJsonResponse({ ok: true, recoveryCodes });
    }

    if (action === "reset_totp") {
      await query(
        `UPDATE users
         SET totp_enabled = FALSE,
             totp_secret_enc = NULL,
             totp_recovery_hashes = ARRAY[]::TEXT[],
             must_enroll_totp = TRUE
         WHERE id = $1`,
        [admin.id]
      );
      await logAudit({
        userId: admin.id,
        action: "totp_reset",
        target: admin.email,
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
        meta: { console: true },
      });
      return adminJsonResponse({ ok: true, message: "TOTP 2FA reset. Enrollment required on next login." });
    }

    if (action === "logout_all") {
      await query("UPDATE users SET token_version = token_version + 1 WHERE id = $1", [admin.id]);
      await logAudit({
        userId: admin.id,
        action: "logout",
        target: "all_admin_sessions",
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
        meta: { console: true },
      });
      return adminJsonResponse({ ok: true, message: "All admin sessions terminated." });
    }

    return adminJsonResponse({ error: "invalid_action", message: "Unknown action" }, { status: 400 });
  } catch (err) {
    return handleRouteError(err, true);
  }
}
