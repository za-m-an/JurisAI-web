"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LanguageSettingsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<"en" | "bn">("en");
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
        setLanguage(data.user.language === "bn" ? "bn" : "en");
        setLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language }),
    });
    if (res.ok) {
      setMessage("Language preference saved.");
      router.refresh();
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs font-mono text-[#71717A]">
        Loading Language Settings...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="border-b border-[#E5E2DC] pb-4">
        <Link href="/settings" className="text-xs text-[#134E4A] hover:underline">
          &larr; Back to Settings
        </Link>
        <h1 className="text-3xl font-serif font-medium text-[#18181B] mt-1">
          Language &amp; Localization
        </h1>
      </div>

      <form onSubmit={handleSave} className="vellum-card rounded-2xl p-6 sm:p-8 space-y-6">
        {message && (
          <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-xs font-medium">
            {message}
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-xs font-medium text-[#18181B]">
            Application &amp; Counsel Language
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { code: "en" as const, name: "English", sub: "Standard International & Statutory English" },
              { code: "bn" as const, name: "বাংলা (Bengali)", sub: "Bangladesh Statutory & Chambers Support" },
            ].map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setLanguage(lang.code)}
                className={`p-4 rounded-xl border text-left editorial-transition ${
                  language === lang.code
                    ? "border-[#134E4A] bg-[#134E4A]/5 ring-1 ring-[#134E4A]"
                    : "border-[#E5E2DC] bg-[#FAF9F6]"
                }`}
              >
                <div className="text-sm font-semibold text-[#18181B]">{lang.name}</div>
                <div className="text-xs text-[#52525B] mt-0.5">{lang.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-[#134E4A] hover:bg-[#0F3F3C] text-[#FAF9F6] text-xs font-medium editorial-transition"
          >
            {saving ? "Saving..." : "Save Language"}
          </button>
        </div>
      </form>
    </div>
  );
}
