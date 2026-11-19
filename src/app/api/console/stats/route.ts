import { NextRequest, NextResponse } from "next/server";
import { adminJsonResponse, requireAdminConsole } from "@/lib/admin-auth";
import { ensureMigrated, query } from "@/lib/db";
import { handleRouteError } from "@/lib/http-error";
import { cleanupStuckAnalyses } from "@/lib/quota";
import { ragHealth } from "@/lib/rag-client";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    await ensureMigrated();
    await requireAdminConsole(req);
    await cleanupStuckAnalyses();

    const rolesRes = await query<{ role: string; cnt: string | number }>(
      "SELECT role, COUNT(*) AS cnt FROM users GROUP BY role"
    );
    const usersByRole: Record<string, number> = {
      admin: 0,
      business: 0,
      common: 0,
      lawyer: 0,
    };
    for (const r of rolesRes.rows) {
      usersByRole[r.role] = Number(r.cnt || 0);
    }

    const now = Date.now();
    const t24h = new Date(now - 24 * 3600 * 1000).toISOString();
    const t7d = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
    const t30d = new Date(now - 30 * 24 * 3600 * 1000).toISOString();

    const c24 = await query<{ cnt: number | string }>(
      "SELECT COUNT(*) AS cnt FROM analyses WHERE created_at >= $1",
      [t24h]
    );
    const c7 = await query<{ cnt: number | string }>(
      "SELECT COUNT(*) AS cnt FROM analyses WHERE created_at >= $1",
      [t7d]
    );
    const c30 = await query<{ cnt: number | string }>(
      "SELECT COUNT(*) AS cnt FROM analyses WHERE created_at >= $1",
      [t30d]
    );

    const statusRes = await query<{ status: string; cnt: number | string }>(
      "SELECT status, COUNT(*) AS cnt FROM analyses GROUP BY status"
    );
    let totalAnalyses = 0;
    let failedAnalyses = 0;
    for (const sr of statusRes.rows) {
      const c = Number(sr.cnt || 0);
      totalAnalyses += c;
      if (sr.status === "failed") failedAnalyses += c;
    }
    const failureRate = totalAnalyses > 0 ? Number((failedAnalyses / totalAnalyses).toFixed(4)) : 0;

    const timingsRes = await query<{ rag_timings: any }>(
      "SELECT rag_timings FROM analyses WHERE status = 'done' AND rag_timings IS NOT NULL LIMIT 200"
    );
    let totalTime = 0;
    let countTime = 0;
    for (const tr of timingsRes.rows) {
      const tt = tr.rag_timings?.total_time ?? tr.rag_timings?.total;
      if (typeof tt === "number") {
        totalTime += tt;
        countTime += 1;
      }
    }
    const averageAnalysisTimeSeconds =
      countTime > 0 ? Number((totalTime / countTime).toFixed(2)) : 0;

    let rag = {
      reachable: false,
      status: "unreachable",
      mock: true,
      latencyMs: 0,
      corpus: null as any,
      modelInfo: null as any,
      version: null as any,
    };
    try {
      const rh = await ragHealth();
      rag = {
        reachable: true,
        status: rh.health.status,
        mock: rh.health.mock,
        latencyMs: rh.latencyMs,
        corpus: rh.health.corpus,
        modelInfo: {
          embeddings: rh.health.embeddings,
        },
        version: rh.health.version,
      };
    } catch {
      // Offline RAG fallback
    }

    // Per-user token usage analytics
    const tokenUsageRes = await query<{
      id: string;
      email: string;
      full_name: string;
      role: string;
      organisation: string | null;
      analyses_count: number | string;
      total_tokens: number | string;
      input_tokens: number | string;
      output_tokens: number | string;
      last_analysis_at: string | null;
    }>(
      `SELECT 
         u.id, 
         u.email, 
         u.full_name, 
         u.role, 
         u.organisation,
         COUNT(a.id)::int AS analyses_count,
         COALESCE(SUM(a.total_tokens), 0)::int AS total_tokens,
         COALESCE(SUM(a.input_tokens), 0)::int AS input_tokens,
         COALESCE(SUM(a.output_tokens), 0)::int AS output_tokens,
         MAX(a.created_at) AS last_analysis_at
       FROM users u
       LEFT JOIN analyses a ON a.user_id = u.id AND a.status = 'done'
       GROUP BY u.id, u.email, u.full_name, u.role, u.organisation
       ORDER BY total_tokens DESC
       LIMIT 50`
    );

    const grandTokensRes = await query<{
      grand_total_tokens: number | string;
      grand_input_tokens: number | string;
      grand_output_tokens: number | string;
    }>(
      `SELECT 
         COALESCE(SUM(total_tokens), 0)::int as grand_total_tokens,
         COALESCE(SUM(input_tokens), 0)::int as grand_input_tokens,
         COALESCE(SUM(output_tokens), 0)::int as grand_output_tokens
       FROM analyses WHERE status = 'done'`
    );

    const grandTotal = Number(grandTokensRes.rows[0]?.grand_total_tokens || 0);
    const grandInput = Number(grandTokensRes.rows[0]?.grand_input_tokens || 0);
    const grandOutput = Number(grandTokensRes.rows[0]?.grand_output_tokens || 0);
    // Standard blended cost estimation (~$3/M input, ~$15/M output)
    const estimatedCostUsd = Number(
      ((grandInput / 1_000_000) * 3.0 + (grandOutput / 1_000_000) * 15.0).toFixed(4)
    );

    return adminJsonResponse({
      usersByRole,
      analyses: {
        last24Hours: Number(c24.rows[0]?.cnt || 0),
        last7Days: Number(c7.rows[0]?.cnt || 0),
        last30Days: Number(c30.rows[0]?.cnt || 0),
        total: totalAnalyses,
        failureRate,
        averageAnalysisTimeSeconds,
      },
      tokens: {
        totalTokens: grandTotal,
        inputTokens: grandInput,
        outputTokens: grandOutput,
        estimatedCostUsd,
        tokenOptimizationEnabled: true,
        perUser: tokenUsageRes.rows.map((r) => ({
          id: r.id,
          email: r.email,
          fullName: r.full_name,
          role: r.role,
          organisation: r.organisation,
          analysesCount: Number(r.analyses_count || 0),
          totalTokens: Number(r.total_tokens || 0),
          inputTokens: Number(r.input_tokens || 0),
          outputTokens: Number(r.output_tokens || 0),
          lastAnalysisAt: r.last_analysis_at,
          estimatedCostUsd: Number(
            (
              (Number(r.input_tokens || 0) / 1_000_000) * 3.0 +
              (Number(r.output_tokens || 0) / 1_000_000) * 15.0
            ).toFixed(4)
          ),
        })),
      },
      rag,
      system: {
        environment: process.env.NODE_ENV || "development",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    return handleRouteError(err, true);
  }
}
