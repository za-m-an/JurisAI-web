import crypto from "crypto";
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import { NextRequest } from "next/server";
import { ensureMigrated, query } from "./db";

export const SESSION_COOKIE_NAME = "juris_session";
const DEV_SECRET_PATH = path.resolve(process.cwd(), ".data", "dev-secret");

export type UserRole = "admin" | "business" | "common" | "lawyer";
export type ProfessionalLevel = "trainee" | "attorney" | "barrister" | "advocate" | null;

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  professional_level: ProfessionalLevel;
  organisation: string | null;
  is_active: boolean;
  token_version: number;
  created_at: string;
  last_login_at: string | null;
}

export interface SessionJwtPayload {
  sub: string;
  role: UserRole;
  tv: number;
}

export class AuthError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function getJwtSecretBytes(): Uint8Array {
  const envSecret = (process.env.JWT_SECRET || "").trim();
  if (envSecret) {
    return new TextEncoder().encode(envSecret);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET environment variable is required in production");
  }
  fs.mkdirSync(path.dirname(DEV_SECRET_PATH), { recursive: true });
  if (fs.existsSync(DEV_SECRET_PATH)) {
    const saved = fs.readFileSync(DEV_SECRET_PATH, "utf8").trim();
    if (saved.length >= 32) {
      return new TextEncoder().encode(saved);
    }
  }
  const generated = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(DEV_SECRET_PATH, generated, { mode: 0o600 });
  return new TextEncoder().encode(generated);
}

export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (typeof password !== "string" || password.length < 10) {
    return { valid: false, reason: "Password must be at least 10 characters long." };
  }
  if (!/[A-Za-z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one digit." };
  }
  return { valid: true };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(payload: SessionJwtPayload): Promise<string> {
  const secret = getJwtSecretBytes();
  return new jose.SignJWT({ role: payload.role, tv: payload.tv })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionJwtPayload> {
  const secret = getJwtSecretBytes();
  const { payload } = await jose.jwtVerify(token, secret, { algorithms: ["HS256"] });
  if (
    !payload.sub ||
    typeof payload.role !== "string" ||
    typeof payload.tv !== "number" ||
    payload.aud === "juris-admin"
  ) {
    throw new AuthError(401, "unauthorized", "Invalid session token payload");
  }
  return {
    sub: payload.sub,
    role: payload.role as UserRole,
    tv: payload.tv,
  };
}

export function buildSessionCookieHeader(token: string, maxAgeSeconds = 7 * 24 * 60 * 60): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}

export function buildClearSessionCookieHeader(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function extractTokenFromRequest(req: NextRequest | Request): string | null {
  const anyReq = req as any;
  if (anyReq.cookies && typeof anyReq.cookies.get === "function") {
    const c = anyReq.cookies.get(SESSION_COOKIE_NAME);
    if (c) return typeof c === "string" ? c : c.value || null;
  }
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function requireUser(req: NextRequest | Request): Promise<AuthenticatedUser> {
  await ensureMigrated();
  const token = extractTokenFromRequest(req);
  if (!token) {
    throw new AuthError(401, "unauthorized", "Authentication required");
  }
  let jwtPayload: SessionJwtPayload;
  try {
    jwtPayload = await verifySessionToken(token);
  } catch {
    throw new AuthError(401, "unauthorized", "Invalid or expired session");
  }

  const res = await query<AuthenticatedUser>(
    `SELECT id, email, full_name, role, professional_level, organisation, is_active, token_version, created_at, last_login_at
     FROM users WHERE id = $1 LIMIT 1`,
    [jwtPayload.sub]
  );
  const user = res.rows[0];
  if (!user || !user.is_active || Number(user.token_version) !== Number(jwtPayload.tv)) {
    throw new AuthError(401, "unauthorized", "Session has been revoked or account is disabled");
  }
  return user;
}

export async function requireAdmin(req: NextRequest | Request): Promise<AuthenticatedUser> {
  const user = await requireUser(req);
  if (user.role !== "admin") {
    throw new AuthError(403, "forbidden", "Administrator privileges required");
  }
  return user;
}

export function verifyCsrfOrigin(req: NextRequest | Request): void {
  const method = (req.method || "GET").toUpperCase();
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return;
  }
  const hostHeader = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
    .trim()
    .toLowerCase();
  const originHeader = req.headers.get("origin");
  const refererHeader = req.headers.get("referer");

  // In non-browser CLI/test environments where Host is not set, require matching if Origin/Referer is supplied
  const candidate = originHeader || refererHeader;
  if (!candidate) {
    if (process.env.NODE_ENV === "production") {
      throw new AuthError(403, "csrf_rejected", "Missing Origin or Referer header on mutating request");
    }
    return;
  }

  let candidateHost = "";
  try {
    candidateHost = new URL(candidate).host.toLowerCase();
  } catch {
    throw new AuthError(403, "csrf_rejected", "Malformed Origin or Referer header");
  }

  if (hostHeader && candidateHost !== hostHeader) {
    throw new AuthError(403, "csrf_rejected", "Origin host does not match request host");
  }
}

export function getClientIp(req: NextRequest | Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "127.0.0.1";
}
