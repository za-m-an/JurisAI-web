"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
        <div className="text-xs font-mono uppercase tracking-wider text-[#5b6472]">
          Preparing Legal Memorandum...
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="max-w-2xl mx-auto vellum-card rounded p-8 text-center space-y-4">
        <h1 className="font-serif text-2xl text-[#121719]">Report Unavailable</h1>
        <p className="text-sm text-[#5b6472]">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/analyze")}
          className="px-4 py-2 rounded-lg bg-[#121719] text-[#F3F3F3] text-xs font-medium"
        >
          Return to Document Analyzer
        </button>
      </div>
    );
  }

  const primaryLaw = analysis.jurisdictions?.[0] || user?.region || "BD";
  const letterhead = getLetterheadConfig(primaryLaw, user?.region || "BD");
  const risks = analysis.result?.risks || [];
  const execSummary =
    analysis.briefSummary ||
    analysis.result?.executive_summary ||
    analysis.result?.summary ||
    "Comprehensive statutory and contractual evaluation completed.";

  const cleanMemo = (analysis.memoMarkdown || "")
    .replace(/\*?This (analysis|response|information) is for informational purposes only.*?legal advice\.?\*?/gi, "")
    .replace(/\*?Not formal legal advice\.?\*?/gi, "")
    .trim();

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Top Action Bar (Hidden in Print / PDF) */}
      <div className="no-print glass-vellum rounded p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded bg-white border border-[#E0E2E4] text-[#121719] font-semibold">
            {analysis.referenceCode}
          </span>
          <span className="text-xs text-[#5b6472]">
            Governing Law: <strong className="text-[#121719]">{primaryLaw}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrintLetterheadPdf}
            className="px-4 py-2 rounded-lg border border-[#E0E2E4] bg-white hover:bg-[#F3F3F3] text-xs font-medium text-[#121719] editorial-transition flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Formal Letterhead PDF
          </button>

          <button
            type="button"
            onClick={handleExpandInCopilot}
            className="px-5 py-2 rounded-lg bg-[#121719] hover:bg-[#222729] text-[#F3F3F3] text-xs font-medium editorial-transition flex items-center gap-1.5 shadow-sm"
          >
            <span>Expand</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Formal Institutional Letterhead Document Container */}
      <article className="print-container vellum-card rounded bg-white p-8 sm:p-12 space-y-8">
        {/* Institutional Letterhead Header (Visible on Screen & Print) */}
        <header
          className="border-b-2 pb-6 space-y-3"
          style={{ borderColor: letterhead.accentColor }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-8 h-8 rounded-md text-white flex items-center justify-center font-serif font-bold text-base"
                  style={{ backgroundColor: letterhead.accentColor }}
                >
                  J
                </span>
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-[#121719]">
                    {letterhead.chamberTitle}
                  </h2>
                  <p className="text-[11px] font-mono uppercase tracking-widest text-[#ff4716]">
                    {letterhead.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="sm:text-right space-y-1">
              <span
                className="inline-block text-[10px] font-mono uppercase tracking-widest px-2.5 py-1 rounded border text-[#121719]"
                style={{ borderColor: letterhead.accentColor }}
              >
                {letterhead.sealText}
              </span>
              <p className="text-[11px] font-mono text-[#5b6472]">
                REF: {analysis.referenceCode}
              </p>
              <p className="text-[11px] font-mono text-[#5b6472]">
                DATE: {new Date(analysis.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>

          <p className="text-[11px] text-[#5b6472] pt-1">
            {letterhead.authorityNote}
          </p>
        </header>

        {/* Client & Matter Metadata Block */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded bg-[#F3F3F3] border border-[#E0E2E4] text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#5b6472]">
              Prepared For
            </span>
            <p className="font-semibold text-[#121719]">{user?.fullName || "Client"}</p>
            {user?.organisation && <p className="text-[#5b6472]">{user.organisation}</p>}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#5b6472]">
              Subject Instrument
            </span>
            <p className="font-semibold text-[#121719] break-words">{analysis.docName}</p>
            <p className="text-[#5b6472]">
              Governing Jurisdiction: {analysis.jurisdictions.join(", ")} · User Region: {user?.region || "BD"}
            </p>
          </div>
        </section>

        {/* Executive Legal Summary */}
        <section className="space-y-2.5">
          <h1 className="font-serif text-2xl font-medium text-[#121719]">
            Executive Legal Opinion
          </h1>
          <p className="text-sm text-[#121719] leading-relaxed">
            {execSummary}
          </p>
        </section>

        {/* Statutory Risk Findings */}
        <section className="space-y-4">
          <div className="border-b border-[#E0E2E4] pb-2 flex items-center justify-between">
            <h2 className="font-serif text-xl font-medium text-[#121719]">
              Statutory Risk &amp; Enforceability Findings
            </h2>
            <span className="text-xs font-mono text-[#5b6472]">
              {risks.length} Issues Identified
            </span>
          </div>

          <div className="space-y-4">
            {risks.map((risk, idx) => {
              const sev = (risk.severity || "medium").toLowerCase();
              const badgeStyle =
                sev === "high"
                  ? "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]"
                  : sev === "medium"
                  ? "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]"
                  : "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]";
              const mitigationText = risk.mitigation_clause || risk.mitigation;

              return (
                <div
                  key={idx}
                  className="p-5 rounded border border-[#E0E2E4] bg-[#F3F3F3]/50 space-y-3 break-inside-avoid"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-mono uppercase tracking-wider text-[#ff4716]">
                        Finding 0{idx + 1} {risk.clause_reference ? `· ${risk.clause_reference}` : ""}
                      </span>
                      <h3 className="font-serif text-lg font-medium text-[#121719]">
                        {risk.issue || risk.title || `Contractual Risk Vector ${idx + 1}`}
                      </h3>
                    </div>
                    <span className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border font-semibold ${badgeStyle}`}>
                      {sev} risk
                    </span>
                  </div>

                  {risk.why_non_obvious && (
                    <p className="text-sm text-[#5b6472] leading-relaxed">
                      {risk.why_non_obvious}
                    </p>
                  )}

                  {risk.citations && risk.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {risk.citations.map((cit, cIdx) => (
                        <span
                          key={cIdx}
                          className="text-[11px] font-mono px-2.5 py-1 rounded bg-white border border-[#E0E2E4] text-[#121719]"
                        >
                          {cit.source || cit.citation || "Statutory Authority"}
                        </span>
                      ))}
                    </div>
                  )}

                  {mitigationText && (
                    <div className="mt-2 p-3.5 rounded-lg bg-white border border-[#E0E2E4] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#166534] font-semibold">
                          Recommended Replacement Clause
                        </span>
                        <button
                          type="button"
                          onClick={() => copyClause(mitigationText, idx)}
                          className="no-print text-[11px] font-medium text-[#121719] hover:underline"
                        >
                          {copiedIdx === idx ? "Copied" : "Copy Clause"}
                        </button>
                      </div>
                      <p className="text-xs text-[#121719] font-mono leading-relaxed">
                        {mitigationText}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Full Memorandum */}
        {cleanMemo && (
          <section className="space-y-3 pt-2 border-t border-[#E0E2E4]">
            <h2 className="font-serif text-xl font-medium text-[#121719]">
              Detailed Legal Memorandum
            </h2>
            <div className="text-sm text-[#121719] leading-relaxed whitespace-pre-wrap">
              {cleanMemo}
            </div>
          </section>
        )}

        {/* Institutional Attestation Footer */}
        <footer className="pt-8 mt-8 border-t border-[#E0E2E4] flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs text-[#5b6472]">
          <div className="space-y-1">
            <p className="font-serif font-normal text-[#121719]">
              Issued by Juris AI Statutory Advisory Chambers
            </p>
            <p>
              Reference ID: <span className="font-mono">{analysis.referenceCode}</span>
            </p>
          </div>
          <div className="sm:text-right">
            <div className="w-48 border-b border-[#121719]/40 mb-1.5" />
            <p className="text-[11px] font-mono uppercase tracking-wider text-[#5b6472]">
              Authenticated Legal Memorandum
            </p>
          </div>
        </footer>
      </article>

      {/* AI-Suggested Counsel Panel (Screen Only) */}
      {suggestedFirms.length > 0 && (
        <section className="no-print vellum-card rounded p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E0E2E4] pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff4716]">
                AI Counsel Matching
              </span>
              <h2 className="font-serif text-xl font-medium text-[#121719]">
                Recommended Lawyers &amp; Firms for This Matter
              </h2>
            </div>
            <button
              type="button"
              onClick={() => router.push("/lawyers")}
              className="text-xs font-medium text-[#121719] hover:underline"
            >
              View Full Directory &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestedFirms.map((f) => (
              <div key={f.id} className="p-4 rounded border border-[#E0E2E4] bg-[#F3F3F3] space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-base font-medium text-[#121719]">{f.name}</h3>
                    <p className="text-xs text-[#121719]">{f.leadCounsel}</p>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-white border border-[#E0E2E4] text-[#121719]">
                    {f.aiRating}/100
                  </span>
                </div>
                <p className="text-[11px] text-[#5b6472]">
                  {f.experienceYears} yrs experience · {(f.specialties || []).join(" · ")}
                </p>
                <p className="text-[11px] text-[#5b6472]">
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
