"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserInfo {
  id: string;
  fullName: string;
  email: string;
  role: string;
  region: "BD" | "US" | "EU";
  subscriptionTier: string;
}

interface QuotaInfo {
  analysesUsedThisMonth: number;
  analysesLimitPerMonth: number;
  chatsUsedToday: number;
  chatsLimitPerDay: number;
}

interface AnalysisSummary {
  id: string;
  referenceCode: string;
  docName: string;
  status: "processing" | "done" | "failed";
  jurisdictions: string[];
  briefSummary: string | null;
  risksCount: number;
  createdAt: string;
}

interface ConversationItem {
  id: string;
  title: string;
  updatedAt: string;
}

export default function HomeWorkspacePage() {
  const router = useRouter();
  const slideRef = useRef<HTMLDivElement>(null);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisSummary[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) {
          router.replace("/login");
          return;
        }
        const meData = await meRes.json();
        if (!active) return;
        setUser(meData.user);
        setQuota(meData.quota);

        const [anRes, convRes] = await Promise.all([
          fetch("/api/analyses"),
          fetch("/api/conversations"),
        ]);
        if (anRes.ok && active) {
          const anData = await anRes.json();
          setAnalyses(anData.analyses || []);
        }
        if (convRes.ok && active) {
          const convData = await convRes.json();
          setConversations(convData.conversations || []);
        }
      } catch {
        if (active) router.replace("/login");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [router]);

  function scrollSlides(direction: "left" | "right") {
    if (!slideRef.current) return;
    const offset = direction === "left" ? -340 : 340;
    slideRef.current.scrollBy({ left: offset, behavior: "smooth" });
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-xs font-mono uppercase tracking-wider text-[#B4B0C2]">
          Loading workspace...
        </div>
      </div>
    );
  }

  const analysesUsed = quota?.analysesUsedThisMonth ?? 0;
  const analysesLimit = quota?.analysesLimitPerMonth ?? 3;
  const usagePct = Math.min(100, Math.round((analysesUsed / Math.max(1, analysesLimit)) * 100));

  const recentItems = [
    ...analyses.map((a) => ({
      type: "analysis" as const,
      id: a.id,
      ref: a.referenceCode,
      title: a.docName,
      subtitle: `${a.jurisdictions.join(" · ")} · ${a.risksCount} risk findings`,
      date: a.createdAt,
      href: `/analyses/${a.id}`,
    })),
    ...conversations.map((c) => ({
      type: "query" as const,
      id: c.id,
      ref: "COPILOT",
      title: c.title,
      subtitle: "Legal consultation thread",
      date: c.updatedAt,
      href: `/chat/${c.id}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const ongoingCase = analyses.find((a) => a.status === "done");

  return (
    <div className="space-y-10 pb-8">
      {/* SECTION 1: Monthly Usage & Subscription Tier */}
      <section className="vellum-card rounded p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#2E2B44]">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#D6A86E]">
              Monthly Allowance
            </span>
            <h1 className="text-3xl font-serif font-light text-[#F2EFE9]">
              Welcome back, {user?.fullName}
            </h1>
            <p className="text-sm text-[#B4B0C2]">
              Active Jurisdiction: <strong className="text-[#F2EFE9]">{user?.region || "BD"}</strong> ·
              Tier: <span className="capitalize font-medium text-[#F2EFE9]">{user?.subscriptionTier || "Standard"}</span> ({user?.role})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/analyze"
              className="px-4 py-2.5 rounded-lg bg-[#D6A86E] hover:bg-[#C49356] text-[#12111D] font-semibold text-xs font-medium editorial-transition"
            >
              Analyze New Document
            </Link>
            <Link
              href="/settings/subscription"
              className="px-4 py-2.5 rounded-lg border border-[#2E2B44] bg-[#131220] hover:bg-[#1A1829] text-xs font-medium text-[#F2EFE9] editorial-transition"
            >
              Manage Tier
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#F2EFE9]">Monthly Document Analyses</span>
              <span className="font-mono text-[#B4B0C2]">
                {analysesUsed} / {analysesLimit} used
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#131220] border border-[#2E2B44] overflow-hidden">
              <div
                className="h-full bg-[#121719] editorial-transition"
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p className="text-[11px] text-[#B4B0C2]">
              {Math.max(0, analysesLimit - analysesUsed)} analyses remaining in this billing cycle.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#F2EFE9]">Daily Copilot Consultations</span>
              <span className="font-mono text-[#B4B0C2]">
                {quota?.chatsUsedToday ?? 0} / {quota?.chatsLimitPerDay ?? 30} today
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#131220] border border-[#2E2B44] overflow-hidden">
              <div
                className="h-full bg-[#ff4716] editorial-transition"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(((quota?.chatsUsedToday ?? 0) / Math.max(1, quota?.chatsLimitPerDay ?? 30)) * 100)
                  )}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-[#B4B0C2]">
              Resets daily for continuous case strategy and statutory inquiries.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: Recent Searches & Queries Slide */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#D6A86E]">
              Case Archive
            </span>
            <h2 className="text-2xl font-serif font-light text-[#F2EFE9]">
              Recent Searches &amp; Queries
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollSlides("left")}
              aria-label="Slide left"
              className="p-2 rounded-lg border border-[#2E2B44] bg-[#1A1829] hover:bg-[#222036] text-[#F2EFE9] editorial-transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollSlides("right")}
              aria-label="Slide right"
              className="p-2 rounded-lg border border-[#2E2B44] bg-[#1A1829] hover:bg-[#222036] text-[#F2EFE9] editorial-transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {recentItems.length === 0 ? (
          <div className="vellum-card rounded p-8 text-center space-y-2">
            <p className="text-sm text-[#B4B0C2]">
              No recent analyses or Copilot queries yet.
            </p>
            <Link
              href="/analyze"
              className="inline-block text-xs font-medium text-[#F2EFE9] hover:underline"
            >
              Upload your first legal document &rarr;
            </Link>
          </div>
        ) : (
          <div
            ref={slideRef}
            className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth"
            style={{ scrollbarWidth: "thin" }}
          >
            {recentItems.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                href={item.href}
                className="min-w-[290px] max-w-[310px] snap-start vellum-card rounded p-5 flex flex-col justify-between hover:border-[#D6A86E]/40 editorial-transition shrink-0"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#131220] border border-[#2E2B44] text-[#B4B0C2]">
                      {item.ref}
                    </span>
                    <span className="text-[11px] text-[#B4B0C2]">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-medium text-[#F2EFE9] line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#B4B0C2]">{item.subtitle}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#2E2B44] flex items-center justify-between text-xs font-medium text-[#F2EFE9]">
                  <span>{item.type === "analysis" ? "Open Report" : "Resume Copilot"}</span>
                  <span>&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: Ongoing Case Legal Suggestions (Bottom) */}
      <section className="vellum-card rounded p-6 sm:p-8 border-l-4 border-l-[#D6A86E]">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#F2EFE9]">
                Ongoing Case Advisory
              </span>
              <h2 className="text-2xl font-serif font-light text-[#F2EFE9]">
                Recommended Legal Strategy
              </h2>
            </div>
            {ongoingCase && (
              <span className="text-xs font-mono text-[#B4B0C2]">
                Case Ref: {ongoingCase.referenceCode}
              </span>
            )}
          </div>

          {ongoingCase ? (
            <div className="space-y-5">
              <div className="p-4 rounded bg-[#131220] border border-[#2E2B44] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#F2EFE9]">
                    Active Matter: {ongoingCase.docName}
                  </p>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FEF2F2] text-[#F5A3A8] border border-[#FECACA]">
                    {ongoingCase.risksCount} Risk Vectors Detected
                  </span>
                </div>
                <p className="text-xs text-[#B4B0C2] leading-relaxed">
                  {ongoingCase.briefSummary ||
                    "Your agreement contains clauses that conflict with mandatory statutory protections. Immediate review and redlining are advised prior to execution."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded border border-[#2E2B44] bg-[#1A1829] space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-[#D6A86E]">Step 01</div>
                  <h3 className="text-sm font-semibold text-[#F2EFE9]">
                    Draft Counter-Redlines
                  </h3>
                  <p className="text-xs text-[#B4B0C2]">
                    Replace unenforceable restraint or penalty clauses using the verified statutory alternatives in your report.
                  </p>
                </div>
                <div className="p-4 rounded border border-[#2E2B44] bg-[#1A1829] space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-[#D6A86E]">Step 02</div>
                  <h3 className="text-sm font-semibold text-[#F2EFE9]">
                    Consult Copilot Strategy
                  </h3>
                  <p className="text-xs text-[#B4B0C2]">
                    Expand this matter into Copilot to evaluate negotiation leverage and dispute settlement pathways.
                  </p>
                </div>
                <div className="p-4 rounded border border-[#2E2B44] bg-[#1A1829] space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-[#D6A86E]">Step 03</div>
                  <h3 className="text-sm font-semibold text-[#F2EFE9]">
                    Engage Regional Counsel
                  </h3>
                  <p className="text-xs text-[#B4B0C2]">
                    Export your institutional letterhead memorandum and engage a top-rated {user?.region || "BD"} law firm.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href={`/chat?analysisId=${ongoingCase.id}`}
                  className="px-4 py-2 rounded-lg bg-[#D6A86E] hover:bg-[#C49356] text-[#12111D] font-semibold text-xs font-medium editorial-transition"
                >
                  Expand Case in Copilot
                </Link>
                <Link
                  href={`/analyses/${ongoingCase.id}`}
                  className="px-4 py-2 rounded-lg border border-[#2E2B44] bg-[#1A1829] hover:bg-[#222036] text-xs font-medium text-[#F2EFE9] editorial-transition"
                >
                  View Full Report
                </Link>
                <Link
                  href="/lawyers"
                  className="px-4 py-2 rounded-lg border border-[#2E2B44] bg-[#1A1829] hover:bg-[#222036] text-xs font-medium text-[#D6A86E] editorial-transition"
                >
                  Find Matched Law Firm &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded bg-[#131220] border border-[#2E2B44] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-sm text-[#B4B0C2]">
                No ongoing legal matter on record. Upload a contract or ask Copilot a legal question to receive tailored case guidance here.
              </p>
              <Link
                href="/analyze"
                className="shrink-0 px-4 py-2 rounded-lg bg-[#D6A86E] text-[#12111D] font-semibold text-xs font-medium"
              >
                Open Document Analyzer
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
