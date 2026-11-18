import { NextRequest, NextResponse } from "next/server";
import {
  adminJsonResponse,
  buildAdminSessionCookieHeader,
  generateRecoveryCodes,
  generateTotpQrCodeDataUrl,
  generateTotpSecret,
  hashRecoveryCodes,
  requireAdminConsole,
  signAdminSessionToken,
  verifyAndBurnRecoveryCode,
  verifyTotpToken,
} from "@/lib/admin-auth";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { getClientIp, verifyCsrfOrigin, verifyPassword, validatePasswordStrength, hashPassword } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const runtime = "nodejs";

const ConsoleLoginSchema = z.object({
  email: z.string().trim().email().transform((s) => s.toLowerCase()),
  password: z.string().min(1),
  totpCode: z.string().trim().optional(),
  recoveryCode: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const ip = getClientIp(req);
    const body = await req.json();
    const parsed = ConsoleLoginSchema.parse(body);

    // Rate limit console logins: 5 attempts / 15 min per IP and per account
    await checkRateLimit({
      key: `console_login:ip:${ip}`,
      limit: 5,
      windowSeconds: 900,
      ip,
    });
    await checkRateLimit({
      key: `console_login:email_ip:${parsed.email}:${ip}`,
      limit: 5,
      windowSeconds: 900,
      ip,
    });

    const res = await query<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: string;
      is_active: boolean;
      token_version: number;
      totp_secret_enc: string | null;
      totp_enabled: boolean;
      totp_recovery_hashes: string[];
      must_change_password: boolean;
      must_enroll_totp: boolean;
    }>(
      `SELECT id, email, password_hash, full_name, role, is_active, token_version,
              totp_secret_enc, totp_enabled, totp_recovery_hashes,
              must_change_password, must_enroll_totp
       FROM users WHERE email = $1 LIMIT 1`,
      [parsed.email]
    );

    const user = res.rows[0];
    // Generic invalid credentials if user not found, inactive, or not admin
    if (!user || !user.is_active || user.role !== "admin") {
      await logAudit({
        userId: user?.id ?? null,
        action: "login_failed",
        target: parsed.email,
        ip,
        userAgent: req.headers.get("user-agent"),
        meta: { console: true, reason: "invalid_or_not_admin" },
      });
      return adminJsonResponse(
        { error: "invalid_credentials", message: "Invalid email or password." },
        { status: 401 }
      );
    }

    const pwOk = await verifyPassword(parsed.password, user.password_hash);
    if (!pwOk) {
      await logAudit({
        userId: user.id,
        action: "login_failed",
        target: user.email,
        ip,
        userAgent: req.headers.get("user-agent"),
        meta: { console: true, reason: "bad_password" },
      });
      return adminJsonResponse(
        { error: "invalid_credentials", message: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Check TOTP requirement
    const isEnrolled = user.totp_enabled && Boolean(user.totp_secret_enc);

    if (isEnrolled) {
      if (parsed.recoveryCode) {
        // Recovery code attempt
        const burnResult = await verifyAndBurnRecoveryCode(
          parsed.recoveryCode,
          user.totp_recovery_hashes || []
        );
        if (!burnResult.valid) {
          await logAudit({
            userId: user.id,
            action: "login_failed",
            target: user.email,
            ip,
            userAgent: req.headers.get("user-agent"),
            meta: { console: true, reason: "invalid_recovery_code" },
          });
          return adminJsonResponse(
            { error: "invalid_recovery_code", message: "Invalid recovery code." },
            { status: 401 }
          );
        }
        await query(
          "UPDATE users SET totp_recovery_hashes = $1, last_login_at = NOW() WHERE id = $2",
          [burnResult.remainingHashes, user.id]
        );
        await logAudit({
          userId: user.id,
          action: "login_success",
          target: user.email,
          ip,
          userAgent: req.headers.get("user-agent"),
          meta: { console: true, method: "recovery_code", remainingCodes: burnResult.remainingHashes.length },
        });
      } else if (parsed.totpCode) {
        // TOTP verification
        const rawSecret = decryptSecret(user.totp_secret_enc!);
        const valid = verifyTotpToken(rawSecret, parsed.totpCode);
        if (!valid) {
          await logAudit({
            userId: user.id,
            action: "login_failed",
            target: user.email,
            ip,
            userAgent: req.headers.get("user-agent"),
            meta: { console: true, reason: "invalid_totp_code" },
          });
          return adminJsonResponse(
            { error: "invalid_totp", message: "Invalid two-factor authentication code." },
            { status: 401 }
          );
        }
        await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);
        await logAudit({
          userId: user.id,
          action: "login_success",
          target: user.email,
          ip,
          userAgent: req.headers.get("user-agent"),
          meta: { console: true, method: "totp" },
        });
      } else {
        // TOTP required
        return adminJsonResponse(
          { error: "totp_required", message: "Two-factor authentication code is required." },
          { status: 401 }
        );
      }
    } else {
      // First-time enrollment required
      await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);
      await logAudit({
        userId: user.id,
        action: "login_success",
        target: user.email,
        ip,
        userAgent: req.headers.get("user-agent"),
        meta: { console: true, method: "initial_enrollment" },
      });
    }

    const token = await signAdminSessionToken({
      sub: user.id,
      tv: Number(user.token_version),
    });

    return adminJsonResponse(
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: "admin",
          mustEnrollTotp: user.must_enroll_totp || !user.totp_enabled,
          mustChangePassword: user.must_change_password,
        },
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": buildAdminSessionCookieHeader(token),
        },
      }
    );
  } catch (err) {
    return handleRouteError(err, true);
  }
}
