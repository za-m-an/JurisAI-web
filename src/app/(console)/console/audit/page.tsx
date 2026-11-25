"use client";

import React, { useEffect, useState } from "react";

export default function ConsoleAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/console/audit")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.logs) setLogs(d.logs);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-xs font-mono uppercase text-[#B4B0C2]">
        Loading Activity...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="border-b border-[#2E2B44] pb-5">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#D6A86E]">
          Compliance Ledger
        </span>
        <h1 className="text-3xl font-serif font-light text-[#F2EFE9]">
          Platform Activity Log
        </h1>
      </div>

      <div className="vellum-card rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#2E2B44] bg-[#131220] text-[10px] font-mono uppercase tracking-wider text-[#B4B0C2]">
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-5">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2B44]">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-[#222036]/60">
                  <td className="py-3 px-5 font-mono text-[11px] text-[#B4B0C2]">
                    {new Date(l.createdAt).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-medium text-[#F2EFE9]">{l.action}</td>
                  <td className="py-3 px-5 font-mono text-[11px] text-[#B4B0C2]">
                    {l.target || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
