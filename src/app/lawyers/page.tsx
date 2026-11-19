"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/ui/primitives";

interface LawyerProfile {
  id: string;
  name: string;
  title: string;
  firm: string;
  jurisdiction: "BD" | "US" | "EU";
  location: string;
  admissions: string[];
  specializations: string[];
  experienceYears: number;
  contactEmail: string;
  phone: string;
  bio: string;
  verified: boolean;
}

const LAWYERS: LawyerProfile[] = [
  {
    id: "bd-01",
    name: "Barrister Rafiqul Islam, KC",
    title: "Senior Advocate, Supreme Court of Bangladesh",
    firm: "Islam & Associates Legal Counsel",
    jurisdiction: "BD",
    location: "Dhaka, Bangladesh",
    admissions: ["Supreme Court of Bangladesh (Appellate Division)", "Lincoln's Inn, London"],
    specializations: ["Bangladesh Competition Act 2012", "Contract Act 1872 Enforceability", "Commercial Arbitration 2001"],
    experienceYears: 24,
    contactEmail: "rafiq.islam@islamlaw.bd",
    phone: "+880 2 956 4412",
    bio: "Lead counsel in landmark vertical restraint, resale price maintenance disputes, and cross-border commercial joint ventures before the High Court and Appellate Division of Bangladesh.",
    verified: true,
  },
  {
    id: "us-01",
    name: "Eleanor Vance, Esq.",
    title: "Partner, Antitrust & Trade Regulation",
    firm: "Sterling, Cross & Vance LLP",
    jurisdiction: "US",
    location: "New York, NY / Washington, DC",
    admissions: ["New York State Bar", "District of Columbia Bar", "U.S. Court of Appeals (2nd & D.C. Cir.)"],
    specializations: ["Sherman Act § 1 & § 2", "Clayton Act § 3 Exclusive Dealing", "UCC § 2-302 Unconscionability"],
    experienceYears: 18,
    contactEmail: "evance@sterlingcross.com",
    phone: "+1 (212) 840-2190",
    bio: "Defends cross-border supply chains and technology distributors in DOJ/FTC investigations, territorial market allocation claims, and federal antitrust litigation.",
    verified: true,
  },
  {
    id: "eu-01",
    name: "Dr. Maximilian Becker",
    title: "Partner, EU Competition & Regulatory Law",
    firm: "Becker, Vogel & Partners",
    jurisdiction: "EU",
    location: "Brussels, Belgium / Frankfurt, Germany",
    admissions: ["Brussels Bar (EU List)", "Frankfurt Bar (Rechtsanwalt)", "European Court of Justice"],
    specializations: ["TFEU Article 101/102", "Vertical Block Exemption (VBER 2022/720)", "Cross-Border Commercial Distribution"],
    experienceYears: 21,
    contactEmail: "m.becker@bv-law.eu",
    phone: "+32 2 401 6850",
    bio: "Advises multinational enterprises on European Commission competition probes, dual pricing, selective distribution compliance, and multi-state judicial enforcement across the EU single market.",
    verified: true,
  },
  {
    id: "bd-02",
    name: "Advocate Nusrat Jahan",
    title: "Partner, Corporate & Commercial Advisory",
    firm: "Apex Juris Chambers",
    jurisdiction: "BD",
    location: "Chittagong / Dhaka, Bangladesh",
    admissions: ["High Court Division, Supreme Court of Bangladesh"],
    specializations: ["Foreign Investment & Exchange Regulations", "Liquidated Damages Disputes", "Supply Agreements"],
    experienceYears: 14,
    contactEmail: "nusrat.jahan@apexjuris.bd",
    phone: "+880 31 621 009",
    bio: "Focuses on transnational supplier-distributor contractual risk mitigation, limitation of liability enforcement, and regulatory compliance under Bangladeshi trade statutes.",
    verified: true,
  },
  {
    id: "us-02",
    name: "Marcus Thorne, Esq.",
    title: "Commercial Disputes & Distribution Counsel",
    firm: "Thorne & Mercer LLP",
    jurisdiction: "US",
    location: "San Francisco, CA",
    admissions: ["California State Bar", "U.S. District Court (N.D. Cal.)"],
    specializations: ["Vertical Restraints", "IP Licensing Covenants", "Choice of Law / Forum Selection"],
    experienceYears: 16,
    contactEmail: "mthorne@thornelaw.com",
    phone: "+1 (415) 790-3320",
    bio: "Represents software and manufacturing vendors in distributor termination disputes, post-employment restrictive covenants, and interstate commerce enforceability challenges.",
    verified: true,
  },
  {
    id: "eu-02",
    name: "Claire Dubois, Avocat",
    title: "Senior Counsel, International Arbitral Enforcement",
    firm: "Dubois & Associés",
    jurisdiction: "EU",
    location: "Paris, France",
    admissions: ["Paris Bar", "International Chamber of Commerce (ICC) Court"],
    specializations: ["New York Convention Enforcement", "EU Mandatory Rules", "Supply Chain Risk"],
    experienceYears: 19,
    contactEmail: "cdubois@dubois-avocats.fr",
    phone: "+33 1 42 68 55 00",
    bio: "Specializes in multi-jurisdictional arbitral awards, nullifying void non-compete covenants, and overcoming conflicting governing-law provisions between non-EU contracts and EU mandatory law.",
    verified: true,
  },
];

