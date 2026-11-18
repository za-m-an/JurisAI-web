"use client";

import React, { useEffect, useState } from "react";

export default function ConsoleAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");

  async function loadLogs() {
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    if (userFilter) params.set("userId", userFilter);
    if (fromFilter) params.set("from", fromFilter);
    const res = await fetch(`/api/console/audit?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs || []);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-lg font-mono font-bold text-slate-900 tracking-tight">
            Security &amp; Operational Audit Trail
          </h1>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Immutable log of all user registrations, logins, rate limits, profile edits, and console modifications.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Action (e.g. login_success)"
            className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs focus:outline-none focus:border-slate-500"
          />
          <input
            type="text"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            placeholder="User UUID"
            className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs focus:outline-none focus:border-slate-500"
          />
          <input
            type="date"
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs focus:outline-none focus:border-slate-500"
          />
          <button
            type="button"
            onClick={loadLogs}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded transition-colors"
          >
            Apply Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
            <tr>
              <th className="p-3">Timestamp</th>
              <th className="p-3">Action</th>
              <th className="p-3">Target</th>
              <th className="p-3">User ID</th>
              <th className="p-3">Client IP</th>
              <th className="p-3">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50/50">
                <td className="p-3 text-slate-500 whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleString()}
                </td>
                <td className="p-3 font-semibold text-slate-900">
                  <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                    {l.action}
                  </span>
                </td>
                <td className="p-3 text-slate-700">{l.target || "—"}</td>
                <td className="p-3 text-slate-500">{l.userId || "anonymous"}</td>
                <td className="p-3 text-slate-500">{l.ip || "—"}</td>
                <td className="p-3 text-slate-600 max-w-xs truncate text-[11px]">
                  {JSON.stringify(l.meta)}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500 font-mono text-xs">
                  No matching audit entries recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
