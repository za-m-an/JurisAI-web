"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function CitationBadge({ status }: { status: "verified" | "found_in_corpus" | "unverified" }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-700 text-white">
        Verified
      </span>
    );
  }
  if (status === "found_in_corpus") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-600 text-white">
        In corpus, confirm source
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-700 text-white">
      Unverified, excluded from memo
    </span>
  );
}

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
    setRecheckMessage(`Checking "${citString}"...`);
    try {
      const res = await fetch(`/api/citation?c=${encodeURIComponent(citString)}`);
      const data = await res.json();
      setRecheckMessage(
        `Citation "${data.citation_string}": status=${data.status} (${data.reason})`
      );
    } catch {
      setRecheckMessage("Citation re-check failed.");
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
    const res = await fetch(`/api/analyses/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-600">Loading analysis report...</div>;
  }

  if (!analysis) {
    return <div className="text-sm text-rose-700">Analysis report not found or access denied.</div>;
  }

  const res = analysis.result || {};
  const risks = res.risks || [];
  const ver = res.verification || { total: 0, verified: 0, found_in_corpus: 0, unverified: 0 };

  return (
    <div className="space-y-8 print-container">
      {/* Demo-mode Banner */}
      {(isDemoMode || Boolean(analysis?.result?.model_info?.mock)) && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm font-medium flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Demo mode: simulated AI output</span>
        </div>
      )}

      {/* Mandatory File-Discarded Privacy Banner */}
      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-sm font-medium flex items-center justify-between">
        <span>
          Your file was analysed in memory and has been permanently discarded. Only the analysis output is saved to your account.
        </span>
        <span className="text-xs font-mono text-emerald-800">
          SHA-256: {(analysis.docSha256 || "").slice(0, 16)}…
        </span>
      </div>

      {/* Header & Action Buttons */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0b1f33]">{analysis.docName}</h1>
          <p className="text-xs text-slate-500 mt-1">
            Document Type: <strong>{res.document_type || "Commercial Contract"}</strong> · Governing Law:{" "}
            <strong>{res.governing_law || "Unspecified"}</strong> · Jurisdictions:{" "}
            <strong>{(analysis.jurisdictions || []).join(", ")}</strong>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium mr-2">
            <button
              type="button"
              onClick={() => setDisplayMode("plain")}
              className={`px-2.5 py-1 rounded transition-colors ${
                displayMode === "plain"
                  ? "bg-white font-bold text-[#0b1f33] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Plain Language
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("technical")}
              className={`px-2.5 py-1 rounded transition-colors ${
                displayMode === "technical"
                  ? "bg-white font-bold text-[#0b1f33] shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Technical Legal
            </button>
          </div>
          <button
            type="button"
            onClick={handleDownloadMemo}
            className="px-3 py-1.5 rounded bg-[#0b1f33] text-white text-xs font-semibold"
          >
            Download Memo (.md)
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded border border-slate-300 text-xs font-medium"
          >
            Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={() => router.push(`/chat?analysisId=${analysis.id}`)}
            className="px-3 py-1.5 rounded bg-amber-600 text-white text-xs font-semibold"
          >
            Ask a Follow-up
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-3 py-1.5 rounded border border-rose-300 text-rose-700 text-xs font-medium"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Verification Summary Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm font-serif font-bold text-[#0b1f33]">
          Citation Verification Summary ({ver.total} Total Citations Checked)
        </div>
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 font-semibold">
            Verified (Full Text): {ver.verified}
          </span>
          <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 font-semibold">
            In Corpus, Confirm Source: {ver.found_in_corpus}
          </span>
          <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-900 font-semibold">
            Unverified (Excluded from Memo): {ver.unverified}
          </span>
        </div>
      </div>

      {recheckMessage && (
        <div className="p-3 rounded bg-slate-100 border border-slate-300 text-xs text-slate-800 no-print">
          {recheckMessage}
        </div>
      )}

      {/* Executive Summary */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <h2 className="text-lg font-serif font-bold text-[#0b1f33]">Executive Summary</h2>
        <p className="text-sm text-slate-700 leading-relaxed">{res.summary}</p>
      </div>

      {/* Risk Cards */}
      <div className="space-y-6">
        <h2 className="text-xl font-serif font-bold text-[#0b1f33]">
          Identified Non-Obvious Legal Risks ({risks.length})
        </h2>
        {risks.map((risk: any, idx: number) => {
          const activeJ = activeTabByRisk[idx] || "BD";
          return (
            <div
              key={idx}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-serif font-bold text-[#0b1f33]">
                  {idx + 1}. {risk.title}
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Clauses: {(risk.clause_refs || []).join(", ")}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                      risk.severity === "high"
                        ? "bg-rose-100 text-rose-800"
                        : risk.severity === "medium"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {risk.severity}
                  </span>
                </div>
              </div>

              <p className="text-sm text-slate-700">
                <strong>
                  {displayMode === "plain"
                    ? "Practical Commercial Impact:"
                    : "Why Non-Obvious (Cross-Clause Interaction):"}
                </strong>{" "}
                {risk.why_non_obvious}
              </p>

              {/* Per-Jurisdiction Notes Tabs (BD / US / EU) */}
              <div className="border rounded-lg p-4 bg-slate-50 space-y-2">
                <div className="flex gap-2 border-b border-slate-200 pb-2">
                  {(["BD", "US", "EU"] as const).map((j) => (
                    <button
                      key={j}
                      type="button"
                      onClick={() => setActiveTabByRisk((p) => ({ ...p, [idx]: j }))}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        activeJ === j
                          ? "bg-[#0b1f33] text-white"
                          : "bg-white text-slate-600 border border-slate-300"
                      }`}
                    >
                      {j} Analysis
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-700 leading-relaxed pt-1">
                  {risk.jurisdiction_notes?.[activeJ] || "No note for this jurisdiction."}
                </p>
              </div>

              {/* Citations with 3 Badge Colours & Re-check Link */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase text-slate-500">
                  Cited Authorities & Verification Status
                </div>
                <div className="space-y-2">
                  {(risk.citations || []).map((cit: any, cIdx: number) => (
                    <div
                      key={cIdx}
                      className="p-3 rounded border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-[#0b1f33]">{cit.citation_string}</span>
                          <CitationBadge status={cit.status} />
                        </div>
                        {cit.quote && (
                          <div className="italic text-slate-600">&ldquo;{cit.quote}&rdquo;</div>
                        )}
                        <div className="text-slate-500">{cit.reason}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRecheckCitation(cit.citation_string)}
                        className="text-xs font-semibold text-[#0b1f33] underline no-print self-start sm:self-center"
                      >
                        Re-check
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mitigation Clause with Copy Button */}
              <div className="p-4 rounded-lg bg-[#f7f3e9] border border-amber-900/15 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-[#0b1f33]">
                    {displayMode === "plain"
                      ? "Recommended Practical Action / Fix"
                      : "Recommended Replacement / Mitigation Clause"}
                  </span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(risk.mitigation_clause_text || "")}
                    className="text-xs font-semibold text-[#0b1f33] underline no-print"
                  >
                    Copy Clause
                  </button>
                </div>
                <p className="text-xs font-mono text-slate-800 leading-relaxed">
                  {risk.mitigation_clause_text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Legal Memorandum Rendered via react-markdown (No Raw HTML) */}
      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#0b1f33]">
          Formal Legal Memorandum (Verified & Corpus-Listed Authorities Only)
        </h2>
        <div className="prose prose-sm max-w-none text-slate-800 space-y-3">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {analysis.memoMarkdown || res.memo_markdown || ""}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
