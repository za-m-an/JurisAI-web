import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";
import { cleanupStuckAnalyses } from "@/lib/quota";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await ensureMigrated();
    const user = await requireUser(req);
    await cleanupStuckAnalyses();

    const res = await query<{
      id: string;
      status: "processing" | "done" | "failed";
      doc_name: string;
      doc_size: number;
      doc_mime: string;
      doc_sha256: string;
      jurisdictions: string[];
      reference_code: string | null;
      brief_summary: string | null;
      error: string | null;
      created_at: string;
      finished_at: string | null;
      result: any;
    }>(
      `SELECT id, status, doc_name, doc_size, doc_mime, doc_sha256, jurisdictions, reference_code, brief_summary, memo_markdown, error, created_at, finished_at, result
       FROM analyses
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [user.id]
    );

    const analyses = res.rows.map((r: any) => {
      const structuredCount = Array.isArray(r.result?.risks) ? r.result.risks.length : 0;
      const memoMatches = typeof r.memo_markdown === "string" ? (r.memo_markdown.match(/(?:^|\n)###\s+(?:\d+\.\s+)?Risk\b/gi) || []).length : 0;
      const cleanSummary = (r.brief_summary || r.result?.summary || r.result?.executive_summary || "")
        .replace(/via Legal Knowledge Graph RAG/gi, "under governing statutory law")
        .replace(/Legal Knowledge Graph RAG/gi, "statutory counsel")
        .trim() || null;
      const cleanTitle =
        r.result?.document_type &&
        !/\.(pdf|docx|txt)$/i.test(r.result.document_type) &&
        r.result.document_type !== "Commercial Agreement"
          ? r.result.document_type
          : r.doc_name.replace(/\.(pdf|docx|txt)$/i, "").replace(/[_-]+/g, " ");

      return {
        id: r.id,
        status: r.status,
        docName: cleanTitle,
        docSize: r.doc_size,
        docMime: r.doc_mime,
        docSha256: r.doc_sha256,
        jurisdictions: r.jurisdictions,
        referenceCode: r.reference_code || `JRS-${r.id.slice(0, 8).toUpperCase()}`,
        briefSummary: cleanSummary,
        error: r.error,
        createdAt: r.created_at,
        finishedAt: r.finished_at,
        summary: cleanSummary,
        risksCount: structuredCount > 0 ? structuredCount : memoMatches,
      };
    });

    return NextResponse.json({ analyses });
  } catch (err) {
    return handleRouteError(err);
  }
}
