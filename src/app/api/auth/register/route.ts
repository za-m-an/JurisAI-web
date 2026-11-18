import { NextRequest, NextResponse } from "next/server";
import {
  buildSessionCookieHeader,
  getClientIp,
  hashPassword,
  signSessionToken,
  validatePasswordStrength,
  verifyCsrfOrigin,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http-error";
import { checkRateLimit } from "@/lib/rate-limit";
import { RegisterSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const ip = getClientIp(req);

    // Rate limit: 5 registrations per hour per IP
    await checkRateLimit({
      key: `register:ip:${ip}`,
      limit: 5,
      windowSeconds: 3600,
      ip,
    });

    const rawBody = await req.json();
    // Explicitly reject 'lawyer' or 'admin' role attempts during self-registration
    if (rawBody && typeof rawBody.role === "string" && !["business", "common"].includes(rawBody.role)) {
      return jsonError(400, "invalid_role", "Registration only permits 'business' or 'common' account types.");
    }

    const parsed = RegisterSchema.parse(rawBody);
    const pwCheck = validatePasswordStrength(parsed.password);
    if (!pwCheck.valid) {
      return jsonError(400, "weak_password", pwCheck.reason || "Password does not meet complexity requirements.");
    }

    const existing = await query<{ id: string }>(
      "SELECT id FROM users WHERE email = $1 LIMIT 1",
      [parsed.email]
    );
    if (existing.rows.length > 0) {
      return jsonError(409, "email_taken", "An account with this email address already exists.");
    }

    const pwHash = await hashPassword(parsed.password);
    const inserted = await query<{
      id: string;
      email: string;
      full_name: string;
      role: "business" | "common";
      organisation: string | null;
      token_version: number;
    }>(
      `INSERT INTO users (email, password_hash, full_name, role, organisation, is_active, token_version, last_login_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, 0, NOW())
       RETURNING id, email, full_name, role, organisation, token_version`,
      [
        parsed.email,
        pwHash,
        parsed.fullName,
        parsed.accountType,
        parsed.organisation || null,
      ]
    );

    const user = inserted.rows[0];
    const token = await signSessionToken({
      sub: user.id,
      role: user.role,
      tv: user.token_version,
    });

    await logAudit({
      userId: user.id,
      action: "register",
      target: user.email,
      ip,
      userAgent: req.headers.get("user-agent"),
      meta: { role: user.role },
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
        status: 201,
        headers: {
          "Set-Cookie": buildSessionCookieHeader(token),
        },
      }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
