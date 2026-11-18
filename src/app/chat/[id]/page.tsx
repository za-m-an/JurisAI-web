"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge, Button } from "@/components/ui/primitives";

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
    if (!confirm("Delete this conversation thread?")) return;
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/chat");
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div className="bg-white border border-hairline rounded-lg p-5 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/chat" className="text-xs text-ink-muted hover:text-ink">
              ← Back to Chat
            </Link>
            <span className="text-hairline">·</span>
            <h1 className="font-serif text-lg font-bold text-ink">
              {conversation?.title || "Legal Research Thread"}
            </h1>
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Created on {conversation ? new Date(conversation.createdAt).toLocaleDateString() : "..."}
          </p>
        </div>

        <Button variant="danger" size="sm" onClick={handleDelete}>
          Delete Thread
        </Button>
      </div>

      <div className="bg-white border border-hairline rounded-lg p-6 shadow-subtle space-y-4">
        <div className="space-y-4 min-h-[360px]">
          {messages.map((m, idx) => (
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
          ))}
        </div>

        <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-hairline">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up question on these provisions..."
            className="flex-1 px-3.5 py-2 bg-white border border-hairline rounded-md text-xs text-ink placeholder:text-ink-subtle shadow-subtle focus:border-accent"
          />
          <Button type="submit" variant="primary" size="md" disabled={loading}>
            {loading ? "Sending..." : "Send"}
          </Button>
        </form>
      </div>
    </div>
  );
}
