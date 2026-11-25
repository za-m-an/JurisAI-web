import React from "react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="space-y-16 pb-12">
      {/* Asymmetric Editorial Hero */}
      <section className="editorial-grid-bg border border-[#E5E2DC] rounded-2xl bg-[#FAF9F6] p-8 sm:p-12 lg:p-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#E5E2DC] bg-white text-[11px] font-mono uppercase tracking-wider text-[#52525B]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#134E4A]" />
              Bangladesh · United States · European Union
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-medium text-[#18181B] leading-[1.08] tracking-tight">
              Authoritative legal counsel for every contract you sign.
            </h1>

            <p className="text-base sm:text-lg text-[#52525B] max-w-xl leading-relaxed">
              Juris AI examines commercial agreements against statutory codes,
              identifies unenforceable clauses, prepares institutional legal
              memoranda, and connects you with top-rated advocates in your jurisdiction.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#134E4A] hover:bg-[#0F3F3C] text-[#FAF9F6] text-sm font-medium editorial-transition shadow-sm"
              >
                <span>Get Started</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <span className="text-xs font-mono uppercase tracking-wider text-[#71717A]">
                Statutory &amp; Precedent Grounded
              </span>
            </div>
          </div>

          {/* Authentic Legal Memorandum Preview Card (Anti-AI Guardrail: Real Product UI) */}
          <div className="lg:col-span-5">
            <div className="vellum-card rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E5E2DC] bg-[#FAF9F6] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#71717A]">
                    REF: JRS-2026-8F4A2C
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#134E4A]/10 text-[#134E4A] font-medium">
                  BD Governing Law
                </span>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <h3 className="font-serif text-lg font-medium text-[#18181B]">
                    Commercial Supply &amp; Distribution Agreement
                  </h3>
                  <p className="text-xs text-[#71717A] mt-0.5">
                    3 Statutory Risk Vectors Identified · Formal Letterhead Ready
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 rounded-lg border border-[#E5E2DC] bg-[#FAF9F6]/60">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#18181B]">
                        Clause 3.1 — Post-Termination Restraint
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]">
                        High Risk
                      </span>
                    </div>
                    <p className="text-xs text-[#52525B] leading-relaxed">
                      Void under Section 27 of the Contract Act 1872; post-termination
                      territorial trade bans are unenforceable unless tied to goodwill sale.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg border border-[#E5E2DC] bg-[#FAF9F6]/60">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-[#18181B]">
                        Clause 2.3 — Stipulated Penalty Interest
                      </span>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A]">
                        Moderate
                      </span>
                    </div>
                    <p className="text-xs text-[#52525B] leading-relaxed">
                      Subject to reasonable compensation limits under Section 74;
                      automatic punitive forfeiture will be reduced by courts.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E2DC] flex items-center justify-between text-[11px] font-mono text-[#166534]">
                  <span>✓ Verified Statutory Citations</span>
                  <span className="text-[#B45309]">Institutional PDF Export</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architectural 3-Column Capabilities */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#E5E2DC] rounded-xl bg-white overflow-hidden">
        <div className="p-8 border-b md:border-b-0 md:border-r border-[#E5E2DC] space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#B45309]">
            01 — Document Analyzer
          </span>
          <h2 className="text-2xl font-serif font-medium text-[#18181B]">
            Statutory Clause Audit
          </h2>
          <p className="text-sm text-[#52525B] leading-relaxed">
            Upload agreements, select your governing jurisdiction, and add case
            context. Receive structured risk findings and formal letterhead memoranda
            ready for submission to legal institutions.
          </p>
        </div>

        <div className="p-8 border-b md:border-b-0 md:border-r border-[#E5E2DC] space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#B45309]">
            02 — Legal Copilot
          </span>
          <h2 className="text-2xl font-serif font-medium text-[#18181B]">
            Strategic Case Counsel
          </h2>
          <p className="text-sm text-[#52525B] leading-relaxed">
            Expand any analysis report directly into your private Copilot workspace.
            Review actionable next steps, negotiation leverage, and statutory remedies
            tailored to your case.
          </p>
        </div>

        <div className="p-8 space-y-3">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#B45309]">
            03 — Regional Law Firms
          </span>
          <h2 className="text-2xl font-serif font-medium text-[#18181B]">
            Verified Counsel Matching
          </h2>
          <p className="text-sm text-[#52525B] leading-relaxed">
            Browse top-rated law firms and barristers in your region, complete with
            AI-evaluated case ratings, practice histories, and direct representation
            contact details.
          </p>
        </div>
      </section>
    </div>
  );
}
