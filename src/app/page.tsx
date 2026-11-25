import React from "react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="space-y-16 pb-12">
      {/* Midnight & Champagne Gold Hero Section */}
      <section className="editorial-grid-bg rounded border border-[#2E2B44] bg-[#161524] px-8 py-14 sm:px-14 sm:py-20 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-7">
            <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-sm border border-[#2E2B44] bg-[#1A1829] text-[11px] font-mono uppercase tracking-wider text-[#B4B0C2]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D6A86E]" />
              Bangladesh · United States · European Union
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[4.25rem] font-serif font-light text-[#F2EFE9] leading-[1.02] tracking-[-0.04em]">
              Authoritative legal counsel for every contract you sign.
            </h1>

            <p className="text-lg sm:text-xl text-[#B4B0C2] max-w-xl leading-[1.5] font-normal">
              Juris AI examines commercial agreements against statutory codes,
              identifies unenforceable clauses, prepares institutional legal
              memoranda, and connects you with top-rated advocates in your region.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-5">
              <Link
                href="/login"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded bg-[#D6A86E] hover:bg-[#C49356] text-[#12111D] text-sm font-semibold editorial-transition"
              >
                <span>Get Started</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <span className="text-xs font-mono uppercase tracking-wider text-[#8A859C]">
                Statutory &amp; Precedent Grounded
              </span>
            </div>
          </div>

          {/* Product Stage Card */}
          <div className="lg:col-span-5">
            <div className="vellum-card overflow-hidden">
              <div className="px-6 py-4 border-b border-[#2E2B44] bg-[#131220] flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#B4B0C2]">
                  REF: JRS-2026-8F4A2C
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-0.5 rounded-sm bg-[#D6A86E]/15 text-[#D6A86E] border border-[#D6A86E]/30 font-medium">
                  BD Governing Law
                </span>
              </div>

              <div className="p-7 space-y-5">
                <div>
                  <h3 className="font-serif text-xl font-light text-[#F2EFE9] tracking-tight">
                    Commercial Supply &amp; Distribution Agreement
                  </h3>
                  <p className="text-xs text-[#B4B0C2] mt-1">
                    3 Statutory Risk Vectors · Formal Letterhead Ready
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-sm border border-[#2E2B44] bg-[#131220]">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-medium text-[#F2EFE9]">
                        Clause 3.1 — Post-Termination Restraint
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-[#3B181C] text-[#F5A3A8] border border-[#6E2830]">
                        High Risk
                      </span>
                    </div>
                    <p className="text-xs text-[#B4B0C2] leading-relaxed">
                      Void under Section 27 of the Contract Act 1872; post-termination
                      territorial trade bans are unenforceable unless tied to goodwill sale.
                    </p>
                  </div>

                  <div className="p-4 rounded-sm border border-[#2E2B44] bg-[#131220]">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-medium text-[#F2EFE9]">
                        Clause 2.3 — Stipulated Penalty Interest
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-[#362814] text-[#F2C97D] border border-[#664A1E]">
                        Moderate
                      </span>
                    </div>
                    <p className="text-xs text-[#B4B0C2] leading-relaxed">
                      Subject to reasonable compensation limits under Section 74;
                      automatic punitive forfeiture will be reduced by courts.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2E2B44] flex items-center justify-between text-[11px] font-mono text-[#7DD3B0]">
                  <span>✓ Verified Statutory Citations</span>
                  <span className="text-[#D6A86E]">Institutional PDF Export</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comfortable 3-Column Capabilities */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="vellum-card p-7 space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#D6A86E]">
            01 — Document Analyzer
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-light text-[#F2EFE9]">
            Statutory Clause Audit
          </h2>
          <p className="text-sm text-[#B4B0C2] leading-relaxed">
            Upload agreements, select your governing jurisdiction, and add case
            context. Receive structured risk findings and formal letterhead memoranda
            ready for submission to legal institutions.
          </p>
        </div>

        <div className="vellum-card p-7 space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#D6A86E]">
            02 — Legal Copilot
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-light text-[#F2EFE9]">
            Strategic Case Counsel
          </h2>
          <p className="text-sm text-[#B4B0C2] leading-relaxed">
            Expand any analysis report directly into your private Copilot workspace.
            Review actionable next steps, negotiation leverage, and statutory remedies
            tailored to your case.
          </p>
        </div>

        <div className="vellum-card p-7 space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#D6A86E]">
            03 — Regional Law Firms
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-light text-[#F2EFE9]">
            Verified Counsel Matching
          </h2>
          <p className="text-sm text-[#B4B0C2] leading-relaxed">
            Browse top-rated law firms and barristers in your region, complete with
            AI-evaluated case ratings, practice histories, and direct representation
            contact details.
          </p>
        </div>
      </section>
    </div>
  );
}
