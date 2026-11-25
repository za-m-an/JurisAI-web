"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Citation {
  source?: string;
  citation?: string;
  status?: string;
  holding?: string;
}

interface RiskFinding {
  severity?: string;
  issue?: string;
  title?: string;
  clause_reference?: string;
  why_non_obvious?: string;
  mitigation?: string;
  mitigation_clause?: string;
  citations?: Citation[];
}

interface AnalysisRecord {
  id: string;
  referenceCode: string;
  docName: string;
  status: "processing" | "done" | "failed";
  jurisdictions: string[];
  briefSummary: string | null;
  memoMarkdown: string | null;
  createdAt: string;
  result: {
    executive_summary?: string;
    summary?: string;
    document_facts?: Record<string, string>;
    risks?: RiskFinding[];
  } | null;
}

interface UserContext {
  fullName: string;
  organisation: string | null;
  region: "BD" | "US" | "EU";
}

function getLetterheadConfig(governingLaw: string, userRegion: string) {
  const law = governingLaw || userRegion || "BD";
  if (law === "US") {
    return {
      chamberTitle: "JURIS AI — FEDERAL & COMMERCIAL LEGAL COUNSEL",
      subtitle: "UNITED STATES STATUTORY & COMMERCIAL PRACTICE",
      authorityNote: "Prepared under U.S. Federal Codes (9 U.S.C., 15 U.S.C., 18 U.S.C.) & Applicable Commercial Law",
      accentColor: "#1E3A8A",
      sealText: "US · FEDERAL & COMMERCIAL",
    };
  }
  if (law === "EU") {
    return {
      chamberTitle: "JURIS AI — EUROPEAN REGULATORY & CIVIL LAW PRACTICE",
      subtitle: "EUROPEAN UNION STATUTORY & COMPLIANCE COUNSEL",
      authorityNote: "Prepared under Regulation (EU) 2016/679 (GDPR), TFEU & European Union Civil Frameworks",
      accentColor: "#121719",
      sealText: "EU · REGULATORY & CIVIL",
    };
  }
  return {
    chamberTitle: "JURIS AI — CHAMBERS OF STATUTORY & COMMERCIAL COUNSEL",
    subtitle: "DHAKA · PEOPLE'S REPUBLIC OF BANGLADESH",
    authorityNote: "Prepared under the Laws of Bangladesh (Contract Act 1872, Penal Code 1860, Arbitration Act 2001 & Statutory Codes)",
    accentColor: "#121719",
    sealText: "BD · STATUTORY COUNSEL",
  };
}

