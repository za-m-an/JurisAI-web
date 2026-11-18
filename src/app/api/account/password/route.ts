import { NextRequest, NextResponse } from "next/server";
import {
  buildSessionCookieHeader,
  hashPassword,
  requireUser,
  signSessionToken,
  validatePasswordStrength,
  verifyCsrfOrigin,
  verifyPassword,
} from "@/lib/auth";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http-error";
import { ChangePasswordSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const user = await requireUser(req);
    const body = await req.json();
    const parsed = ChangePasswordSchema.parse(body);

    const pwCheck = validatePasswordStrength(parsed.newPassword);
    if (!pwCheck.valid) {
      return jsonError(400, "weak_password", pwCheck.reason || "New password is too weak.");
    }

    const rowRes = await query<{ password_hash: string; token_version: number }>(
      "SELECT password_hash, token_version FROM users WHERE id = $1 LIMIT 1",
      [user.id]
    );
    const row = rowRes.rows[0];
    if (!row) {
      return jsonError(404, "not_found", "User not found.");
    }

    const currentValid = await verifyPassword(parsed.currentPassword, row.password_hash);
    if (!currentValid) {
      return jsonError(400, "invalid_password", "Current password is incorrect.");
    }

    const newHash = await hashPassword(parsed.newPassword);
    const updated = await query<{ token_version: number }>(
      `UPDATE users
       SET password_hash = $2, token_version = token_version + 1
       WHERE id = $1
       RETURNING token_version`,
      [user.id, newHash]
    );

    const newTv = Number(updated.rows[0].token_version);
    const newToken = await signSessionToken({
      sub: user.id,
      role: user.role,
      tv: newTv,
    });

    return NextResponse.json(
      { ok: true, tokenVersion: newTv },
      {
        status: 200,
        headers: {
          "Set-Cookie": buildSessionCookieHeader(newToken),
        },
      }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
