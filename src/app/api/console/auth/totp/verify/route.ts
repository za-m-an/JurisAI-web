import { NextRequest, NextResponse } from "next/server";
import {
  adminJsonResponse,
  generateRecoveryCodes,
  hashRecoveryCodes,
  requireAdminConsole,
  verifyTotpToken,
} from "@/lib/admin-auth";
import { decryptSecret } from "@/lib/crypto";
import { getClientIp, verifyCsrfOrigin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { query } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http-error";
import { z } from "zod";

export const runtime = "nodejs";

const VerifySchema = z.object({
  code: z.string().trim().min(6).max(8),
});

export async function POST(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    const admin = await requireAdminConsole(req);
    const body = await req.json();
    const { code } = VerifySchema.parse(body);

    if (!admin.totp_secret_enc) {
      return adminJsonResponse(
        { error: "totp_not_initialized", message: "TOTP enrollment has not been started." },
        { status: 400 }
      );
    }

    const rawSecret = decryptSecret(admin.totp_secret_enc);
    const valid = verifyTotpToken(rawSecret, code);
    if (!valid) {
      return adminJsonResponse(
        { error: "invalid_code", message: "Verification code does not match. Please verify your authenticator app time." },
        { status: 400 }
      );
    }

    const recoveryCodes = generateRecoveryCodes(8);
    const recoveryHashes = await hashRecoveryCodes(recoveryCodes);

    await query(
      `UPDATE users
       SET totp_enabled = TRUE,
           must_enroll_totp = FALSE,
           totp_recovery_hashes = $1
       WHERE id = $2`,
      [recoveryHashes, admin.id]
    );

    await logAudit({
      userId: admin.id,
      action: "totp_enrolled",
      target: admin.email,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      meta: { console: true, recoveryCodesCount: recoveryCodes.length },
    });

    return adminJsonResponse({
      ok: true,
      recoveryCodes,
      message: "Two-factor authentication successfully enabled. Store these recovery codes securely.",
    });
  } catch (err) {
    return handleRouteError(err, true);
  }
}
