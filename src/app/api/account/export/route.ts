import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await ensureMigrated();
    const user = await requireUser(req);

    const analysesRes = await query(
      `SELECT id, status, doc_name, doc_size, doc_mime, doc_sha256, jurisdictions, result, memo_markdown, error, rag_timings, created_at, finished_at
       FROM analyses WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id]
    );

    const convsRes = await query<{
      id: string;
      title: string;
      created_at: string;
      updated_at: string;
    }>(
      "SELECT id, title, created_at, updated_at FROM conversations WHERE user_id = $1 ORDER BY created_at DESC",
      [user.id]
    );

    const conversationsWithMessages = [];
    for (const c of convsRes.rows) {
      const msgs = await query(
        "SELECT id, role, content, citations, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC",
        [c.id]
      );
      conversationsWithMessages.append
        ? conversationsWithMessages.push({ ...c, messages: msgs.rows })
        : conversationsWithMessages.push({ ...c, messages: msgs.rows });
    }

    const exportPayload = {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        professionalLevel: user.professional_level,
        organisation: user.organisation,
        createdAt: user.created_at,
      },
      analyses: analysesRes.rows,
      conversations: conversationsWithMessages,
    };

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="juris-ai-export-${user.id}.json"`,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
