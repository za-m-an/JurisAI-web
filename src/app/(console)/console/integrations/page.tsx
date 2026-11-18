"use client";

import React, { useEffect, useState } from "react";

export default function ConsoleIntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [newKey, setNewKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function loadIntegrations() {
    const res = await fetch("/api/console/integrations");
    if (res.ok) {
      const data = await res.json();
      setIntegrations(data.integrations || []);
    }
  }

  useEffect(() => {
    loadIntegrations();
  }, []);

  async function handleSaveIntegration(item: any) {
    setMessage(null);
    const res = await fetch("/api/console/integrations", {
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
      setMessage(`Integration "${item.name}" updated successfully.`);
      setApiKeyInputs((p) => ({ ...p, [item.slug]: "" }));
      loadIntegrations();
    }
  }

  async function handleTestConnection(slug: string) {
    setTestResults((p) => ({ ...p, [slug]: "Testing..." }));
    const res = await fetch(`/api/console/integrations/${slug}/test`, { method: "POST" });
    const data = await res.json();
    setTestResults((p) => ({
      ...p,
      [slug]: `${data.status} (${data.latencyMs ?? 0}ms)`,
    }));
    loadIntegrations();
  }

  async function handleAddIntegration(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/console/integrations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug: newSlug.trim().toLowerCase(),
        name: newName.trim(),
        baseUrl: newBaseUrl.trim(),
        healthPath: "/health",
        apiKey: newKey.trim() || undefined,
        enabled: true,
      }),
    });
    if (res.ok) {
      setNewSlug("");
      setNewName("");
      setNewBaseUrl("");
      setNewKey("");
      setMessage("New service integration configured.");
      loadIntegrations();
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-lg font-mono font-bold text-slate-900 tracking-tight">
          Upstream Service Integrations &amp; Secrets
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          Write-only secret management: API keys are encrypted at rest with AES-256-GCM and never revealed over any API.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-slate-900 text-slate-100 rounded text-xs font-mono">
          {message}
        </div>
      )}

      {/* Add Integration Form */}
      <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-xs font-mono font-bold uppercase text-slate-700">
          Add External LLM / Retrieval Microservice
        </h2>
        <form onSubmit={handleAddIntegration} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            required
            placeholder="slug (e.g. custom-rag)"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-slate-500"
          />
          <input
            type="text"
            required
            placeholder="Service Display Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-slate-500"
          />
          <input
            type="url"
            required
            placeholder="Base URL (http://...)"
            value={newBaseUrl}
            onChange={(e) => setNewBaseUrl(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-slate-500"
          />
          <input
            type="password"
            placeholder="Write-only API Key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded transition-colors"
          >
            Register Service
          </button>
        </form>
      </div>

      {/* Existing Integrations List */}
      <div className="space-y-4">
        {integrations.map((item) => (
          <div
            key={item.id}
            className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-mono font-bold text-slate-900">{item.name}</h3>
                <span className="text-[11px] font-mono text-slate-500">
                  Slug: <span className="font-semibold text-slate-700">{item.slug}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    item.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.enabled ? "Active" : "Disabled"}
                </span>
                <button
                  type="button"
                  onClick={() => handleTestConnection(item.slug)}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-mono font-semibold text-slate-800 transition-colors"
                >
                  Test Connection
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                  Base URL
                </label>
                <input
                  type="text"
                  value={item.baseUrl}
                  onChange={(e) =>
                    setIntegrations((prev) =>
                      prev.map((i) => (i.slug === item.slug ? { ...i, baseUrl: e.target.value } : i))
                    )
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                  Health Check Endpoint
                </label>
                <input
                  type="text"
                  value={item.healthPath}
                  onChange={(e) =>
                    setIntegrations((prev) =>
                      prev.map((i) => (i.slug === item.slug ? { ...i, healthPath: e.target.value } : i))
                    )
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs focus:outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                  API Key ({item.hasApiKey ? `Encrypted: ${item.apiKeyMasked}` : "Unset"})
                </label>
                <input
                  type="password"
                  placeholder="Enter new key to update..."
                  value={apiKeyInputs[item.slug] || ""}
                  onChange={(e) =>
                    setApiKeyInputs((prev) => ({ ...prev, [item.slug]: e.target.value }))
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs focus:outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveIntegration(item)}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded transition-colors"
                >
                  Save Integration
                </button>
              </div>
            </div>

            {testResults[item.slug] && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-800">
                Telemetry probe: {testResults[item.slug]}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
