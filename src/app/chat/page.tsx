"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
      .replace(/\*?This (memorandum|analysis|response|information) is (system-generated )?(informational )?(analysis|purposes)[\s\S]*?(legal advice|made)\.?\*?/gi, "")
      .replace(/\*?Not formal legal advice\.?\*?/gi, "")
      .replace(/\n---\s*$/g, "")
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
        <div className="text-xs font-mono uppercase tracking-wider text-[#B4B0C2]">
          Preparing Legal Copilot...
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-11rem)] min-h-[540px]">
      {/* Sidebar: Past Consultations */}
      <aside className="lg:col-span-3 vellum-card rounded p-4 flex flex-col justify-between overflow-hidden">
        <div className="space-y-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-[#2E2B44]">
            <h2 className="font-serif text-lg font-medium text-[#F2EFE9]">
              Consultations
            </h2>
            <button
              type="button"
              onClick={handleNewConsultation}
              className="px-2.5 py-1 rounded-md bg-[#D6A86E] text-[#12111D] font-semibold text-[11px] font-medium hover:bg-[#222729] editorial-transition"
            >
              + New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {conversations.length === 0 ? (
              <p className="text-xs text-[#B4B0C2] py-4 text-center">
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
                      ? "bg-[#D6A86E]/15 border-[#D6A86E]/30 text-[#F2EFE9] font-semibold"
                      : "bg-transparent border-transparent text-[#B4B0C2] hover:bg-[#222036] hover:text-[#F2EFE9]"
                  }`}
                >
                  <div className="truncate">{c.title}</div>
                  <div className="text-[10px] text-[#B4B0C2] mt-0.5">
                    {new Date(c.updatedAt).toLocaleDateString()}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="pt-3 border-t border-[#2E2B44] space-y-1.5">
          <label className="block text-[10px] font-mono uppercase tracking-wider text-[#B4B0C2]">
            Governing Law Scope
          </label>
          <select
            value={jurisdiction}
            onChange={(e) => setJurisdiction(e.target.value as "BD" | "US" | "EU")}
            className="w-full px-3 py-2 rounded-lg border border-[#2E2B44] bg-[#131220] text-xs font-medium text-[#F2EFE9]"
          >
            <option value="BD">Bangladesh (BD)</option>
            <option value="US">United States (US)</option>
            <option value="EU">European Union (EU)</option>
          </select>
        </div>
      </aside>

      {/* Main Copilot Chat Area — Strictly Chat Only, Zero File Uploads */}
      <section className="lg:col-span-9 vellum-card rounded flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2E2B44] bg-[#131220] flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#D6A86E]">
              Legal Advisory Assistant
            </span>
            <h1 className="font-serif text-xl font-medium text-[#F2EFE9]">
              Juris AI Copilot
            </h1>
          </div>

          {linkedAnalysis && (
            <div className="px-3 py-1.5 rounded-lg bg-[#D6A86E]/15 border border-[#D6A86E]/20 text-xs text-[#F2EFE9] flex items-center gap-2">
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
              <div className="w-10 h-10 rounded bg-[#D6A86E]/15 text-[#F2EFE9] flex items-center justify-center font-serif font-bold text-lg">
                J
              </div>
              <h2 className="font-serif text-xl font-medium text-[#F2EFE9]">
                Ask for Legal Counsel
              </h2>
              <p className="text-xs text-[#B4B0C2] leading-relaxed">
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
                className={`max-w-[85%] rounded px-5 py-4 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#D6A86E] text-[#12111D] font-semibold whitespace-pre-wrap"
                    : "bg-[#131220] border border-[#2E2B44] text-[#F2EFE9]"
                }`}
              >
                {m.role === "user" ? (
                  m.content
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ children }) => (
                        <h1 className="font-serif text-xl sm:text-2xl font-light text-[#F2EFE9] border-b border-[#2E2B44] pb-2 mt-4 mb-3 first:mt-0">
                          {children}
                        </h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className="font-serif text-lg sm:text-xl font-light text-[#D6A86E] mt-5 mb-2.5 pt-2 border-t border-[#2E2B44]/60 first:mt-0 first:border-t-0 first:pt-0">
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className="font-serif text-base font-normal text-[#F2EFE9] mt-4 mb-1.5">
                          {children}
                        </h3>
                      ),
                      p: ({ children }) => (
                        <p className="text-sm text-[#F2EFE9]/90 leading-relaxed mb-3 last:mb-0">
                          {children}
                        </p>
                      ),
                      strong: ({ children }) => (
                        <strong className="font-semibold text-[#F2EFE9]">{children}</strong>
                      ),
                      ul: ({ children }) => (
                        <ul className="list-disc pl-5 space-y-1.5 mb-3 text-sm text-[#B4B0C2]">
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol className="list-decimal pl-5 space-y-1.5 mb-3 text-sm text-[#B4B0C2]">
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      blockquote: ({ children }) => (
                        <blockquote className="border-l-2 border-[#D6A86E] bg-[#1A1829] pl-3.5 pr-3 py-2 my-3 rounded-r text-xs sm:text-sm text-[#B4B0C2] italic">
                          {children}
                        </blockquote>
                      ),
                      hr: () => <hr className="border-[#2E2B44] my-4" />,
                      code: ({ children }) => (
                        <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#1A1829] border border-[#2E2B44] text-[#D6A86E]">
                          {children}
                        </code>
                      ),
                      table: ({ children }) => (
                        <div className="overflow-x-auto my-4 rounded border border-[#2E2B44]">
                          <table className="w-full text-left border-collapse text-xs">
                            {children}
                          </table>
                        </div>
                      ),
                      thead: ({ children }) => (
                        <thead className="bg-[#1A1829] border-b border-[#2E2B44] text-[10px] font-mono uppercase tracking-wider text-[#D6A86E]">
                          {children}
                        </thead>
                      ),
                      tbody: ({ children }) => (
                        <tbody className="divide-y divide-[#2E2B44] bg-[#131220]">
                          {children}
                        </tbody>
                      ),
                      th: ({ children }) => <th className="py-2 px-3 font-semibold">{children}</th>,
                      td: ({ children }) => <td className="py-2 px-3 text-[#F2EFE9]/90 align-top">{children}</td>,
                    }}
                  >
                    {m.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="rounded px-5 py-3.5 bg-[#131220] border border-[#2E2B44] text-xs font-mono text-[#B4B0C2]">
                Formulating legal counsel...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Pure Text Input Bar (No File Upload) */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-[#2E2B44] bg-[#1A1829] flex items-end gap-3"
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
            className="flex-1 resize-none px-4 py-2.5 rounded border border-[#2E2B44] bg-[#131220] text-sm text-[#F2EFE9] placeholder:text-[#B4B0C2] focus:outline-none focus:border-[#D6A86E] focus:bg-[#1A1829] editorial-transition"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="px-5 py-3 rounded bg-[#121719] hover:bg-[#222729] disabled:opacity-50 text-[#F2EFE9] text-xs font-medium editorial-transition shrink-0"
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
          <div className="text-xs font-mono uppercase tracking-wider text-[#B4B0C2]">
            Preparing Legal Copilot...
          </div>
        </div>
      }
    >
      <CopilotContent />
    </Suspense>
  );
}
