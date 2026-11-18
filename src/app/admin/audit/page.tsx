"use client";

import React, { useEffect, useState } from "react";

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");

  async function loadLogs() {
    const params = new URLSearchParams();
    if (actionFilter) params.set("action", actionFilter);
    if (userFilter) params.set("userId", userFilter);
    if (fromFilter) params.set("from", fromFilter);
    const res = await fetch(`/api/admin/audit?${params.toString()}`);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-serif font-bold text-[#0b1f33]">Security Audit Log</h1>
        <div className="flex flex-wrap gap-2 text-xs">
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder="Filter action (e.g. login_success)"
            className="px-3 py-1.5 rounded border border-slate-300 bg-white"
          />
          <input
            type="text"
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            placeholder="Filter user UUID"
            className="px-3 py-1.5 rounded border border-slate-300 bg-white"
          />
          <input
            type="date"
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            className="px-3 py-1.5 rounded border border-slate-300 bg-white"
          />
          <button
            type="button"
            onClick={loadLogs}
            className="px-4 py-1.5 rounded bg-[#0b1f33] text-white font-semibold"
          >
            Apply Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 uppercase">
            <tr>
              <th className="p-3">Time</th>
              <th className="p-3">Action</th>
              <th className="p-3">User ID</th>
              <th className="p-3">Target</th>
              <th className="p-3">IP</th>
              <th className="p-3">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="p-3 whitespace-nowrap">{l.createdAt}</td>
                <td className="p-3 font-semibold text-[#0b1f33]">{l.action}</td>
                <td className="p-3 font-mono text-[11px]">{l.userId || "null"}</td>
                <td className="p-3">{l.target || "—"}</td>
                <td className="p-3 font-mono">{l.ip || "—"}</td>
                <td className="p-3 font-mono text-[11px]">
                  {JSON.stringify(l.meta || {})}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
