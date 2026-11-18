import { NextRequest, NextResponse } from "next/server";
import { adminJsonResponse, requireAdminConsole } from "@/lib/admin-auth";
import {
  getClientIp,
  hashPassword,
  validatePasswordStrength,
  verifyCsrfOrigin,
  verifyPassword,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";
import { ChangePasswordSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    const admin = await requireAdminConsole(req);
    const body = await req.json();
    const parsed = ChangePasswordSchema.parse(body);

    const strength = validatePasswordStrength(parsed.newPassword);
    if (!strength.valid) {
      return adminJsonResponse(
        { error: "weak_password", message: strength.reason || "Password does not meet strength requirements." },
        { status: 400 }
      );
    }

    const currentHashRes = await query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1 LIMIT 1",
      [admin.id]
    );
    const currentHash = currentHashRes.rows[0]?.password_hash;
    const ok = await verifyPassword(parsed.currentPassword, currentHash || "");
    if (!ok) {
      return adminJsonResponse(
        { error: "invalid_current_password", message: "Current password does not match." },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(parsed.newPassword);
    await query(
      "UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2",
      [newHash, admin.id]
    );

    await logAudit({
      userId: admin.id,
      action: "password_changed",
      target: admin.email,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      meta: { console: true },
    });

    return adminJsonResponse({ ok: true, message: "Password updated successfully." });
  } catch (err) {
    return handleRouteError(err, true);
  }
}
