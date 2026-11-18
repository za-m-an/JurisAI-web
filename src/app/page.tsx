import React from "react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="bg-[#0b1f33] text-white rounded-xl p-8 sm:p-12 shadow-lg border border-slate-800">
        <div className="max-w-3xl space-y-6">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold uppercase tracking-wider">
            Bangladesh (BD) · United States (US) · European Union (EU)
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif font-bold leading-tight text-amber-50">
            Juris AI: Non-Obvious Legal Risk Detection with Corpus-Verified Citations
          </h1>
          <p className="text-slate-200 text-lg leading-relaxed">
            Upload a commercial contract or describe a business scenario. Juris AI uncovers hidden multi-clause interactions, vertical competition restraints, and cross-border enforceability traps—and checks every single legal citation against a curated statutory and case-law corpus.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link
              href="/analyze"
              className="px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow"
            >
              Analyse a Contract Now
            </Link>
            <Link
              href="/register"
              className="px-6 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600 font-medium"
            >
              Create Free Account
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works in 4 Steps */}
      <section className="space-y-6">
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0b1f33]">
          How Juris AI Works in 4 Steps
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              step: "1. In-Memory Intake",
              desc: "Upload a PDF, DOCX, or TXT contract (or paste a scenario). Magic bytes are verified, text is extracted in RAM, and the file buffer is permanently discarded.",
            },
            {
              step: "2. Hybrid Legal Retrieval",
              desc: "Our RAG engine derives targeted legal issue queries and searches across Bangladesh, US, and EU statutes and landmark cases using vector + BM25 Reciprocal Rank Fusion.",
            },
            {
              step: "3. Deterministic Citation Check",
              desc: "Every cited statute or case is verified in pure Python against our citation index and full-text corpus before the memorandum is finalised.",
            },
            {
              step: "4. Actionable Legal Memo",
              desc: "Receive a structured legal memorandum with severity ratings, cross-jurisdiction comparisons, and replacement mitigation clause drafting.",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2"
            >
              <h3 className="text-lg font-serif font-bold text-[#0b1f33]">{item.step}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Verified Citations Explainer with the 3 Badges */}
      <section className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-serif font-bold text-[#0b1f33]">
            Zero-Hallucination Citation Verification Badges
          </h2>
          <p className="text-sm text-slate-600">
            Unlike generic chatbots that invent statutes or misquote sections, Juris AI deterministically classifies every citation into one of three transparent statuses:
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-700 text-white">
              Verified
            </span>
            <p className="text-sm text-emerald-950 font-medium">
              Matched against real full-text law in the corpus
            </p>
            <p className="text-xs text-emerald-800">
              The normalised citation exists in our index with full statutory text (`source_type=full_text`) and any quoted wording matches verbatim.
            </p>
          </div>
          <div className="p-5 rounded-lg bg-amber-50 border border-amber-200 space-y-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-600 text-white">
              In corpus, confirm source
            </span>
            <p className="text-sm text-amber-950 font-medium">
              Listed in our curated legal catalog (`found_in_corpus`)
            </p>
            <p className="text-xs text-amber-800">
              The statute or case exists in our verified metadata catalog (`provision_summary`, `case_reference`, or `law_summary`), flagged to confirm against the primary gazette or reporter.
            </p>
          </div>
          <div className="p-5 rounded-lg bg-rose-50 border border-rose-200 space-y-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-700 text-white">
              Unverified, excluded from memo
            </span>
            <p className="text-sm text-rose-950 font-medium">
              Not found in corpus (`unverified`)
            </p>
            <p className="text-xs text-rose-800">
              Displayed with a red warning badge in the risk breakdown for transparency, and automatically stripped from the formal legal memorandum.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Promise & Roles / Pricing */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#f7f3e9] rounded-xl p-8 border border-amber-900/15 space-y-4">
          <h2 className="text-2xl font-serif font-bold text-[#0b1f33]">
            Strict Privacy Promise: Files Are Never Stored
          </h2>
          <p className="text-sm text-slate-700 leading-relaxed">
            Uploaded PDF, DOCX, and TXT files are processed exclusively in volatile server memory (`ArrayBuffer`). As soon as text extraction finishes, the raw bytes are zeroed/dereferenced, optional PII (emails, phone numbers, national IDs) is masked before analysis, and neither the file bytes nor the raw contract text is ever written to disk or stored in our database.
          </p>
          <Link
            href="/privacy"
            className="inline-block text-sm font-semibold text-[#0b1f33] underline hover:text-amber-700"
          >
            Read our full Privacy & Data Handling Architecture →
          </Link>
        </div>

        <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-2xl font-serif font-bold text-[#0b1f33]">
            Account Tiers & Quotas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-lg border border-slate-200">
              <div className="font-bold text-[#0b1f33]">Common / Individual</div>
              <div className="text-xs text-slate-500 mb-2">Prototype Free Tier</div>
              <ul className="space-y-1 text-slate-700 text-xs">
                <li>• 3 contract analyses / month</li>
                <li>• 30 legal chat messages / day</li>
                <li>• Full BD, US & EU citation checks</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-amber-300 bg-amber-50/40">
              <div className="font-bold text-[#0b1f33]">Business & Counsel</div>
              <div className="text-xs text-slate-500 mb-2">Enterprise & Commercial Tier</div>
              <ul className="space-y-1 text-slate-700 text-xs">
                <li>• 30 contract analyses / month</li>
                <li>• 100 legal chat messages / day</li>
                <li>• Replacement clause drafting & export</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="p-5 rounded-lg bg-slate-100 border border-slate-300 text-xs text-slate-600">
        <strong>Legal Disclaimer:</strong> This memorandum is informational analysis generated by an AI system and is not legal advice. It should be reviewed by a qualified lawyer before any decision is made.
      </section>
    </div>
  );
}
