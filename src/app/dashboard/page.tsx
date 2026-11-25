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
        <div className="text-xs font-mono uppercase tracking-wider text-[#71717A]">
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
      <section className="vellum-card rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#E5E2DC]">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#B45309]">
              Monthly Allowance
            </span>
            <h1 className="text-3xl font-serif font-medium text-[#18181B]">
              Welcome back, {user?.fullName}
            </h1>
            <p className="text-sm text-[#52525B]">
              Active Jurisdiction: <strong className="text-[#18181B]">{user?.region || "BD"}</strong> ·
              Tier: <span className="capitalize font-medium text-[#134E4A]">{user?.subscriptionTier || "Standard"}</span> ({user?.role})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/analyze"
              className="px-4 py-2.5 rounded-lg bg-[#134E4A] hover:bg-[#0F3F3C] text-[#FAF9F6] text-xs font-medium editorial-transition"
            >
              Analyze New Document
            </Link>
            <Link
              href="/settings/subscription"
              className="px-4 py-2.5 rounded-lg border border-[#E5E2DC] bg-[#FAF9F6] hover:bg-white text-xs font-medium text-[#18181B] editorial-transition"
            >
              Manage Tier
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#18181B]">Monthly Document Analyses</span>
              <span className="font-mono text-[#52525B]">
                {analysesUsed} / {analysesLimit} used
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#FAF9F6] border border-[#E5E2DC] overflow-hidden">
              <div
                className="h-full bg-[#134E4A] editorial-transition"
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p className="text-[11px] text-[#71717A]">
              {Math.max(0, analysesLimit - analysesUsed)} analyses remaining in this billing cycle.
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#18181B]">Daily Copilot Consultations</span>
              <span className="font-mono text-[#52525B]">
                {quota?.chatsUsedToday ?? 0} / {quota?.chatsLimitPerDay ?? 30} today
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#FAF9F6] border border-[#E5E2DC] overflow-hidden">
              <div
                className="h-full bg-[#B45309] editorial-transition"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round(((quota?.chatsUsedToday ?? 0) / Math.max(1, quota?.chatsLimitPerDay ?? 30)) * 100)
                  )}%`,
                }}
              />
            </div>
            <p className="text-[11px] text-[#71717A]">
              Resets daily for continuous case strategy and statutory inquiries.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 2: Recent Searches & Queries Slide */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#B45309]">
              Case Archive
            </span>
            <h2 className="text-2xl font-serif font-medium text-[#18181B]">
              Recent Searches &amp; Queries
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollSlides("left")}
              aria-label="Slide left"
              className="p-2 rounded-lg border border-[#E5E2DC] bg-white hover:bg-[#FAF9F6] text-[#18181B] editorial-transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scrollSlides("right")}
              aria-label="Slide right"
              className="p-2 rounded-lg border border-[#E5E2DC] bg-white hover:bg-[#FAF9F6] text-[#18181B] editorial-transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {recentItems.length === 0 ? (
          <div className="vellum-card rounded-xl p-8 text-center space-y-2">
            <p className="text-sm text-[#52525B]">
              No recent analyses or Copilot queries yet.
            </p>
            <Link
              href="/analyze"
              className="inline-block text-xs font-medium text-[#134E4A] hover:underline"
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
                className="min-w-[290px] max-w-[310px] snap-start vellum-card rounded-xl p-5 flex flex-col justify-between hover:border-[#134E4A]/40 editorial-transition shrink-0"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E5E2DC] text-[#52525B]">
                      {item.ref}
                    </span>
                    <span className="text-[11px] text-[#71717A]">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                  <h3 className="font-serif text-base font-medium text-[#18181B] line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[#52525B]">{item.subtitle}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E5E2DC] flex items-center justify-between text-xs font-medium text-[#134E4A]">
                  <span>{item.type === "analysis" ? "Open Report" : "Resume Copilot"}</span>
                  <span>&rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 3: Ongoing Case Legal Suggestions (Bottom) */}
      <section className="vellum-card rounded-2xl p-6 sm:p-8 border-l-4 border-l-[#134E4A]">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#134E4A]">
                Ongoing Case Advisory
              </span>
              <h2 className="text-2xl font-serif font-medium text-[#18181B]">
                Recommended Legal Strategy
              </h2>
            </div>
            {ongoingCase && (
              <span className="text-xs font-mono text-[#71717A]">
                Case Ref: {ongoingCase.referenceCode}
              </span>
            )}
          </div>

          {ongoingCase ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[#18181B]">
                    Active Matter: {ongoingCase.docName}
                  </p>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                    {ongoingCase.risksCount} Risk Vectors Detected
                  </span>
                </div>
                <p className="text-xs text-[#52525B] leading-relaxed">
                  {ongoingCase.briefSummary ||
                    "Your agreement contains clauses that conflict with mandatory statutory protections. Immediate review and redlining are advised prior to execution."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-[#E5E2DC] bg-white space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-[#B45309]">Step 01</div>
                  <h3 className="text-sm font-semibold text-[#18181B]">
                    Draft Counter-Redlines
                  </h3>
                  <p className="text-xs text-[#52525B]">
                    Replace unenforceable restraint or penalty clauses using the verified statutory alternatives in your report.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[#E5E2DC] bg-white space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-[#B45309]">Step 02</div>
                  <h3 className="text-sm font-semibold text-[#18181B]">
                    Consult Copilot Strategy
                  </h3>
                  <p className="text-xs text-[#52525B]">
                    Expand this matter into Copilot to evaluate negotiation leverage and dispute settlement pathways.
                  </p>
                </div>
                <div className="p-4 rounded-xl border border-[#E5E2DC] bg-white space-y-1.5">
                  <div className="text-[11px] font-mono uppercase text-[#B45309]">Step 03</div>
                  <h3 className="text-sm font-semibold text-[#18181B]">
                    Engage Regional Counsel
                  </h3>
                  <p className="text-xs text-[#52525B]">
                    Export your institutional letterhead memorandum and engage a top-rated {user?.region || "BD"} law firm.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href={`/chat?analysisId=${ongoingCase.id}`}
                  className="px-4 py-2 rounded-lg bg-[#134E4A] hover:bg-[#0F3F3C] text-[#FAF9F6] text-xs font-medium editorial-transition"
                >
                  Expand Case in Copilot
                </Link>
                <Link
                  href={`/analyses/${ongoingCase.id}`}
                  className="px-4 py-2 rounded-lg border border-[#E5E2DC] bg-white hover:bg-[#FAF9F6] text-xs font-medium text-[#18181B] editorial-transition"
                >
                  View Full Report
                </Link>
                <Link
                  href="/lawyers"
                  className="px-4 py-2 rounded-lg border border-[#E5E2DC] bg-white hover:bg-[#FAF9F6] text-xs font-medium text-[#B45309] editorial-transition"
                >
                  Find Matched Law Firm &rarr;
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-[#FAF9F6] border border-[#E5E2DC] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-sm text-[#52525B]">
                No ongoing legal matter on record. Upload a contract or ask Copilot a legal question to receive tailored case guidance here.
              </p>
              <Link
                href="/analyze"
                className="shrink-0 px-4 py-2 rounded-lg bg-[#134E4A] text-[#FAF9F6] text-xs font-medium"
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