export default function RecommendedLawyersPage() {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [consultModalLawyer, setConsultModalLawyer] = useState<LawyerProfile | null>(null);
  const [consultSubmitted, setConsultSubmitted] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  const filteredLawyers = LAWYERS.filter((l) => {
    if (selectedJurisdiction !== "ALL" && l.jurisdiction !== selectedJurisdiction) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = l.name.toLowerCase().includes(q);
      const matchFirm = l.firm.toLowerCase().includes(q);
      const matchSpec = l.specializations.some((s) => s.toLowerCase().includes(q));
      if (!matchName && !matchFirm && !matchSpec) return false;
    }
    return true;
  });

  function handleSendConsultRequest(e: React.FormEvent) {
    e.preventDefault();
    setConsultSubmitted(true);
    setTimeout(() => {
      setConsultSubmitted(false);
      setConsultModalLawyer(null);
      setNotes("");
    }, 2500);
  }

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="border-b border-hairline pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-paper-warm border border-hairline text-xs font-mono text-ink-muted mb-2">
            <span>Verified Advisory Network</span>
            <span>·</span>
            <span>Tri-Jurisdictional Practitioners</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-ink tracking-tight">
            Recommended Legal Practitioners
          </h1>
          <p className="text-sm text-ink-muted font-sans mt-1 max-w-2xl">
            Retain qualified Advocates, Barristers, and Antitrust Partners to formalize opinions, negotiate redlines, or enforce commercial agreements across Bangladesh, the United States, and the European Union.
          </p>
        </div>

        <Link href="/analyze">
          <Button variant="primary">
            Analyse Contract Before Consulting →
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-hairline shadow-subtle flex flex-wrap items-center justify-between gap-4">
        {/* Jurisdiction Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-ink-subtle mr-1">Jurisdiction:</span>
          {[
            { id: "ALL", label: "All Jurisdictions" },
            { id: "BD", label: "Bangladesh (BD)" },
            { id: "US", label: "United States (US)" },
            { id: "EU", label: "European Union (EU)" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedJurisdiction(tab.id)}
              className={`px-3 py-1.5 rounded transition-colors ${
                selectedJurisdiction === tab.id
                  ? "bg-slate-900 text-white font-semibold"
                  : "bg-paper-warm text-ink-muted hover:text-ink border border-hairline"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search by name, statute, or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 border border-hairline rounded text-xs font-sans focus:outline-none focus:border-slate-500"
          />
        </div>
      </div>

      {/* Lawyers Directory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLawyers.map((lawyer) => (
          <div
            key={lawyer.id}
            className="bg-white rounded-lg border border-hairline shadow-subtle p-6 flex flex-col justify-between space-y-5 hover:border-slate-400 transition-colors"
          >
            <div className="space-y-3">
              {/* Top Meta */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-serif text-lg font-bold text-ink leading-snug">
                    {lawyer.name}
                  </h3>
                  <p className="text-xs text-ink-muted font-sans font-medium">{lawyer.title}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{lawyer.firm}</p>
                </div>
                <Badge
                  variant={
                    lawyer.jurisdiction === "BD"
                      ? "high"
                      : lawyer.jurisdiction === "US"
                      ? "medium"
                      : "verified"
                  }
                >
                  {lawyer.jurisdiction === "BD"
                    ? "BD Counsel"
                    : lawyer.jurisdiction === "US"
                    ? "US Counsel"
                    : "EU Counsel"}
                </Badge>
              </div>

              {/* Location & Experience */}
              <div className="text-[11px] font-mono text-ink-muted flex items-center gap-3 pt-1 border-t border-hairline">
                <span>📍 {lawyer.location}</span>
                <span>·</span>
                <span>{lawyer.experienceYears} Years Practice</span>
              </div>

              {/* Bio */}
              <p className="text-xs text-ink leading-relaxed font-sans line-clamp-3">
                {lawyer.bio}
              </p>

              {/* Specializations Badges */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-mono uppercase text-ink-subtle block">Core Expertise</span>
                <div className="flex flex-wrap gap-1.5">
                  {lawyer.specializations.map((spec, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-paper-warm border border-hairline text-ink-muted"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Admissions */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-mono uppercase text-ink-subtle block">Bar Admissions</span>
                <p className="text-[11px] font-mono text-slate-600 truncate">
                  {lawyer.admissions.join(" · ")}
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-hairline flex items-center justify-between gap-2">
              <div className="text-[11px] font-mono text-slate-500 truncate">
                ✉️ {lawyer.contactEmail}
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => setConsultModalLawyer(lawyer)}
              >
                Consult Counsel
              </Button>
            </div>
          </div>
        ))}
      </div>

      {filteredLawyers.length === 0 && (
        <div className="bg-white p-12 text-center rounded-lg border border-hairline space-y-2">
          <p className="font-serif text-lg text-ink font-bold">No legal practitioners found</p>
          <p className="text-xs text-ink-muted font-sans">
            Try adjusting your search criteria or resetting the jurisdiction filter.
          </p>
        </div>
      )}

      {/* Consult Request Modal */}
      {consultModalLawyer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-300 max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-start justify-between border-b border-hairline pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500">Legal Consultation Request</span>
                <h3 className="font-serif text-xl font-bold text-ink">
                  {consultModalLawyer.name}
                </h3>
                <p className="text-xs text-slate-600 font-sans">{consultModalLawyer.firm}</p>
              </div>
              <button
                onClick={() => setConsultModalLawyer(null)}
                className="text-slate-400 hover:text-slate-600 font-mono text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {consultSubmitted ? (
              <div className="p-6 text-center space-y-3 bg-emerald-50 rounded border border-emerald-200">
                <span className="text-2xl">✓</span>
                <h4 className="font-serif font-bold text-emerald-950 text-base">Consultation Request Dispatched</h4>
                <p className="text-xs text-emerald-800 font-sans">
                  Your engagement memorandum has been sent to {consultModalLawyer.contactEmail}. Counsel will reach out within 1 business day.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendConsultRequest} className="space-y-4 text-xs font-sans">
                <p className="text-ink-muted leading-relaxed">
                  Brief {consultModalLawyer.name} regarding your contract risk report. All communications remain subject to attorney-client confidentiality.
                </p>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-ink-muted mb-1">
                    Engagement Summary / Contract Context
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Briefly state your transaction scope, counterparties, or specific concern (e.g. non-compete duration, liquidated damages validity under local law)..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 border border-hairline rounded font-sans text-xs focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div className="p-3 bg-paper-warm rounded border border-hairline text-[11px] font-mono text-ink-muted space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Direct Email:</span>
                    <strong className="text-ink">{consultModalLawyer.contactEmail}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Chambers Phone:</span>
                    <strong className="text-ink">{consultModalLawyer.phone}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setConsultModalLawyer(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Send Engagement Brief
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
