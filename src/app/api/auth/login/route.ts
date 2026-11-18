import { NextRequest, NextResponse } from "next/server";
import {
  buildSessionCookieHeader,
  getClientIp,
  signSessionToken,
   UserRole,
  verifyCsrfOrigin,
  verifyPassword,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { LoginSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const ip = getClientIp(req);
    const rawBody = await req.json();
    const parsed = LoginSchema.parse(rawBody);

    // Rate limit: 20 attempts / 15 min per IP and 5 attempts / 15 min per (email+IP)
    await checkRateLimit({
      key: `login:ip:${ip}`,
      limit: 20,
      windowSeconds: 900,
      ip,
    });
    await checkRateLimit({
      key: `login:email_ip:${parsed.email}:${ip}`,
      limit: 5,
      windowSeconds: 900,
      ip,
    });

    const res = await query<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: UserRole;
      organisation: string | null;
      is_active: boolean;
      token_version: number;
    }>(
      `SELECT id, email, password_hash, full_name, role, organisation, is_active, token_version
       FROM users WHERE email = $1 LIMIT 1`,
      [parsed.email]
    );

    const user = res.rows[0];
    if (!user || !user.is_active) {
      await logAudit({
        userId: user?.id ?? null,
        action: "login_failed",
        target: parsed.email,
        ip,
        userAgent: req.headers.get("user-agent"),
      });
      return jsonError(401, "invalid_credentials", "Invalid email or password.");
    }

    const ok = await verifyPassword(parsed.password, user.password_hash);
    if (!ok) {
      await logAudit({
        userId: user.id,
        action: "login_failed",
        target: parsed.email,
        ip,
        userAgent: req.headers.get("user-agent"),
      });
      return jsonError(401, "invalid_credentials", "Invalid email or password.");
    }

    await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);

    const token = await signSessionToken({
      sub: user.id,
      role: user.role,
      tv: Number(user.token_version),
    });

    await logAudit({
      userId: user.id,
      action: "login_success",
      target: user.email,
      ip,
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          organisation: user.organisation,
        },
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": buildSessionCookieHeader(token),
        },
      }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
