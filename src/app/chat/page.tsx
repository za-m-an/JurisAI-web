"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: string;
}

interface LinkedAnalysis {
  id: string;
  referenceCode: string;
  docName: string;
  jurisdictions: string[];
  briefSummary: string | null;
}

function CopilotContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const routeConvId = typeof params?.id === "string" ? params.id : null;
  const expandAnalysisId = searchParams.get("analysisId");

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(routeConvId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [linkedAnalysis, setLinkedAnalysis] = useState<LinkedAnalysis | null>(null);
  const [jurisdiction, setJurisdiction] = useState<"BD" | "US" | "EU">("BD");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const autoExpandedRef = useRef(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.replace("/login");
          return;
        }
        const meData = await meRes.json();
        if (meData.user?.region) {
          setJurisdiction(meData.user.region);
        }

        const convRes = await fetch("/api/conversations");
        if (convRes.ok && active) {
          const convData = await convRes.json();
          setConversations(convData.conversations || []);
        }

        if (routeConvId) {
          const msgRes = await fetch(`/api/conversations/${routeConvId}`);
          if (msgRes.ok && active) {
            const msgData = await msgRes.json();
            setMessages(msgData.messages || []);
            setActiveConvId(routeConvId);
          }
        } else if (expandAnalysisId && !autoExpandedRef.current) {
          autoExpandedRef.current = true;
          const anRes = await fetch(`/api/analyses/${expandAnalysisId}`);
          if (anRes.ok && active) {
            const anData = await anRes.json();
            const analysis = anData.analysis;
            if (analysis) {
              setLinkedAnalysis(analysis);
              if (analysis.jurisdictions?.[0]) {
                setJurisdiction(analysis.jurisdictions[0]);
              }
              await triggerAutoExpandCounsel(analysis);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    }
    init();
    return () => {
      active = false;
    };
  }, [routeConvId, expandAnalysisId, router]);

  async function triggerAutoExpandCounsel(analysis: LinkedAnalysis) {
    const prompt = `I have just completed the legal analysis for "${analysis.docName}" (Reference: ${analysis.referenceCode}). Based on the identified statutory risks and findings, explain clearly what I should do next and what the best legal decision is for my position.`;

    const tempUserMsg: ChatMessage = {
      id: `temp-u-${Date.now()}`,
      role: "user",
      content: prompt,
    };
    setMessages([tempUserMsg]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          analysisId: analysis.id,
          jurisdictions: analysis.jurisdictions?.length ? analysis.jurisdictions : [jurisdiction],
          mode: "conversational",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        const cleanReply = stripDisclaimer(data.reply || data.answer_markdown || "");
        setActiveConvId(data.conversationId);
        setMessages([
          tempUserMsg,
          {
            id: `temp-a-${Date.now()}`,
            role: "assistant",
            content: cleanReply,
          },
        ]);
        refreshConversations();
      }
    } finally {
      setSending(false);
    }
  }

  async function refreshConversations() {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations || []);
    }
  }

  function stripDisclaimer(text: string): string {
    return text
      .replace(/\*?This (analysis|response|information) is for informational purposes only.*?legal advice\.?\*?/gi, "")
      .replace(/\*?Not formal legal advice\.?\*?/gi, "")
      .trim();
  }

  async function handleSelectConversation(convId: string) {
    setActiveConvId(convId);
    setLinkedAnalysis(null);
    const res = await fetch(`/api/conversations/${convId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages || []);
    }
  }

  function handleNewConsultation() {
    setActiveConvId(null);
    setLinkedAnalysis(null);
    setMessages([]);
    router.push("/chat");
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    const userText = input.trim();
    setInput("");
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: userText,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvId,
          message: userText,
          analysisId: linkedAnalysis?.id || null,
          jurisdictions: [jurisdiction],
          mode: "conversational",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        if (data.conversationId && !activeConvId) {
          setActiveConvId(data.conversationId);
          refreshConversations();
        }
        const reply = stripDisclaimer(data.reply || data.answer_markdown || "");
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "assistant",
            content: reply,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: data.message || "Unable to complete your request right now.",
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "Connection interrupted. Please try sending your question again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-xs font-mono uppercase tracking-wider text-[#71717A]">
          Preparing Legal Copilot...
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-11rem)] min-h-[540px]">
      {/* Sidebar: Past Consultations */}
      <aside className="lg:col-span-3 vellum-card rounded-2xl p-4 flex flex-col justify-between overflow-hidden">
        <div className="space-y-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E2DC]">
            <h2 className="font-serif text-lg font-medium text-[#18181B]">
              Consultations
            </h2>
            <button
              type="button"
              onClick={handleNewConsultation}
              className="px-2.5 py-1 rounded-md bg-[#134E4A] text-[#FAF9F6] text-[11px] font-medium hover:bg-[#0F3F3C] editorial-transition"
            >
              + New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-[#71717A] py-4 text-center">
                No prior consultations yet.
              </p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectConversation(c.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs editorial-transition border ${
                    activeConvId === c.id
                      ? "bg-[#134E4A]/10 border-[#134E4A]/30 text-[#134E4A] font-semibold"
                      : "bg-transparent border-transparent text-[#52525B] hover:bg-[#FAF9F6] hover:text-[#18181B]"
                  }`}
                >
                  <div className="truncate">{c.title}</div>
                  <div className="text-[10px] text-[#71717A] mt-0.5">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-[#E5E2DC] space-y-1.5">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-[#71717A]">
            Governing Law Scope
          </label>
          <select
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value as "BD" | "US" | "EU")}
            className="w-full px-3 py-2 rounded-lg border border-[#E5E2DC] bg-[#FAF9F6] text-xs font-medium text-[#18181B]"
          >
            <option value="BD">Bangladesh (BD)</option>
            <option value="US">United States (US)</option>
            <option value="EU">European Union (EU)</option>
          </select>
        </div>
      </aside>

      {/* Main Copilot Chat Area — Strictly Chat Only, Zero File Uploads */}
      <section className="lg:col-span-9 vellum-card rounded-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E2DC] bg-[#FAF9F6]/60 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#B45309]">
              Legal Advisory Assistant
            </span>
            <h1 className="font-serif text-xl font-medium text-[#18181B]">
              Juris AI Copilot
            </h1>
          </div>

          {linkedAnalysis && (
            <div className="px-3 py-1.5 rounded-lg bg-[#134E4A]/10 border border-[#134E4A]/20 text-xs text-[#134E4A] flex items-center gap-2">
              <span className="font-mono text-[10px] font-semibold">
                {linkedAnalysis.referenceCode}
              </span>
              <span className="truncate max-w-[200px] font-medium">
                {linkedAnalysis.docName}
              </span>
            </div>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#134E4A]/10 text-[#134E4A] flex items-center justify-center font-serif font-bold text-lg">
                J
              </div>
              <h2 className="font-serif text-xl font-medium text-[#18181B]">
                Ask for Legal Counsel
              </h2>
              <p className="text-xs text-[#52525B] leading-relaxed">
                Discuss statutory rights, dispute strategies, enforceability questions,
                or expand an analyzed contract report to determine your best next decision.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[82%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-[#134E4A] text-[#FAF9F6]"
                    : "bg-[#FAF9F6] border border-[#E5E2DC] text-[#18181B]"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl px-5 py-3.5 bg-[#FAF9F6] border border-[#E5E2DC] text-xs font-mono text-[#71717A]">
                Formulating legal counsel...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Pure Text Input Bar (No File Upload) */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-[#E5E2DC] bg-white flex items-end gap-3"
        >
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Ask about statutory remedies, contract enforceability, or strategic next steps..."
            className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] text-sm text-[#18181B] placeholder:text-[#71717A] focus:outline-none focus:border-[#134E4A] focus:bg-white editorial-transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="px-5 py-3 rounded-xl bg-[#134E4A] hover:bg-[#0F3F3C] disabled:opacity-50 text-[#FAF9F6] text-xs font-medium editorial-transition shrink-0"
          >
            Send
          </button>
        </form>
      </section>
    </div>
  );
}

export default function CopilotPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-xs font-mono uppercase tracking-wider text-[#71717A]">
            Preparing Legal Copilot...
          </div>
        </div>
      }
    >
      <CopilotContent />
    </Suspense>
  );
}
