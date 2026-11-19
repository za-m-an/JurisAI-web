"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button } from "@/components/ui/primitives";

interface AgentStage {
  id: string;
  name: string;
  subAgent: string;
  description: string;
  detail: string;
}

const AGENT_STAGES: AgentStage[] = [
  {
    id: "ingest",
    name: "RAM Buffer & Cryptographic Fingerprinting",
    subAgent: "Privacy & Ingestion Agent",
    description: "Reading file bytes in volatile application memory and computing SHA-256 checksum.",
    detail: "Zero disk writes, zero DB persistence of source documents. PII masking applied in memory.",
  },
  {
    id: "decompose",
    name: "Operative Clause Decomposition",
    subAgent: "Clause Extraction Agent",
    description: "Parsing contract syntax to isolate operative covenants: exclusivity, pricing, penalties, and jurisdiction.",
    detail: "Segmenting legal terms into distinct clause blocks for isolated cross-examination.",
  },
  {
    id: "retrieve_plan",
    name: "Autonomous Retrieval Planning",
    subAgent: "Retrieval Planning Agent",
    description: "Deriving specialized issue queries to interrogate Competition and Commercial Law.",
    detail: "Generating search vectors for resale price maintenance, post-termination restraint, and liquidated damages.",
  },
  {
    id: "cross_examine",
    name: "Tri-Jurisdictional Statutory Cross-Examination",
    subAgent: "Jurisdictional Cross-Examiner",
    description: "Executing hybrid vector + BM25 retrieval against Bangladesh, United States, and European Union corpora.",
    detail: "Querying Bangladesh Competition Act 2012, US Sherman/Clayton Acts, UCC § 2-302, and EU Article 101/102 TFEU.",
  },
  {
    id: "verify",
    name: "Deterministic Citation Verification",
    subAgent: "Citation Auditor",
    description: "Cross-referencing legal citations against primary statutory texts in pure Python.",
    detail: "Any ungrounded or hallucinated citations are automatically omitted from the formal memorandum.",
  },
  {
    id: "synthesize",
    name: "Risk Synthesis & Mitigation Drafting",
    subAgent: "Senior Legal Drafting Agent",
    description: "Analyzing multi-clause interactions, assigning severity, and generating actionable replacement clauses.",
    detail: "Synthesizing executive memorandum and redlined contractual protections for commercial closing.",
  },
];

