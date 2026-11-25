"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const AGENT_STEPS = [
  {
    title: "Reviewing Document Structure",
    desc: "Parsing operative clauses, covenants, and obligations.",
  },
  {
    title: "Cross-Referencing Governing Statutes",
    desc: "Matching provisions against statutory codes and judicial precedents.",
  },
  {
    title: "Evaluating Enforceability & Risk Exposure",
    desc: "Identifying void clauses, penalty traps, and jurisdictional conflicts.",
  },
  {
    title: "Drafting Legal Memorandum",
    desc: "Compiling structured findings and institutional letterhead report.",
  },
];

export default function DocumentAnalyzerPage() {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<"file" | "text">("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [governingLaw, setGoverningLaw] = useState<"BD" | "US" | "EU">("BD");
  const [extraContext, setExtraContext] = useState("");
  const [dragging, setDragging] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        if (data.user.region && ["BD", "US", "EU"].includes(data.user.region)) {
          setGoverningLaw(data.user.region);
        }
        setLoadingAuth(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    if (!analyzing) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < AGENT_STEPS.length - 1 ? prev + 1 : prev));
    }, 2400);
    return () => clearInterval(interval);
  }, [analyzing]);

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      setFile(dropped);
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (inputMode === "file" && !file) {
      setError("Please select a PDF, DOCX, or TXT legal document to analyze.");
      return;
    }
    if (inputMode === "text" && text.trim().length < 200) {
      setError("Please provide at least 200 characters of contract text for analysis.");
      return;
    }

    setAnalyzing(true);
    setActiveStep(0);

    try {
      const formData = new FormData();
      if (inputMode === "file" && file) {
        formData.append("file", file);
      } else {
        formData.append("text", text.trim());
      }
      formData.append("jurisdictions", JSON.stringify([governingLaw]));
      if (extraContext.trim()) {
        formData.append("analysisNote", extraContext.trim());
      }

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Unable to complete document analysis.");
        setAnalyzing(false);
        return;
      }

      setActiveStep(AGENT_STEPS.length - 1);
      router.push(`/analyses/${data.analysisId}`);
    } catch {
      setError("Network error occurred while analyzing your document.");
      setAnalyzing(false);
    }
  }

  if (loadingAuth) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-xs font-mono uppercase tracking-wider text-[#71717A]">
          Loading Document Analyzer...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="space-y-2 border-b border-[#E5E2DC] pb-6">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#B45309]">
          Agentic Legal Review
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#18181B]">
          Document Analyzer
        </h1>
        <p className="text-sm text-[#52525B] max-w-2xl">
          Upload a legal agreement, select the governing law for your jurisdiction,
          and provide any additional case context for a comprehensive statutory review.
        </p>
      </div>

      {analyzing ? (
        <div className="vellum-card rounded-2xl p-8 sm:p-10 space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#134E4A]">
              Review In Progress
            </span>
            <h2 className="text-2xl font-serif font-medium text-[#18181B]">
              Examining Your Legal Document
            </h2>
          </div>

          <div className="space-y-4 pt-2">
            {AGENT_STEPS.map((step, idx) => {
              const isDone = idx < activeStep;
              const isCurrent = idx === activeStep;
              return (
                <div
                  key={step.title}
                  className={`p-4 rounded-xl border editorial-transition flex items-start gap-4 ${
                    isCurrent
                      ? "border-[#134E4A] bg-[#134E4A]/5"
                      : isDone
                      ? "border-[#E5E2DC] bg-[#FAF9F6]"
                      : "border-[#E5E2DC]/60 bg-white opacity-55"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono shrink-0 mt-0.5 ${
                      isDone
                        ? "bg-[#166534] text-white"
                        : isCurrent
                        ? "bg-[#134E4A] text-white animate-pulse"
                        : "bg-[#FAF9F6] border border-[#E5E2DC] text-[#71717A]"
                    }`}
                  >
                    {isDone ? "✓" : `0${idx + 1}`}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#18181B]">{step.title}</h3>
                    <p className="text-xs text-[#52525B] mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="vellum-card rounded-2xl p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-medium">
              {error}
            </div>
          )}

          {/* 1. Governing Law Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#18181B]">
              1. Select Governing Law
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { code: "BD" as const, title: "Bangladesh Law", sub: "Contract Act, Penal Code, Labour & Cyber Law" },
                { code: "US" as const, title: "United States Law", sub: "Federal Commercial, Antitrust & Arbitration Codes" },
                { code: "EU" as const, title: "European Union Law", sub: "GDPR, TFEU Competition & Civil Regulations" },
              ].map((law) => (
                <button
                  key={law.code}
                  type="button"
                  onClick={() => setGoverningLaw(law.code)}
                  className={`p-3.5 rounded-xl border text-left editorial-transition ${
                    governingLaw === law.code
                      ? "border-[#134E4A] bg-[#134E4A]/5 ring-1 ring-[#134E4A]"
                      : "border-[#E5E2DC] bg-[#FAF9F6] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#18181B]">{law.title}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-[#E5E2DC] text-[#52525B]">
                      {law.code}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#71717A] mt-1 leading-snug">{law.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Document Upload or Paste */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[#18181B]">
                2. Upload Document or Paste Clauses
              </label>
              <div className="inline-flex rounded-lg border border-[#E5E2DC] bg-[#FAF9F6] p-0.5">
                <button
                  type="button"
                  onClick={() => setInputMode("file")}
                  className={`px-3 py-1 rounded-md text-xs font-medium editorial-transition ${
                    inputMode === "file" ? "bg-white text-[#18181B] shadow-sm" : "text-[#71717A]"
                  }`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode("text")}
                  className={`px-3 py-1 rounded-md text-xs font-medium editorial-transition ${
                    inputMode === "text" ? "bg-white text-[#18181B] shadow-sm" : "text-[#71717A]"
                  }`}
                >
                  Paste Text
                </button>
              </div>
            </div>

            {inputMode === "file" ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleFileDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center editorial-transition ${
                  dragging
                    ? "border-[#134E4A] bg-[#134E4A]/5"
                    : "border-[#E5E2DC] bg-[#FAF9F6] hover:border-[#134E4A]/40"
                }`}
              >
                <input
                  id="doc-upload"
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="doc-upload" className="cursor-pointer space-y-2 block">
                  <div className="mx-auto w-10 h-10 rounded-full bg-white border border-[#E5E2DC] flex items-center justify-center text-[#134E4A]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                  </div>
                  {file ? (
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-[#134E4A]">{file.name}</p>
                      <p className="text-xs text-[#71717A]">
                        {(file.size / 1024).toFixed(1)} KB · Click to change file
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-[#18181B]">
                        Click to select or drag and drop your contract
                      </p>
                      <p className="text-xs text-[#71717A]">
                        Supports text-based PDF, DOCX, and TXT files (up to 4 MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>
            ) : (
              <div className="space-y-1.5">
                <textarea
                  rows={8}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the full agreement or disputed contract clauses here (minimum 200 characters)..."
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] text-sm text-[#18181B] placeholder:text-[#71717A] focus:outline-none focus:border-[#134E4A] focus:bg-white editorial-transition"
                />
                <div className="text-right text-[11px] font-mono text-[#71717A]">
                  {text.length} / 150,000 characters
                </div>
              </div>
            )}
          </div>

          {/* 3. Extra Context Prompt Box */}
          <div className="space-y-2">
            <label htmlFor="extraContext" className="block text-xs font-medium text-[#18181B]">
              3. Extra Case Context &amp; Instructions <span className="text-[#71717A] font-normal">(Optional)</span>
            </label>
            <textarea
              id="extraContext"
              rows={3}
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="Describe your position (e.g., 'We are the distributor negotiating termination penalties and non-compete limits') or highlight specific clauses of concern..."
              className="w-full px-4 py-3 rounded-xl border border-[#E5E2DC] bg-[#FAF9F6] text-sm text-[#18181B] placeholder:text-[#71717A] focus:outline-none focus:border-[#134E4A] focus:bg-white editorial-transition"
            />
          </div>

          <div className="pt-2 flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-[#134E4A] hover:bg-[#0F3F3C] text-[#FAF9F6] text-sm font-medium editorial-transition shadow-sm"
            >
              Begin Legal Analysis
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
