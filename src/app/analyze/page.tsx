"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const STAGED_MESSAGES = [
  "Reading file in memory & verifying magic bytes...",
  "Retrieving statutes & landmark cases across BD, US & EU...",
  "Analysing non-obvious multi-clause & competition risks...",
  "Verifying citations deterministically against corpus index...",
  "Writing legal memorandum & replacement mitigation clauses...",
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
    }, 1200);
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
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0b1f33]">
            Analyse Legal Document or Scenario
          </h1>
          <p className="text-sm text-slate-600">
            Files are processed strictly in memory and discarded immediately after extraction.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLoadSampleContract}
          className="px-4 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-[#0b1f33] text-xs font-semibold border border-amber-300"
        >
          Try the sample contract
        </button>
      </div>

      {isDemoMode && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-sm font-medium flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>Demo mode: simulated AI output</span>
        </div>
      )}

      {/* Mode Switch Tabs */}
      <div className="flex border-b border-slate-200 text-sm font-medium">
        <button
          type="button"
          onClick={() => setMode("upload")}
          className={`px-4 py-2.5 border-b-2 ${
            mode === "upload"
              ? "border-[#0b1f33] text-[#0b1f33] font-bold"
              : "border-transparent text-slate-500"
          }`}
        >
          Upload File (PDF / DOCX / TXT)
        </button>
        <button
          type="button"
          onClick={() => setMode("paste")}
          className={`px-4 py-2.5 border-b-2 ${
            mode === "paste"
              ? "border-[#0b1f33] text-[#0b1f33] font-bold"
              : "border-transparent text-slate-500"
          }`}
        >
          Paste Contract / Describe Scenario
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {mode === "upload" ? (
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3 bg-slate-50">
            <div className="text-sm font-medium text-[#0b1f33]">
              Drag and drop your contract here, or select a file (max 4 MB)
            </div>
            <input
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block mx-auto text-sm text-slate-600"
            />
            {file && (
              <div className="text-xs text-emerald-700 font-semibold">
                Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Contract Text or Commercial Scenario (200 to 150,000 characters)
            </label>
            <textarea
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3 rounded-lg border border-slate-300 font-mono text-xs"
              placeholder="Paste the full agreement text or click 'Try the sample contract' above..."
            />
          </div>
        )}

        {/* Jurisdiction Multi-Select */}
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-700 mb-2">
            Target Jurisdictions
          </label>
          <div className="flex flex-wrap gap-3">
            {(
              [
                { code: "BD", label: "Bangladesh (BD)" },
                { code: "US", label: "United States (US)" },
                { code: "EU", label: "European Union (EU)" },
              ] as const
            ).map((j) => {
              const active = jurisdictions.includes(j.code);
              return (
                <button
                  key={j.code}
                  type="button"
                  onClick={() => toggleJurisdiction(j.code)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                    active
                      ? "bg-[#0b1f33] text-white border-[#0b1f33]"
                      : "bg-white text-slate-700 border-slate-300"
                  }`}
                >
                  {active ? "✓ " : ""}
                  {j.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
            Optional Context / Focus Note
          </label>
          <input
            type="text"
            value={analysisNote}
            onChange={(e) => setAnalysisNote(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
            placeholder="e.g. We are the Bangladesh distributor importing from a US supplier and reselling in the EU."
          />
        </div>

        {loading && (
          <div className="p-5 rounded-xl bg-[#0b1f33] text-white space-y-3">
            <div className="text-xs uppercase tracking-wider text-amber-300 font-semibold">
              In-Memory Legal Analysis Pipeline Running
            </div>
            <div className="text-sm font-medium">{STAGED_MESSAGES[stageIndex]}</div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-500"
                style={{ width: `${((stageIndex + 1) / STAGED_MESSAGES.length) * 100}%` }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm shadow"
        >
          {loading ? "Analysing Contract & Verifying Citations..." : "Run Legal Risk & Citation Analysis"}
        </button>
      </form>
    </div>
  );
}
