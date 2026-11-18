import { NextRequest, NextResponse } from "next/server";
import {
  adminJsonResponse,
  buildTotpUri,
  generateTotpQrCodeDataUrl,
  generateTotpSecret,
  requireAdminConsole,
} from "@/lib/admin-auth";
import { encryptSecret } from "@/lib/crypto";
import { verifyCsrfOrigin } from "@/lib/auth";
import { query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    const admin = await requireAdminConsole(req);

    const secretBase32 = generateTotpSecret();
    const secretEnc = encryptSecret(secretBase32);

    await query("UPDATE users SET totp_secret_enc = $1 WHERE id = $2", [
      secretEnc,
      admin.id,
    ]);

    const uri = buildTotpUri(admin.email, secretBase32);
    const qrCodeDataUrl = await generateTotpQrCodeDataUrl(uri);

    return adminJsonResponse({
      secret: secretBase32,
      uri,
      qrCodeDataUrl,
    });
  } catch (err) {
    return handleRouteError(err, true);
  }
}
