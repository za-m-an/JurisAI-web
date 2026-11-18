"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetch("/api/analyses")
      .then((r) => (r.ok ? r.json() : { analyses: [] }))
      .then((d) => setAnalyses(d.analyses || []));
    fetch("/api/conversations")
      .then((r) => (r.ok ? r.json() : { conversations: [] }))
      .then((d) => setConversations(d.conversations || []));
  }, []);

  async function deleteAnalysis(id: string) {
    const res = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
    if (res.ok) setAnalyses((prev) => prev.filter((a) => a.id !== id));
  }

  async function deleteConversation(id: string) {
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (res.ok) setConversations((prev) => prev.filter((c) => c.id !== id));
  }

  const q = searchTerm.toLowerCase();
  const filteredAnalyses = analyses.filter(
    (a) =>
      (a.docName || "").toLowerCase().includes(q) ||
      (a.summary || "").toLowerCase().includes(q)
  );
  const filteredConvs = conversations.filter((c) =>
    (c.title || "").toLowerCase().includes(q)
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-serif font-bold text-[#0b1f33]">
          Analyses & Conversations History
        </h1>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by document name or topic..."
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm w-full sm:w-72 bg-white"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-serif font-bold text-[#0b1f33]">
            Contract Analyses ({filteredAnalyses.length})
          </h2>
          <div className="divide-y divide-slate-200">
            {filteredAnalyses.map((a) => (
              <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <Link
                    href={`/analyses/${a.id}`}
                    className="text-sm font-semibold text-[#0b1f33] hover:underline"
                  >
                    {a.docName}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {a.status} · {(a.jurisdictions || []).join(", ")}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteAnalysis(a.id)}
                  className="text-xs text-rose-700 hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-lg font-serif font-bold text-[#0b1f33]">
            Legal Chat Conversations ({filteredConvs.length})
          </h2>
          <div className="divide-y divide-slate-200">
            {filteredConvs.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                <Link
                  href={`/chat/${c.id}`}
                  className="text-sm font-semibold text-[#0b1f33] hover:underline"
                >
                  {c.title}
                </Link>
                <button
                  type="button"
                  onClick={() => deleteConversation(c.id)}
                  className="text-xs text-rose-700 hover:underline"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
