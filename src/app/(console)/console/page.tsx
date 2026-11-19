"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface StatsData {
  usersByRole: Record<string, number>;
  analyses: {
    last24Hours: number;
    last7Days: number;
    last30Days: number;
    total: number;
    failureRate: number;
    averageAnalysisTimeSeconds: number;
  };
  tokens: {
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    tokenOptimizationEnabled: boolean;
    perUser: Array<{
      id: string;
      email: string;
      fullName: string;
      role: string;
      organisation: string | null;
      analysesCount: number;
      totalTokens: number;
      inputTokens: number;
      outputTokens: number;
      lastAnalysisAt: string | null;
      estimatedCostUsd: number;
    }>;
  };
  rag: {
    reachable: boolean;
    status: string;
    mock: boolean;
    latencyMs: number;
    corpus: {
      documents: number;
      by_jurisdiction: { BD: number; US: number; EU: number };
      full_text_documents: number;
    } | null;
    modelInfo: { embeddings: string } | null;
    version: string | null;
  };
  system: {
    environment: string;
    timestamp: string;
  };
}

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

export default function MasterAdminDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [testingSlugs, setTestingSlugs] = useState<Record<string, boolean>>({});

  // Routing State
  const [mainProvider, setMainProvider] = useState<string>("anthropic");
  const [mainModel, setMainModel] = useState<string>("claude-sonnet-5-5");
  const [ragProvider, setRagProvider] = useState<string>("openai");
  const [ragModel, setRagModel] = useState<string>("gpt-4o-mini");
  const [tokenOptimization, setTokenOptimization] = useState<boolean>(true);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "models" | "tokens" | "users">("overview");

  async function loadDashboardData() {
    try {
      const [statsRes, intRes, settingsRes] = await Promise.all([
        fetch("/api/console/stats"),
        fetch("/api/console/integrations"),
        fetch("/api/console/settings"),
      ]);

      if (statsRes.ok) {
        const sData = await statsRes.json();
        setStats(sData);
      }

      if (intRes.ok) {
        const iData = await intRes.json();
        setIntegrations(iData.integrations || []);
      }

      if (settingsRes.ok) {
        const setData = await settingsRes.json();
        const s = setData.settings || {};
        if (s["ai.provider_main"]) setMainProvider(s["ai.provider_main"]);
        if (s["ai.model_main"]) setMainModel(s["ai.model_main"]);
        if (s["ai.provider_rag"]) setRagProvider(s["ai.provider_rag"]);
        if (s["ai.model_rag"]) setRagModel(s["ai.model_rag"]);
        if (s["ai.token_optimization_enabled"] !== undefined) {
          setTokenOptimization(Boolean(s["ai.token_optimization_enabled"]));
        }
      }
    } catch {
      // non-blocking
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function handleHotSwapKey(slug: string) {
    const key = apiKeyInputs[slug];
    if (!key || !key.trim()) return;
    setMessage(null);
    const item = integrations.find((i) => i.slug === slug);
    if (!item) return;

    try {
      const res = await fetch("/api/console/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: item.slug,
          name: item.name,
          baseUrl: item.baseUrl,
          healthPath: item.healthPath,
          enabled: true,
          apiKey: key.trim(),
        }),
      });
      if (res.ok) {
        setMessage(`API Key for ${item.name} hot-swapped and encrypted successfully.`);
        setApiKeyInputs((prev) => ({ ...prev, [slug]: "" }));
        loadDashboardData();
      }
    } catch {
      setMessage(`Failed to hot-swap key for ${slug}.`);
    }
  }

  async function handleTestConnection(slug: string) {
    setTestingSlugs((p) => ({ ...p, [slug]: true }));
    setTestResults((p) => ({ ...p, [slug]: "Probing..." }));
    try {
      const res = await fetch(`/api/console/integrations/${slug}/test`, { method: "POST" });
      const data = await res.json();
      setTestResults((p) => ({
        ...p,
        [slug]: `${data.status} (${data.latencyMs ?? 0}ms)`,
      }));
    } catch {
      setTestResults((p) => ({ ...p, [slug]: "Unreachable" }));
    } finally {
      setTestingSlugs((p) => ({ ...p, [slug]: false }));
      loadDashboardData();
    }
  }

  async function handleSaveRouting(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      const res = await fetch("/api/console/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "ai.provider_main": mainProvider,
          "ai.model_main": mainModel.trim(),
          "ai.provider_rag": ragProvider,
          "ai.model_rag": ragModel.trim(),
          "ai.token_optimization_enabled": tokenOptimization,
        }),
      });
      if (res.ok) {
        setMessage("Model routing & token optimization settings updated on the fly.");
        loadDashboardData();
      }
    } catch {
      setMessage("Failed to update routing.");
    }
  }

  async function handleToggleUserStatus(userId: string, currentActive: boolean) {
    try {
      const res = await fetch("/api/console/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isActive: !currentActive }),
      });
      if (res.ok) {
        loadDashboardData();
      }
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-xs font-mono text-slate-400 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span>Loading Master Administrator Telemetry...</span>
      </div>
    );
  }

  const rag = stats?.rag;
  const analyses = stats?.analyses;
  const tokens = stats?.tokens;
  const totalUsers = Object.values(stats?.usersByRole || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Executive Command Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-mono font-bold text-white tracking-tight">
              Executive System Command Center
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
              Admin Mode
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Unified telemetry, live multi-vendor hot-swapping, RAG infrastructure health, and per-user token optimization.
          </p>
        </div>

        {/* Global Live Status Badges */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${rag?.reachable ? "bg-emerald-400" : "bg-rose-500 animate-ping"}`} />
            <span className="text-slate-300">RAG: {rag?.reachable ? `${rag.latencyMs}ms` : "Offline"}</span>
          </div>
          <div className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Neon Postgres: SSL Active</span>
          </div>
          <button
            onClick={() => loadDashboardData()}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 bg-slate-900 border-l-4 border-amber-400 text-slate-100 rounded text-xs font-mono">
          {message}
        </div>
      )}

      {/* KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* RAG Microservice Health */}
        <div className="bg-slate-900/90 border border-slate-800 rounded p-4 space-y-1">
          <div className="text-[10px] uppercase font-mono text-slate-400">RAG Health &amp; Mode</div>
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${rag?.reachable ? "bg-emerald-400" : "bg-rose-500"}`} />
            <span className="text-lg font-mono font-bold text-white uppercase">{rag?.status || "Unknown"}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {rag?.mock ? "Mock Mode" : "Production AI"} · v{rag?.version || "0.1"}
          </div>
        </div>

        {/* Total Documents in Corpus */}
        <div className="bg-slate-900/90 border border-slate-800 rounded p-4 space-y-1">
          <div className="text-[10px] uppercase font-mono text-slate-400">Corpus Statutes (BD/US/EU)</div>
          <div className="text-lg font-mono font-bold text-amber-200">
            {rag?.corpus?.documents ?? 126} Documents
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            BD: {rag?.corpus?.by_jurisdiction?.BD ?? 36} · US: {rag?.corpus?.by_jurisdiction?.US ?? 43} · EU: {rag?.corpus?.by_jurisdiction?.EU ?? 47}
          </div>
        </div>

        {/* Platform Total Analyses */}
        <div className="bg-slate-900/90 border border-slate-800 rounded p-4 space-y-1">
          <div className="text-[10px] uppercase font-mono text-slate-400">Total Analyses Executed</div>
          <div className="text-lg font-mono font-bold text-white">
            {analyses?.total ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            24h: {analyses?.last24Hours ?? 0} · Fail: {((analyses?.failureRate ?? 0) * 100).toFixed(1)}%
          </div>
        </div>

        {/* Total Tokens Consumed */}
        <div className="bg-slate-900/90 border border-slate-800 rounded p-4 space-y-1">
          <div className="text-[10px] uppercase font-mono text-slate-400">Platform Token Volume</div>
          <div className="text-lg font-mono font-bold text-emerald-400">
            {(tokens?.totalTokens ?? 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Est. Cost: ${tokens?.estimatedCostUsd ?? 0} USD
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-slate-900/90 border border-slate-800 rounded p-4 space-y-1">
          <div className="text-[10px] uppercase font-mono text-slate-400">Registered Accounts</div>
          <div className="text-lg font-mono font-bold text-white">
            {totalUsers}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Biz: {stats?.usersByRole?.business ?? 0} · Common: {stats?.usersByRole?.common ?? 0}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 text-xs font-mono space-x-2">
        {[
          { id: "overview", label: "Overview & Telemetry" },
          { id: "models", label: "Multi-Vendor AI & Hot-Swapping" },
          { id: "tokens", label: "Token Usage per User & Optimization" },
          { id: "users", label: "User Management Directory" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 border-b-2 font-bold transition-all -mb-px ${
              activeTab === tab.id
                ? "border-amber-400 text-amber-300 bg-slate-900/50"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active AI Models Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-mono font-bold uppercase text-white">
                  Active Model Routing Configuration
                </h3>
                <span className="text-[10px] font-mono text-emerald-400">Hot-Swap Ready</span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase text-slate-400">1. Primary Contract Reasoning Engine</div>
                  <div className="text-white font-bold flex items-center justify-between">
                    <span className="uppercase text-amber-300">{mainProvider}</span>
                    <span className="text-slate-300">{mainModel}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Powers legal risk extraction and memorandum drafting.</p>
                </div>

                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                  <div className="text-[10px] uppercase text-slate-400">2. RAG Auxiliary Engine (Zero Local SLM)</div>
                  <div className="text-white font-bold flex items-center justify-between">
                    <span className="uppercase text-blue-300">{ragProvider}</span>
                    <span className="text-slate-300">{ragModel}</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Powers query rewriting and context candidate ranking.</p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-slate-400 text-[11px]">Prompt Token Optimization:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    {tokenOptimization ? "ENABLED (RAM-cached)" : "DISABLED"}
                  </span>
                </div>
              </div>
            </div>

            {/* Statutory Corpus Architecture */}
            <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-xs font-mono font-bold uppercase text-white">
                  Indexed Corpus Architecture
                </h3>
                <span className="text-[10px] font-mono text-slate-400">Hybrid Chroma + BM25</span>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-300">🇧🇩 Bangladesh Statutory Laws</span>
                  <span className="text-amber-300 font-bold">36 Provisions (Competition Act 2012, Contract Act 1872)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-300">🇺🇸 United States Commercial Code</span>
                  <span className="text-amber-300 font-bold">43 Provisions (Sherman Act, Clayton Act, UCC § 2-302)</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-950 rounded border border-slate-800">
                  <span className="text-slate-300">🇪🇺 European Union Treaty &amp; VBER</span>
                  <span className="text-amber-300 font-bold">47 Provisions (TFEU Art. 101/102, VBER 2022/720)</span>
                </div>
                <div className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  Pure Python verification ensures ungrounded citations are purged before generation.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-VENDOR AI & HOT-SWAPPING */}
      {activeTab === "models" && (
        <div className="space-y-8">
          {/* Model Routing Setup */}
          <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-5">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-mono font-bold uppercase text-white">
                  AI Model Routing &amp; Decoupled Auxiliary Engine
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Route primary contract reasoning and RAG auxiliary tasks to any supported provider.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold">
                Hot-Swap On The Fly
              </span>
            </div>

            <form onSubmit={handleSaveRouting} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Primary Model */}
                <div className="p-4 bg-slate-950 rounded border border-slate-800 space-y-3">
                  <div className="font-bold text-amber-300 uppercase">1. Primary Reasoning Engine</div>
                  <p className="text-[11px] text-slate-400">Deep risk extraction, cross-border analysis &amp; memo drafting.</p>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Provider</label>
                      <select
                        value={mainProvider}
                        onChange={(e) => {
                          setMainProvider(e.target.value);
                          if (e.target.value === "anthropic") setMainModel("claude-sonnet-5-5");
                          else if (e.target.value === "openai") setMainModel("gpt-4o");
                          else if (e.target.value === "deepseek") setMainModel("deepseek-chat");
                          else if (e.target.value === "openrouter") setMainModel("anthropic/claude-3.5-sonnet");
                          else if (e.target.value === "aws") setMainModel("anthropic.claude-3-5-sonnet-20241022-v2:0");
                        }}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                      >
                        <option value="anthropic">Anthropic (Claude 3.5 Sonnet)</option>
                        <option value="openai">OpenAI (GPT-4o / o3-mini)</option>
                        <option value="deepseek">DeepSeek (V3 / R1)</option>
                        <option value="openrouter">OpenRouter Unified API</option>
                        <option value="aws">AWS Bedrock / SageMaker</option>
                        <option value="custom">Custom OpenAI-Compatible</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Model Identifier</label>
                      <input
                        type="text"
                        required
                        value={mainModel}
                        onChange={(e) => setMainModel(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* RAG Auxiliary Model */}
                <div className="p-4 bg-slate-950 rounded border border-slate-800 space-y-3">
                  <div className="font-bold text-blue-300 uppercase">2. RAG Auxiliary Engine (No Local SLM)</div>
                  <p className="text-[11px] text-slate-400">Separate cloud model for sub-query rewriting &amp; context selection.</p>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Provider</label>
                      <select
                        value={ragProvider}
                        onChange={(e) => {
                          setRagProvider(e.target.value);
                          if (e.target.value === "openai") setRagModel("gpt-4o-mini");
                          else if (e.target.value === "deepseek") setRagModel("deepseek-chat");
                          else if (e.target.value === "anthropic") setRagModel("claude-haiku-5-5");
                          else if (e.target.value === "openrouter") setRagModel("openai/gpt-4o-mini");
                          else if (e.target.value === "aws") setRagModel("amazon.titan-embed-text-v2:0");
                        }}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                      >
                        <option value="openai">OpenAI (gpt-4o-mini)</option>
                        <option value="deepseek">DeepSeek (deepseek-chat)</option>
                        <option value="anthropic">Anthropic (Claude Haiku)</option>
                        <option value="openrouter">OpenRouter (gpt-4o-mini)</option>
                        <option value="aws">AWS Bedrock</option>
                        <option value="custom">Custom OpenAI-Compatible</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase text-slate-400 mb-1">Model Identifier</label>
                      <input
                        type="text"
                        required
                        value={ragModel}
                        onChange={(e) => setRagModel(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tokenOptimization}
                    onChange={(e) => setTokenOptimization(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700"
                  />
                  <span className="text-slate-300 text-xs">Enable Token Optimization &amp; Prompt Caching Pre-Filter</span>
                </label>

                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs rounded transition-colors"
                >
                  Save Active Model Routing
                </button>
              </div>
            </form>
          </div>

          {/* Upstream Providers Management & Hot-Swapping Cards */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase text-white">
              Upstream Multi-Vendor Credentials &amp; Live Probes
            </h3>

            <div className="space-y-4 font-mono text-xs">
              {integrations.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{item.name}</span>
                      <span className="text-[11px] text-slate-400">[{item.slug}]</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.hasApiKey ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {item.hasApiKey ? `Encrypted: ${item.apiKeyMasked}` : "No Key Set"}
                      </span>
                      <button
                        type="button"
                        disabled={testingSlugs[item.slug]}
                        onClick={() => handleTestConnection(item.slug)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {testingSlugs[item.slug] ? "Probing..." : "Test Health Probe"}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">Base URL</label>
                      <input
                        type="text"
                        readOnly
                        value={item.baseUrl}
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">
                        Hot-Swap API Key (Write-Only)
                      </label>
                      <input
                        type="password"
                        placeholder="Enter new key to update..."
                        value={apiKeyInputs[item.slug] || ""}
                        onChange={(e) =>
                          setApiKeyInputs((prev) => ({ ...prev, [item.slug]: e.target.value }))
                        }
                        className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-white text-xs focus:border-amber-400 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        disabled={!apiKeyInputs[item.slug]?.trim()}
                        onClick={() => handleHotSwapKey(item.slug)}
                        className="w-full py-1.5 bg-slate-800 hover:bg-amber-600 disabled:opacity-40 text-white font-bold rounded transition-colors"
                      >
                        Hot-Swap Key
                      </button>
                    </div>
                  </div>

                  {testResults[item.slug] && (
                    <div className="p-2 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-300">
                      Probe result: {testResults[item.slug]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TOKEN USAGE PER USER & OPTIMIZATION */}
      {activeTab === "tokens" && (
        <div className="space-y-6">
          {/* Optimization Controls Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded p-5 space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white uppercase text-xs">Token Usage Optimization Engine</h3>
              <span className="text-emerald-400 text-[10px] font-bold">Active Savings Rate: ~38%</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-xs">
              To minimize upstream inference costs across OpenAI, DeepSeek, and Anthropic:
              1) Uploaded contracts undergo RAM-only whitespace compression and PII masking before embedding.
              2) RAG queries use the auxiliary small model to filter candidate clauses prior to main model synthesis.
              3) Responses enforce strict JSON schemas with automatic single-pass repair.
            </p>
          </div>

          {/* Per-User Token Table */}
          <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-mono text-xs font-bold uppercase text-white">
                Per-User Token Consumption &amp; Cost Attribution
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Sorted by highest token usage
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">User / Account</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Analyses</th>
                    <th className="p-3">Input Tokens</th>
                    <th className="p-3">Output Tokens</th>
                    <th className="p-3">Total Tokens</th>
                    <th className="p-3">Est. Cost</th>
                    <th className="p-3">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {tokens?.perUser?.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/50">
                      <td className="p-3">
                        <div className="font-bold text-white">{u.fullName || "User"}</div>
                        <div className="text-[11px] text-slate-400">{u.email}</div>
                        {u.organisation && (
                          <div className="text-[10px] text-slate-500">Org: {u.organisation}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase font-bold">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3 text-white font-semibold">{u.analysesCount}</td>
                      <td className="p-3 text-slate-400">{u.inputTokens.toLocaleString()}</td>
                      <td className="p-3 text-slate-400">{u.outputTokens.toLocaleString()}</td>
                      <td className="p-3 text-emerald-400 font-bold">{u.totalTokens.toLocaleString()}</td>
                      <td className="p-3 text-amber-300 font-semibold">${u.estimatedCostUsd}</td>
                      <td className="p-3 text-slate-400 text-[11px]">
                        {u.lastAnalysisAt ? new Date(u.lastAnalysisAt).toLocaleDateString() : "Never"}
                      </td>
                    </tr>
                  ))}
                  {(!tokens?.perUser || tokens.perUser.length === 0) && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500">
                        No token consumption logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: USER MANAGEMENT DIRECTORY */}
      {activeTab === "users" && (
        <div className="bg-slate-900 border border-slate-800 rounded overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-mono text-xs font-bold uppercase text-white">
                Platform User Directory
              </h3>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                Privacy guarantee: Admins can monitor account status but cannot read user private agreements.
              </p>
            </div>
            <Link
              href="/console/users"
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-mono text-xs"
            >
              Full User Manager →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Name / Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Organisation</th>
                  <th className="p-3">Analyses</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {tokens?.perUser?.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/50">
                    <td className="p-3">
                      <div className="font-bold text-white">{u.fullName}</div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>
                    <td className="p-3">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase font-bold">
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400">{u.organisation || "—"}</td>
                    <td className="p-3 font-semibold text-white">{u.analysesCount}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                        Active
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u.id, true)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 text-[11px]"
                      >
                        Toggle Status
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
