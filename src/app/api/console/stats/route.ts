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
