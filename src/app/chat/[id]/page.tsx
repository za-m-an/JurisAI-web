"use client";

import React, { useEffect, useRef, useState } from "react";
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
  const [mode, setMode] = useState<"conversational" | "memorandum">("conversational");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      setAttachedFile(files[0]);
      setMode("memorandum");
      setError(null);
    }
  }

  function removeAttachedFile() {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setMode("conversational");
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!input.trim() && !attachedFile) return;

    setError(null);
    setLoading(true);

    const userText = input.trim();
    const currentFile = attachedFile;
    const currentMode = mode;

    setInput("");
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const displayMsg = currentFile
      ? `📎 [Attached: ${currentFile.name}]\n\n${userText || "Please analyze this agreement and review statutory risks."}`
      : userText;

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: displayMsg,
        citations: [],
      },
    ]);

    try {
      let res: Response;
      if (currentFile) {
        const formData = new FormData();
        formData.append("file", currentFile);
        formData.append("message", userText);
        formData.append("mode", currentMode);
        formData.append("conversationId", id);

        res = await fetch("/api/chat", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: id,
            message: userText,
            mode: currentMode,
          }),
        });
      }

      if (res.ok) {
        const updated = await fetch(`/api/conversations/${id}`).then((r) => r.json());
        setMessages(updated.messages || []);
      } else {
        const data = await res.json();
        setError(data.message || "Failed to send message.");
      }
    } catch {
      setError("Network error while communicating with Juris AI.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to permanently delete this research thread?")) return;
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/chat");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-hairline rounded-lg p-5 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/chat"
              className="text-xs text-ink-muted hover:text-ink font-medium transition-colors"
            >
              ← Back to Copilot
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

        <Button variant="danger" size="sm" onClick={handleDelete} className="text-xs">
          Delete Thread
        </Button>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-white border border-hairline rounded-lg p-5 sm:p-6 shadow-subtle flex flex-col min-h-[560px]">
        {error && (
          <div className="p-3 mb-4 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {error}
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 space-y-4 overflow-y-auto mb-4 pr-1 max-h-[480px]">
          {messages.map((m, idx) => {
            const isUser = m.role === "user";
            const isAttached = isUser && m.content.startsWith("📎 [Attached:");
            const isMemo =
              !isUser &&
              (m.content.includes("### Legal Advisory Memorandum") ||
                m.content.includes("Advisory Memorandum"));

            return (
              <div
                key={idx}
                className={`p-4 rounded-lg text-xs sm:text-sm leading-relaxed transition-all ${
                  isUser
                    ? "bg-[#f5f2eb] border border-hairline text-ink ml-6 sm:ml-16 shadow-sm"
                    : "bg-white border border-hairline mr-6 sm:mr-16 text-ink shadow-subtle"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                        isUser
                          ? "bg-slate-200 text-slate-800"
                          : isMemo
                          ? "bg-rose-100 text-[#7B1E22]"
                          : "bg-blue-100 text-[#0b1f33]"
                      }`}
                    >
                      {isUser
                        ? "Client Inquiry"
                        : isMemo
                        ? "Advisory Memorandum"
                        : "Juris AI Copilot"}
                    </span>
                    {isAttached && (
                      <span className="text-[10px] font-mono text-ink-subtle">
                        [Document Attached]
                      </span>
                    )}
                  </div>
                </div>

                <div className="prose prose-sm max-w-none text-ink font-serif leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>

                {Array.isArray(m.citations) && m.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-hairline flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mr-1">
                      Verified Authorities:
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
            );
          })}

          {loading && (
            <div className="p-4 rounded-lg bg-white border border-hairline mr-6 sm:mr-16 shadow-subtle flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
              <div className="text-xs text-ink-muted font-medium">
                {attachedFile || mode === "memorandum"
                  ? "Cross-referencing statutory authorities and compiling memorandum..."
                  : "Consulting legal corpus and formulating response..."}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Unified Chat Input Box Container (With Attachment Button Inside) */}
        <div className="border border-hairline rounded-xl bg-slate-50/70 p-3 shadow-sm focus-within:border-accent focus-within:ring-1 focus-within:ring-accent transition-all">
          {/* Top Toolbar Inside Chat Box: Mode Selector Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-hairline/60">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted mr-1">
                AI Mode:
              </span>
              <button
                type="button"
                onClick={() => setMode("conversational")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  mode === "conversational"
                    ? "bg-white text-ink shadow-sm border border-hairline font-bold"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                💬 Conversational Copilot
              </button>
              <button
                type="button"
                onClick={() => setMode("memorandum")}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  mode === "memorandum"
                    ? "bg-[#7B1E22] text-white shadow-sm border border-[#7B1E22] font-bold"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                📜 Deep Legal Memorandum
              </button>
            </div>

            {attachedFile && (
              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Zero File Retention Active
              </span>
            )}
          </div>

          {/* Attached File Preview Tag (Inside the chat box) */}
          {attachedFile && (
            <div className="mb-2 p-2 rounded-lg bg-white border border-accent/30 flex items-center justify-between text-xs shadow-sm">
              <div className="flex items-center gap-2 truncate mr-2">
                <span className="w-6 h-6 rounded bg-rose-50 border border-rose-200 text-[#7B1E22] flex items-center justify-center font-mono text-xs font-bold shrink-0">
                  📄
                </span>
                <div className="truncate">
                  <span className="font-semibold text-ink truncate block">{attachedFile.name}</span>
                  <span className="text-[10px] text-ink-muted">
                    {(attachedFile.size / 1024).toFixed(1)} KB · In-Memory Analysis
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={removeAttachedFile}
                className="text-ink-muted hover:text-rose-600 font-bold px-2 py-1 text-xs rounded hover:bg-slate-100"
                title="Remove attachment"
              >
                ✕ Remove
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf,.docx,.txt"
            className="hidden"
          />

          {/* Main Textarea */}
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              attachedFile
                ? "Enter instructions for analyzing this agreement (or click Send to begin)..."
                : mode === "conversational"
                ? "Ask any legal question, follow-up on provisions, or attach an agreement below..."
                : "Specify clauses or legal issues to analyze in this formal memorandum..."
            }
            className="w-full bg-transparent border-0 resize-none text-xs sm:text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-0 leading-relaxed"
          />

          {/* Bottom Action Bar Inside the Box */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-hairline/60">
            {/* Attachment Button Within the Chat Box */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-ink bg-white border border-hairline hover:bg-paper-warm hover:border-hairline-dark shadow-subtle transition-all"
                title="Attach contract (.pdf, .docx, .txt) for in-memory analysis"
              >
                <span className="text-base leading-none">📎</span>
                <span className="font-medium">
                  {attachedFile ? "Change Agreement" : "Attach Agreement"}
                </span>
              </button>
              <span className="text-[10px] text-ink-subtle hidden sm:inline">
                PDF, DOCX, TXT (up to 4MB)
              </span>
            </div>

            {/* Send Button */}
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={loading || (!input.trim() && !attachedFile)}
              onClick={() => handleSend()}
              className="px-4 py-1.5 text-xs font-semibold"
            >
              {loading
                ? "Analyzing..."
                : attachedFile
                ? "Analyze Agreement →"
                : mode === "conversational"
                ? "Send Message →"
                : "Generate Memorandum →"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
