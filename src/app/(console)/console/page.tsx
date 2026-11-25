"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

export default function ConsoleOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/console/stats").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/console/settings").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([sData, cfgData]) => {
        if (sData) setStats(sData);
        if (cfgData?.settings) setSettings(cfgData.settings);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-16 text-center text-xs font-mono uppercase tracking-wider text-[#B4B0C2]">
        Loading Executive Overview...
      </div>
    );
  }

  const activeProvider = settings?.["ai.provider_main"] || "openrouter";
  const activeModel = settings?.["ai.model_main"] || "Not Selected";
  const tokenOpt = Boolean(settings?.["ai.token_optimization_enabled"]);

  return (
    <div className="space-y-8">
      <div className="space-y-1 border-b border-[#2E2B44] pb-5">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#D6A86E]">
          Administration
        </span>
        <h1 className="text-3xl font-serif font-light text-[#F2EFE9]">
          Executive Overview
        </h1>
        <p className="text-sm text-[#B4B0C2]">
          Manage AI providers, user roles, regional law firms, and cost controls.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="vellum-card rounded p-5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#B4B0C2]">
            Registered Users
          </span>
          <div className="text-3xl font-serif font-normal text-[#F2EFE9]">
            {stats?.usersCount ?? 0}
          </div>
          <Link href="/console/users" className="text-xs text-[#F2EFE9] hover:underline inline-block pt-1">
            Manage Roles &rarr;
          </Link>
        </div>

        <div className="vellum-card rounded p-5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#B4B0C2]">
            Analyses Completed
          </span>
          <div className="text-3xl font-serif font-normal text-[#F2EFE9]">
            {stats?.analysesCount ?? 0}
          </div>
          <Link href="/console/audit" className="text-xs text-[#F2EFE9] hover:underline inline-block pt-1">
            View Activity &rarr;
          </Link>
        </div>

        <div className="vellum-card rounded p-5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#B4B0C2]">
            Active AI Provider
          </span>
          <div className="text-xl font-serif font-normal text-[#F2EFE9] capitalize truncate">
            {activeProvider}
          </div>
          <div className="text-[11px] font-mono text-[#B4B0C2] truncate">{activeModel}</div>
        </div>

        <div className="vellum-card rounded p-5 space-y-1">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#B4B0C2]">
            Token Cost Optimizer
          </span>
          <div className="text-xl font-serif font-normal text-[#F2EFE9]">
            {tokenOpt ? "Enabled" : "Standard"}
          </div>
          <Link href="/console/integrations" className="text-xs text-[#F2EFE9] hover:underline inline-block pt-1">
            Configure AI &rarr;
          </Link>
        </div>
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/console/integrations"
          className="vellum-card rounded p-6 hover:border-[#D6A86E]/50 editorial-transition space-y-2"
        >
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#D6A86E]">
            01 — AI &amp; Models
          </span>
          <h2 className="font-serif text-xl font-medium text-[#F2EFE9]">
            Providers &amp; Key Swapping
          </h2>
          <p className="text-xs text-[#B4B0C2] leading-relaxed">
            Hot-swap keys for OpenAI, DeepSeek, Anthropic, Gemini, and OpenRouter,
            load live models, set active provider, and toggle Token Optimizer.
          </p>
        </Link>

        <Link
          href="/console/users"
          className="vellum-card rounded p-6 hover:border-[#D6A86E]/50 editorial-transition space-y-2"
        >
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#D6A86E]">
            02 — Accounts
          </span>
          <h2 className="font-serif text-xl font-medium text-[#F2EFE9]">
            User &amp; Role Management
          </h2>
          <p className="text-xs text-[#B4B0C2] leading-relaxed">
            View registered accounts, update user roles, and manage active session
            access.
          </p>
        </Link>

        <Link
          href="/console/law-firms"
          className="vellum-card rounded p-6 hover:border-[#D6A86E]/50 editorial-transition space-y-2"
        >
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#D6A86E]">
            03 — Representation
          </span>
          <h2 className="font-serif text-xl font-medium text-[#F2EFE9]">
            Law Firms &amp; Counsel Directory
          </h2>
          <p className="text-xs text-[#B4B0C2] leading-relaxed">
            Directly add and manage regional law firms, practice specialties,
            notable cases, and chambers contact details.
          </p>
        </Link>
      </div>
    </div>
  );
}
