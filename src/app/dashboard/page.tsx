"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const [me, setMe] = useState<any>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/analyses").then((r) => (r.ok ? r.json() : { analyses: [] })),
    ])
      .then(([meData, anaData]) => {
        setMe(meData);
        setAnalyses(anaData?.analyses || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-sm text-slate-600">Loading dashboard...</div>;
  }

  const user = me?.user;
  const quota = me?.quota;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#0b1f33]">
            Welcome{user?.fullName ? `, ${user.fullName}` : " to Juris AI"}
          </h1>
          <p className="text-sm text-slate-600">
            Role: <span className="font-semibold uppercase">{user?.role || "guest"}</span>
            {user?.organisation ? ` · ${user.organisation}` : ""}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/analyze"
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold"
          >
            + New Contract Analysis
          </Link>
          <Link
            href="/chat"
            className="px-4 py-2 rounded-lg bg-[#0b1f33] hover:bg-[#102a43] text-white text-sm font-medium"
          >
            Open Legal Chat
          </Link>
        </div>
      </div>

      {/* Quota Usage Cards */}
      {quota && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">
              Monthly Contract Analyses Quota
            </div>
            <div className="mt-2 text-2xl font-bold text-[#0b1f33]">
              {quota.analysesUsedThisMonth} / {quota.analysesLimitPerMonth}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Non-failed analyses performed this calendar month
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="text-xs font-semibold uppercase text-slate-500">
              Daily Legal Chat Quota
            </div>
            <div className="mt-2 text-2xl font-bold text-[#0b1f33]">
              {quota.chatUsedToday} / {quota.chatLimitPerDay}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Questions submitted today across all conversations
            </p>
          </div>
        </div>
      )}

      {/* Recent Analyses */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif font-bold text-[#0b1f33]">Recent Contract Analyses</h2>
          <Link href="/history" className="text-xs font-semibold text-[#0b1f33] underline">
            View Full History →
          </Link>
        </div>
        {analyses.length === 0 ? (
          <p className="text-sm text-slate-500">
            No analyses yet. Click &ldquo;New Contract Analysis&rdquo; to test the sample distribution agreement or upload your own contract.
          </p>
        ) : (
          <div className="divide-y divide-slate-200">
            {analyses.slice(0, 6).map((a) => (
              <div key={a.id} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <Link
                    href={`/analyses/${a.id}`}
                    className="font-semibold text-sm text-[#0b1f33] hover:underline"
                  >
                    {a.docName}
                  </Link>
                  <div className="text-xs text-slate-500">
                    Status: <span className="font-medium uppercase">{a.status}</span> · Jurisdictions:{" "}
                    {(a.jurisdictions || []).join(", ")} · Risks: {a.risksCount}
                  </div>
                </div>
                <Link
                  href={`/analyses/${a.id}`}
                  className="px-3 py-1 rounded border border-slate-300 text-xs font-medium hover:bg-slate-50"
                >
                  View Report
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
