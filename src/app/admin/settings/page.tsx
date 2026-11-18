"use client";

import React, { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSettings(d?.settings || null));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSavedMessage(null);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings);
      setSavedMessage("System settings saved.");
    }
  }

  if (!settings) {
    return <div className="text-sm text-slate-600">Loading settings...</div>;
  }

  return (
    <form
      onSubmit={handleSave}
      className="max-w-3xl mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6"
    >
      <h1 className="text-2xl font-serif font-bold text-[#0b1f33]">
        Quotas & System Policy Settings
      </h1>

      {savedMessage && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          {savedMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-semibold uppercase text-slate-600 mb-1">
            Common Analyses / Month
          </label>
          <input
            type="number"
            value={settings["quota.common.analyses_per_month"]}
            onChange={(e) =>
              setSettings({
                ...settings,
                "quota.common.analyses_per_month": Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>
        <div>
          <label className="block font-semibold uppercase text-slate-600 mb-1">
            Business Analyses / Month
          </label>
          <input
            type="number"
            value={settings["quota.business.analyses_per_month"]}
            onChange={(e) =>
              setSettings({
                ...settings,
                "quota.business.analyses_per_month": Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>
        <div>
          <label className="block font-semibold uppercase text-slate-600 mb-1">
            Common Chats / Day
          </label>
          <input
            type="number"
            value={settings["quota.common.chat_per_day"]}
            onChange={(e) =>
              setSettings({
                ...settings,
                "quota.common.chat_per_day": Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>
        <div>
          <label className="block font-semibold uppercase text-slate-600 mb-1">
            Business Chats / Day
          </label>
          <input
            type="number"
            value={settings["quota.business.chat_per_day"]}
            onChange={(e) =>
              setSettings({
                ...settings,
                "quota.business.chat_per_day": Number(e.target.value),
              })
            }
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>
        <div>
          <label className="block font-semibold uppercase text-slate-600 mb-1">
            Max Upload Size (MB, clamped 1 to 4 MB)
          </label>
          <input
            type="number"
            min={1}
            max={4}
            value={settings.max_upload_mb}
            onChange={(e) =>
              setSettings({
                ...settings,
                max_upload_mb: Math.min(4, Math.max(1, Number(e.target.value))),
              })
            }
            className="w-full px-3 py-2 rounded border border-slate-300"
          />
        </div>
        <div className="flex items-center pt-5">
          <label className="flex items-center gap-2 font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={Boolean(settings.mask_pii)}
              onChange={(e) => setSettings({ ...settings, mask_pii: e.target.checked })}
            />
            Mask PII (`[EMAIL]`, `[PHONE]`, `[ID]`) before sending to RAG
          </label>
        </div>
      </div>

      <button
        type="submit"
        className="px-5 py-2.5 rounded bg-[#0b1f33] text-white text-xs font-semibold"
      >
        Save System Settings
      </button>
    </form>
  );
}
