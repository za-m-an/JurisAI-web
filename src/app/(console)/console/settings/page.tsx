"use client";

import React, { useEffect, useState } from "react";

export default function ConsoleSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/console/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setSettings(d?.settings || null));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSavedMessage(null);
    const res = await fetch("/api/console/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings);
      setSavedMessage("System policy settings committed to database.");
    }
  }

  if (!settings) {
    return <div className="text-xs font-mono text-slate-500">Loading system settings...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-lg font-mono font-bold text-slate-900 tracking-tight">
          System Operational Policies &amp; Quotas
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          Configure resource thresholds, rate budgets, PII anonymisation, and upload size constraints.
        </p>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 rounded text-xs font-mono">
          {savedMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 rounded border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3">
            <h2 className="text-xs font-bold uppercase text-slate-700">Role Quota Limits</h2>
            <div>
              <label className="block text-[10px] uppercase text-slate-500 mb-1">
                Common Role: Analyses / Month
              </label>
              <input
                type="number"
                value={settings["quota.common.analyses_per_month"] ?? 5}
                onChange={(e) =>
                  setSettings({ ...settings, "quota.common.analyses_per_month": Number(e.target.value) })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-slate-500 mb-1">
                Business Role: Analyses / Month
              </label>
              <input
                type="number"
                value={settings["quota.business.analyses_per_month"] ?? 50}
                onChange={(e) =>
                  setSettings({ ...settings, "quota.business.analyses_per_month": Number(e.target.value) })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-slate-500 mb-1">
                Lawyer Role: Analyses / Month
              </label>
              <input
                type="number"
                value={settings["quota.lawyer.analyses_per_month"] ?? 100}
                onChange={(e) =>
                  setSettings({ ...settings, "quota.lawyer.analyses_per_month": Number(e.target.value) })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-3">
            <h2 className="text-xs font-bold uppercase text-slate-700">Chat &amp; Storage Boundaries</h2>
            <div>
              <label className="block text-[10px] uppercase text-slate-500 mb-1">
                Common Role: Daily Chat Messages
              </label>
              <input
                type="number"
                value={settings["quota.common.chat_messages_per_day"] ?? 20}
                onChange={(e) =>
                  setSettings({ ...settings, "quota.common.chat_messages_per_day": Number(e.target.value) })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-slate-500 mb-1">
                Business Role: Daily Chat Messages
              </label>
              <input
                type="number"
                value={settings["quota.business.chat_messages_per_day"] ?? 200}
                onChange={(e) =>
                  setSettings({ ...settings, "quota.business.chat_messages_per_day": Number(e.target.value) })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono focus:outline-none focus:border-slate-500"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase text-slate-500 mb-1">
                Max Document Upload Size (MB, Clamped 1..4)
              </label>
              <input
                type="number"
                min={1}
                max={4}
                value={settings["max_upload_mb"] ?? 4}
                onChange={(e) =>
                  setSettings({ ...settings, max_upload_mb: Number(e.target.value) })
                }
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-2 text-xs font-mono">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(settings["pii_masking"])}
              onChange={(e) => setSettings({ ...settings, pii_masking: e.target.checked })}
              className="rounded border-slate-300 text-slate-900 focus:ring-0"
            />
            <span className="font-bold text-slate-900">Enforce PII Masking on Ingestion</span>
          </label>
          <p className="text-[11px] text-slate-500 pl-6">
            Automatically redacts customer email addresses, phone numbers, and National ID numbers from uploaded text buffers prior to RAG processing.
          </p>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded transition-colors"
        >
          Save Policy Configuration
        </button>
      </form>
    </div>
  );
}
