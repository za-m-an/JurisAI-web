import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await ensureMigrated();
    await requireAdmin(req);

    const action = (req.nextUrl.searchParams.get("action") || "").trim();
    const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
    const dateFrom = (req.nextUrl.searchParams.get("from") || "").trim();
    const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("pageSize") || 50)));
    const offset = (page - 1) * pageSize;

    const res = await query<{
      id: number | string;
      user_id: string | null;
      action: string;
      target: string | null;
      ip: string | null;
      user_agent: string | null;
      meta: any;
      created_at: string;
    }>(
      `SELECT id, user_id, action, target, ip, user_agent, meta, created_at
       FROM audit_logs
       WHERE ($1 = '' OR action = $1)
         AND ($2 = '' OR CAST(user_id AS TEXT) = $2)
         AND ($3 = '' OR created_at >= CAST($3 AS TIMESTAMPTZ))
       ORDER BY created_at DESC, id DESC
       LIMIT $4 OFFSET $5`,
      [action, userId, dateFrom, pageSize, offset]
    );

    return NextResponse.json({
      page,
      pageSize,
      logs: res.rows.map((l) => ({
        id: Number(l.id),
        userId: l.user_id,
        action: l.action,
        target: l.target,
        ip: l.ip,
        userAgent: l.user_agent,
        meta: l.meta || {},
        createdAt: l.created_at,
      })),
    });
  } catch (err) {
    return handleRouteError(err, true);
  }
}
