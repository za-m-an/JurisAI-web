import crypto from "crypto";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { NextRequest, NextResponse } from "next/server";
import { ensureMigrated, query } from "./db";
import { decryptSecret, encryptSecret } from "./crypto";
import { getJwtSecretBytes } from "./auth";

export const CONSOLE_SECURITY_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Cache-Control": "no-store",
};

export function adminJsonResponse(
  body: any,
  init: { status?: number; headers?: Record<string, string> } = {}
): NextResponse {
  const headers = new Headers(init.headers || {});
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("Cache-Control", "no-store");
  return NextResponse.json(body, {
    status: init.status || 200,
    headers,
  });
}

export const ADMIN_SESSION_COOKIE_NAME = "juris_admin_session";
export const ADMIN_SESSION_MAX_AGE_SECONDS = 2 * 60 * 60; // 2 hours
export const ADMIN_AUDIENCE = "juris-admin";

export class AdminAuthError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export interface AdminUserRecord {
  id: string;
  email: string;
  full_name: string;
  role: "admin";
  is_active: boolean;
  token_version: number;
  totp_secret_enc: string | null;
  totp_enabled: boolean;
  totp_recovery_hashes: string[];
  must_change_password: boolean;
  must_enroll_totp: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminSessionJwtPayload {
  sub: string;
  role: "admin";
  tv: number;
  aud: string;
}

export async function signAdminSessionToken(payload: {
  sub: string;
  tv: number;
}): Promise<string> {
  const secret = getJwtSecretBytes();
  return new jose.SignJWT({ role: "admin", tv: payload.tv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setAudience(ADMIN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(secret);
}

export async function verifyAdminSessionToken(token: string): Promise<AdminSessionJwtPayload> {
  const secret = getJwtSecretBytes();
  const { payload } = await jose.jwtVerify(token, secret, {
    algorithms: ["HS256"],
    audience: ADMIN_AUDIENCE,
  });
  if (
    !payload.sub ||
    payload.role !== "admin" ||
    typeof payload.tv !== "number" ||
    payload.aud !== ADMIN_AUDIENCE
  ) {
    throw new AdminAuthError(404, "not_found", "Not Found");
  }
  return {
    sub: payload.sub,
    role: "admin",
    tv: payload.tv,
    aud: payload.aud as string,
  };
}

export function buildAdminSessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ADMIN_SESSION_MAX_AGE_SECONDS}${secure}`;
}

export function buildClearAdminSessionCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function extractAdminTokenFromRequest(req: NextRequest | Request): string | null {
  const anyReq = req as any;
  if (anyReq.cookies && typeof anyReq.cookies.get === "function") {
    const c = anyReq.cookies.get(ADMIN_SESSION_COOKIE_NAME);
    if (c) return typeof c === "string" ? c : c.value || null;
  }
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${ADMIN_SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function requireAdminConsole(req: NextRequest | Request): Promise<AdminUserRecord> {
  await ensureMigrated();
  const token = extractAdminTokenFromRequest(req);
  if (!token) {
    throw new AdminAuthError(404, "not_found", "Not Found");
  }

  let payload: AdminSessionJwtPayload;
  try {
    payload = await verifyAdminSessionToken(token);
  } catch {
    throw new AdminAuthError(404, "not_found", "Not Found");
  }

  const res = await query<AdminUserRecord>(
    `SELECT id, email, full_name, role, is_active, token_version,
            totp_secret_enc, totp_enabled, totp_recovery_hashes,
            must_change_password, must_enroll_totp, created_at, last_login_at
     FROM users WHERE id = $1 LIMIT 1`,
    [payload.sub]
  );
  const user = res.rows[0];
  if (
    !user ||
    !user.is_active ||
    user.role !== "admin" ||
    Number(user.token_version) !== payload.tv
  ) {
    throw new AdminAuthError(404, "not_found", "Not Found");
  }
  return user;
}

// TOTP Utility functions
export function generateTotpSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function buildTotpUri(email: string, secretBase32: string): string {
  const totp = new OTPAuth.TOTP({
    issuer: "Juris AI",
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  return totp.toString();
}

export async function generateTotpQrCodeDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, { errorCorrectionLevel: "M", width: 220, margin: 2 });
}

export function verifyTotpToken(secretBase32: string, token: string): boolean {
  try {
    const totp = new OTPAuth.TOTP({
      issuer: "Juris AI",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    });
    const delta = totp.validate({ token: token.trim(), window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const buf = crypto.randomBytes(5).toString("hex").toUpperCase();
    codes.push(`${buf.slice(0, 5)}-${buf.slice(5)}`);
  }
  return codes;
}

export async function hashRecoveryCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => bcrypt.hash(c.trim().toUpperCase(), 10)));
}

export async function verifyAndBurnRecoveryCode(
  rawCode: string,
  storedHashes: string[]
): Promise<{ valid: boolean; remainingHashes: string[] }> {
  const clean = rawCode.trim().toUpperCase();
  for (let i = 0; i < storedHashes.length; i++) {
    const ok = await bcrypt.compare(clean, storedHashes[i]);
    if (ok) {
      const remaining = storedHashes.filter((_, idx) => idx !== i);
      return { valid: true, remainingHashes: remaining };
    }
  }
  return { valid: false, remainingHashes: storedHashes };
}