export default function AnalysisReportPage() {
  const params = useParams();
  const router = useRouter();
  const analysisId = typeof params?.id === "string" ? params.id : "";

  const [analysis, setAnalysis] = useState<AnalysisRecord | null>(null);
  const [user, setUser] = useState<UserContext | null>(null);
  const [suggestedFirms, setSuggestedFirms] = useState<any[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [meRes, anRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch(`/api/analyses/${analysisId}`),
        ]);
        if (!meRes.ok) {
          router.replace("/login");
          return;
        }
        const meData = await meRes.json();
        if (active) setUser(meData.user);

        if (!anRes.ok) {
          if (active) setError("Analysis report could not be located.");
          return;
        }
        const anData = await anRes.json();
        if (active) setAnalysis(anData.analysis);

        const reg = anData.analysis?.jurisdictions?.[0] || meData.user?.region || "BD";
        const lfRes = await fetch(`/api/law-firms?region=${reg}&analysisId=${analysisId}`);
        if (lfRes.ok && active) {
          const lfData = await lfRes.json();
          setSuggestedFirms((lfData.lawFirms || []).slice(0, 2));
        }
      } catch {
        if (active) setError("Failed to load legal analysis report.");
      } finally {
        if (active) setLoading(false);
      }
    }
    if (analysisId) load();
    return () => {
      active = false;
    };
  }, [analysisId, router]);

  function copyClause(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function handleExpandInCopilot() {
    router.push(`/chat?analysisId=${analysisId}`);
  }

  function handlePrintLetterheadPdf() {
    window.print();
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-xs font-mono uppercase tracking-wider text-[#B4B0C2]">
          Preparing Legal Memorandum...
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-2xl mx-auto vellum-card rounded p-8 text-center space-y-4">
        <h1 className="font-serif text-2xl text-[#F2EFE9]">Report Unavailable</h1>
        <p className="text-sm text-[#B4B0C2]">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/analyze")}
          className="px-4 py-2 rounded-lg bg-[#D6A86E] text-[#12111D] font-semibold text-xs font-medium"
        >
          Return to Document Analyzer
        </button>
      </div>
    );
  }

  const primaryLaw = analysis.jurisdictions?.[0] || user?.region || "BD";
  const letterhead = getLetterheadConfig(primaryLaw, user?.region || "BD");
  const risks = analysis.result?.risks || [];

  const formattedDisplayDate = new Date(analysis.createdAt || Date.now()).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const cleanMemo = (analysis.memoMarkdown || "")
    .replace(/\[(?:Insert\s+)?Date\]/gi, formattedDisplayDate)
    .replace(/(To:\s*)File\s*\/\s*Engagement Team/gi, `$1${user?.fullName || "Instructing Party"}`)
    .replace(/\*?This (analysis|memorandum|response|information) is (for informational purposes only|informational analysis generated by an AI system).*?legal advice\.?\*?/gi, "")
    .replace(/It should be reviewed by a qualified lawyer before any decision is made\.?/gi, "")
    .replace(/\*?Not formal legal advice\.?\*?/gi, "")
    .replace(/AI Legal Analysis System/gi, "Juris AI Statutory Advisory Chambers")
    .replace(/via Legal Knowledge Graph RAG/gi, "under governing statutory law")
    .replace(/\n---\s*\n\*\*Disclaimer:[\s\S]*$/i, "")
    .replace(/\nDisclaimer:[\s\S]*$/i, "")
    .trim();

  const rawExec =
    analysis.briefSummary ||
    analysis.result?.executive_summary ||
    analysis.result?.summary ||
    "Comprehensive statutory and contractual evaluation completed.";
  const execSummary = rawExec
    .replace(/via Legal Knowledge Graph RAG/gi, "under governing statutory law")
    .replace(/Legal Knowledge Graph RAG/gi, "statutory counsel");

  const displayTitle =
    (analysis.result as any)?.document_type &&
    !/\.(pdf|docx|txt)$/i.test((analysis.result as any).document_type) &&
    (analysis.result as any).document_type !== "Commercial Agreement"
      ? (analysis.result as any).document_type
      : analysis.docName.replace(/\.(pdf|docx|txt)$/i, "").replace(/[_-]+/g, " ");

  // Compute accurate risk count from structured risks or markdown headings/table
  const memoRiskMatches = cleanMemo.match(/(?:^|\n)###\s+(?:\d+\.\s+)?Risk\b/gi) || [];
  const effectiveRiskCount = risks.length > 0 ? risks.length : memoRiskMatches.length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Action Bar (Hidden in Print / PDF) */}
      <div className="no-print glass-vellum rounded p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded bg-[#1A1829] border border-[#2E2B44] text-[#F2EFE9] font-semibold">
            {analysis.referenceCode}
          </span>
          <span className="text-xs text-[#B4B0C2]">
            Governing Law: <strong className="text-[#F2EFE9]">{primaryLaw}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrintLetterheadPdf}
            className="px-4 py-2 rounded-lg border border-[#2E2B44] bg-[#1A1829] hover:bg-[#222036] text-xs font-medium text-[#F2EFE9] editorial-transition flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Formal Letterhead PDF
          </button>

          <button
            type="button"
            onClick={handleExpandInCopilot}
            className="px-5 py-2 rounded-lg bg-[#D6A86E] hover:bg-[#C49356] text-[#12111D] font-semibold text-xs font-medium editorial-transition flex items-center gap-1.5 shadow-sm"
          >
            <span>Expand</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Formal Institutional Letterhead Document Container */}
      <article className="print-container vellum-card rounded bg-[#1A1829] p-8 sm:p-12 space-y-8">
        {/* Institutional Letterhead Header (Visible on Screen & Print with Color) */}
        <header
          className="print-letterhead-banner border-b-2 pb-6 space-y-3"
          style={{ borderColor: "#D6A86E" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.jpg"
                  alt="Juris AI"
                  className="w-11 h-11 rounded-sm object-cover border border-[#D6A86E]/60"
                />
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#F2EFE9]">
                    {letterhead.chamberTitle}
                  </h2>
                  <p className="print-gold text-[11px] font-mono uppercase tracking-widest text-[#D6A86E]">
                    {letterhead.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <span
                className="print-gold inline-block text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded border text-[#D6A86E]"
                style={{ borderColor: "#D6A86E" }}
              >
                {letterhead.sealText}
              </span>
              <p className="print-muted text-[11px] font-mono text-[#B4B0C2]">
                REF: {analysis.referenceCode}
              </p>
              <p className="print-muted text-[11px] font-mono text-[#B4B0C2]">
                DATE: {new Date(analysis.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <p className="print-muted text-[11px] text-[#B4B0C2] pt-1">
            {letterhead.authorityNote}
          </p>
        </header>

        {/* Client & Matter Metadata Block */}
        <section className="print-meta-box grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded bg-[#131220] border border-[#2E2B44] text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#B4B0C2]">
              Prepared For
            </span>
            <p className="font-semibold text-[#F2EFE9]">{user?.fullName || "Client"}</p>
            {user?.organisation && <p className="text-[#B4B0C2]">{user.organisation}</p>}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#B4B0C2]">
              Subject Matter
            </span>
            <p className="font-semibold text-[#F2EFE9] break-words">{displayTitle}</p>
            <p className="text-[#B4B0C2]">
              Governing Jurisdiction: {analysis.jurisdictions.join(", ")} · Risk Findings: {effectiveRiskCount}
            </p>
          </div>
        </section>

        {/* Executive Legal Summary */}
        <section className="space-y-2.5">
          <h1 className="font-serif text-2xl font-medium text-[#F2EFE9]">
            Executive Legal Opinion
          </h1>
          <p className="text-sm text-[#F2EFE9] leading-relaxed">
            {execSummary}
          </p>
        </section>

        {/* Statutory Risk Findings */}
        {risks.length > 0 && (
          <section className="space-y-4">
            <div className="border-b border-[#2E2B44] pb-2 flex items-center justify-between">
              <h2 className="font-serif text-xl font-light text-[#F2EFE9]">
                Statutory Risk &amp; Enforceability Findings
              </h2>
              <span className="text-xs font-mono text-[#B4B0C2]">
                {risks.length} Issues Identified
              </span>
            </div>

            <div className="space-y-4">
              {risks.map((risk, idx) => {
                const sev = (risk.severity || "medium").toLowerCase();
                const badgeStyle =
                  sev === "high"
                    ? "bg-[#3B181C] text-[#F5A3A8] border-[#6E2830]"
                    : sev === "medium"
                    ? "bg-[#362814] text-[#F2C97D] border-[#664A1E]"
                    : "bg-[#122D25] text-[#7DD3B0] border-[#225444]";
                const mitigationText = risk.mitigation_clause || risk.mitigation;

                return (
                  <div
                    key={idx}
                    className="p-5 rounded border border-[#2E2B44] bg-[#131220] space-y-3 break-inside-avoid"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-[#D6A86E]">
                          Finding 0{idx + 1} {risk.clause_reference ? `· ${risk.clause_reference}` : ""}
                        </span>
                        <h3 className="font-serif text-lg font-light text-[#F2EFE9]">
                          {risk.issue || risk.title || `Contractual Risk Vector ${idx + 1}`}
                        </h3>
                      </div>
                      <span className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border font-semibold ${badgeStyle}`}>
                        {sev} risk
                      </span>
                    </div>

                    {risk.why_non_obvious && (
                      <p className="text-sm text-[#B4B0C2] leading-relaxed">
                        {risk.why_non_obvious}
                      </p>
                    )}

                    {risk.citations && risk.citations.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {risk.citations.map((cit, cIdx) => (
                          <span
                            key={cIdx}
                            className="text-[11px] font-mono px-2.5 py-1 rounded bg-[#1A1829] border border-[#2E2B44] text-[#F2EFE9]"
                          >
                            {cit.source || cit.citation || "Statutory Authority"}
                          </span>
                        ))}
                      </div>
                    )}

                    {mitigationText && (
                      <div className="mt-2 p-3.5 rounded bg-[#1A1829] border border-[#2E2B44] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-[#7DD3B0] font-semibold">
                            Recommended Replacement Clause
                          </span>
                          <button
                            type="button"
                            onClick={() => copyClause(mitigationText, idx)}
                            className="no-print text-[11px] font-medium text-[#F2EFE9] hover:underline"
                          >
                            {copiedIdx === idx ? "Copied" : "Copy Clause"}
                          </button>
                        </div>
                        <p className="text-xs text-[#F2EFE9] font-mono leading-relaxed">
                          {mitigationText}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Full Rendered Markdown Memorandum */}
        {cleanMemo && (
          <section className="space-y-4 pt-4 border-t border-[#2E2B44]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1 className="font-serif text-2xl sm:text-3xl font-light text-[#F2EFE9] border-b border-[#2E2B44] pb-2.5 mt-6 mb-4">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="font-serif text-xl sm:text-2xl font-light text-[#D6A86E] mt-7 mb-3 pt-2 border-t border-[#2E2B44]/60">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="font-serif text-lg font-normal text-[#F2EFE9] mt-5 mb-2">
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-sm font-semibold text-[#D6A86E] uppercase tracking-wider mt-4 mb-1.5 font-mono">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="text-sm text-[#F2EFE9]/90 leading-relaxed mb-3.5">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-[#F2EFE9]">{children}</strong>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 space-y-2 mb-4 text-sm text-[#B4B0C2]">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 space-y-2 mb-4 text-sm text-[#B4B0C2]">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[#D6A86E] bg-[#131220] pl-4 pr-3 py-2.5 my-4 rounded-r text-xs sm:text-sm text-[#B4B0C2] italic">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="border-[#2E2B44] my-6" />,
                code: ({ children }) => (
                  <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-[#131220] border border-[#2E2B44] text-[#D6A86E]">
                    {children}
                  </code>
                ),
                table: ({ children }) => (
                  <div className="overflow-x-auto my-5 rounded border border-[#2E2B44]">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-[#131220] border-b border-[#2E2B44] text-[11px] font-mono uppercase tracking-wider text-[#D6A86E]">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-[#2E2B44] bg-[#1A1829]">
                    {children}
                  </tbody>
                ),
                tr: ({ children }) => (
                  <tr className="hover:bg-[#222036]/50 editorial-transition">{children}</tr>
                ),
                th: ({ children }) => (
                  <th className="py-2.5 px-4 font-semibold">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="py-2.5 px-4 text-[#F2EFE9]/90 align-top">{children}</td>
                ),
              }}
            >
              {cleanMemo}
            </ReactMarkdown>
          </section>
        )}

        {/* Institutional Attestation Footer */}
        <footer className="pt-8 mt-8 border-t border-[#2E2B44] flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs text-[#B4B0C2]">
          <div className="space-y-1">
            <p className="font-serif font-normal text-[#F2EFE9]">
              Issued by Juris AI Statutory Advisory Chambers
            </p>
            <p>
              Reference ID: <span className="font-mono">{analysis.referenceCode}</span>
            </p>
          </div>
          <div className="sm:text-right">
            <div className="w-48 border-b border-[#D6A86E]/40 mb-1.5" />
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#B4B0C2]">
              Authenticated Legal Memorandum
            </p>
          </div>
        </footer>
      </article>

      {/* AI-Suggested Counsel Panel (Screen Only) */}
      {suggestedFirms.length > 0 && (
        <section className="no-print vellum-card rounded p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2E2B44] pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#D6A86E]">
                AI Counsel Matching
              </span>
              <h2 className="font-serif text-xl font-medium text-[#F2EFE9]">
                Recommended Lawyers &amp; Firms for This Matter
              </h2>
            </div>
            <button
              type="button"
              onClick={() => router.push("/lawyers")}
              className="text-xs font-medium text-[#F2EFE9] hover:underline"
            >
              View Full Directory &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestedFirms.map((f) => (
              <div key={f.id} className="p-4 rounded border border-[#2E2B44] bg-[#131220] space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-base font-medium text-[#F2EFE9]">{f.name}</h3>
                    <p className="text-xs text-[#F2EFE9]">{f.leadCounsel}</p>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-[#1A1829] border border-[#2E2B44] text-[#F2EFE9]">
                    {f.aiRating}/100
                  </span>
                </div>
                <p className="text-[11px] text-[#B4B0C2]">
                  {f.experienceYears} yrs experience · {(f.specialties || []).join(" · ")}
                </p>
                <p className="text-[11px] text-[#B4B0C2]">
                  {f.contact?.phone} · {f.contact?.email}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
