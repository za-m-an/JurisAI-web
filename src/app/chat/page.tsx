"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge, Button, Input } from "@/components/ui/primitives";

export default function ChatPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>("");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => (r.ok ? r.json() : { conversations: [] }))
      .then((d) => setConversations(d.conversations || []));
    fetch("/api/analyses")
      .then((r) => (r.ok ? r.json() : { analyses: [] }))
      .then((d) => setAnalyses(d.analyses || []));
  }, []);

  async function loadConversation(convId: string) {
    setActiveConvId(convId);
    const res = await fetch(`/api/conversations/${convId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setError(null);
    setLoading(true);
    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage, citations: [] }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId,
          message: userMessage,
          analysisId: selectedAnalysisId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Chat request failed.");
        return;
      }
      setActiveConvId(data.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer_markdown,
          citations: data.citations || [],
        },
      ]);
      const listRes = await fetch("/api/conversations");
      if (listRes.ok) {
        const listData = await listRes.json();
        setConversations(listData.conversations || []);
      }
    } catch {
      setError("Network error while sending message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Conversations & Analysis Context */}
        <div className="md:col-span-4 bg-white border border-hairline rounded-lg p-4 shadow-subtle space-y-4">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setActiveConvId(null);
              setMessages([]);
            }}
            className="w-full"
          >
            + New Research Thread
          </Button>

          <div className="space-y-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Attach Contract Context
            </label>
            <select
              value={selectedAnalysisId}
              onChange={(e) => setSelectedAnalysisId(e.target.value)}
              className="w-full px-3 py-1.5 bg-white border border-hairline rounded text-xs text-ink shadow-subtle focus:border-accent"
            >
              <option value="">No Attached Agreement</option>
              {analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.docName}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-ink-subtle">
              Provides the assistant with extracted risk context and governing law.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-hairline">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Conversations ({conversations.length})
            </div>
            {conversations.length === 0 ? (
              <p className="text-xs text-ink-subtle">No saved threads yet.</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {conversations.map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => loadConversation(c.id)}
                      className={`text-left text-xs px-2.5 py-1.5 rounded flex-1 truncate transition-colors ${
                        activeConvId === c.id
                          ? "bg-paper-warm text-[#7B1E22] font-semibold border border-hairline"
                          : "text-ink hover:bg-paper-warm/50"
                      }`}
                    >
                      {c.title}
                    </button>
                    <Link
                      href={`/chat/${c.id}`}
                      className="text-[10px] text-ink-muted hover:text-ink px-1.5 py-1 rounded"
                    >
                      ↗
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Chat Area */}
        <div className="md:col-span-8 bg-white border border-hairline rounded-lg p-6 shadow-subtle flex flex-col min-h-[560px]">
          <div className="border-b border-hairline pb-4 mb-4">
            <h1 className="font-serif text-xl font-bold text-ink">
              Multi-Jurisdictional Legal Research Chat
            </h1>
            <p className="text-xs text-ink-muted mt-0.5">
              Ask statutory questions spanning Bangladesh, US antitrust, and EU competition frameworks.
            </p>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex-1 space-y-4 overflow-y-auto mb-4 pr-1">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-10 h-10 rounded-full bg-paper-warm border border-hairline flex items-center justify-center font-serif text-lg text-accent">
                  §
                </div>
                <div className="font-serif text-base font-bold text-ink">
                  Ask a Cross-Border Statutory Question
                </div>
                <p className="text-xs text-ink-muted max-w-md leading-relaxed">
                  e.g., &ldquo;Is resale price maintenance strictly prohibited under Bangladesh Competition Act 2012, and how does that compare to the Leegin standard under US federal law?&rdquo;
                </p>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg text-xs sm:text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-paper-warm border border-hairline text-ink ml-8 sm:ml-16"
                      : "bg-white border border-hairline mr-8 sm:mr-16 text-ink shadow-subtle"
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-ink-muted tracking-wider mb-1.5">
                    {m.role === "user" ? "Inquiry" : "Advisory Memorandum"}
                  </div>
                  <div className="prose prose-sm max-w-none text-ink font-serif">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>

                  {Array.isArray(m.citations) && m.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-hairline flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mr-1">
                        Authorities:
                      </span>
                      {m.citations.map((c: any, ci: number) => (
                        <Badge
                          key={ci}
                          variant={
                            c.status === "verified"
                              ? "verified"
                              : c.status === "found_in_corpus"
                              ? "corpus"
                              : "unverified"
                          }
                          className="text-[10px]"
                        >
                          {c.citation_string} ({c.status})
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSend} className="flex gap-2 pt-2 border-t border-hairline">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about Section 27 non-competes, VBER Art. 4 hardcore restrictions, UCC 2-302..."
              className="flex-1 px-3.5 py-2 bg-white border border-hairline rounded-md text-xs text-ink placeholder:text-ink-subtle shadow-subtle focus:border-accent"
            />
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
            >
              {loading ? "Researching..." : "Send Query"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
