"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface LawFirm {
  id: string;
  name: string;
  leadCounsel: string;
  region: "BD" | "US" | "EU";
  city: string;
  specialties: string[];
  experienceYears: number;
  aiRating: number;
  notableCases: string[];
  recentNews: string;
  contact: {
    phone: string;
    email: string;
    address: string;
  };
}

export default function LawFirmsPage() {
  const router = useRouter();
  const [region, setRegion] = useState<"BD" | "US" | "EU">("BD");
  const [firms, setFirms] = useState<LawFirm[]>([]);
  const [matchedCaseTitle, setMatchedCaseTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        if (data.user.region) {
          setRegion(data.user.region);
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    let active = true;
    fetch(`/api/law-firms?region=${region}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setFirms(data.lawFirms || []);
        setMatchedCaseTitle(data.matchedCaseTitle || null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [region]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-xs font-mono uppercase tracking-wider text-[#5b6472]">
          Matching Regional Law Firms...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E0E2E4] pb-6">
        <div className="space-y-2">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#ff4716]">
            Institutional Representation
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#121719]">
            Recommended Law Firms &amp; Barristers
          </h1>
          <p className="text-sm text-[#5b6472] max-w-2xl">
            Curated chambers rated automatically by experience, practice field, and
            suitability for your analyzed case.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#5b6472]">Region:</span>
          {(["BD", "US", "EU"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRegion(r)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-medium editorial-transition border ${
                region === r
                  ? "bg-[#121719] text-[#F3F3F3] border-[#121719]"
                  : "bg-white text-[#5b6472] border-[#E0E2E4] hover:text-[#121719]"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {matchedCaseTitle && (
        <div className="p-4 rounded bg-[#121719]/5 border border-[#121719]/20 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-[#121719]">
            <strong>AI Ranking Active:</strong> Rankings calibrated for{" "}
            <span className="font-semibold">{matchedCaseTitle}</span>.
          </p>
          <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-[#121719]/20 text-[#121719]">
            Experience &amp; Field Matched
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {firms.map((firm) => (
          <article key={firm.id} className="vellum-card rounded p-6 sm:p-8 space-y-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#E0E2E4] pb-5">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-serif text-2xl font-medium text-[#121719]">{firm.name}</h2>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#F3F3F3] border border-[#E0E2E4] text-[#5b6472]">
                    {firm.city} · {firm.experienceYears} yrs experience
                  </span>
                </div>
                <p className="text-sm font-medium text-[#121719]">{firm.leadCounsel}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {firm.specialties.map((s) => (
                    <span
                      key={s}
                      className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#F3F3F3] border border-[#E0E2E4] text-[#5b6472]"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="shrink-0 p-3.5 rounded bg-[#F3F3F3] border border-[#E0E2E4] text-center min-w-[120px]">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#5b6472]">
                  AI Case Rating
                </div>
                <div className="text-2xl font-serif font-bold text-[#121719] mt-0.5">
                  {firm.aiRating}
                  <span className="text-xs font-normal text-[#5b6472]">/100</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#ff4716] font-semibold">
                  Recent Firm News
                </span>
                <p className="text-[#5b6472] leading-relaxed">
                  {firm.recentNews || "Active commercial & statutory representation."}
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#ff4716] font-semibold">
                  Notable Precedents &amp; Cases
                </span>
                <ul className="space-y-2 text-[#5b6472]">
                  {firm.notableCases.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#121719] font-bold mt-0.5">·</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 p-4 rounded bg-[#F3F3F3] border border-[#E0E2E4]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#121719] font-semibold">
                  Chambers Contact Details
                </span>
                <div className="space-y-1.5 text-[#121719] pt-1">
                  <p>
                    <strong className="text-[#5b6472] font-normal">Tel:</strong> {firm.contact.phone}
                  </p>
                  <p>
                    <strong className="text-[#5b6472] font-normal">Email:</strong>{" "}
                    <a href={`mailto:${firm.contact.email}`} className="text-[#121719] hover:underline">
                      {firm.contact.email}
                    </a>
                  </p>
                  <p>
                    <strong className="text-[#5b6472] font-normal">Address:</strong> {firm.contact.address}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
