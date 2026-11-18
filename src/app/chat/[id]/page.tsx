"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/conversations/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setConversation(d.conversation);
          setMessages(d.messages || []);
        }
      });
  }, [id]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    const msg = input.trim();
    setInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id, message: msg }),
      });
      if (res.ok) {
        const updated = await fetch(`/api/conversations/${id}`).then((r) => r.json());
        setMessages(updated.messages || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/chat");
  }

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-serif font-bold text-[#0b1f33]">
          {conversation?.title || "Legal Conversation"}
        </h1>
        <button
          type="button"
          onClick={handleDelete}
          className="px-3 py-1 rounded border border-rose-300 text-rose-700 text-xs font-medium"
        >
          Delete Conversation
        </button>
      </div>

      <div className="space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-xl text-sm ${
              m.role === "user"
                ? "bg-[#0b1f33] text-white ml-12"
                : "bg-slate-50 border border-slate-200 mr-12 text-slate-800"
            }`}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
            {Array.isArray(m.citations) && m.citations.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap gap-2">
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
        ))}
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a follow-up question..."
          className="flex-1 px-3 py-2 rounded border border-slate-300 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-amber-600 text-white text-sm font-semibold"
        >
          Send
        </button>
      </form>
    </div>
  );
}
