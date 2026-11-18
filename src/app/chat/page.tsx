"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Sidebar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <button
          type="button"
          onClick={() => {
            setActiveConvId(null);
            setMessages([]);
          }}
          className="w-full py-2 rounded bg-[#0b1f33] text-white text-xs font-semibold"
        >
          + New Chat
        </button>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            Attach Analysis Context (Optional)
          </label>
          <select
            value={selectedAnalysisId}
            onChange={(e) => setSelectedAnalysisId(e.target.value)}
            className="w-full px-2 py-1.5 rounded border border-slate-300 text-xs bg-white"
          >
            <option value="">None</option>
            {analyses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.docName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-semibold uppercase text-slate-500">Conversations</div>
          {conversations.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-1">
              <button
                type="button"
                onClick={() => loadConversation(c.id)}
                className={`text-left text-xs px-2 py-1.5 rounded flex-1 truncate ${
                  activeConvId === c.id ? "bg-amber-100 font-bold text-[#0b1f33]" : "hover:bg-slate-100"
                }`}
              >
                {c.title}
              </button>
              <Link
                href={`/chat/${c.id}`}
                className="text-[10px] text-slate-400 hover:text-slate-700 px-1"
              >
                ↗
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div className="md:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col min-h-[520px]">
        <h1 className="text-xl font-serif font-bold text-[#0b1f33] mb-4">
          Juris AI Multi-Jurisdictional Legal Research Chat
        </h1>

        {error && (
          <div className="p-3 mb-4 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {error}
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto mb-4">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">
              Ask any question on Bangladesh (`BD`), United States (`US`), or European Union (`EU`) competition and commercial contract law.
            </p>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl text-sm ${
                  m.role === "user"
                    ? "bg-[#0b1f33] text-white ml-12"
                    : "bg-slate-50 border border-slate-200 mr-12 text-slate-800"
                }`}
              >
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
                {Array.isArray(m.citations) && m.citations.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap gap-2">
                    {m.citations.map((c: any, ci: number) => (
                      <span
                        key={ci}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                          c.status === "verified"
                            ? "bg-emerald-700 text-white"
                            : c.status === "found_in_corpus"
                            ? "bg-amber-600 text-white"
                            : "bg-rose-700 text-white"
                        }`}
                      >
                        {c.citation_string} ({c.status})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about resale price maintenance, s.27 non-competes, VBER Art. 4..."
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm"
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
}
