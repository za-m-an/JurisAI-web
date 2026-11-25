"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SettingsHubPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{
    fullName: string;
    email: string;
    region: string;
    language: string;
    subscriptionTier: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-xs font-mono uppercase tracking-wider text-[#5b6472]">
          Loading Settings...
        </div>
      </div>
    );
  }

  const sections = [
    {
      href: "/settings/profile",
      tag: "01 — Identity",
      title: "Profile & Avatar",
      desc: "Update your name, organisation, primary region, and upload a custom profile avatar.",
      current: user?.fullName || "Manage Profile",
    },
    {
      href: "/settings/language",
      tag: "02 — Localization",
      title: "Language & Regional Format",
      desc: "Switch application language (English / বাংলা) and regional legal formatting preferences.",
      current: user?.language === "bn" ? "বাংলা (Bengali)" : "English",
    },
    {
      href: "/settings/subscription",
      tag: "03 — Plan & Billing",
      title: "Subscription & Tier",
      desc: "Review monthly document allowance, upgrade your legal tier, or manage plan limits.",
      current: `${(user?.subscriptionTier || "Standard").toUpperCase()} Plan`,
    },
    {
      href: "/settings/security",
      tag: "04 — Account Security",
      title: "Password & Account Control",
      desc: "Update your password, revoke all active browser sessions, or permanently delete your account.",
      current: "Protected Session",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="space-y-2 border-b border-[#E0E2E4] pb-6">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#ff4716]">
          Preferences
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-light text-[#121719]">
          Account Settings
        </h1>
        <p className="text-sm text-[#5b6472]">
          Select a section below to manage your profile, language, subscription, or security.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {sections.map((sec) => (
          <Link
            key={sec.href}
            href={sec.href}
            className="vellum-card rounded p-6 flex flex-col justify-between hover:border-[#121719]/50 editorial-transition group"
          >
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff4716]">
                {sec.tag}
              </span>
              <h2 className="font-serif text-xl font-medium text-[#121719] group-hover:text-[#121719] editorial-transition">
                {sec.title}
              </h2>
              <p className="text-xs text-[#5b6472] leading-relaxed">{sec.desc}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E0E2E4] flex items-center justify-between text-xs">
              <span className="font-mono text-[11px] text-[#5b6472]">{sec.current}</span>
              <span className="font-medium text-[#121719]">Open &rarr;</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
