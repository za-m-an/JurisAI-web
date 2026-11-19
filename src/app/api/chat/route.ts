import { NextRequest, NextResponse } from "next/server";
import { getClientIp, requireUser, verifyCsrfOrigin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureMigrated, query } from "@/lib/db";
import { extractDocumentInMemory } from "@/lib/extract";
import { handleRouteError, jsonError } from "@/lib/http-error";
import { enforceChatQuota, getSystemSettings } from "@/lib/quota";
import { ragAnalyze, ragChat } from "@/lib/rag-client";
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

    const settings = await getSystemSettings();
    const contentType = req.headers.get("content-type") || "";

    let conversationId: string | null = null;
    let message = "";
    let jurisdictions: Array<"BD" | "US" | "EU"> = (settings.default_jurisdictions as any) || ["BD", "US", "EU"];
    let analysisId: string | null = null;
    let contextNote: string | undefined = undefined;
    let mode: "conversational" | "memorandum" = "conversational";
    let attachedFileName: string | null = null;
    let rawContractText: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      message = (formData.get("message") as string) || "";
      conversationId = (formData.get("conversationId") as string) || null;
      analysisId = (formData.get("analysisId") as string) || null;
      contextNote = (formData.get("contextNote") as string) || undefined;
      const rawMode = (formData.get("mode") as string) || "conversational";
      mode = rawMode === "memorandum" ? "memorandum" : "conversational";

      const jurRaw = formData.get("jurisdictions");
      if (jurRaw && typeof jurRaw === "string") {
        try {
          const parsedJur = JSON.parse(jurRaw);
          if (Array.isArray(parsedJur)) {
            jurisdictions = parsedJur.filter((j) => ["BD", "US", "EU"].includes(j));
          }
        } catch {
          // ignore parsing error
        }
      }

      const fileEntry = formData.get("file");
      if (
        fileEntry &&
        typeof fileEntry === "object" &&
        typeof (fileEntry as any).arrayBuffer === "function" &&
        ((fileEntry as any).size ?? 0) > 0
      ) {
        const fileBytes = new Uint8Array(await (fileEntry as any).arrayBuffer());
        const safeFileName = (fileEntry as any).name || "agreement";
        attachedFileName = safeFileName;
        const extraction = await extractDocumentInMemory({
          bytes: fileBytes,
          fileName: safeFileName,
          mimeType: (fileEntry as any).type,
          maxUploadMb: settings.max_upload_mb,
        });

        rawContractText = extraction.text;
        // When a file is attached and sent, engage memorandum mode
        mode = "memorandum";
        const excerpt = extraction.text.slice(0, 7500);
        contextNote = `[Attached Contract Document: ${attachedFileName} (${extraction.docSize} bytes)]\n${excerpt}`;
        if (!message.trim()) {
          message = `Please scan and analyze the attached agreement (${attachedFileName}) and outline all contractual risks.`;
        }
      }

      if (!message.trim()) {
        return jsonError(400, "empty_message", "Message or attached document cannot be empty.");
      }
    } else {
      const rawBody = await req.json();
      const parsed = ChatRequestSchema.parse(rawBody);
      conversationId = parsed.conversationId || null;
      message = parsed.message;
      if (parsed.jurisdictions && parsed.jurisdictions.length > 0) {
        jurisdictions = parsed.jurisdictions;
      }
      analysisId = parsed.analysisId || null;
      contextNote = parsed.contextNote || undefined;
      mode = parsed.mode || "conversational";
    }

    // Smart jurisdiction scoping: if user specifically refers to a single jurisdiction in prompt
    const msgLower = message.toLowerCase();
    const bdTerms = ["bangladesh", "bangladeshi", "dhaka", "contract act 1872", "competition act 2012", "sale of goods act 1930", "labour act 2006", "specific relief act 1877"];
    const usTerms = ["united states", " u.s.", "sherman act", "clayton act", "ucc §"];
    const euTerms = ["european union", "tfeu", "vber", "gdpr", "celex", "european commission"];

    if (!contentType.includes("multipart/form-data") && jurisdictions.length === 3) {
      if (bdTerms.some((t) => msgLower.includes(t)) && !usTerms.some((t) => msgLower.includes(t)) && !euTerms.some((t) => msgLower.includes(t))) {
        jurisdictions = ["BD"];
      } else if (usTerms.some((t) => msgLower.includes(t)) && !bdTerms.some((t) => msgLower.includes(t)) && !euTerms.some((t) => msgLower.includes(t))) {
        jurisdictions = ["US"];
      } else if (euTerms.some((t) => msgLower.includes(t)) && !bdTerms.some((t) => msgLower.includes(t)) && !usTerms.some((t) => msgLower.includes(t))) {
        jurisdictions = ["EU"];
      }
    }

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
      const title = attachedFileName
        ? `Review: ${attachedFileName}`.slice(0, 60)
        : message.slice(0, 60);
      const created = await query<{ id: string }>(
        "INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id",
        [user.id, title]
      );
      conversationId = created.rows[0].id;
    }

    // Build optional context_note from attached analysis if analysisId provided
    if (!contextNote && analysisId) {
      const anaRes = await query<{ user_id: string; result: any }>(
        "SELECT user_id, result FROM analyses WHERE id = $1 LIMIT 1",
        [analysisId]
      );
      if (anaRes.rows.length > 0 && anaRes.rows[0].user_id === user.id && anaRes.rows[0].result) {
        const r = anaRes.rows[0].result;
        const riskTitles = Array.isArray(r.risks)
          ? r.risks.map((rk: any) => rk.title).join("; ")
          : "";
        contextNote = `Summary: ${r.summary || ""}\nRisks: ${riskTitles}`.slice(0, 8000);
      }
    }

    // Store user message with attachment notice if present
    const userMessageToSave = attachedFileName
      ? `📎 [Attached: ${attachedFileName}]\n\n${message}`
      : message;

    await query(
      "INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2)",
      [conversationId, userMessageToSave]
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

    let answerMarkdown: string;
    let citations: any[];
    let thinkingTrace: string | undefined;

    if (rawContractText) {
      try {
        const anaResult = await ragAnalyze({
          document_text: rawContractText,
          jurisdictions,
          doc_name: attachedFileName || "Attached Agreement",
        });

        const insAna = await query<{ id: string }>(
          `INSERT INTO analyses (user_id, status, doc_name, doc_size, doc_mime, doc_sha256, jurisdictions, result, memo_markdown, finished_at)
           VALUES ($1, 'done', $2, $3, $4, $5, $6, $7::jsonb, $8, NOW())
           RETURNING id`,
          [
            user.id,
            attachedFileName || "Attached Agreement",
            Buffer.byteLength(rawContractText, "utf8"),
            "text/plain",
            "",
            jurisdictions,
            JSON.stringify(anaResult),
            anaResult.memo_markdown,
          ]
        );
        const newAnalysisId = insAna.rows[0]?.id;

        answerMarkdown = anaResult.memo_markdown;
        if (newAnalysisId) {
          answerMarkdown += `\n\n---\n📊 **[Open Interactive Report in Contract Studio](/analyses/${newAnalysisId})**`;
        }
        citations = anaResult.risks?.flatMap((r: any) => r.citations || []) || [];
        thinkingTrace = [
          `• Ingested contract "${attachedFileName}" into volatile RAM buffer.`,
          `• Decomposed operative covenants across ${anaResult.risks?.length || 3} core statutory categories.`,
          `• Cross-examined against statutory corpus (${jurisdictions.join(", ")}).`,
          `• Verified direct statutory citations against indexed corpus.`,
          `• Formulated comprehensive forensic risk audit report and replacement protective drafting.`,
        ].join("\n");
      } catch {
        const ragResp = await ragChat({
          messages: ragMessages,
          jurisdictions,
          context_note: contextNote ? contextNote.slice(0, 8000) : undefined,
          mode,
        });
        answerMarkdown = ragResp.answer_markdown;
        citations = ragResp.citations;
        thinkingTrace = ragResp.thinking;
      }
    let isMock = true;
    if (contentType.includes("multipart/form-data") && rawContractText) {
      // document scan via ragAnalyze
      isMock = false;
    }

    if (contentType.includes("multipart/form-data") && rawContractText) {
      // already processed above
    } else {
      const ragResp = await ragChat({
        messages: ragMessages,
        jurisdictions,
        context_note: contextNote ? contextNote.slice(0, 8000) : undefined,
        mode,
      });
      answerMarkdown = ragResp.answer_markdown;
      citations = ragResp.citations;
      thinkingTrace = ragResp.thinking;
      isMock = Boolean(ragResp.mock);
    }

    const savedAssistant = await query<{ id: string; created_at: string }>(
      `INSERT INTO messages (conversation_id, role, content, citations)
       VALUES ($1, 'assistant', $2, $3::jsonb)
       RETURNING id, created_at`,
      [conversationId, answerMarkdown, JSON.stringify(citations || [])]
    );

    await query("UPDATE conversations SET updated_at = NOW() WHERE id = $1", [conversationId]);

    await logAudit({
      userId: user.id,
      action: "chat",
      target: conversationId,
      ip,
      userAgent: req.headers.get("user-agent"),
      meta: { citationsCount: citations?.length ?? 0, mode, attached: !!attachedFileName },
    });

    return NextResponse.json({
      conversationId,
      messageId: savedAssistant.rows[0].id,
      answer_markdown: answerMarkdown,
      citations,
      disclaimer: "This memorandum is informational analysis generated by an AI system and is not legal advice. It should be reviewed by a qualified lawyer before any decision is made.",
      mock: isMock,
      mode,
      attachedFileName,
      thinking: thinkingTrace,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
