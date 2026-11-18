import React from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/ui/primitives";

export default function LandingPage() {
  return (
    <div className="space-y-20 py-6">
      {/* Editorial 12-Column Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start border-b border-hairline pb-16">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded border border-hairline bg-paper-warm text-[11px] font-mono text-ink-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>Multi-Jurisdictional Advisory · BD · US · EU</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-ink leading-[1.15] tracking-tight">
            Identify non-obvious contractual risks before closing.
          </h1>

          <p className="text-base sm:text-lg text-ink-muted leading-relaxed font-sans max-w-xl">
            Juris AI analyzes commercial contracts for clause interactions, vertical restraints, and cross-border enforceability traps. Every cited statutory provision and judicial decision is verified in pure Python against our indexed corpus.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link href="/analyze">
              <Button size="lg" variant="primary">
                Analyse a Contract
              </Button>
            </Link>
            <Link href="/how-verification-works">
              <Button size="lg" variant="outline">
                How Verification Works
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="ghost">
                Create Account
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-hairline text-xs font-mono text-ink-muted">
            <div>
              <strong className="block text-ink font-semibold">Zero File Storage</strong>
              Buffers discarded in RAM
            </div>
            <div>
              <strong className="block text-ink font-semibold">Pure-Python Verification</strong>
              Exact citation checking
            </div>
            <div>
              <strong className="block text-ink font-semibold">3 Jurisdictions</strong>
              BD, US, and EU statutes
            </div>
          </div>
        </div>

        {/* Real Coded Report Preview */}
        <div className="lg:col-span-5 bg-white border border-hairline rounded-lg p-6 shadow-subtle space-y-5">
          <div className="flex items-center justify-between border-b border-hairline pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-ink-subtle">Sample Analysis Output</span>
              <h2 className="text-sm font-serif font-bold text-ink">Global Software Distribution Agreement</h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-paper-warm border border-hairline text-ink-muted">
              Governing: NY, US
            </span>
          </div>

          {/* Verification Bar */}
          <div className="p-2.5 rounded bg-paper-warm border border-hairline flex items-center justify-between text-xs font-mono">
            <span className="text-ink-muted text-[11px]">Citation Audit (3 Checked)</span>
            <div className="flex gap-1.5">
              <Badge variant="verified">2 Verified</Badge>
              <Badge variant="corpus">1 In Corpus</Badge>
            </div>
          </div>

          {/* Risk 1 */}
          <div className="space-y-2 border-b border-hairline-subtle pb-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xs font-serif font-bold text-ink leading-snug">
                1. Post-Term Non-Compete &amp; Territory Allocation
              </h3>
              <Badge variant="high">High Risk</Badge>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed font-sans">
              Clause 14.2 imposes a 3-year global territory ban. Violates vertical competition rules under EU Art. 101 and BD Competition Act s.15.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="verified">TFEU Art. 101(1)</Badge>
              <Badge variant="corpus">BD Competition Act 2012, s.15</Badge>
            </div>
          </div>

          {/* Risk 2 */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-xs font-serif font-bold text-ink leading-snug">
                2. Mandatory Arbitral Seat Conflict &amp; Enforceability
              </h3>
              <Badge variant="medium">Medium</Badge>
            </div>
            <p className="text-[11px] text-ink-muted leading-relaxed font-sans">
              Asymmetry between Clause 19 (exclusive Dhaka seat) and Clause 22 (New York jurisdiction) risks pre-enforcement invalidation.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge variant="verified">Arbitration Act 2001, s.3</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Editorial Principles */}
      <section className="space-y-8">
        <div>
          <span className="text-xs font-mono uppercase text-ink-subtle">Engine Design</span>
          <h2 className="text-2xl font-serif font-bold text-ink mt-1">
            Built for legal precision, not general-purpose chat.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-2 border-t border-hairline pt-4">
            <div className="text-xs font-mono text-accent font-bold">01 / PRIVACY PROMISE</div>
            <h3 className="font-serif font-bold text-base text-ink">In-Memory Upload &amp; Discard</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Uploaded files (PDF, DOCX, TXT) are validated by magic bytes, extracted in RAM, and dereferenced immediately. Neither file bytes nor raw extracted text are ever committed to our database.
            </p>
          </div>

          <div className="space-y-2 border-t border-hairline pt-4">
            <div className="text-xs font-mono text-accent font-bold">02 / CITATION AUDIT</div>
            <h3 className="font-serif font-bold text-base text-ink">Deterministic Verification</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              We never ask a generative model whether a citation is valid. A pure-Python verification algorithm cross-checks citations against indexed statutory provisions and full-text primary records.
            </p>
          </div>

          <div className="space-y-2 border-t border-hairline pt-4">
            <div className="text-xs font-mono text-accent font-bold">03 / MULTI-JURISDICTION</div>
            <h3 className="font-serif font-bold text-base text-ink">BD, US &amp; EU Statute Harmonization</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              Cross-border contracts often trigger conflicting rules. Our hybrid ChromaDB + BM25 retrieval captures regulatory exposures across Bangladesh, US federal, and European Union commercial law.
            </p>
          </div>
        </div>
      </section>

      {/* Honest Scope & Limitations Table */}
      <section className="space-y-6 border-t border-hairline pt-16">
        <div>
          <span className="text-xs font-mono uppercase text-ink-subtle">Honest Scope</span>
          <h2 className="text-2xl font-serif font-bold text-ink mt-1">
            What Juris AI Does and Does Not Do
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs font-sans">
          <div className="p-5 bg-white border border-hairline rounded-lg space-y-3 shadow-subtle">
            <h3 className="font-serif font-bold text-sm text-[#1B6E42]">What Juris AI Does</h3>
            <ul className="space-y-2 text-ink-muted">
              <li>• Identifies non-obvious clause interactions and vertical competition restraints.</li>
              <li>• Evaluates governing law conflicts across Bangladesh, United States, and the EU.</li>
              <li>• Categorises legal citations into 3 transparent verification tiers.</li>
              <li>• Generates replacement mitigation clauses ready for counsel review.</li>
              <li>• Permanently discards source documents after in-memory extraction.</li>
            </ul>
          </div>

          <div className="p-5 bg-white border border-hairline rounded-lg space-y-3 shadow-subtle">
            <h3 className="font-serif font-bold text-sm text-accent">What Juris AI Does Not Do</h3>
            <ul className="space-y-2 text-ink-muted">
              <li>• Does not provide formal legal advice or substitute for licensed counsel.</li>
              <li>• Does not store or retain uploaded client agreements on disk or in the database.</li>
              <li>• Does not allow unverified or hallucinated citations into final legal memoranda.</li>
              <li>• Does not sell, share, or train AI foundation models on uploaded document text.</li>
              <li>• Does not support jurisdictions outside the loaded BD, US, and EU corpus.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Editorial Bottom Callout */}
      <section className="bg-paper-warm border border-hairline rounded-lg p-8 sm:p-12 text-center space-y-4">
        <h2 className="text-2xl font-serif font-bold text-ink">
          Examine your agreement against statutory law today.
        </h2>
        <p className="text-xs text-ink-muted max-w-md mx-auto leading-relaxed font-sans">
          Upload a sample contract or paste scenario text. Review risks, verify citations, and export structured memoranda.
        </p>
        <div className="pt-2">
          <Link href="/analyze">
            <Button size="lg" variant="primary">
              Begin Contract Analysis
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
