"use client";

import React, { useEffect, useState } from "react";

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [newKey, setNewKey] = useState("");

  async function loadIntegrations() {
    const res = await fetch("/api/admin/integrations");
    if (res.ok) {
      const data = await res.json();
      setIntegrations(data.integrations || []);
    }
  }

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function handleSaveIntegration(item: any) {
    const res = await fetch("/api/admin/integrations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: item.slug,
        name: item.name,
        baseUrl: item.baseUrl,
        healthPath: item.healthPath,
        enabled: item.enabled,
        apiKey: apiKeyInputs[item.slug] || undefined,
      }),
    });
    if (res.ok) {
      setApiKeyInputs((p) => ({ ...p, [item.slug]: "" }));
      loadIntegrations();
    }
  }

  async function handleTestConnection(slug: string) {
    setTestResults((p) => ({ ...p, [slug]: "Testing..." }));
    const res = await fetch(`/api/admin/integrations/${slug}/test`, { method: "POST" });
    const data = await res.json();
    setTestResults((p) => ({
      ...p,
      [slug]: `${data.status} (${data.latencyMs ?? 0}ms)`,
    }));
    loadIntegrations();
  }

  async function handleAddIntegration(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/integrations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: newSlug,
        name: newName,
        baseUrl: newBaseUrl,
        apiKey: newKey || undefined,
        healthPath: "/health",
        enabled: true,
      }),
    });
    if (res.ok) {
      setNewSlug("");
      setNewName("");
      setNewBaseUrl("");
      setNewKey("");
      loadIntegrations();
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#0b1f33]">
          External Integrations & RAG Service Configuration
        </h1>
        <p className="text-xs text-slate-500">
          API keys are encrypted at rest with AES-256-GCM (`v1:iv:tag:ciphertext`) and are write-only (`••••` + last 4 chars).
        </p>
      </div>

      <div className="space-y-4">
        {integrations.map((item, idx) => (
          <div
            key={item.slug}
            className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#0b1f33]">
                  {item.name} (`{item.slug}`)
                </h2>
                <div className="text-xs text-slate-500">
                  Stored Key: <strong>{item.apiKeyMasked || "None (using env fallback)"}</strong> · Last Status:{" "}
                  <strong>{testResults[item.slug] || item.lastStatus || "Not checked"}</strong>
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={item.enabled}
                  onChange={(e) => {
                    const copy = [...integrations];
                    copy[idx] = { ...item, enabled: e.target.checked };
                    setIntegrations(copy);
                  }}
                />
                Enabled
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <input
                type="url"
                value={item.baseUrl}
                onChange={(e) => {
                  const copy = [...integrations];
                  copy[idx] = { ...item, baseUrl: e.target.value };
                  setIntegrations(copy);
                }}
                placeholder="Base URL"
                className="px-3 py-2 rounded border border-slate-300"
              />
              <input
                type="text"
                value={item.healthPath}
                onChange={(e) => {
                  const copy = [...integrations];
                  copy[idx] = { ...item, healthPath: e.target.value };
                  setIntegrations(copy);
                }}
                placeholder="/health"
                className="px-3 py-2 rounded border border-slate-300"
              />
              <input
                type="password"
                value={apiKeyInputs[item.slug] || ""}
                onChange={(e) =>
                  setApiKeyInputs((p) => ({ ...p, [item.slug]: e.target.value }))
                }
                placeholder={`Write-only API Key (${item.apiKeyMasked || "unset"})`}
                className="px-3 py-2 rounded border border-slate-300"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handleSaveIntegration(item)}
                className="px-4 py-1.5 rounded bg-[#0b1f33] text-white text-xs font-semibold"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => handleTestConnection(item.slug)}
                className="px-4 py-1.5 rounded bg-amber-600 text-white text-xs font-semibold"
              >
                Test Connection
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Integration */}
      <form
        onSubmit={handleAddIntegration}
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
      >
        <h2 className="text-lg font-serif font-bold text-[#0b1f33]">Add Integration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <input
            type="text"
            required
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="slug (e.g. bdlaws)"
            className="px-3 py-2 rounded border border-slate-300"
          />
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Display Name"
            className="px-3 py-2 rounded border border-slate-300"
          />
          <input
            type="url"
            required
            value={newBaseUrl}
            onChange={(e) => setNewBaseUrl(e.target.value)}
            placeholder="https://api.example.com"
            className="px-3 py-2 rounded border border-slate-300"
          />
          <input
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="API Key (optional)"
            className="px-3 py-2 rounded border border-slate-300"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-[#0b1f33] text-white text-xs font-semibold"
        >
          Add Integration
        </button>
      </form>
    </div>
  );
}
