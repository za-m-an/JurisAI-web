import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/primitives";

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-hairline pb-6 space-y-2">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#7B1E22]/10 border border-[#7B1E22]/20 text-[#7B1E22] text-xs font-semibold">
          <span>Privacy & Confidentiality</span>
          <span className="text-[#7B1E22]/40">·</span>
          <span>Zero Document Storage</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          Privacy Policy & Data Handling Mandate
        </h1>
        <p className="text-xs text-ink-muted">
          Effective Date: November 2026 · Built specifically for commercial confidentiality and privilege protection.
        </p>
      </div>

      <div className="space-y-6">
        {/* Section 1 */}
        <section className="bg-white border border-hairline rounded-lg p-6 shadow-subtle space-y-2">
          <h2 className="font-serif text-lg font-bold text-ink">
            1. The Upload-Analyse-Discard Architecture
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            When you submit a legal document (PDF, DOCX, or TXT) to Juris AI, the raw bytes are buffered strictly in volatile application RAM during parsing via memory streams. We calculate an ephemeral SHA-256 hash for your verification audit trail, extract terms, and execute the analysis.
          </p>
          <p className="text-xs sm:text-sm text-ink leading-relaxed font-semibold text-[#1B6E42]">
            Neither raw document files nor extracted source text are ever written to disk, temporary OS storage, or the database.
          </p>
        </section>

        {/* Section 2 */}
        <section className="bg-white border border-hairline rounded-lg p-6 shadow-subtle space-y-2">
          <h2 className="font-serif text-lg font-bold text-ink">
            2. Automatic In-Memory PII Masking
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Prior to forwarding document text to the inference service, our in-memory token sanitizer strips email addresses (<code>[EMAIL]</code>), direct telephone numbers (<code>[PHONE]</code>), and 9+ digit identifiers or account codes (<code>[ID]</code>), while preserving commercial entity names necessary for antitrust and party-capacity legal reasoning.
          </p>
        </section>

        {/* Section 3 */}
        <section className="bg-white border border-hairline rounded-lg p-6 shadow-subtle space-y-2">
          <h2 className="font-serif text-lg font-bold text-ink">
            3. Account Data & Full Data Portability
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Our PostgreSQL database stores only: (1) your user profile and bcrypt-hashed password (cost 12); (2) audit metadata (file name, SHA-256 fingerprint, jurisdiction tags); (3) the resulting structured risk assessment and generated markdown memorandum; and (4) your research conversation logs.
          </p>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            You may export all stored analysis data as JSON via <code>/api/account/export</code> or permanently purge your account and all associated records at any time.
          </p>
        </section>

        {/* Section 4 */}
        <section className="bg-white border border-hairline rounded-lg p-6 shadow-subtle space-y-2">
          <h2 className="font-serif text-lg font-bold text-ink">
            4. Administrative Isolation
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            System administrators monitor system health and aggregated usage telemetry through an isolated administrative console protected by multi-factor authentication (TOTP). Administrative accounts are structurally prohibited from viewing, reading, or decrypting user contract analyses or conversation threads.
          </p>
        </section>
      </div>

      <div className="pt-4 border-t border-hairline flex items-center justify-between">
        <Link href="/how-verification-works">
          <Button variant="outline" size="sm">
            ← How Citation Verification Works
          </Button>
        </Link>
        <Link href="/analyze">
          <Button variant="primary" size="sm">
            Begin Analysis
          </Button>
        </Link>
      </div>
    </div>
  );
}
