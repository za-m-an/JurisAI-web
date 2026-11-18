"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isLoginPage = pathname === "/console/login";

  useEffect(() => {
    if (isLoginPage) {
      setLoading(false);
      return;
    }
    fetch("/api/console/security")
      .then((r) => {
        if (!r.ok) {
          router.replace("/console/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) setAdminUser(data);
      })
      .catch(() => router.replace("/console/login"))
      .finally(() => setLoading(false));
  }, [isLoginPage, router]);

  async function handleSignOut() {
    await fetch("/api/console/auth/logout", { method: "POST" });
    router.replace("/console/login");
  }

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <header className="px-6 py-3 border-b border-slate-800 bg-slate-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-tight text-white">Juris AI · Admin console</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-semibold border border-amber-500/30">
              {process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEV"}
            </span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">Strict Access Area</span>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">{children}</main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-400 font-mono text-xs flex items-center justify-center">
        Loading admin console...
      </div>
    );
  }

  const navItems = [
    { label: "Overview", href: "/console" },
    { label: "Users", href: "/console/users" },
    { label: "Integrations", href: "/console/integrations" },
    { label: "Settings", href: "/console/settings" },
    { label: "Audit Log", href: "/console/audit" },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      {/* Utilitarian Persistent Admin Bar */}
      <header className="px-6 py-2.5 bg-slate-950 text-slate-200 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm tracking-tight text-white">
              Juris AI · Admin console
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-semibold border border-amber-500/30">
              {process.env.NODE_ENV === "production" ? "PRODUCTION" : "DEV"}
            </span>
          </div>
          <nav className="flex items-center gap-1 text-xs">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    active
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Link
            href="/console/security"
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              pathname === "/console/security"
                ? "bg-slate-800 text-white font-semibold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Security
          </Link>
          <button
            onClick={handleSignOut}
            className="px-2.5 py-1 rounded bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/50 font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Console Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">{children}</main>
    </div>
  );
}
