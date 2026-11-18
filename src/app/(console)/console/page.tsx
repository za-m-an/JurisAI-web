"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function ConsoleOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/console/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-xs font-mono text-slate-500">Loading console metrics...</div>;
  }

  if (!stats) {
    return <div className="text-xs font-mono text-rose-600">Failed to load console statistics.</div>;
  }

  const roles = stats.usersByRole || {};
  const analyses = stats.analyses || {};
  const rag = stats.rag || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-mono font-bold text-slate-900 tracking-tight">
            System Status &amp; Telemetry
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Privacy-by-Design Admin: Customer contract bytes and chat records are cryptographically inaccessible.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/console/users"
            className="px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-mono rounded transition-colors"
          >
            Manage Users
          </Link>
          <Link
            href="/console/integrations"
            className="px-3 py-1.5 bg-slate-200 text-slate-800 hover:bg-slate-300 text-xs font-mono rounded transition-colors"
          >
            Integrations
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-500">Analyses (24h / 7d / 30d)</div>
          <div className="text-2xl font-mono font-bold text-slate-900">
            {analyses.last24Hours} / {analyses.last7Days} / {analyses.last30Days}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Total Lifetime: {analyses.total}</div>
        </div>

        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-500">Failure Rate</div>
          <div className={`text-2xl font-mono font-bold ${analyses.failureRate > 0.05 ? "text-rose-600" : "text-emerald-600"}`}>
            {(analyses.failureRate * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Avg Latency: {analyses.averageAnalysisTimeSeconds}s</div>
        </div>

        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-500">Total Registered Users</div>
          <div className="text-2xl font-mono font-bold text-slate-900">
            {Number(Object.values(roles).reduce((a: any, b: any) => Number(a) + Number(b), 0))}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Biz: {roles.business || 0} · Common: {roles.common || 0} · Admin: {roles.admin || 0}
          </div>
        </div>

        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-mono uppercase text-slate-500">RAG Engine Status</div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${rag.reachable ? "bg-emerald-500" : "bg-rose-500"}`} />
            <span className="text-lg font-mono font-bold text-slate-900">{rag.status || "Unknown"}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Latency: {rag.latencyMs}ms · Mode: {rag.mock ? "Mock (Simulated)" : "Production LLM"}
          </div>
        </div>
      </div>

      {/* RAG Corpus Telemetry Card */}
      <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase text-slate-600 tracking-wider">
          Statutory Corpus &amp; Embeddings Configuration
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="text-slate-500 text-[10px] uppercase">Jurisdictions Loaded</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              BD ({rag.corpus?.by_jurisdiction?.BD || 0}), US ({rag.corpus?.by_jurisdiction?.US || 0}), EU ({rag.corpus?.by_jurisdiction?.EU || 0})
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="text-slate-500 text-[10px] uppercase">Indexed Documents</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {rag.corpus?.total_documents || 0} docs ({rag.corpus?.full_text_chunks || 0} full text)
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="text-slate-500 text-[10px] uppercase">Embeddings Backend</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {rag.modelInfo?.embeddings_backend || "hash (deterministic)"}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="text-slate-500 text-[10px] uppercase">Analysis Engine</div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {rag.modelInfo?.analysis_model || "Mock Sonnet 3.5"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
