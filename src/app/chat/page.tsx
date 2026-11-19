"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge, Button } from "@/components/ui/primitives";

interface MessageItem {
  role: "user" | "assistant";
  content: string;
  citations?: any[];
  thinking?: string;
  thoughtTimeSeconds?: number;
  mode?: string;
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string>("");
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"conversational" | "memorandum">("conversational");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [jurisdictions, setJurisdictions] = useState<string[]>(["BD"]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Streaming & Thinking state
  const [streamingMessage, setStreamingMessage] = useState<{
    thinking: string;
    thoughtTime: number;
    text: string;
    isThinkingDone: boolean;
  } | null>(null);
  const [showThinking, setShowThinking] = useState<Record<number, boolean>>({});

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
  }, [messages, streamingMessage, loading]);

  async function loadConversation(convId: string) {
    setActiveConvId(convId);
    setError(null);
    setStreamingMessage(null);
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
      setMode("memorandum");
      setError(null);
    }
  }

  function removeAttachedFile() {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setMode("conversational");
  }

  function setJurisdictionPreset(preset: "BD" | "US" | "EU" | "ALL") {
    if (preset === "ALL") {
      setJurisdictions(["BD", "US", "EU"]);
    } else {
      setJurisdictions([preset]);
    }
  }

  async function streamTokens(
    fullText: string,
    thinkingText: string,
    citations: any[],
    activeMode: string,
    elapsedSeconds: number
  ) {
    // Phase 1: Reveal Thinking Box with active deliberation
    setStreamingMessage({
      thinking: thinkingText,
      thoughtTime: elapsedSeconds,
      text: "",
      isThinkingDone: false,
    });

    await new Promise((resolve) => setTimeout(resolve, 600));

    // Phase 2: Complete thinking, begin typing word-by-word
    setStreamingMessage((prev) =>
      prev
        ? {
            ...prev,
            isThinkingDone: true,
          }
        : null
    );

    const words = fullText.split(/(\s+)/);
    let accumulated = "";

    for (let i = 0; i < words.length; i++) {
      accumulated += words[i];
      setStreamingMessage((prev) =>
        prev
          ? {
              ...prev,
              text: accumulated,
            }
          : null
      );
      // Word-by-word cadence (approx 20ms per token/space)
      if (words[i].trim().length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 22));
      }
    }

    // Phase 3: Finalize and commit to messages list
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: fullText,
        citations: citations || [],
        thinking: thinkingText,
        thoughtTimeSeconds: elapsedSeconds,
        mode: activeMode,
      },
    ]);

    setStreamingMessage(null);
  }

  async function handleSend(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!input.trim() && !attachedFile) return;

    setError(null);
    setLoading(true);

    const userText = input.trim();
    const currentFile = attachedFile;
    const currentMode = mode;
    const activeJurs = jurisdictions;

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

    const startTime = Date.now();

    try {
      let res: Response;
      if (currentFile) {
        const formData = new FormData();
        formData.append("file", currentFile);
        formData.append("message", userText);
        formData.append("mode", currentMode);
        formData.append("jurisdictions", JSON.stringify(activeJurs));
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
            jurisdictions: activeJurs,
            analysisId: selectedAnalysisId || undefined,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Chat request failed.");
        setLoading(false);
        return;
      }

      const elapsedSeconds = Number(((Date.now() - startTime) / 1000).toFixed(1));
      setActiveConvId(data.conversationId);
      setLoading(false);

      // Stream the response word by word with thinking process
      await streamTokens(
        data.answer_markdown,
        data.thinking || "• Processed inquiry against indexed legal corpus.",
        data.citations || [],
        data.mode || currentMode,
        elapsedSeconds
      );

      const listRes = await fetch("/api/conversations");
      if (listRes.ok) {
        const listData = await listRes.json();
        setConversations(listData.conversations || []);
      }
    } catch {
      setError("Network error while communicating with Juris AI.");
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function toggleThought(idx: number) {
    setShowThinking((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
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
              setStreamingMessage(null);
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
                  {mode === "conversational" ? "Conversational Copilot" : "Memorandum Mode"}
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5">
                Real-time reasoning deliberation and word-by-word statutory synthesis.
              </p>
            </div>

            {/* Jurisdiction Presets & Scope Lock */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] uppercase font-bold text-ink-subtle mr-1">Jurisdiction Lock:</span>
              <button
                type="button"
                onClick={() => setJurisdictionPreset("BD")}
                className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-all ${
                  jurisdictions.length === 1 && jurisdictions[0] === "BD"
                    ? "bg-[#0b1f33] text-amber-200 border-[#0b1f33] font-bold shadow-sm"
                    : "bg-paper-warm text-ink-muted border-hairline hover:border-hairline-dark"
                }`}
                title="Lock analysis exclusively to Bangladesh Laws"
              >
                🇧🇩 BD Only
              </button>

              <button
                type="button"
                onClick={() => setJurisdictionPreset("US")}
                className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-all ${
                  jurisdictions.length === 1 && jurisdictions[0] === "US"
                    ? "bg-[#0b1f33] text-amber-200 border-[#0b1f33] font-bold shadow-sm"
                    : "bg-paper-warm text-ink-muted border-hairline hover:border-hairline-dark"
                }`}
                title="Lock analysis exclusively to United States Laws"
              >
                🇺🇸 US Only
              </button>

              <button
                type="button"
                onClick={() => setJurisdictionPreset("EU")}
                className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-all ${
                  jurisdictions.length === 1 && jurisdictions[0] === "EU"
                    ? "bg-[#0b1f33] text-amber-200 border-[#0b1f33] font-bold shadow-sm"
                    : "bg-paper-warm text-ink-muted border-hairline hover:border-hairline-dark"
                }`}
                title="Lock analysis exclusively to European Union Laws"
              >
                🇪🇺 EU Only
              </button>

              <button
                type="button"
                onClick={() => setJurisdictionPreset("ALL")}
                className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-all ${
                  jurisdictions.length === 3
                    ? "bg-[#7B1E22] text-white border-[#7B1E22] font-bold shadow-sm"
                    : "bg-paper-warm text-ink-muted border-hairline hover:border-hairline-dark"
                }`}
                title="Enable Tri-Jurisdictional Cross-Border Scope"
              >
                🌐 All 3
              </button>
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
          <div className="flex-1 space-y-5 overflow-y-auto mb-4 pr-1 max-h-[500px]">
            {messages.length === 0 && !streamingMessage && !loading ? (
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
                      setJurisdictionPreset("BD");
                      setMode("conversational");
                    }}
                    className="p-2.5 rounded border border-hairline bg-paper-warm/50 hover:bg-paper-warm text-left text-xs text-ink transition-colors"
                  >
                    <span className="font-semibold block text-[11px] text-accent">🇧🇩 Bangladesh Restraint of Trade</span>
                    Section 27 non-competes in Bangladesh
                  </button>

                  <button
                    onClick={() => {
                      setInput("What are the liquidated damages rules under Section 74 of the Contract Act 1872 in Bangladesh?");
                      setJurisdictionPreset("BD");
                      setMode("conversational");
                    }}
                    className="p-2.5 rounded border border-hairline bg-paper-warm/50 hover:bg-paper-warm text-left text-xs text-ink transition-colors"
                  >
                    <span className="font-semibold block text-[11px] text-accent">🇧🇩 Penalty vs Reasonable Compensation</span>
                    Section 74 penalty enforcement in BD
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

                const isThoughtOpen = showThinking[idx] !== false; // default open

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

                    {/* Thinking Process Accordion for Assistant */}
                    {!isUser && m.thinking && (
                      <div className="mb-3 rounded-md bg-slate-50/90 border border-slate-200 text-slate-700 text-xs overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleThought(idx)}
                          className="w-full px-3 py-1.5 flex items-center justify-between bg-slate-100/70 hover:bg-slate-100 transition-colors text-[11px] font-medium text-slate-600"
                        >
                          <span className="flex items-center gap-1.5">
                            <span>💭</span>
                            <span className="font-semibold">
                              Legal Deliberation Process
                            </span>
                            {m.thoughtTimeSeconds && (
                              <span className="text-slate-400 font-mono text-[10px]">
                                · Thought for {m.thoughtTimeSeconds}s
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {isThoughtOpen ? "Hide Thinking ▴" : "View Thinking ▾"}
                          </span>
                        </button>
                        {isThoughtOpen && (
                          <div className="p-3 font-mono text-[11px] leading-relaxed whitespace-pre-line border-t border-slate-200/60 bg-white/50 text-slate-600">
                            {m.thinking}
                          </div>
                        )}
                      </div>
                    )}

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

            {/* Live Streaming Message Box */}
            {streamingMessage && (
              <div className="p-4 rounded-lg bg-white border border-hairline mr-6 sm:mr-16 text-ink shadow-subtle animate-fadeIn">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-100 text-[#0b1f33]">
                    {mode === "memorandum" ? "Advisory Memorandum" : "Juris AI Copilot"}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 animate-pulse">
                    ● Streaming real-time synthesis
                  </span>
                </div>

                {/* Thinking Process Box */}
                {streamingMessage.thinking && (
                  <div className="mb-3 rounded-md bg-slate-50/90 border border-slate-200 text-slate-700 text-xs overflow-hidden">
                    <div className="px-3 py-1.5 flex items-center justify-between bg-slate-100/70 text-[11px] font-medium text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <span className="animate-spin text-accent">⚙</span>
                        <span className="font-semibold">Legal Deliberation Process</span>
                        <span className="text-slate-400 font-mono text-[10px]">
                          · Thought for {streamingMessage.thoughtTime}s
                        </span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-medium">
                        {streamingMessage.isThinkingDone ? "✓ Analysis Completed" : "Reasoning..."}
                      </span>
                    </div>
                    <div className="p-3 font-mono text-[11px] leading-relaxed whitespace-pre-line border-t border-slate-200/60 bg-white/50 text-slate-600">
                      {streamingMessage.thinking}
                    </div>
                  </div>
                )}

                {/* Word-by-word streamed content */}
                <div className="prose prose-sm max-w-none text-ink font-serif leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {streamingMessage.text || ""}
                  </ReactMarkdown>
                  <span className="inline-block w-2 h-4 ml-0.5 bg-accent animate-pulse align-middle"></span>
                </div>
              </div>
            )}

            {loading && !streamingMessage && (
              <div className="p-4 rounded-lg bg-white border border-hairline mr-6 sm:mr-16 shadow-subtle flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
                <div className="text-xs text-ink-muted font-medium">
                  {attachedFile || mode === "memorandum"
                    ? "Initiating multi-jurisdictional legal deliberation and cross-referencing statutes..."
                    : "Isolating jurisdiction, consulting legal corpus, and reasoning..."}
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

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-slate-500">
                  Target Scope: <strong className="text-ink">{jurisdictions.join(", ")}</strong>
                </span>
                {attachedFile && (
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Zero File Retention Active
                  </span>
                )}
              </div>
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
                disabled={loading || !!streamingMessage || (!input.trim() && !attachedFile)}
                onClick={() => handleSend()}
                className="px-4 py-1.5 text-xs font-semibold"
              >
                {loading
                  ? "Thinking..."
                  : streamingMessage
                  ? "Generating..."
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
