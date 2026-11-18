import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await ensureMigrated();
    const user = await requireUser(req);

    const res = await query<{
      id: string;
      title: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, title, created_at, updated_at
       FROM conversations
       WHERE user_id = $1
       ORDER BY updated_at DESC
       LIMIT 100`,
      [user.id]
    );

    return NextResponse.json({
      conversations: res.rows.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
