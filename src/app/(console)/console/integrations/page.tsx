"use client";

import React, { useEffect, useState } from "react";

interface IntegrationItem {
  slug: string;
  name: string;
  baseUrl: string;
  hasApiKey: boolean;
  maskedKey: string | null;
  enabled: boolean;
  lastStatus: string | null;
  config: { models?: string[] };
}

const PROVIDER_SLUGS = ["openai", "deepseek", "anthropic", "gemini", "openrouter"];

export default function ConsoleIntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [activeProvider, setActiveProvider] = useState("openrouter");
  const [activeModel, setActiveModel] = useState("google/gemini-2.5-flash");
  const [tokenOpt, setTokenOpt] = useState(false);

  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [urlInputs, setUrlInputs] = useState<Record<string, string>>({});
  const [loadedModels, setLoadedModels] = useState<Record<string, string[]>>({});
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>({});
  const [liveStatus, setLiveStatus] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    try {
      const [intRes, setRes] = await Promise.all([
        fetch("/api/console/integrations"),
        fetch("/api/console/settings"),
      ]);
      if (intRes.ok) {
        const data = await intRes.json();
        const list: IntegrationItem[] = data.integrations || [];
        setIntegrations(list);

        const modelsMap: Record<string, string[]> = {};
        const urlMap: Record<string, string> = {};
        const statusMap: Record<string, { ok: boolean; text: string }> = {};
        for (const item of list) {
          urlMap[item.slug] = item.baseUrl;
          if (item.config?.models) {
            modelsMap[item.slug] = item.config.models;
          }
          if (item.lastStatus) {
            statusMap[item.slug] = {
              ok: item.lastStatus.toLowerCase().startsWith("ok"),
              text: item.lastStatus,
            };
          }
        }
        setLoadedModels(modelsMap);
        setUrlInputs(urlMap);
        setLiveStatus(statusMap);
      }

      if (setRes.ok) {
        const sData = await setRes.json();
        const cfg = sData.settings || {};
        if (cfg["ai.provider_main"]) setActiveProvider(cfg["ai.provider_main"]);
        if (cfg["ai.model_main"]) setActiveModel(cfg["ai.model_main"]);
        setTokenOpt(Boolean(cfg["ai.token_optimization_enabled"]));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleSaveKey(item: IntegrationItem) {
    setBusySlug(item.slug);
    setBanner(null);
    try {
      const res = await fetch("/api/console/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: item.slug,
          name: item.name,
          baseUrl: urlInputs[item.slug] || item.baseUrl,
          apiKey: keyInputs[item.slug]?.trim() || undefined,
          healthPath: item.slug === "rag" ? "/health" : "/models",
          enabled: true,
        }),
      });
      if (res.ok) {
        setKeyInputs((prev) => ({ ...prev, [item.slug]: "" }));
        setBanner(`Saved API credentials for ${item.name}.`);
        await loadAll();
      }
    } finally {
      setBusySlug(null);
    }
  }

  async function handleTestKey(slug: string) {
    setBusySlug(slug);
    setBanner(null);
    try {
      const res = await fetch(`/api/console/integrations/${slug}/test`, { method: "POST" });
      const data = await res.json();
      setLiveStatus((prev) => ({
        ...prev,
        [slug]: { ok: Boolean(data.ok), text: data.ok ? "Live" : data.status || "Offline" },
      }));
    } finally {
      setBusySlug(null);
    }
  }

  async function handleLoadModels(slug: string) {
    setBusySlug(slug);
    setBanner(null);
    try {
      const res = await fetch(`/api/console/integrations/${slug}/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyInputs[slug]?.trim() || "" }),
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data.models)) {
        setLoadedModels((prev) => ({ ...prev, [slug]: data.models }));
        if (data.models.length > 0 && !selectedModels[slug]) {
          setSelectedModels((prev) => ({ ...prev, [slug]: data.models[0] }));
        }
        setLiveStatus((prev) => ({
          ...prev,
          [slug]: { ok: true, text: `Live (${data.models.length} models)` },
        }));
        setBanner(`Loaded ${data.models.length} available models for ${slug.toUpperCase()}.`);
      } else {
        setLiveStatus((prev) => ({
          ...prev,
          [slug]: { ok: false, text: data.message || "Key Rejected" },
        }));
        setBanner(data.message || "Unable to load models for this API key.");
      }
    } finally {
      setBusySlug(null);
    }
  }

  async function handleSetActive(slug: string) {
    setBusySlug(slug);
    setBanner(null);
    const modelChoice =
      selectedModels[slug] ||
      (loadedModels[slug] && loadedModels[slug][0]) ||
      activeModel;

    try {
      const res = await fetch("/api/console/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "ai.provider_main": slug,
          "ai.model_main": modelChoice,
        }),
      });
      if (res.ok) {
        setActiveProvider(slug);
        setActiveModel(modelChoice);
        setBanner(`Active provider switched to ${slug.toUpperCase()} (${modelChoice}).`);
      }
    } finally {
      setBusySlug(null);
    }
  }

  async function handleToggleTokenOpt() {
    const next = !tokenOpt;
    setTokenOpt(next);
    await fetch("/api/console/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "ai.token_optimization_enabled": next }),
    });
    setBanner(`Token Optimizer ${next ? "enabled" : "disabled"} across Copilot and Document Analyzer.`);
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-xs font-mono uppercase tracking-wider text-[#5b6472]">
        Loading Providers...
      </div>
    );
  }

  const aiProviders = PROVIDER_SLUGS.map(
    (slug) =>
      integrations.find((i) => i.slug === slug) || {
        slug,
        name: slug.toUpperCase(),
        baseUrl: "",
        hasApiKey: false,
        maskedKey: null,
        enabled: true,
        lastStatus: null,
        config: {},
      }
  );
  const ragService = integrations.find((i) => i.slug === "rag");

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E0E2E4] pb-5">
        <div className="space-y-1">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#ff4716]">
            AI Routing &amp; Cost Control
          </span>
          <h1 className="text-3xl font-serif font-light text-[#121719]">
            Providers &amp; Model Selection
          </h1>
          <p className="text-sm text-[#5b6472]">
            Hot-swap provider keys, verify live status, load models dynamically, and control token cost.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded bg-white border border-[#E0E2E4] text-xs space-y-0.5">
          <div className="text-[10px] font-mono uppercase text-[#5b6472]">Currently Active</div>
          <div className="font-semibold text-[#121719] capitalize">
            {activeProvider} · <span className="font-mono">{activeModel}</span>
          </div>
        </div>
      </div>

      {banner && (
        <div className="p-3.5 rounded bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-xs font-medium">
          {banner}
        </div>
      )}

      {/* Token Optimizer Control */}
      <section className="vellum-card rounded p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-xl font-medium text-[#121719]">Token Optimizer</h2>
            <span
              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                tokenOpt
                  ? "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]"
                  : "bg-[#F3F3F3] text-[#5b6472] border-[#E0E2E4]"
              }`}
            >
              {tokenOpt ? "Active" : "Off"}
            </span>
          </div>
          <p className="text-xs text-[#5b6472]">
            Automatically condenses conversation history and document whitespace in Copilot and Document Analyzer to reduce AI cost.
          </p>
        </div>
        <button
          type="button"
          onClick={handleToggleTokenOpt}
          className={`px-5 py-2.5 rounded-lg text-xs font-medium editorial-transition shrink-0 ${
            tokenOpt
              ? "bg-[#121719] text-[#F3F3F3]"
              : "border border-[#E0E2E4] bg-[#F3F3F3] text-[#121719] hover:bg-white"
          }`}
        >
          {tokenOpt ? "Disable Optimizer" : "Enable Optimizer"}
        </button>
      </section>

      {/* Main Inference Providers */}
      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-medium text-[#121719]">
          Inference Providers
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {aiProviders.map((item) => {
            const isActive = activeProvider === item.slug;
            const live = liveStatus[item.slug];
            const models = loadedModels[item.slug] || [];
            const chosenModel =
              selectedModels[item.slug] ||
              (isActive ? activeModel : models[0] || "");

            return (
              <div
                key={item.slug}
                className={`vellum-card rounded p-6 space-y-4 ${
                  isActive ? "border-[#121719] ring-1 ring-[#121719]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3 border-b border-[#E0E2E4] pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-xl font-medium text-[#121719]">
                        {item.name}
                      </h3>
                      {isActive && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#121719] text-[#F3F3F3]">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-[#5b6472]">
                      {item.hasApiKey ? `Saved Key: ${item.maskedKey}` : "No key saved"}
                    </p>
                  </div>

                  {/* Separate Live Key Indicator */}
                  <span
                    className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                      live?.ok
                        ? "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]"
                        : live
                        ? "bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]"
                        : "bg-[#F3F3F3] text-[#5b6472] border-[#E0E2E4]"
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        live?.ok ? "bg-[#166534]" : live ? "bg-[#991B1B]" : "bg-[#5b6472]"
                      }`}
                    />
                    {live?.ok ? "Key Live" : live ? "Key Offline" : "Untested"}
                  </span>
                </div>

                {/* Hot-Swap Key Input */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-medium text-[#5b6472]">
                    Hot-Swap API Key
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={keyInputs[item.slug] || ""}
                      onChange={(e) =>
                        setKeyInputs((prev) => ({ ...prev, [item.slug]: e.target.value }))
                      }
                      placeholder={item.hasApiKey ? "Enter new key to replace saved..." : "Paste provider API key..."}
                      className="flex-1 px-3 py-2 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-xs font-mono"
                    />
                    <button
                      type="button"
                      disabled={busySlug === item.slug}
                      onClick={() => handleSaveKey(item)}
                      className="px-3.5 py-2 rounded-lg border border-[#E0E2E4] bg-white hover:bg-[#F3F3F3] text-xs font-medium text-[#121719]"
                    >
                      Save
                    </button>
                  </div>
                </div>

                {/* Test & Load Models */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busySlug === item.slug}
                    onClick={() => handleTestKey(item.slug)}
                    className="px-3.5 py-2 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] hover:bg-white text-xs font-medium text-[#121719]"
                  >
                    Test Key
                  </button>
                  <button
                    type="button"
                    disabled={busySlug === item.slug}
                    onClick={() => handleLoadModels(item.slug)}
                    className="px-3.5 py-2 rounded-lg border border-[#121719]/30 bg-[#121719]/5 hover:bg-[#121719]/10 text-xs font-medium text-[#121719]"
                  >
                    {busySlug === item.slug ? "Loading..." : "Load Models"}
                  </button>
                </div>

                {/* Loaded Models Dropdown + Set Active */}
                <div className="pt-2 border-t border-[#E0E2E4] flex flex-col sm:flex-row gap-2.5">
                  <select
                    value={chosenModel}
                    onChange={(e) =>
                      setSelectedModels((prev) => ({ ...prev, [item.slug]: e.target.value }))
                    }
                    className="flex-1 px-3 py-2 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-xs font-mono text-[#121719]"
                  >
                    {models.length === 0 ? (
                      <option value={chosenModel}>
                        {chosenModel || "Click Load Models to fetch available models"}
                      </option>
                    ) : (
                      models.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))
                    )}
                  </select>

                  <button
                    type="button"
                    disabled={busySlug === item.slug}
                    onClick={() => handleSetActive(item.slug)}
                    className={`px-4 py-2 rounded-lg text-xs font-medium editorial-transition shrink-0 ${
                      isActive
                        ? "bg-[#121719] text-[#F3F3F3]"
                        : "bg-[#121719] hover:bg-[#121719] text-white"
                    }`}
                  >
                    {isActive ? "Update Active Model" : "Set Active"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Advisory Service Connection (RAG Hot-Swap) */}
      {ragService && (
        <section className="vellum-card rounded p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E0E2E4] pb-4">
            <div>
              <h2 className="font-serif text-xl font-medium text-[#121719]">
                Legal Advisory Service Connection
              </h2>
              <p className="text-xs text-[#5b6472]">
                Hot-swap endpoint URL and access key for the statutory analysis service.
              </p>
            </div>
            <span
              className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded border ${
                liveStatus["rag"]?.ok
                  ? "bg-[#F0FDF4] text-[#166534] border-[#BBF7D0]"
                  : "bg-[#F3F3F3] text-[#5b6472] border-[#E0E2E4]"
              }`}
            >
              {liveStatus["rag"]?.ok ? "Live" : "Check Status"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#121719]">Service URL</label>
              <input
                type="url"
                value={urlInputs["rag"] || ""}
                onChange={(e) => setUrlInputs((prev) => ({ ...prev, rag: e.target.value }))}
                className="w-full px-3.5 py-2 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-xs font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#121719]">Service Access Key</label>
              <input
                type="password"
                value={keyInputs["rag"] || ""}
                onChange={(e) => setKeyInputs((prev) => ({ ...prev, rag: e.target.value }))}
                placeholder={ragService.hasApiKey ? `Saved (${ragService.maskedKey})` : "Enter key..."}
                className="w-full px-3.5 py-2 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleSaveKey(ragService)}
              className="px-4 py-2 rounded-lg bg-[#121719] text-[#F3F3F3] text-xs font-medium"
            >
              Save Connection
            </button>
            <button
              type="button"
              onClick={() => handleTestKey("rag")}
              className="px-4 py-2 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-xs font-medium text-[#121719]"
            >
              Test Connection
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
