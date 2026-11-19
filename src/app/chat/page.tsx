"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge, Button } from "@/components/ui/primitives";

export default function ChatPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>("");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"conversational" | "memorandum">("conversational");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [jurisdictions, setJurisdictions] = useState<string[]>(["BD", "US", "EU"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => (r.ok ? r.json() : { conversations: [] }))
      .then((d) => setConversations(d.conversations || []));
    fetch("/api/analyses")
      .then((r) => (r.ok ? r.json() : { analyses: [] }))
      .then((d) => setAnalyses(d.analyses || []));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function loadConversation(convId: string) {
    setActiveConvId(convId);
    setError(null);
    const res = await fetch(`/api/conversations/${convId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setAttachedFile(file);
      // Automatically toggle to memorandum mode when a contract is attached
      setMode("memorandum");
      setError(null);
    }
  }

  function removeAttachedFile() {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    // Switch back to conversational chatbot mode
    setMode("conversational");
  }

  function toggleJurisdiction(j: string) {
    setJurisdictions((prev) =>
      prev.includes(j)
        ? prev.length > 1
          ? prev.filter((item) => item !== j)
          : prev
        : [...prev, j]
    );
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

    // Optimistic user bubble
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
        formData.append("jurisdictions", JSON.stringify(jurisdictions));
        if (activeConvId) formData.append("conversationId", activeConvId);
        if (selectedAnalysisId) formData.append("analysisId", selectedAnalysisId);

        res = await fetch("/api/chat", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: activeConvId,
            message: userText,
            mode: currentMode,
            jurisdictions,
            analysisId: selectedAnalysisId || undefined,
          }),
        });
      }

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
          mode: data.mode,
        },
      ]);

      const listRes = await fetch("/api/conversations");
      if (listRes.ok) {
        const listData = await listRes.json();
        setConversations(listData.conversations || []);
      }
    } catch {
      setError("Network error while communicating with Juris AI.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sidebar: Threads & Context */}
        <div className="lg:col-span-4 bg-white border border-hairline rounded-lg p-4 shadow-subtle space-y-4">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setActiveConvId(null);
              setMessages([]);
              setAttachedFile(null);
              setMode("conversational");
              setError(null);
            }}
            className="w-full justify-center text-xs py-2"
          >
            + New Research Thread
          </Button>

          <div className="space-y-1.5">
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
              Seeds discussion with extracted risk cards and governing law.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-hairline">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted flex items-center justify-between">
              <span>Saved Threads</span>
              <span className="font-mono text-[10px] text-ink-subtle">{conversations.length}</span>
            </div>

            {conversations.length === 0 ? (
              <p className="text-xs text-ink-subtle py-2">No saved research threads yet.</p>
            ) : (
              <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
                {conversations.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center justify-between p-2 rounded-md transition-colors ${
                      activeConvId === c.id
                        ? "bg-paper-warm border border-accent/20"
                        : "hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <button
                      onClick={() => loadConversation(c.id)}
                      className="text-left text-xs text-ink truncate flex-1 font-medium mr-2"
                      title={c.title}
                    >
                      {c.title}
                    </button>
                    <Link
                      href={`/chat/${c.id}`}
                      className="text-[10px] text-ink-muted hover:text-ink px-1.5 py-0.5 rounded border border-hairline bg-white shrink-0"
                    >
                      Open ↗
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Main Chat Area */}
        <div className="lg:col-span-8 bg-white border border-hairline rounded-lg p-5 sm:p-6 shadow-subtle flex flex-col min-h-[640px]">
          {/* Header */}
          <div className="border-b border-hairline pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <h1 className="font-serif text-lg sm:text-xl font-bold text-ink">
                  Juris AI Legal Copilot
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-paper-warm border border-hairline text-ink-muted">
                  {mode === "conversational" ? "Conversational Mode" : "Memorandum Mode"}
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Chatbot assistance by default. Switch modes or attach documents for deep statutory memoranda.
              </p>
            </div>

            {/* Jurisdiction Selectors */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-ink-subtle mr-1 hidden sm:inline">Scope:</span>
              {["BD", "US", "EU"].map((j) => {
                const active = jurisdictions.includes(j);
                return (
                  <button
                    key={j}
                    type="button"
                    onClick={() => toggleJurisdiction(j)}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded border transition-colors ${
                      active
                        ? "bg-[#0b1f33] text-amber-200 border-[#0b1f33]"
                        : "bg-paper-warm text-ink-muted border-hairline hover:border-hairline-dark"
                    }`}
                  >
                    {j}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-3 mb-4 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-xs font-bold hover:underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 space-y-4 overflow-y-auto mb-4 pr-1 max-h-[480px]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 my-auto">
                <div className="w-12 h-12 rounded-full bg-paper-warm border border-hairline flex items-center justify-center font-serif text-xl text-accent shadow-sm">
                  §
                </div>
                <div>
                  <h2 className="font-serif text-base font-bold text-ink">
                    Ask a Legal Question or Attach a Contract
                  </h2>
                  <p className="text-xs text-ink-muted max-w-md leading-relaxed mt-1">
                    Juris AI operates as an interactive legal chatbot for statutory inquiries, and seamlessly switches to deep legal memoranda when analyzing agreements.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full text-left pt-2">
                  <button
                    onClick={() => {
                      setInput("Can an employer enforce a post-termination non-compete clause under Section 27 of Bangladesh Contract Act 1872?");
                      setMode("conversational");
                    }}
                    className="p-2.5 rounded border border-hairline bg-paper-warm/50 hover:bg-paper-warm text-left text-xs text-ink transition-colors"
                  >
                    <span className="font-semibold block text-[11px] text-accent">💬 Employment Restraint</span>
                    Section 27 non-competes in Bangladesh
                  </button>

                  <button
                    onClick={() => {
                      setInput("How does EU VBER 2022/720 treat minimum resale price maintenance compared to US antitrust?");
                      setMode("conversational");
                    }}
                    className="p-2.5 rounded border border-hairline bg-paper-warm/50 hover:bg-paper-warm text-left text-xs text-ink transition-colors"
                  >
                    <span className="font-semibold block text-[11px] text-accent">💬 Vertical Restraints</span>
                    VBER Article 4 vs US Sherman Act § 1
                  </button>
                </div>
              </div>
            ) : (
              messages.map((m, idx) => {
                const isUser = m.role === "user";
                const isAttached = isUser && m.content.startsWith("📎 [Attached:");
                const isMemo =
                  !isUser &&
                  (m.content.includes("### Legal Advisory Memorandum") ||
                    m.content.includes("Advisory Memorandum") ||
                    m.mode === "memorandum");

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
              })
            )}

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
                  ? "Ask any legal question, request clause advice, or attach an agreement below..."
                  : "Specify legal points, parties, or questions for this formal memorandum..."
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
    </div>
  );
}
