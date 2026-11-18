import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getClientIp, requireUser, verifyCsrfOrigin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureMigrated, query } from "@/lib/db";
import { extractDocumentInMemory, ExtractionError, maskPii } from "@/lib/extract";
import { handleRouteError, jsonError } from "@/lib/http-error";
import { enforceAnalysisQuota, getSystemSettings } from "@/lib/quota";
import { ragAnalyze, RagClientError } from "@/lib/rag-client";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let rawBytes: Uint8Array | undefined;
  let extractedText: string | undefined;

  try {
    verifyCsrfOrigin(req);
    await ensureMigrated();
    const user = await requireUser(req);
    const ip = getClientIp(req);

    // 1. Rate limit (5/min per user) and monthly role quota check
    await checkRateLimit({
      key: `analyze:user:${user.id}`,
      limit: 5,
      windowSeconds: 60,
      userId: user.id,
      ip,
    });
    await enforceAnalysisQuota(user);

    const settings = await getSystemSettings();
    const formData = await req.formData();
    const fileEntry = formData.get("file");
    const textEntry = formData.get("text");
    const jurisdictionsRaw = formData.get("jurisdictions");
    const analysisNote = formData.get("analysisNote");

    const hasFile =
      fileEntry !== null &&
      typeof fileEntry === "object" &&
      typeof (fileEntry as any).arrayBuffer === "function" &&
      ((fileEntry as any).size ?? 0) > 0;
    const hasText = typeof textEntry === "string" && textEntry.trim().length > 0;

    if ((hasFile && hasText) || (!hasFile && !hasText)) {
      return jsonError(
        400,
        "invalid_input",
        "Provide exactly one of 'file' or 'text' in multipart/form-data."
      );
    }

    let jurisdictions: Array<"BD" | "US" | "EU"> = settings.default_jurisdictions || [
      "BD",
      "US",
      "EU",
    ];
    if (typeof jurisdictionsRaw === "string" && jurisdictionsRaw.trim()) {
      try {
        const parsedJ = JSON.parse(jurisdictionsRaw);
        if (Array.isArray(parsedJ)) {
          const validJ = parsedJ.filter((j): j is "BD" | "US" | "EU" =>
            ["BD", "US", "EU"].includes(j)
          );
          if (validJ.length > 0) jurisdictions = validJ;
        }
      } catch {
        return jsonError(400, "invalid_jurisdictions", "jurisdictions must be a JSON array.");
      }
    }

    let docName = "Scenario / Pasted Text";
    let docSize = 0;
    let docMime = "text/plain";
    let docSha256 = "";

    // 2-4. Read strictly into memory, validate magic bytes, extract text, and discard file buffer
    try {
      if (hasFile) {
        const fileObj = fileEntry as File;
        docName = fileObj.name || "Uploaded Document";
        const ab = await fileObj.arrayBuffer();
        rawBytes = new Uint8Array(ab);
        const extracted = await extractDocumentInMemory({
          bytes: rawBytes,
          fileName: docName,
          mimeType: fileObj.type || "application/octet-stream",
          maxUploadMb: settings.max_upload_mb,
        });
        extractedText = extracted.text;
        docSize = extracted.docSize;
        docMime = extracted.docMime;
        docSha256 = extracted.sha256;
      } else {
        const rawText = String(textEntry || "").trim();
        if (rawText.length > 150_000) {
          throw new ExtractionError(
            413,
            "too_long",
            "Submitted text exceeds the 150,000 character limit."
          );
        }
        if (rawText.replace(/\s+/g, "").length < 200) {
          throw new ExtractionError(
            422,
            "no_text",
            "This looks like a scanned or image-only file. Scanned documents are not supported in this version; please upload a text-based PDF, DOCX or TXT."
          );
        }
        extractedText = rawText;
        docSize = Buffer.byteLength(rawText, "utf8");
        docMime = "text/plain";
        docSha256 = crypto.createHash("sha256").update(rawText, "utf8").digest("hex");
      }
    } finally {
      // Immediately drop all references to raw file bytes
      rawBytes = undefined;
    }

    if (typeof analysisNote === "string" && analysisNote.trim()) {
      const noteClean = analysisNote.trim().slice(0, 2000);
      extractedText = `${extractedText}\n\n[User Context Note]: ${noteClean}`;
      if (extractedText.length > 150_000) {
        extractedText = extractedText.slice(0, 150_000);
      }
    }

    // 5. Apply light PII masking if enabled in settings
    if (settings.mask_pii) {
      extractedText = maskPii(extractedText);
    }

    // 6. Insert analyses row with status='processing' (metadata only; never file bytes or extracted text)
    const inserted = await query<{ id: string }>(
      `INSERT INTO analyses (user_id, status, doc_name, doc_size, doc_mime, doc_sha256, jurisdictions)
       VALUES ($1, 'processing', $2, $3, $4, $5, $6)
       RETURNING id`,
      [user.id, docName, docSize, docMime, docSha256, jurisdictions]
    );
    const analysisId = inserted.rows[0].id;

    await logAudit({
      userId: user.id,
      action: "analyze_start",
      target: analysisId,
      ip,
      userAgent: req.headers.get("user-agent"),
      meta: { docName, docSize, docMime, jurisdictions },
    });

    try {
      const ragResult = await ragAnalyze({
        document_text: extractedText,
        jurisdictions,
        doc_name: docName,
      });
      // Immediately clear extracted text reference after RAG call
      extractedText = undefined;

      await query(
        `UPDATE analyses
         SET status = 'done',
             result = $2::jsonb,
             memo_markdown = $3,
             rag_timings = $4::jsonb,
             finished_at = NOW()
         WHERE id = $1`,
        [
          analysisId,
          JSON.stringify(ragResult),
          ragResult.memo_markdown,
          JSON.stringify(ragResult.timings_ms || {}),
        ]
      );

      await logAudit({
        userId: user.id,
        action: "analyze_done",
        target: analysisId,
        ip,
        userAgent: req.headers.get("user-agent"),
        meta: {
          risksCount: ragResult.risks?.length ?? 0,
          verification: ragResult.verification,
        },
      });

      return NextResponse.json(
        {
          analysisId,
          status: "done",
          file_discarded: true,
          result: ragResult,
        },
        { status: 200 }
      );
    } catch (ragErr) {
      extractedText = undefined;
      const safeErrorMsg =
        ragErr instanceof RagClientError
          ? ragErr.userMessage
          : "Analysis failed due to an upstream service error.";

      await query(
        `UPDATE analyses
         SET status = 'failed', error = $2, finished_at = NOW()
         WHERE id = $1`,
        [analysisId, safeErrorMsg]
      );

      await logAudit({
        userId: user.id,
        action: "analyze_failed",
        target: analysisId,
        ip,
        userAgent: req.headers.get("user-agent"),
        meta: { error: safeErrorMsg },
      });

      throw ragErr;
    }
  } catch (err) {
    rawBytes = undefined;
    extractedText = undefined;
    return handleRouteError(err);
  }
}
