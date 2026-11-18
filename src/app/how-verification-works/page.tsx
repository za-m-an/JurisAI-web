import React from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/ui/primitives";

export default function HowVerificationWorksPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Title & Editorial Subtitle */}
      <div className="border-b border-hairline pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#7B1E22]/10 border border-[#7B1E22]/20 text-[#7B1E22] text-xs font-semibold">
          <span>Verification Architecture</span>
          <span className="text-[#7B1E22]/40">·</span>
          <span>Pure Python</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          How Statutory Citation Verification Works
        </h1>
        <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">
          Deterministic, non-LLM statutory verification designed to purge hallucinations before generation.
        </p>
      </div>

      {/* Core Principle */}
      <section className="bg-white border border-hairline rounded-lg p-6 sm:p-8 shadow-subtle space-y-4">
        <h2 className="font-serif text-xl font-bold text-ink">
          The Zero-Hallucination Mandate
        </h2>
        <p className="text-xs sm:text-sm text-ink leading-relaxed">
          Standard large language models exhibit severe citation hallucination when asked to cite statutes and appellate rulings—inventing section numbers, conflating amendments, or fabricating judicial quotes out of whole cloth.
        </p>
        <p className="text-xs sm:text-sm text-ink leading-relaxed">
          Juris AI treats every model-generated legal citation as unverified by default. Before an advisory memorandum is delivered to counsel, a standalone pure-Python verifier executes an exact lookup against our indexed statutory corpus across Bangladesh, the United States, and the European Union.
        </p>
      </section>

      {/* The 3 Statuses */}
      <section className="space-y-4">
        <h2 className="font-serif text-xl font-bold text-ink">
          The Three-Tier Citation Taxonomy
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Verified */}
          <div className="bg-white border border-[#A3D9BD] rounded-lg p-5 shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="verified">Verified</Badge>
              <span className="font-mono text-[10px] text-[#1B6E42]">Status 1</span>
            </div>
            <h3 className="font-serif text-base font-bold text-ink">Full-Text Matched</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              The citation corresponds to a canonical statutory provision or landmark precedent present in the primary legal corpus. If a quote is provided, it is verified verbatim against primary statutory text.
            </p>
            <div className="text-[11px] font-semibold text-[#1B6E42]">
              Included in formal memorandum.
            </div>
          </div>

          {/* 2. Found in Corpus */}
          <div className="bg-white border border-[#F0D597] rounded-lg p-5 shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="corpus">Found in Corpus</Badge>
              <span className="font-mono text-[10px] text-[#8A5B00]">Status 2</span>
            </div>
            <h3 className="font-serif text-base font-bold text-ink">Corpus-Listed Authority</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              The act or provision exists in the jurisdiction index, but only provision summaries or metadata are indexed, or the model quote differed from the statutory text.
            </p>
            <div className="text-[11px] font-semibold text-[#8A5B00]">
              Included with &ldquo;Confirm Source&rdquo; caveat.
            </div>
          </div>

          {/* 3. Unverified */}
          <div className="bg-white border border-[#F8B4B4] rounded-lg p-5 shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="unverified">Unverified</Badge>
              <span className="font-mono text-[10px] text-[#A61C1C]">Status 3</span>
            </div>
            <h3 className="font-serif text-base font-bold text-ink">Purged / Potential Hallucination</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              The citation was not found in any gazetted law, statute table, or regulatory digest. Juris AI marks it as unverified and automatically purges it from the generated legal memorandum.
            </p>
            <div className="text-[11px] font-semibold text-[#A61C1C]">
              Strictly excluded from memorandum text.
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Re-check */}
      <section className="bg-paper-warm border border-hairline rounded-lg p-6 space-y-3">
        <h2 className="font-serif text-lg font-bold text-ink">
          Real-Time Statutory Re-Check Engine
        </h2>
        <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
          On any analysis report, clicking <strong>Re-check</strong> initiates a live query to <code>/api/citation?c=...</code>, querying the underlying statutory registry to display match metadata, source URLs, and status validation reasons.
        </p>
        <div className="pt-2">
          <Link href="/analyze">
            <Button variant="primary" size="md">
              Test with Sample Contract
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
