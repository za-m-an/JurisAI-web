"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const TIERS = [
  {
    id: "standard" as const,
    name: "Standard",
    price: "Free",
    allowance: "3 document analyses / month · 30 Copilot inquiries / day",
    features: [
      "Full statutory risk identification",
      "Formal letterhead PDF export",
      "Regional law firm directory access",
    ],
  },
  {
    id: "professional" as const,
    name: "Professional",
    price: "$49 / mo",
    allowance: "30 document analyses / month · 100 Copilot inquiries / day",
    features: [
      "Priority cross-border statutory review",
      "Unlimited Expand-to-Copilot case sessions",
      "AI-calibrated law firm suitability scoring",
    ],
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: "$199 / mo",
    allowance: "Unlimited analyses · Dedicated legal counsel routing",
    features: [
      "Multi-jurisdiction BD / US / EU institutional memoranda",
      "Team workspace & corporate letterhead branding",
      "Direct chambers referral priority",
    ],
  },
];

export default function SubscriptionSettingsPage() {
  const router = useRouter();
  const [tier, setTier] = useState<"standard" | "professional" | "enterprise">("standard");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        const t = data.user.subscriptionTier;
        if (t === "professional" || t === "enterprise" || t === "standard") {
          setTier(t);
        }
        setLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function handleSelectTier(newTier: "standard" | "professional" | "enterprise") {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionTier: newTier }),
    });
    if (res.ok) {
      setTier(newTier);
      setMessage(`Subscription updated to ${newTier.toUpperCase()} tier.`);
      router.refresh();
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs font-mono text-[#5b6472]">
        Loading Subscription...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="border-b border-[#E0E2E4] pb-4">
        <Link href="/settings" className="text-xs text-[#121719] hover:underline">
          &larr; Back to Settings
        </Link>
        <h1 className="text-3xl font-serif font-light text-[#121719] mt-1">
          Subscription &amp; Tier Management
        </h1>
      </div>

      {message && (
        <div className="p-3.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-xs font-medium">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {TIERS.map((t) => {
          const active = tier === t.id;
          return (
            <div
              key={t.id}
              className={`vellum-card rounded p-6 flex flex-col justify-between ${
                active ? "border-[#121719] ring-1 ring-[#121719]" : ""
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-xl font-medium text-[#121719]">{t.name}</h2>
                  {active && (
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#121719]/10 text-[#121719] font-semibold">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-2xl font-serif font-normal text-[#121719]">{t.price}</div>
                <p className="text-xs text-[#ff4716] font-medium">{t.allowance}</p>
                <ul className="space-y-2 pt-2 border-t border-[#E0E2E4] text-xs text-[#5b6472]">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <span className="text-[#121719]">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                disabled={active || saving}
                onClick={() => handleSelectTier(t.id)}
                className={`mt-6 w-full py-2.5 rounded-lg text-xs font-medium editorial-transition ${
                  active
                    ? "bg-[#F3F3F3] border border-[#E0E2E4] text-[#5b6472] cursor-default"
                    : "bg-[#121719] hover:bg-[#222729] text-[#F3F3F3]"
                }`}
              >
                {active ? "Current Plan" : `Switch to ${t.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
