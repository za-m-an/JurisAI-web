import React from "react";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <h1 className="text-3xl font-serif font-bold text-[#0b1f33]">
        Juris AI Privacy & Data Handling Statement
      </h1>
      <p className="text-sm text-slate-600">
        Effective Date: November 2026 — Designed for strict confidentiality and zero document persistence.
      </p>

      <section className="space-y-2">
        <h2 className="text-xl font-serif font-bold text-[#0b1f33]">
          1. Upload-Analyse-Discard Architecture (Zero File Storage)
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          When you upload a PDF, DOCX, or TXT contract to Juris AI, the file bytes are read exclusively into volatile application memory (`await file.arrayBuffer()`). We verify the file format using magic bytes, extract the text in memory, compute a SHA-256 checksum for your audit reference, and immediately discard the raw file buffer in a `finally` block. Neither your uploaded file nor the extracted raw contract text is ever written to disk, temporary directories, logs, or our PostgreSQL database.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-serif font-bold text-[#0b1f33]">
          2. Automatic PII Masking Before Analysis
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          When PII masking is enabled (the default system setting), Juris AI automatically scrubs email addresses (`[EMAIL]`), phone numbers (`[PHONE]`), and 9+ digit identification or bank account numbers (`[ID]`) in memory before transmitting the text to the RAG analysis service, while preserving corporate party names required for legal reasoning.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-serif font-bold text-[#0b1f33]">
          3. What Is Stored in Your Account
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          Our database stores only: (a) your account profile and bcrypt-hashed password (cost 12); (b) document metadata (`doc_name`, `doc_size`, `doc_mime`, `doc_sha256`, and selected `jurisdictions`); (c) the structured risk analysis output and generated Markdown memorandum; and (d) your legal chat conversations.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-serif font-bold text-[#0b1f33]">
          4. Privacy by Design (Admin Isolation & Full Account Deletion)
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          System administrators can view aggregate usage counts and manage user roles or quotas, but are architecturally blocked from reading any user&apos;s contract analyses or chat transcripts. You may export all of your data as JSON (`/api/account/export`), delete individual analyses or conversations, or permanently delete your entire account and all associated records (`/api/account`) at any time.
        </p>
      </section>
    </div>
  );
}
