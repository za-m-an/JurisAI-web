import { NextRequest, NextResponse } from "next/server";
import {
  buildClearSessionCookieHeader,
  getClientIp,
  requireUser,
  verifyCsrfOrigin,
  verifyPassword,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureMigrated, query, tx } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http-error";
import { DeleteAccountSchema, UpdateProfileSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const user = await requireUser(req);
    const body = await req.json();
    const parsed = UpdateProfileSchema.parse(body);

    const updates: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (parsed.fullName !== undefined) {
      updates.push(`full_name = $${idx++}`);
      params.push(parsed.fullName);
    }
    if (parsed.organisation !== undefined) {
      updates.push(`organisation = $${idx++}`);
      params.push(parsed.organisation);
    }
    if (parsed.region !== undefined) {
      updates.push(`region = $${idx++}`);
      params.push(parsed.region);
    }
    if (parsed.language !== undefined) {
      updates.push(`language = $${idx++}`);
      params.push(parsed.language);
    }
    if (parsed.avatarUrl !== undefined) {
      updates.push(`avatar_url = $${idx++}`);
      params.push(parsed.avatarUrl);
    }
    if (parsed.subscriptionTier !== undefined) {
      updates.push(`subscription_tier = $${idx++}`);
      params.push(parsed.subscriptionTier);
    }

    if (updates.length > 0) {
      params.push(user.id);
      await query(
        `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}`,
        params
      );
      await logAudit({
        userId: user.id,
        action: "update_profile",
        target: user.id,
        ip: getClientIp(req),
        userAgent: req.headers.get("user-agent"),
        meta: { fields: Object.keys(parsed) },
      });
    }

    const updated = await query<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      organisation: string | null;
      region: string;
      language: string;
      avatar_url: string | null;
      subscription_tier: string;
    }>("SELECT id, email, full_name, role, organisation, region, language, avatar_url, subscription_tier FROM users WHERE id = $1", [user.id]);

    const u = updated.rows[0];
    return NextResponse.json({
      ok: true,
      user: {
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        role: u.role,
        organisation: u.organisation,
        region: u.region,
        language: u.language,
        avatarUrl: u.avatar_url,
        subscriptionTier: u.subscription_tier,
      },
    }, { status: 200 });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const user = await requireUser(req);
    const body = await req.json();
    const parsed = DeleteAccountSchema.parse(body);

    const pwRes = await query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1 LIMIT 1",
      [user.id]
    );
    const row = pwRes.rows[0];
    if (!row) {
      return jsonError(404, "not_found", "User account not found.");
    }

    const ok = await verifyPassword(parsed.password, row.password_hash);
    if (!ok) {
      return jsonError(401, "invalid_password", "Password confirmation failed.");
    }

    await tx(async (client) => {
      // Nullify audit_logs user_id and scrub target before deleting user (cascades analyses, conversations, messages)
      await client.query(
        "UPDATE audit_logs SET user_id = NULL, target = NULL, meta = '{}'::jsonb WHERE user_id = $1",
        [user.id]
      );
      await client.query("DELETE FROM users WHERE id = $1", [user.id]);
    });

    // Audit record keeps only user_id = null and action = 'account_deleted'
    await logAudit({
      userId: null,
      action: "account_deleted",
      target: null,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
      meta: {},
    });

    return NextResponse.json(
      { deleted: true },
      {
        status: 200,
        headers: {
          "Set-Cookie": buildClearSessionCookieHeader(),
        },
      }
    );
  } catch (err) {
    return handleRouteError(err);
  }
}
