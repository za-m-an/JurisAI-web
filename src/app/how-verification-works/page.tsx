import React from "react";
import Link from "next/link";

export default function HowVerificationWorksPage() {
  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#0b1f33]">
          How Citation Verification Works
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Deterministic, pure-Python citation verification with zero LLM hallucination in the verification loop.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-serif font-bold text-[#0b1f33]">
          The Zero-Hallucination Philosophy
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Standard large language models frequently invent statutory sections, nonexistent appellate court precedents, and fabricated quotes when asked to cite law. Juris AI treats all AI-generated citations with skepticism. Every authority cited in an analysis is extracted and validated deterministically by a standalone Python verification engine against a curated multi-jurisdictional statutory corpus before appearing in your memorandum.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#0b1f33]">
          The Three Citation Statuses
        </h2>

        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-700 text-white">
              Verified
            </span>
            <span className="font-bold text-sm text-emerald-950">Verified Against Statutory Law</span>
          </div>
          <p className="text-xs text-emerald-900 leading-relaxed">
            The citation was successfully matched to an official primary law document in our corpus index. If the model provided a quote, that quote was verified verbatim (under 20 words) against the primary text. Safe to rely on as a verified authority.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-600 text-white">
              In corpus, confirm source
            </span>
            <span className="font-bold text-sm text-amber-950">Corpus-Listed Authority</span>
          </div>
          <p className="text-xs text-amber-900 leading-relaxed">
            The cited statute, section, or landmark case is indexed in our jurisdiction registries, but only metadata or a provision summary is currently indexed (or the specific quote provided differed from the statutory text). The citation is labelled in the memorandum with a clear notice to confirm against primary legal records before filing.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-700 text-white">
              Unverified
            </span>
            <span className="font-bold text-sm text-rose-950">Unverified / Purged Authority</span>
          </div>
          <p className="text-xs text-rose-900 leading-relaxed">
            The authority was <strong>not found</strong> in any known jurisdiction gazette, statute registry, or case law index. Juris AI flags this citation as a high-risk potential hallucination and <strong>strictly purges it from the generated legal memorandum</strong>. You will see it highlighted in the risk card to warn you, but it will never appear in the formal advisory text.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-serif font-bold text-[#0b1f33]">
          Interactive Citation Re-Check
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          On any analysis report, clicking <strong>Re-check</strong> next to a citation executes an on-demand lookup against our authority index (`/api/citation`), querying the canonical instrument registry in real time and displaying the match reason and source URL.
        </p>
      </section>

      <div className="pt-4 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
        <Link href="/privacy" className="text-[#0b1f33] hover:underline font-semibold">
          ← View Privacy & Data Handling Statement
        </Link>
        <Link href="/analyze" className="text-amber-700 hover:underline font-semibold">
          Analyse a Contract →
        </Link>
      </div>
    </div>
  );
}
