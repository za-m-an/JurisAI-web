import { NextRequest, NextResponse } from "next/server";
import { adminJsonResponse, requireAdminConsole } from "@/lib/admin-auth";
import {
  getClientIp,
  hashPassword,
  validatePasswordStrength,
  verifyCsrfOrigin,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";
import { AdminUserCreateSchema, AdminUserPatchSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await ensureMigrated();
    await requireAdminConsole(req);

    const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
    // Privacy by design: admins can NOT read users' analyses or chats; show only counts.
    const res = await query<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      professional_level: string | null;
      organisation: string | null;
      is_active: boolean;
      token_version: number;
      created_at: string;
      last_login_at: string | null;
      must_change_password: boolean;
      totp_enabled: boolean;
      analyses_count: number | string;
      conversations_count: number | string;
    }>(
      `SELECT u.id, u.email, u.full_name, u.role, u.professional_level, u.organisation,
              u.is_active, u.token_version, u.created_at, u.last_login_at,
              u.must_change_password, u.totp_enabled,
              (SELECT COUNT(*) FROM analyses a WHERE a.user_id = u.id) AS analyses_count,
              (SELECT COUNT(*) FROM conversations c WHERE c.user_id = u.id) AS conversations_count
       FROM users u
       WHERE ($1 = '' OR LOWER(u.email) LIKE '%' || $1 || '%' OR LOWER(u.full_name) LIKE '%' || $1 || '%')
       ORDER BY u.created_at DESC
       LIMIT 200`,
      [q]
    );

    return adminJsonResponse({
      users: res.rows.map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        professionalLevel: u.professional_level,
        organisation: u.organisation,
        isActive: u.is_active,
        tokenVersion: Number(u.token_version),
        mustChangePassword: Boolean(u.must_change_password),
        totpEnabled: Boolean(u.totp_enabled),
        createdAt: u.created_at,
        lastLoginAt: u.last_login_at,
        analysesCount: Number(u.analyses_count || 0),
        conversationsCount: Number(u.conversations_count || 0),
      })),
    });
  } catch (err) {
    return handleRouteError(err, true);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const admin = await requireAdminConsole(req);
    const body = await req.json();
    const parsed = AdminUserPatchSchema.parse(body);

    const existing = await query<{
      id: string;
      role: string;
      professional_level: string | null;
      is_active: boolean;
      token_version: number;
    }>("SELECT id, role, professional_level, is_active, token_version FROM users WHERE id = $1 LIMIT 1", [
      parsed.userId,
    ]);
    if (existing.rows.length === 0) {
      return adminJsonResponse(
        { error: "not_found", message: "Target user not found." },
        { status: 404 }
      );
    }

    const row = existing.rows[0];
    const nextRole = parsed.role ?? row.role;
    const nextProf =
      parsed.professionalLevel !== undefined ? parsed.professionalLevel : row.professional_level;
    const nextActive = parsed.isActive !== undefined ? parsed.isActive : row.is_active;
    const bumpTv =
      parsed.forceLogout === true ||
      parsed.isActive === false ||
      (parsed.role !== undefined && parsed.role !== row.role);

    const updated = await query<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      professional_level: string | null;
      is_active: boolean;
      token_version: number;
    }>(
      `UPDATE users
       SET role = $2,
           professional_level = $3,
           is_active = $4,
           token_version = token_version + $5
       WHERE id = $1
       RETURNING id, email, full_name, role, professional_level, is_active, token_version`,
      [parsed.userId, nextRole, nextProf, nextActive, bumpTv ? 1 : 0]
    );

    await logAudit({
      userId: admin.id,
      action: "admin_user_updated",
      target: parsed.userId,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      meta: {
        console: true,
        role: nextRole,
        professionalLevel: nextProf,
        isActive: nextActive,
        forceLogout: Boolean(parsed.forceLogout),
      },
    });

    return adminJsonResponse({ user: updated.rows[0] });
  } catch (err) {
    return handleRouteError(err, true);
  }
}

export async function POST(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const admin = await requireAdminConsole(req);
    const body = await req.json();
    const parsed = AdminUserCreateSchema.parse(body);

    const pwCheck = validatePasswordStrength(parsed.temporaryPassword);
    if (!pwCheck.valid) {
      return adminJsonResponse(
        { error: "weak_password", message: pwCheck.reason || "Temporary password is too weak." },
        { status: 400 }
      );
    }

    const dup = await query("SELECT id FROM users WHERE email = $1 LIMIT 1", [parsed.email]);
    if (dup.rows.length > 0) {
      return adminJsonResponse(
        { error: "email_taken", message: "A user with that email already exists." },
        { status: 409 }
      );
    }

    const pwHash = await hashPassword(parsed.temporaryPassword);
    const created = await query<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      professional_level: string | null;
      organisation: string | null;
      is_active: boolean;
    }>(
      `INSERT INTO users (email, password_hash, full_name, role, professional_level, organisation, is_active, token_version, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, 0, TRUE)
       RETURNING id, email, full_name, role, professional_level, organisation, is_active`,
      [
        parsed.email,
        pwHash,
        parsed.fullName,
        parsed.role,
        parsed.professionalLevel ?? null,
        parsed.organisation ?? null,
      ]
    );

    await logAudit({
      userId: admin.id,
      action: "admin_user_updated",
      target: created.rows[0].id,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      meta: { console: true, action: "created_by_admin", role: parsed.role, mustChangePassword: true },
    });

    return adminJsonResponse({ user: created.rows[0] }, { status: 201 });
  } catch (err) {
    return handleRouteError(err, true);
  }
}
