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
import { DeleteAccountSchema } from "@/lib/validation";

export const runtime = "nodejs";

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
