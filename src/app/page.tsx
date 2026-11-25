import React from "react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="space-y-16 pb-12">
      {/* Spellbook-inspired Dark Obsidian Hero Mode (u-mode-dark) */}
      <section className="u-mode-dark editorial-grid-bg rounded border border-[#222729] px-8 py-14 sm:px-14 sm:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-7">
            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-sm border border-[#414547] bg-[#222729] text-[11px] font-mono uppercase tracking-wider text-[#acaeae]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff4716]" />
              Bangladesh · United States · European Union
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[4.25rem] font-serif font-light text-white leading-[1.02] tracking-[-0.04em]">
              Authoritative legal counsel for every contract you sign.
            </h1>

            <p className="text-lg sm:text-xl text-[#acaeae] max-w-xl leading-[1.45] font-normal">
              Juris AI examines commercial agreements against statutory codes,
              identifies unenforceable clauses, prepares institutional legal
              memoranda, and connects you with top-rated advocates in your region.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-5">
              <Link
                href="/login"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded bg-[#ff4716] hover:bg-[#e03a0e] text-white text-sm font-medium editorial-transition"
              >
                <span>Get Started</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <span className="text-xs font-mono uppercase tracking-wider text-[#acaeae]">
                Statutory &amp; Precedent Grounded
              </span>
            </div>
          </div>

          {/* Dark Charcoal Product Stage (sb-dark-card, 0.25rem radius) */}
          <div className="lg:col-span-5">
            <div className="sb-dark-card overflow-hidden">
              <div className="px-6 py-4 border-b border-[#414547] bg-[#121719] flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#acaeae]">
                  REF: JRS-2026-8F4A2C
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-sm bg-[#ff4716]/15 text-[#ff4716] border border-[#ff4716]/30 font-medium">
                  BD Governing Law
                </span>
              </div>

              <div className="p-7 space-y-5">
                <div>
                  <h3 className="font-serif text-xl font-light text-white tracking-tight">
                    Commercial Supply &amp; Distribution Agreement
                  </h3>
                  <p className="text-xs text-[#acaeae] mt-1">
                    3 Statutory Risk Vectors · Formal Letterhead Ready
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-sm border border-[#414547] bg-[#121719]">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-medium text-white">
                        Clause 3.1 — Post-Termination Restraint
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-[#ff4716]/15 text-[#ff4716]">
                        High Risk
                      </span>
                    </div>
                    <p className="text-xs text-[#acaeae] leading-relaxed">
                      Void under Section 27 of the Contract Act 1872; post-termination
                      territorial trade bans are unenforceable unless tied to goodwill sale.
                    </p>
                  </div>

                  <div className="p-4 rounded-sm border border-[#414547] bg-[#121719]">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-medium text-white">
                        Clause 2.3 — Stipulated Penalty Interest
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-white/10 text-white">
                        Moderate
                      </span>
                    </div>
                    <p className="text-xs text-[#acaeae] leading-relaxed">
                      Subject to reasonable compensation limits under Section 74;
                      automatic punitive forfeiture will be reduced by courts.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#414547] flex items-center justify-between text-[11px] font-mono text-[#acaeae]">
                  <span>✓ Verified Statutory Citations</span>
                  <span className="text-white">Institutional PDF Export</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Light Architectural Grid Section (u-mode-light, 24px gap, 28px padding, 0.25rem radius) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="vellum-card p-7 space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#ff4716]">
            01 — Document Analyzer
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-light text-[#121719]">
            Statutory Clause Audit
          </h2>
          <p className="text-sm text-[#5b6472] leading-relaxed">
            Upload agreements, select your governing jurisdiction, and add case
            context. Receive structured risk findings and formal letterhead memoranda
            ready for submission to legal institutions.
          </p>
        </div>

        <div className="vellum-card p-7 space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#ff4716]">
            02 — Legal Copilot
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-light text-[#121719]">
            Strategic Case Counsel
          </h2>
          <p className="text-sm text-[#5b6472] leading-relaxed">
            Expand any analysis report directly into your private Copilot workspace.
            Review actionable next steps, negotiation leverage, and statutory remedies
            tailored to your case.
          </p>
        </div>

        <div className="vellum-card p-7 space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#ff4716]">
            03 — Regional Law Firms
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-light text-[#121719]">
            Verified Counsel Matching
          </h2>
          <p className="text-sm text-[#5b6472] leading-relaxed">
            Browse top-rated law firms and barristers in your region, complete with
            AI-evaluated case ratings, practice histories, and direct representation
            contact details.
          </p>
        </div>
      </section>
    </div>
  );
}
