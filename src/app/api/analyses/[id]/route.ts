import { NextRequest, NextResponse } from "next/server";
import { getClientIp, requireUser, verifyCsrfOrigin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http-error";
import { cleanupStuckAnalyses } from "@/lib/quota";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    await ensureMigrated();
    const user = await requireUser(req);
    await cleanupStuckAnalyses();
    const analysisId = context.params.id;

    // Privacy by design: only the owning user can read their analysis (even admins cannot read another user's analysis)
    const res = await query<{
      id: string;
      user_id: string;
      status: "processing" | "done" | "failed";
      doc_name: string;
      doc_size: number;
      doc_mime: string;
      doc_sha256: string;
      jurisdictions: string[];
      reference_code: string | null;
      brief_summary: string | null;
      result: any;
      memo_markdown: string | null;
      error: string | null;
      rag_timings: any;
      created_at: string;
      finished_at: string | null;
    }>(
      `SELECT id, user_id, status, doc_name, doc_size, doc_mime, doc_sha256, jurisdictions, reference_code, brief_summary, result, memo_markdown, error, rag_timings, created_at, finished_at
       FROM analyses WHERE id = $1 LIMIT 1`,
      [analysisId]
    );

    const row = res.rows[0];
    if (!row) {
      return jsonError(404, "not_found", "Analysis not found.");
    }
    if (row.user_id !== user.id) {
      return jsonError(403, "forbidden", "You do not have permission to access this analysis.");
    }

    return NextResponse.json({
      analysis: {
        id: row.id,
        referenceCode: row.reference_code || `JRS-${row.id.slice(0, 8).toUpperCase()}`,
        briefSummary: row.brief_summary || row.result?.executive_summary || null,
        status: row.status,
        docName: row.doc_name,
        docSize: row.doc_size,
        docMime: row.doc_mime,
        docSha256: row.doc_sha256,
        jurisdictions: row.jurisdictions,
        result: row.result,
        memoMarkdown: row.memo_markdown,
        error: row.error,
        ragTimings: row.rag_timings,
        createdAt: row.created_at,
        finishedAt: row.finished_at,
        file_discarded: true,
      },
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
    const analysisId = context.params.id;

    const res = await query<{ id: string; user_id: string }>(
      "SELECT id, user_id FROM analyses WHERE id = $1 LIMIT 1",
      [analysisId]
    );
    const row = res.rows[0];
    if (!row) {
      return jsonError(404, "not_found", "Analysis not found.");
    }
    if (row.user_id !== user.id) {
      return jsonError(403, "forbidden", "You do not have permission to delete this analysis.");
    }

    await query("DELETE FROM analyses WHERE id = $1 AND user_id = $2", [analysisId, user.id]);
    await logAudit({
      userId: user.id,
      action: "data_deleted",
      target: `analysis:${analysisId}`,
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ deleted: true, id: analysisId });
  } catch (err) {
    return handleRouteError(err);
  }
}
