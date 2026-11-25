"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfileSettingsPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [region, setRegion] = useState<"BD" | "US" | "EU">("BD");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        setFullName(data.user.fullName || "");
        setOrganisation(data.user.organisation || "");
        setRegion(data.user.region || "BD");
        setAvatarUrl(data.user.avatarUrl || null);
        setLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      setError("Profile image must be under 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
        setError("");
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          organisation: organisation.trim() || null,
          region,
          avatarUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to update profile.");
      } else {
        setMessage("Profile and avatar updated.");
        router.refresh();
      }
    } catch {
      setError("Unable to save profile changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs font-mono text-[#B4B0C2]">
        Loading Profile...
      </div>
    );
  }

  const initials = fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between border-b border-[#2E2B44] pb-4">
        <div>
          <Link href="/settings" className="text-xs text-[#F2EFE9] hover:underline">
            &larr; Back to Settings
          </Link>
          <h1 className="text-3xl font-serif font-light text-[#F2EFE9] mt-1">
            Profile &amp; Avatar
          </h1>
        </div>
      </div>

      <form onSubmit={handleSave} className="vellum-card rounded p-6 sm:p-8 space-y-6">
        {message && (
          <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#7DD3B0] text-xs font-medium">
            {message}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#F5A3A8] text-xs font-medium">
            {error}
          </div>
        )}

        {/* Avatar Upload */}
        <div className="flex items-center gap-5 pb-5 border-b border-[#2E2B44]">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile Avatar"
              className="w-16 h-16 rounded-full object-cover border border-[#2E2B44]"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#D6A86E] text-[#12111D] font-semibold font-serif text-xl font-semibold flex items-center justify-center">
              {initials}
            </div>
          )}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <label className="px-3.5 py-1.5 rounded-lg border border-[#2E2B44] bg-[#131220] hover:bg-[#1A1829] text-xs font-medium text-[#F2EFE9] cursor-pointer editorial-transition">
                Upload Image
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
              {avatarUrl && (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(null)}
                  className="text-xs text-[#F5A3A8] hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#B4B0C2]">PNG, JPG, or WebP up to 1 MB.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#F2EFE9]">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#2E2B44] bg-[#131220] text-sm text-[#F2EFE9]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#F2EFE9]">Organisation</label>
            <input
              type="text"
              value={organisation}
              onChange={(e) => setOrganisation(e.target.value)}
              placeholder="Optional company or chambers name"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#2E2B44] bg-[#131220] text-sm text-[#F2EFE9]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#F2EFE9]">Primary Region / Jurisdiction</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value as "BD" | "US" | "EU")}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#2E2B44] bg-[#131220] text-sm text-[#F2EFE9]"
            >
              <option value="BD">Bangladesh (BD)</option>
              <option value="US">United States (US)</option>
              <option value="EU">European Union (EU)</option>
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-[#D6A86E] hover:bg-[#C49356] text-[#12111D] font-semibold text-xs font-medium editorial-transition"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
