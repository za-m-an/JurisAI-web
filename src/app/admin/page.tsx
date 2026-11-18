"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStats(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-600">Loading admin overview...</div>;
  }

  if (!stats) {
    return <div className="text-sm text-rose-700">Administrator access required.</div>;
  }

  const roles = stats.usersByRole || {};
  const counts = stats.analysesCounts || {};
  const rag = stats.ragStatus || {};

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0b1f33]">
            Juris AI Administration Console
          </h1>
          <p className="text-xs text-slate-500">
            Privacy-by-design administration: user contract contents and chat messages are never accessible to admins.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <Link href="/admin/users" className="px-3 py-1.5 rounded bg-[#0b1f33] text-white">
            Manage Users
          </Link>
          <Link href="/admin/integrations" className="px-3 py-1.5 rounded bg-amber-600 text-white">
            Integrations (RAG)
          </Link>
          <Link
            href="/admin/settings"
            className="px-3 py-1.5 rounded border border-slate-300 bg-white"
          >
            Quotas & Settings
          </Link>
          <Link
            href="/admin/audit"
            className="px-3 py-1.5 rounded border border-slate-300 bg-white"
          >
            Audit Log
          </Link>
        </div>
      </div>

      {/* Users by Role & Analyses Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-500">Users by Role</div>
          <div className="mt-2 text-xs space-y-1">
            <div>Admin: <strong>{roles.admin ?? 0}</strong></div>
            <div>Business: <strong>{roles.business ?? 0}</strong></div>
            <div>Common: <strong>{roles.common ?? 0}</strong></div>
            <div>Lawyer (Reserved): <strong>{roles.lawyer ?? 0}</strong></div>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-500">
            Analyses Volume (24h / 7d / 30d)
          </div>
          <div className="mt-2 text-2xl font-bold text-[#0b1f33]">
            {counts.last24h ?? 0} / {counts.last7d ?? 0} / {counts.last30d ?? 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Total all-time: {counts.total ?? 0}</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-500">Analysis Failure Rate</div>
          <div className="mt-2 text-2xl font-bold text-[#0b1f33]">
            {((stats.failureRate || 0) * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">Across all submitted jobs</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs uppercase font-semibold text-slate-500">Avg RAG Analysis Time</div>
          <div className="mt-2 text-2xl font-bold text-[#0b1f33]">
            {stats.avgAnalysisMs || 0} ms
          </div>
          <div className="text-xs text-slate-500 mt-1">End-to-end RAG pipeline</div>
        </div>
      </div>

      {/* RAG Service Status Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-serif font-bold text-[#0b1f33]">
            RAG Service Live Status (`GET /health`)
          </h2>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              rag.reachable ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}
          >
            {rag.reachable ? `ONLINE (${rag.latencyMs} ms)` : "UNREACHABLE"}
          </span>
        </div>
        {rag.reachable ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-700">
            <div>
              <strong>Version:</strong> {rag.version} · <strong>Mock Mode:</strong>{" "}
              {String(rag.mock)} · <strong>Embeddings:</strong> {rag.embeddings}
            </div>
            <div>
              <strong>Total Corpus Docs:</strong> {rag.corpus?.documents ?? 0} (Full-text:{" "}
              {rag.corpus?.full_text_documents ?? 0})
            </div>
            <div>
              <strong>By Jurisdiction:</strong> BD: {rag.corpus?.by_jurisdiction?.BD ?? 0} · US:{" "}
              {rag.corpus?.by_jurisdiction?.US ?? 0} · EU: {rag.corpus?.by_jurisdiction?.EU ?? 0}
            </div>
          </div>
        ) : (
          <p className="text-xs text-rose-700">{rag.error || "RAG service unreachable"}</p>
        )}
      </div>
    </div>
  );
}