export default function AnalyzePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [jurisdictions, setJurisdictions] = useState<Array<"BD" | "US" | "EU">>(["BD", "US", "EU"]);
  const [analysisNote, setAnalysisNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.rag?.mock) setIsDemoMode(true);
      })
      .catch(() => {});
  }, []);

  // Agent execution stage timer
  useEffect(() => {
    if (!loading) {
      setCurrentStageIdx(0);
      setElapsedSeconds(0);
      return;
    }

    const tInterval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    const sInterval = setInterval(() => {
      setCurrentStageIdx((prev) => (prev < AGENT_STAGES.length - 1 ? prev + 1 : prev));
    }, 2200);

    return () => {
      clearInterval(tInterval);
      clearInterval(sInterval);
    };
  }, [loading]);

  function toggleJurisdiction(code: "BD" | "US" | "EU") {
    setJurisdictions((prev) =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter((j) => j !== code)
          : prev
        : [...prev, code]
    );
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) {
      setFile(dropped);
    }
  }

  async function handleLoadSampleContract() {
    setError(null);
    try {
      const res = await fetch("/sample_contract.txt");
      const sampleText = await res.text();
      setMode("paste");
      setFile(null);
      setText(sampleText);
    } catch {
      setError("Failed to load sample contract.");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setCurrentStageIdx(0);

    try {
      const fd = new FormData();
      if (mode === "upload") {
        if (!file) {
          setError("Please select a PDF, DOCX, or TXT file to upload.");
          setLoading(false);
          return;
        }
        fd.append("file", file);
      } else {
        if (!text.trim()) {
          setError("Please paste contract text or click 'Try the sample contract'.");
          setLoading(false);
          return;
        }
        fd.append("text", text);
      }
      fd.append("jurisdictions", JSON.stringify(jurisdictions));
      if (analysisNote.trim()) {
        fd.append("analysisNote", analysisNote.trim());
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Contract analysis failed.");
        setLoading(false);
        return;
      }
      router.push(`/analyses/${data.analysisId}`);
    } catch {
      setError("Network error while submitting document for analysis.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-paper-warm border border-hairline text-[11px] font-mono text-ink-muted mb-1.5">
            <span>Browser-Based Agentic Studio</span>
            <span>·</span>
            <span>Zero-Retention RAM Isolation</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
            Agentic Contract Risk Analysis Studio
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Autonomous multi-jurisdictional legal agent evaluating clause interactions, competition exposure, and replacement drafting.
          </p>
        </div>
        {!loading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLoadSampleContract}
            className="self-start sm:self-auto"
          >
            Try Sample Contract
          </Button>
        )}
      </div>

      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Demo mode: simulated AI output. Connected to local mock analysis service.</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* ACTIVE AGENT DELIBERATION STUDIO (DURING EXECUTION) */}
      {loading ? (
        <div className="bg-white rounded-lg border border-slate-300 shadow-md p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-[#7B1E22] animate-ping" />
              <div>
                <h2 className="font-serif text-lg font-bold text-ink">
                  Agentic Legal Deliberation in Progress
                </h2>
                <p className="text-xs text-ink-muted font-mono">
                  Autonomous cross-examination against BD, US, and EU statutory corpus
                </p>
              </div>
            </div>
            <div className="px-3 py-1 rounded bg-paper-warm border border-hairline font-mono text-xs font-semibold text-ink">
              Elapsed: {elapsedSeconds}s
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="space-y-4">
            {AGENT_STAGES.map((st, idx) => {
              const isPast = idx < currentStageIdx;
              const isCurrent = idx === currentStageIdx;
              const isFuture = idx > currentStageIdx;

              return (
                <div
                  key={st.id}
                  className={`p-3.5 rounded-lg border transition-all ${
                    isCurrent
                      ? "bg-amber-50/70 border-amber-300 shadow-sm"
                      : isPast
                      ? "bg-emerald-50/50 border-emerald-200"
                      : "bg-paper-warm/40 border-hairline opacity-60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {isPast ? (
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                          ✓
                        </div>
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold font-mono animate-pulse">
                          {idx + 1}
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold font-mono">
                          {idx + 1}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-serif font-bold text-sm text-ink">{st.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-hairline text-ink-muted">
                          {st.subAgent}
                        </span>
                      </div>
                      <p className="text-xs text-ink font-sans">{st.description}</p>
                      <p className="text-[11px] text-ink-muted font-mono">{st.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Privacy & Progress Bar */}
          <div className="space-y-2 pt-2 border-t border-hairline">
            <div className="w-full bg-paper-warm rounded-full h-2 overflow-hidden border border-hairline">
              <div
                className="bg-[#7B1E22] h-full transition-all duration-500"
                style={{
                  width: `${Math.min(95, Math.round(((currentStageIdx + 1) / AGENT_STAGES.length) * 100))}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-ink-muted">
              <span>Memory Lock Active · Zero persistence</span>
              <span>Evaluating statutory corpus...</span>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD INPUT FORM */
        <div className="space-y-6">
          {/* Mode Selector Tabs */}
          <div className="flex border-b border-hairline text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode("upload")}
              className={`px-4 py-2.5 border-b-2 transition-all -mb-px ${
                mode === "upload"
                  ? "border-[#7B1E22] text-[#7B1E22]"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Upload Document (PDF / DOCX / TXT)
            </button>
            <button
              type="button"
              onClick={() => setMode("paste")}
              className={`px-4 py-2.5 border-b-2 transition-all -mb-px ${
                mode === "paste"
                  ? "border-[#7B1E22] text-[#7B1E22]"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              Paste Contract Text / Scenario
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {mode === "upload" ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-8 sm:p-12 text-center space-y-3 transition-colors ${
                  isDragging
                    ? "border-[#7B1E22] bg-[#7B1E22]/5"
                    : "border-hairline bg-white hover:border-hairline-dark"
                }`}
              >
                <div className="w-10 h-10 mx-auto rounded-full bg-paper-warm border border-hairline flex items-center justify-center text-ink-muted text-sm font-bold">
                  ↑
                </div>
                <div>
                  <div className="font-serif text-base font-bold text-ink">
                    Drag and drop your contract here, or browse files
                  </div>
                  <p className="text-xs text-ink-muted mt-1">
                    Accepted: PDF, DOCX, TXT · Maximum file size: 10 MB · Memory-only parsing
                  </p>
                </div>

                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block mx-auto text-xs text-ink-muted pt-2 file:mr-3 file:py-1 file:px-3 file:rounded file:border file:border-hairline file:text-xs file:font-semibold file:bg-paper-warm file:text-ink hover:file:bg-white"
                />

                {file && (
                  <div className="pt-2 text-xs font-mono text-ink">
                    Selected: <strong className="text-accent">{file.name}</strong> (
                    {(file.size / 1024).toFixed(1)} KB)
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-serif font-bold text-ink uppercase tracking-wider">
                  Contract Agreement Text or Transaction Scenario
                </label>
                <textarea
                  rows={14}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste complete agreement text, relevant clauses, or transaction scenario here (up to 150,000 characters)..."
                  className="w-full p-4 border border-hairline rounded-lg font-mono text-xs text-ink leading-relaxed focus:outline-none focus:border-[#7B1E22] bg-white resize-y"
                />
                <div className="flex justify-between items-center text-[11px] font-mono text-ink-muted">
                  <span>RAM memory parsed · Discarded immediately</span>
                  <span>{text.length.toLocaleString()} / 150,000 characters</span>
                </div>
              </div>
            )}

            {/* Jurisdictions Selection */}
            <div className="bg-white border border-hairline rounded-lg p-5 space-y-3">
              <label className="block text-xs font-serif font-bold text-ink uppercase tracking-wider">
                Target Legal Jurisdictions for Cross-Examination
              </label>
              <p className="text-xs text-ink-muted">
                The agent queries indexed statutory records across each selected jurisdiction:
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                {[
                  { code: "BD", name: "Bangladesh", subtitle: "Competition Act 2012, Contract Act 1872" },
                  { code: "US", name: "United States", subtitle: "Sherman Act §§ 1-2, Clayton Act, UCC" },
                  { code: "EU", name: "European Union", subtitle: "TFEU Article 101/102, VBER 2022/720" },
                ].map((j) => {
                  const selected = jurisdictions.includes(j.code as any);
                  return (
                    <button
                      key={j.code}
                      type="button"
                      onClick={() => toggleJurisdiction(j.code as any)}
                      className={`flex-1 min-w-[200px] p-3 rounded border text-left transition-all ${
                        selected
                          ? "border-[#7B1E22] bg-[#7B1E22]/5 shadow-subtle"
                          : "border-hairline bg-paper-warm/50 hover:bg-paper-warm"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-xs text-ink">{j.name}</span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            selected ? "bg-[#7B1E22] text-white" : "bg-hairline text-ink-muted"
                          }`}
                        >
                          {j.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-muted mt-1 font-mono">{j.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transaction Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-serif font-bold text-ink uppercase tracking-wider">
                Transaction Context / Specific Lawyer Instructions (Optional)
              </label>
              <input
                type="text"
                value={analysisNote}
                onChange={(e) => setAnalysisNote(e.target.value)}
                placeholder="e.g. Focus on exclusive distribution clause 4, or evaluate post-termination non-compete"
                className="w-full px-3 py-2 border border-hairline rounded text-xs font-sans focus:outline-none focus:border-[#7B1E22] bg-white"
              />
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-ink-muted font-mono">
                Upload-Analyse-Discard Privacy Promise: No contract text is retained on disk or database.
              </p>
              <Button type="submit" size="lg" variant="primary">
                Launch Agentic Analysis →
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
