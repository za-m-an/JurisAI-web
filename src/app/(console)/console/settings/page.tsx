"use client";

import React, { useEffect, useState } from "react";

export default function ConsoleSettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/console/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings) setSettings(data.settings);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/console/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        "quota.common.analyses_per_month": Number(settings["quota.common.analyses_per_month"] ?? 3),
        "quota.business.analyses_per_month": Number(settings["quota.business.analyses_per_month"] ?? 30),
        "quota.lawyer.analyses_per_month": Number(settings["quota.lawyer.analyses_per_month"] ?? 30),
        "quota.common.chat_per_day": Number(settings["quota.common.chat_per_day"] ?? 30),
        "quota.business.chat_per_day": Number(settings["quota.business.chat_per_day"] ?? 100),
      }),
    });
    if (res.ok) setMessage("Monthly and daily allowances saved.");
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-xs font-mono uppercase text-[#5b6472]">
        Loading Allowances...
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6 pb-10">
      <div className="border-b border-[#E0E2E4] pb-5">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#ff4716]">
          Quotas &amp; Tiers
        </span>
        <h1 className="text-3xl font-serif font-light text-[#121719]">
          Subscription Limits
        </h1>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-xs font-medium">
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="vellum-card rounded p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#121719]">
              Individual Monthly Analyses
            </label>
            <input
              type="number"
              value={settings["quota.common.analyses_per_month"] ?? 3}
              onChange={(e) =>
                setSettings({ ...settings, "quota.common.analyses_per_month": e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#121719]">
              Business Monthly Analyses
            </label>
            <input
              type="number"
              value={settings["quota.business.analyses_per_month"] ?? 30}
              onChange={(e) =>
                setSettings({ ...settings, "quota.business.analyses_per_month": e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#121719]">
              Individual Daily Copilot Chats
            </label>
            <input
              type="number"
              value={settings["quota.common.chat_per_day"] ?? 30}
              onChange={(e) =>
                setSettings({ ...settings, "quota.common.chat_per_day": e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#121719]">
              Business Daily Copilot Chats
            </label>
            <input
              type="number"
              value={settings["quota.business.chat_per_day"] ?? 100}
              onChange={(e) =>
                setSettings({ ...settings, "quota.business.chat_per_day": e.target.value })
              }
              className="w-full px-3.5 py-2 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-[#121719] hover:bg-[#222729] text-[#F3F3F3] text-xs font-medium"
          >
            Save Allowances
          </button>
        </div>
      </form>
    </div>
  );
}
