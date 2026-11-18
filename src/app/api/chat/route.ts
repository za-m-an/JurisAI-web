import { NextRequest, NextResponse } from "next/server";
import { getClientIp, requireUser, verifyCsrfOrigin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http-error";
import { enforceChatQuota, getSystemSettings } from "@/lib/quota";
import { ragChat } from "@/lib/rag-client";
import { checkRateLimit } from "@/lib/rate-limit";
import { ChatRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const user = await requireUser(req);
    const ip = getClientIp(req);

    // Rate limit: 20/min per user + daily chat quota check
    await checkRateLimit({
      key: `chat:user:${user.id}`,
      limit: 20,
      windowSeconds: 60,
      userId: user.id,
      ip,
    });
    await enforceChatQuota(user);

    const rawBody = await req.json();
    const parsed = ChatRequestSchema.parse(rawBody);
    const settings = await getSystemSettings();
    const jurisdictions = parsed.jurisdictions || settings.default_jurisdictions || ["BD", "US", "EU"];

    let conversationId = parsed.conversationId || null;
    if (conversationId) {
      const convCheck = await query<{ id: string; user_id: string }>(
        "SELECT id, user_id FROM conversations WHERE id = $1 LIMIT 1",
        [conversationId]
      );
      if (convCheck.rows.length === 0) {
        return jsonError(404, "not_found", "Conversation not found.");
      }
      if (convCheck.rows[0].user_id !== user.id) {
        return jsonError(403, "forbidden", "Access denied to this conversation.");
      }
    } else {
      const title = parsed.message.slice(0, 60);
      const created = await query<{ id: string }>(
        "INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id",
        [user.id, title]
      );
      conversationId = created.rows[0].id;
    }

    // Build optional context_note from attached analysis if analysisId provided
    let contextNote = parsed.contextNote || undefined;
    if (!contextNote && parsed.analysisId) {
      const anaRes = await query<{ user_id: string; result: any }>(
        "SELECT user_id, result FROM analyses WHERE id = $1 LIMIT 1",
        [parsed.analysisId]
      );
      if (anaRes.rows.length > 0 && anaRes.rows[0].user_id === user.id && anaRes.rows[0].result) {
        const r = anaRes.rows[0].result;
        const riskTitles = Array.isArray(r.risks)
          ? r.risks.map((rk: any) => rk.title).join("; ")
          : "";
        contextNote = `Summary: ${r.summary || ""}\nRisks: ${riskTitles}`.slice(0, 8000);
      }
    }

    // Insert user message
    await query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2)",
      [conversationId, parsed.message]
    );

    // Fetch at most the last 10 messages for RAG context
    const histRes = await query<{ role: "user" | "assistant"; content: string }>(
      `SELECT role, content FROM (
         SELECT role, content, created_at, id
         FROM messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 10
       ) sub
       ORDER BY created_at ASC, id ASC`,
      [conversationId]
    );

    const ragMessages = histRes.rows.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const ragResp = await ragChat({
      messages: ragMessages,
      jurisdictions,
      context_note: contextNote ? contextNote.slice(0, 8000) : undefined,
    });

    const savedAssistant = await query<{ id: string; created_at: string }>(
      `INSERT INTO messages (conversation_id, role, content, citations)
       VALUES ($1, 'assistant', $2, $3::jsonb)
       RETURNING id, created_at`,
      [conversationId, ragResp.answer_markdown, JSON.stringify(ragResp.citations || [])]
    );

    await query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [conversationId]);

    await logAudit({
      userId: user.id,
      action: "chat",
      target: conversationId,
      ip,
      userAgent: req.headers.get("user-agent"),
      meta: { citationsCount: ragResp.citations?.length ?? 0 },
    });

    return NextResponse.json({
      conversationId,
      messageId: savedAssistant.rows[0].id,
      answer_markdown: ragResp.answer_markdown,
      citations: ragResp.citations,
      disclaimer: ragResp.disclaimer,
      mock: ragResp.mock,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
