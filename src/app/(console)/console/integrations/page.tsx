"use client";

import React, { useEffect, useState } from "react";

interface IntegrationItem {
  id: string;
  slug: string;
  name: string;
  baseUrl: string;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  healthPath: string;
  enabled: boolean;
  lastStatus: string | null;
  lastCheckedAt: string | null;
}

export default function ConsoleIntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [testingSlugs, setTestingSlugs] = useState<Record<string, boolean>>({});

  // Model Routing State
  const [mainProvider, setMainProvider] = useState<string>("anthropic");
  const [mainModel, setMainModel] = useState<string>("claude-sonnet-5-5");
  const [ragProvider, setRagProvider] = useState<string>("openai");
  const [ragModel, setRagModel] = useState<string>("gpt-4o-mini");
  const [routingSaving, setRoutingSaving] = useState(false);

  // Add Custom Integration State
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [newKey, setNewKey] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function loadData() {
    try {
      const [intRes, setRes] = await Promise.all([
        fetch("/api/console/integrations"),
        fetch("/api/console/settings"),
      ]);

      if (intRes.ok) {
        const intData = await intRes.json();
        setIntegrations(intData.integrations || []);
      }

      if (setRes.ok) {
        const setData = await setRes.json();
        const s = setData.settings || {};
        if (s["ai.provider_main"]) setMainProvider(s["ai.provider_main"]);
        if (s["ai.model_main"]) setMainModel(s["ai.model_main"]);
        if (s["ai.provider_rag"]) setRagProvider(s["ai.provider_rag"]);
        if (s["ai.model_rag"]) setRagModel(s["ai.model_rag"]);
      }
    } catch {
      // ignore fetch error on unmount
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSaveRouting(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setRoutingSaving(true);
    try {
      const res = await fetch("/api/console/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "ai.provider_main": mainProvider,
          "ai.model_main": mainModel.trim(),
          "ai.provider_rag": ragProvider,
          "ai.model_rag": ragModel.trim(),
        }),
      });

      if (res.ok) {
        setMessage("AI Model Routing and RAG Auxiliary settings saved successfully.");
      } else {
        const err = await res.json();
        setMessage(`Failed to update routing: ${err.message || "Unknown error"}`);
      }
    } catch {
      setMessage("Network error saving AI routing.");
    } finally {
      setRoutingSaving(false);
    }
  }

  async function handleSaveIntegration(item: IntegrationItem) {
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
      loadData();
    }
  }

  async function handleTestConnection(slug: string) {
    setTestingSlugs((p) => ({ ...p, [slug]: true }));
    setTestResults((p) => ({ ...p, [slug]: "Testing connection..." }));
    try {
      const res = await fetch(`/api/console/integrations/${slug}/test`, { method: "POST" });
      const data = await res.json();
      setTestResults((p) => ({
        ...p,
        [slug]: `${data.status} (${data.latencyMs ?? 0}ms)`,
      }));
    } catch {
      setTestResults((p) => ({ ...p, [slug]: "Connection failed (network error)" }));
    } finally {
      setTestingSlugs((p) => ({ ...p, [slug]: false }));
      loadData();
    }
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
        healthPath: "/models",
        apiKey: newKey.trim() || undefined,
        enabled: true,
      }),
    });
    if (res.ok) {
      setNewSlug("");
      setNewName("");
      setNewBaseUrl("");
      setNewKey("");
      setMessage("New custom AI / upstream service configured.");
      loadData();
    }
  }

  // Split into AI providers and services
  const aiSlugs = ["anthropic", "openai", "deepseek", "custom-llm"];
  const aiIntegrations = integrations.filter((i) => aiSlugs.includes(i.slug));
  const otherIntegrations = integrations.filter((i) => !aiSlugs.includes(i.slug));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-mono font-bold text-slate-900 tracking-tight">
          AI Providers &amp; Upstream Integrations
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-1">
          Manage API keys for Anthropic, OpenAI, DeepSeek, and custom models. All credentials are encrypted at rest with AES-256-GCM.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-slate-900 text-slate-100 rounded text-xs font-mono border-l-4 border-amber-400">
          {message}
        </div>
      )}

      {/* AI Model Routing Configuration */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-mono font-bold uppercase text-slate-800">
              AI Engine &amp; Model Routing
            </h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Decouple primary legal analysis reasoning from RAG auxiliary search operations.
            </p>
          </div>
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold">
            Dynamic Dispatch
          </span>
        </div>

        <form onSubmit={handleSaveRouting} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary Model */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-slate-900">
                  1. Primary Reasoning Engine
                </span>
                <span className="text-[10px] font-mono text-slate-500">Contract Analysis &amp; Memo</span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono leading-relaxed">
                Powers comprehensive legal risk detection, cross-border analysis, and memorandum generation.
              </p>

              <div className="space-y-2 pt-1 text-xs font-mono">
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 mb-1">Provider</label>
                  <select
                    value={mainProvider}
                    onChange={(e) => {
                      setMainProvider(e.target.value);
                      if (e.target.value === "anthropic") setMainModel("claude-sonnet-5-5");
                      else if (e.target.value === "openai") setMainModel("gpt-4o");
                      else if (e.target.value === "deepseek") setMainModel("deepseek-chat");
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono focus:outline-none focus:border-slate-500"
                  >
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="openai">OpenAI (GPT-4o / o3-mini)</option>
                    <option value="deepseek">DeepSeek (V3 / R1)</option>
                    <option value="custom">Custom / Self-Hosted (OpenAI Compatible)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-500 mb-1">Model Name / ID</label>
                  <input
                    type="text"
                    required
                    value={mainModel}
                    onChange={(e) => setMainModel(e.target.value)}
                    placeholder="e.g. claude-sonnet-5-5, gpt-4o, deepseek-chat"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>
            </div>

            {/* RAG Auxiliary Model */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold uppercase text-slate-900">
                  2. RAG Auxiliary Engine
                </span>
                <span className="text-[10px] font-mono text-slate-500">Query Rewriting &amp; Selection</span>
              </div>
              <p className="text-[11px] text-slate-600 font-mono leading-relaxed">
                Uses a separate cloud model to eliminate local SLM hosting. Keeps search fast, low-cost, and reliable.
              </p>

              <div className="space-y-2 pt-1 text-xs font-mono">
                <div>
                  <label className="block text-[10px] uppercase text-slate-500 mb-1">Provider</label>
                  <select
                    value={ragProvider}
                    onChange={(e) => {
                      setRagProvider(e.target.value);
                      if (e.target.value === "openai") setRagModel("gpt-4o-mini");
                      else if (e.target.value === "deepseek") setRagModel("deepseek-chat");
                      else if (e.target.value === "anthropic") setRagModel("claude-haiku-5-5");
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono focus:outline-none focus:border-slate-500"
                  >
                    <option value="openai">OpenAI (gpt-4o-mini)</option>
                    <option value="deepseek">DeepSeek (deepseek-chat)</option>
                    <option value="anthropic">Anthropic (Claude Haiku)</option>
                    <option value="custom">Custom / Self-Hosted (OpenAI Compatible)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-slate-500 mb-1">Model Name / ID</label>
                  <input
                    type="text"
                    required
                    value={ragModel}
                    onChange={(e) => setRagModel(e.target.value)}
                    placeholder="e.g. gpt-4o-mini, deepseek-chat, claude-haiku-5-5"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs font-mono focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={routingSaving}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-mono text-xs font-bold rounded transition-colors"
            >
              {routingSaving ? "Saving..." : "Save AI Routing Configuration"}
            </button>
          </div>
        </form>
      </div>

      {/* AI Model Providers Section */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
          <h2 className="text-sm font-mono font-bold uppercase text-slate-800">
            Supported AI Model Providers
          </h2>
          <span className="text-[11px] font-mono text-slate-500">
            Enter provider API keys below to enable live inference
          </span>
        </div>

        <div className="space-y-4">
          {aiIntegrations.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center font-mono font-bold text-xs text-slate-700">
                    {item.slug === "anthropic" && "A"}
                    {item.slug === "openai" && "O"}
                    {item.slug === "deepseek" && "D"}
                    {item.slug === "custom-llm" && "C"}
                  </div>
                  <div>
                    <h3 className="text-sm font-mono font-bold text-slate-900">{item.name}</h3>
                    <span className="text-[11px] font-mono text-slate-500">
                      Slug: <span className="font-semibold text-slate-700">{item.slug}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                      item.enabled ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <button
                    type="button"
                    disabled={testingSlugs[item.slug]}
                    onClick={() => handleTestConnection(item.slug)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-mono font-semibold text-slate-800 transition-colors disabled:opacity-50"
                  >
                    {testingSlugs[item.slug] ? "Testing..." : "Test Connection"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                    API Endpoint Base URL
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
                    Health Check Path
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
                    Save API Key &amp; Settings
                  </button>
                </div>
              </div>

              {testResults[item.slug] && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-800">
                  Connection probe result: {testResults[item.slug]}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Core Services Section */}
      <div className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h2 className="text-sm font-mono font-bold uppercase text-slate-800">
            Core Microservices &amp; Legal Repositories
          </h2>
        </div>

        <div className="space-y-4">
          {otherIntegrations.map((item) => (
            <div
              key={item.id}
              className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4"
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
                    disabled={testingSlugs[item.slug]}
                    onClick={() => handleTestConnection(item.slug)}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-xs font-mono font-semibold text-slate-800 transition-colors disabled:opacity-50"
                  >
                    {testingSlugs[item.slug] ? "Testing..." : "Test Connection"}
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
                    Save Service
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

      {/* Add Custom Service Form */}
      <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-xs font-mono font-bold uppercase text-slate-700">
          Add Custom External Provider / Retrieval Service
        </h2>
        <form onSubmit={handleAddIntegration} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            required
            placeholder="slug (e.g. groq, vllm)"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-slate-500"
          />
          <input
            type="text"
            required
            placeholder="Provider Display Name"
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
            Register Custom Service
          </button>
        </form>
      </div>
    </div>
  );
}
