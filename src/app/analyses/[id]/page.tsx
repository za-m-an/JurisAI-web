"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge, Button } from "@/components/ui/primitives";

export default function AnalysisReportPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id || "");
  const [analysis, setAnalysis] = useState<any>(null);
  const [activeTabByRisk, setActiveTabByRisk] = useState<Record<number, "BD" | "US" | "EU">>({});
  const [recheckMessage, setRecheckMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [displayMode, setDisplayMode] = useState<"plain" | "technical">("technical");
  const [selectedCitation, setSelectedCitation] = useState<any | null>(null);
  const [copiedRiskIdx, setCopiedRiskIdx] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user?.role === "common") {
          setDisplayMode("plain");
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.rag?.mock) setIsDemoMode(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/analyses/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAnalysis(data?.analysis || null))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleRecheckCitation(citString: string) {
    setRecheckMessage(`Querying statutory corpus for "${citString}"...`);
    try {
      const res = await fetch(`/api/citation?c=${encodeURIComponent(citString)}`);
      const data = await res.json();
      setRecheckMessage(
        `Citation "${data.citation_string}": status=${data.status} · ${data.reason || ""}`
      );
    } catch {
      setRecheckMessage("Citation verification query failed.");
    }
  }

  function handleCopyClause(text: string, idx: number) {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedRiskIdx(idx);
      setTimeout(() => setCopiedRiskIdx(null), 2000);
    }
  }

  function handleDownloadMemo() {
    if (!analysis?.memoMarkdown) return;
    const blob = new Blob([analysis.memoMarkdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(analysis.docName || "legal-memo").replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this analysis report?")) return;
    const res = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center space-y-3">
        <div className="font-serif text-xl font-bold text-ink">Retrieving Analysis Report...</div>
        <p className="text-xs text-ink-muted">Loading verified citations and formal memorandum.</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white border border-rose-200 rounded-lg text-center space-y-3">
        <div className="font-serif text-lg font-bold text-rose-800">Analysis Not Found</div>
        <p className="text-xs text-ink-muted">The requested legal report does not exist or access was denied.</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
          Return to Dashboard
        </Button>
      </div>
    );
  }

  const res = analysis.result || {};
  const risks = res.risks || [];
  const ver = res.verification || { total: 0, verified: 0, found_in_corpus: 0, unverified: 0 };

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6 print-container">
      {/* Demo Mode Notice */}
      {(isDemoMode || Boolean(analysis?.result?.model_info?.mock)) && (
        <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Demo mode: simulated AI output. Connected to local mock analysis service.</span>
        </div>
      )}

      {/* Mandatory File-Discarded Privacy Notice */}
      <div className="p-3.5 rounded-md bg-[#E8F5EE] border border-[#A3D9BD] text-[#1B6E42] text-xs font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold uppercase tracking-wider text-[10px]">Zero Storage Guarantee</span>
          <span className="hidden sm:inline text-[#A3D9BD]">·</span>
          <span>Your document was parsed in volatile RAM and permanently purged. Only this analysis output is saved.</span>
        </div>
        <span className="font-mono text-[11px] text-[#1B6E42]/80">
          SHA-256: {(analysis.docSha256 || "").slice(0, 16)}…
        </span>
      </div>

      {/* Document Header & Primary Action Toolbar */}
      <div className="bg-white border border-hairline rounded-lg p-5 sm:p-6 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">{analysis.docName}</h1>
            <Badge variant="neutral" className="uppercase font-mono text-[10px]">
              {res.document_type || "Commercial Contract"}
            </Badge>
          </div>
          <div className="text-xs text-ink-muted mt-1.5 flex flex-wrap items-center gap-3">
            <span>Governing Law: <strong className="text-ink">{res.governing_law || "Unspecified"}</strong></span>
            <span>·</span>
            <span>Target Jurisdictions: <strong className="text-ink">{(analysis.jurisdictions || []).join(", ")}</strong></span>
            <span>·</span>
            <span>Analysed: <strong className="text-ink">{new Date(analysis.createdAt).toLocaleDateString()}</strong></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {/* Mode Toggle: Plain Language vs Technical Legal */}
          <div className="inline-flex items-center bg-paper-warm border border-hairline p-0.5 rounded-md text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDisplayMode("plain")}
              className={`px-2.5 py-1 rounded transition-colors ${
                displayMode === "plain" ? "bg-white text-ink shadow-subtle" : "text-ink-muted hover:text-ink"
              }`}
            >
              Plain Language
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("technical")}
              className={`px-2.5 py-1 rounded transition-colors ${
                displayMode === "technical" ? "bg-white text-ink shadow-subtle" : "text-ink-muted hover:text-ink"
              }`}
            >
              Technical Legal
            </button>
          </div>

          <Button variant="secondary" size="sm" onClick={handleDownloadMemo}>
            Download Memo (.md)
          </Button>

          <Button variant="outline" size="sm" onClick={() => window.print()}>
            Print / PDF
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push(`/chat?analysisId=${analysis.id}`)}
          >
            Ask Follow-up
          </Button>

          <Button variant="danger" size="sm" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {/* Main Grid: Sticky Side Rail (Left) + Editorial Content (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sticky Left Rail */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
          {/* Verification Summary Card */}
          <div className="bg-white border border-hairline rounded-lg p-4 shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Statutory Citations
              </span>
              <span className="text-xs font-mono font-bold text-ink">{ver.total} Checked</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded bg-[#E8F5EE] border border-[#A3D9BD] text-xs">
                <span className="font-semibold text-[#1B6E42]">Verified (Full Text)</span>
                <span className="font-mono font-bold text-[#1B6E42]">{ver.verified}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#FFF8E6] border border-[#F0D597] text-xs">
                <span className="font-semibold text-[#8A5B00]">In Corpus (Summary / Meta)</span>
                <span className="font-mono font-bold text-[#8A5B00]">{ver.found_in_corpus}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#FDE8E8] border border-[#F8B4B4] text-xs">
                <span className="font-semibold text-[#A61C1C]">Unverified (Purged)</span>
                <span className="font-mono font-bold text-[#A61C1C]">{ver.unverified}</span>
              </div>
            </div>

            <p className="text-[10px] text-ink-subtle leading-relaxed">
              * Citations with &ldquo;Unverified&rdquo; status are strictly purged from the formal advisory memorandum to prevent hallucinated citations.
            </p>
          </div>

          {/* Quick Risk Navigation Rail */}
          <div className="bg-white border border-hairline rounded-lg p-4 shadow-subtle space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              Identified Risks ({risks.length})
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {risks.map((r: any, idx: number) => (
                <a
                  key={idx}
                  href={`#risk-${idx}`}
                  className="block p-2 rounded hover:bg-paper-warm transition-colors text-xs text-ink truncate border border-transparent hover:border-hairline"
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        r.severity === "high"
                          ? "bg-rose-600"
                          : r.severity === "medium"
                          ? "bg-amber-500"
                          : "bg-blue-500"
                      }`}
                    />
                    <span className="font-medium truncate">
                      {idx + 1}. {r.title}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Right Content Area: Executive Summary, Risks, Memo */}
        <div className="lg:col-span-8 space-y-6">
          {/* Re-check Status Banner */}
          {recheckMessage && (
            <div className="p-3 rounded-md bg-paper-warm border border-hairline text-xs font-mono text-ink no-print">
              {recheckMessage}
            </div>
          )}

          {/* Executive Summary */}
          <div className="bg-white border border-hairline rounded-lg p-6 shadow-subtle space-y-3">
            <h2 className="font-serif text-lg font-bold text-ink">Executive Summary</h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed whitespace-pre-line">
              {res.summary}
            </p>
          </div>

          {/* Non-Obvious Risks List */}
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-hairline pb-2">
              <h2 className="font-serif text-xl font-bold text-ink">
                Non-Obvious Legal & Regulatory Risks
              </h2>
              <span className="text-xs text-ink-muted">{risks.length} evaluated</span>
            </div>

            {risks.map((risk: any, idx: number) => {
              const activeJ = activeTabByRisk[idx] || "BD";
              return (
                <div
                  key={idx}
                  id={`risk-${idx}`}
                  className="bg-white border border-hairline rounded-lg p-6 shadow-subtle space-y-4"
                >
                  {/* Risk Title & Severity */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hairline pb-3">
                    <h3 className="font-serif text-base sm:text-lg font-bold text-ink">
                      {idx + 1}. {risk.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-ink-muted">
                        Clauses: {(risk.clause_refs || []).join(", ")}
                      </span>
                      <Badge
                        variant={risk.severity === "high" ? "high" : risk.severity === "medium" ? "medium" : "low"}
                      >
                        {risk.severity}
                      </Badge>
                    </div>
                  </div>

                  {/* Why Non-Obvious */}
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                      {displayMode === "plain"
                        ? "Practical Business Exposure"
                        : "Cross-Clause Interaction & Statutory Conflict"}
                    </h4>
                    <p className="text-xs sm:text-sm text-ink leading-relaxed">
                      {risk.why_non_obvious}
                    </p>
                  </div>

                  {/* Per-Jurisdiction Notes (Tabs: BD / US / EU) */}
                  <div className="border border-hairline rounded-md bg-paper-warm/50 p-4 space-y-2">
                    <div className="flex items-center gap-1 border-b border-hairline pb-2">
                      {(["BD", "US", "EU"] as const).map((j) => (
                        <button
                          key={j}
                          type="button"
                          onClick={() => setActiveTabByRisk((prev) => ({ ...prev, [idx]: j }))}
                          className={`px-3 py-1 text-xs font-semibold rounded transition-all ${
                            activeJ === j
                              ? "bg-white text-ink border border-hairline shadow-subtle"
                              : "text-ink-muted hover:text-ink"
                          }`}
                        >
                          {j} Framework
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed pt-1">
                      {risk.jurisdiction_notes?.[activeJ] || "No statutory observation recorded for this jurisdiction."}
                    </p>
                  </div>

                  {/* Cited Authorities & Badges */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Statutory Authorities & Verification
                    </div>
                    <div className="space-y-2">
                      {(risk.citations || []).map((cit: any, cIdx: number) => (
                        <div
                          key={cIdx}
                          className="p-3 rounded-md border border-hairline bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-ink">{cit.citation_string}</span>
                              <Badge
                                variant={
                                  cit.status === "verified"
                                    ? "verified"
                                    : cit.status === "found_in_corpus"
                                    ? "corpus"
                                    : "unverified"
                                }
                              >
                                {cit.status === "verified"
                                  ? "Verified"
                                  : cit.status === "found_in_corpus"
                                  ? "In corpus, confirm source"
                                  : "Unverified, purged"}
                              </Badge>
                            </div>
                            {cit.quote && (
                              <p className="text-[11px] italic text-ink-muted">&ldquo;{cit.quote}&rdquo;</p>
                            )}
                            <p className="text-[11px] text-ink-subtle">{cit.reason}</p>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center no-print">
                            <button
                              type="button"
                              onClick={() => setSelectedCitation(cit)}
                              className="text-[11px] font-semibold text-accent hover:underline"
                            >
                              Details
                            </button>
                            <span className="text-hairline">|</span>
                            <button
                              type="button"
                              onClick={() => handleRecheckCitation(cit.citation_string)}
                              className="text-[11px] font-semibold text-ink-muted hover:text-ink hover:underline"
                            >
                              Re-check
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mitigation Clause */}
                  <div className="p-4 rounded-md bg-paper-warm border border-hairline space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-accent">
                        {displayMode === "plain"
                          ? "Recommended Action / Contract Revision"
                          : "Recommended Replacement / Mitigation Clause"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyClause(risk.mitigation_clause_text || "", idx)}
                        className="text-xs font-semibold text-ink-muted hover:text-ink underline no-print"
                      >
                        {copiedRiskIdx === idx ? "Copied!" : "Copy Clause"}
                      </button>
                    </div>
                    <p className="font-mono text-xs text-ink leading-relaxed whitespace-pre-line bg-white p-3 rounded border border-hairline">
                      {risk.mitigation_clause_text}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Formal Legal Memorandum */}
          <div className="bg-white border border-hairline rounded-lg p-6 sm:p-8 shadow-subtle space-y-4">
            <div className="border-b border-hairline pb-4">
              <h2 className="font-serif text-2xl font-bold text-ink">Formal Legal Memorandum</h2>
              <p className="text-xs text-ink-muted mt-1">
                Authoritative multi-jurisdictional memorandum referencing only verified and corpus-listed provisions.
              </p>
            </div>

            <div className="prose prose-sm max-w-none text-ink font-serif leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {analysis.memoMarkdown || res.memo_markdown || ""}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over / Modal for Citation Details */}
      {selectedCitation && (
        <div className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs no-print">
          <div className="bg-white border border-hairline rounded-lg max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3 className="font-serif text-base font-bold text-ink">Citation Verification Record</h3>
              <button
                type="button"
                onClick={() => setSelectedCitation(null)}
                className="text-ink-muted hover:text-ink text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold text-ink-muted uppercase text-[10px] block">Authority</span>
                <span className="font-mono font-bold text-ink text-sm">{selectedCitation.citation_string}</span>
              </div>

              <div>
                <span className="font-semibold text-ink-muted uppercase text-[10px] block">Verification Status</span>
                <Badge
                  variant={
                    selectedCitation.status === "verified"
                      ? "verified"
                      : selectedCitation.status === "found_in_corpus"
                      ? "corpus"
                      : "unverified"
                  }
                  className="mt-1"
                >
                  {selectedCitation.status}
                </Badge>
              </div>

              {selectedCitation.quote && (
                <div>
                  <span className="font-semibold text-ink-muted uppercase text-[10px] block">Extracted Quote</span>
                  <p className="italic text-ink bg-paper-warm p-2.5 rounded border border-hairline mt-1">
                    &ldquo;{selectedCitation.quote}&rdquo;
                  </p>
                </div>
              )}

              <div>
                <span className="font-semibold text-ink-muted uppercase text-[10px] block">Verification Rationale</span>
                <p className="text-ink mt-1 leading-relaxed">{selectedCitation.reason || "Matched against corpus index."}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-hairline flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedCitation(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
