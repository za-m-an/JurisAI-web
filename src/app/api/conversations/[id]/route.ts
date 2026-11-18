import { NextRequest, NextResponse } from "next/server";
import { getClientIp, requireUser, verifyCsrfOrigin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http-error";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    await ensureMigrated();
    const user = await requireUser(req);
    const convId = context.params.id;

    const convRes = await query<{
      id: string;
      user_id: string;
      title: string;
      created_at: string;
      updated_at: string;
    }>("SELECT id, user_id, title, created_at, updated_at FROM conversations WHERE id = $1 LIMIT 1", [
      convId,
    ]);
    const conv = convRes.rows[0];
    if (!conv) {
      return jsonError(404, "not_found", "Conversation not found.");
    }
    if (conv.user_id !== user.id) {
      return jsonError(403, "forbidden", "You do not have permission to view this conversation.");
    }

    const msgRes = await query<{
      id: string;
      role: "user" | "assistant";
      content: string;
      citations: any;
      created_at: string;
    }>(
      `SELECT id, role, content, citations, created_at
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC, id ASC`,
      [convId]
    );

    return NextResponse.json({
      conversation: {
        id: conv.id,
        title: conv.title,
        createdAt: conv.created_at,
        updatedAt: conv.updated_at,
      },
      messages: msgRes.rows.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        citations: m.citations || [],
        createdAt: m.created_at,
      })),
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const user = await requireUser(req);
    const convId = context.params.id;

    const convRes = await query<{ id: string; user_id: string }>(
      "SELECT id, user_id FROM conversations WHERE id = $1 LIMIT 1",
      [convId]
    );
    const conv = convRes.rows[0];
    if (!conv) {
      return jsonError(404, "not_found", "Conversation not found.");
    }
    if (conv.user_id !== user.id) {
      return jsonError(403, "forbidden", "You do not have permission to delete this conversation.");
    }

    await query("DELETE FROM conversations WHERE id = $1 AND user_id = $2", [convId, user.id]);
    await logAudit({
      userId: user.id,
      action: "data_deleted",
      target: `conversation:${convId}`,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ deleted: true, id: convId });
  } catch (err) {
    return handleRouteError(err);
  }
}
