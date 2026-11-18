"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  EmptyState,
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/primitives";

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [tab, setTab] = useState<"analyses" | "chats">("analyses");

  useEffect(() => {
    fetch("/api/analyses")
      .then((r) => (r.ok ? r.json() : { analyses: [] }))
      .then((d) => setAnalyses(d.analyses || []));
    fetch("/api/conversations")
      .then((r) => (r.ok ? r.json() : { conversations: [] }))
      .then((d) => setConversations(d.conversations || []));
  }, []);

  async function deleteAnalysis(id: string) {
    if (!confirm("Delete this analysis record?")) return;
    const res = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
    if (res.ok) setAnalyses((prev) => prev.filter((a) => a.id !== id));
  }

  async function deleteConversation(id: string) {
    if (!confirm("Delete this chat conversation?")) return;
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
    <div className="max-w-6xl mx-auto py-6 space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
            Archive & Research History
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Browse, review, and manage past contract analyses and legal chat conversations.
          </p>
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by title or keywords..."
          className="px-3.5 py-2 bg-white border border-hairline rounded-md text-xs text-ink placeholder:text-ink-subtle shadow-subtle focus:border-accent w-full sm:w-72"
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-hairline text-xs font-semibold">
        <button
          type="button"
          onClick={() => setTab("analyses")}
          className={`px-4 py-2 border-b-2 transition-all -mb-px ${
            tab === "analyses"
              ? "border-[#7B1E22] text-[#7B1E22]"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Contract Analyses ({filteredAnalyses.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("chats")}
          className={`px-4 py-2 border-b-2 transition-all -mb-px ${
            tab === "chats"
              ? "border-[#7B1E22] text-[#7B1E22]"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          Legal Chats ({filteredConvs.length})
        </button>
      </div>

      {/* Tab 1: Analyses */}
      {tab === "analyses" && (
        <div className="space-y-4">
          {filteredAnalyses.length === 0 ? (
            <EmptyState
              title="No analyses found"
              description="No saved contract analyses match your search criteria."
              action={
                <Link href="/analyze">
                  <Button variant="primary" size="sm">
                    New Analysis
                  </Button>
                </Link>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <tr>
                  <th className="p-3">Document Title</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Jurisdictions</th>
                  <th className="p-3">Risks</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </TableHeader>
              <tbody>
                {filteredAnalyses.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/analyses/${a.id}`}
                        className="text-ink font-semibold hover:text-accent hover:underline"
                      >
                        {a.docName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          a.status === "completed"
                            ? "verified"
                            : a.status === "failed"
                            ? "unverified"
                            : "neutral"
                        }
                        className="uppercase text-[10px]"
                      >
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {(a.jurisdictions || []).map((j: string) => (
                          <span
                            key={j}
                            className="px-1.5 py-0.5 rounded bg-paper-warm border border-hairline text-[10px] font-mono text-ink-muted"
                          >
                            {j}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{a.risksCount || 0}</TableCell>
                    <TableCell className="text-ink-muted text-[11px]">
                      {new Date(a.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Link href={`/analyses/${a.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAnalysis(a.id)}
                        className="text-rose-700 hover:text-rose-800"
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}

      {/* Tab 2: Chats */}
      {tab === "chats" && (
        <div className="space-y-4">
          {filteredConvs.length === 0 ? (
            <EmptyState
              title="No chat threads found"
              description="No legal research conversations match your search query."
              action={
                <Link href="/chat">
                  <Button variant="primary" size="sm">
                    Start New Chat
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="bg-white border border-hairline rounded-lg divide-y divide-hairline shadow-subtle">
              {filteredConvs.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between gap-4 hover:bg-paper-warm/50 transition-colors">
                  <div>
                    <Link
                      href={`/chat/${c.id}`}
                      className="font-serif font-bold text-sm text-ink hover:text-accent hover:underline"
                    >
                      {c.title}
                    </Link>
                    <div className="text-[11px] text-ink-subtle mt-0.5">
                      Updated {new Date(c.updatedAt).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/chat/${c.id}`}>
                      <Button variant="outline" size="sm">
                        Open Thread
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteConversation(c.id)}
                      className="text-rose-700 hover:text-rose-800"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
