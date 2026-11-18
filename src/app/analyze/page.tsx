"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Input } from "@/components/ui/primitives";

const STAGED_MESSAGES = [
  "Reading file in volatile memory & verifying magic bytes...",
  "Retrieving statutory acts & case precedents across BD, US, and EU...",
  "Analysing multi-clause interactions & antitrust/competition exposure...",
  "Verifying statutory citations deterministically in pure Python...",
  "Drafting formal legal memorandum & replacement mitigation clauses...",
];

export default function AnalyzePage() {
  const router = useRouter();
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [jurisdictions, setJurisdictions] = useState<Array<"BD" | "US" | "EU">>(["BD", "US", "EU"]);
  const [analysisNote, setAnalysisNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
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

  useEffect(() => {
    if (!loading) {
      setStageIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setStageIndex((prev) => (prev < STAGED_MESSAGES.length - 1 ? prev + 1 : prev));
    }, 1400);
    return () => clearInterval(interval);
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
        return;
      }
      router.push(`/analyses/${data.analysisId}`);
    } catch {
      setError("Network error while submitting document for analysis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
            Analyse Legal Document or Scenario
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Uploaded files exist in volatile RAM only during parsing and are permanently purged immediately after.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLoadSampleContract}
          className="self-start sm:self-auto"
        >
          Try Sample Contract
        </Button>
      </div>

      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Demo mode: simulated AI output. Connected to local mock analysis service.</span>
        </div>
      )}

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

      {error && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-[#E8F5EE] border border-[#A3D9BD] text-[#1B6E42] text-xs font-semibold">
                <span>Selected: {file.name}</span>
                <span className="font-mono text-[10px]">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                Contract Text or Commercial Scenario
              </label>
              <span className="text-[11px] font-mono text-ink-subtle">
                {text.length.toLocaleString()} characters
              </span>
            </div>
            <textarea
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3.5 bg-white border border-hairline rounded-lg font-mono text-xs text-ink placeholder:text-ink-subtle shadow-subtle focus:border-accent transition-colors"
              placeholder="Paste full agreement text or click 'Try Sample Contract' above..."
            />
          </div>
        )}

        {/* Target Jurisdictions Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Target Jurisdictions
          </label>
          <div className="flex flex-wrap gap-2.5">
            {(
              [
                { code: "BD", label: "Bangladesh (BD)", desc: "Competition Act 2012, Contract Act 1872" },
                { code: "US", label: "United States (US)", desc: "Sherman Act, FTC Act, UCC Article 2" },
                { code: "EU", label: "European Union (EU)", desc: "Article 101/102 TFEU, VBER 2022/720" },
              ] as const
            ).map((j) => {
              const active = jurisdictions.includes(j.code);
              return (
                <button
                  key={j.code}
                  type="button"
                  onClick={() => toggleJurisdiction(j.code)}
                  className={`px-3.5 py-2 rounded-md border text-xs text-left transition-all ${
                    active
                      ? "border-[#7B1E22] bg-[#7B1E22]/10 text-[#7B1E22] font-semibold"
                      : "border-hairline bg-white text-ink-muted hover:text-ink hover:border-hairline-dark"
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{active ? "✓" : "○"}</span>
                    <span>{j.label}</span>
                  </div>
                  <div className="text-[10px] text-ink-subtle mt-0.5">{j.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Optional Focus Note */}
        <Input
          label="Optional Context / Focus Note"
          type="text"
          value={analysisNote}
          onChange={(e) => setAnalysisNote(e.target.value)}
          placeholder="e.g. Distributor based in Dhaka importing industrial machinery from Delaware and reselling in Germany."
          helperText="Guides risk prioritization toward specific cross-border transaction dynamics."
        />

        {/* Staged Execution Indicator */}
        {loading && (
          <div className="p-5 rounded-lg bg-white border border-hairline shadow-subtle space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-accent">
                In-Memory Pipeline Active
              </span>
              <span className="font-mono text-ink-muted">
                Step {stageIndex + 1} of {STAGED_MESSAGES.length}
              </span>
            </div>

            <div className="text-xs font-semibold text-ink">{STAGED_MESSAGES[stageIndex]}</div>

            <div className="w-full bg-paper-warm h-2 rounded-full overflow-hidden border border-hairline">
              <div
                className="bg-[#7B1E22] h-full transition-all duration-500"
                style={{ width: `${((stageIndex + 1) / STAGED_MESSAGES.length) * 100}%` }}
              />
            </div>

            <p className="text-[11px] text-ink-subtle">
              Extracting terms in RAM · No disk storage · Deterministic verification against corpus.
            </p>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={loading}
          className="w-full"
        >
          {loading ? "Analysing Agreement & Verifying Citations..." : "Run Risk Analysis & Citation Verification"}
        </Button>
      </form>
    </div>
  );
}
