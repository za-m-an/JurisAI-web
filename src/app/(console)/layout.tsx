"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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
      .catch(() => router.replace("/console/login"))
      .finally(() => setLoading(false));
  }, [isLoginPage, router]);

  async function handleSignOut() {
    await fetch("/api/console/auth/logout", { method: "POST" });
    router.replace("/console/login");
  }

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-[#131220] text-[#F2EFE9] flex flex-col font-sans editorial-grid-bg">
        <header className="pt-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto glass-vellum rounded px-5 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="Juris AI"
                className="w-7 h-7 rounded-sm object-cover border border-[#D6A86E]/40"
              />
              <span className="font-serif font-normal text-base text-[#F2EFE9]">
                Juris AI · Executive Console
              </span>
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#D6A86E]">
              Authorized Personnel Only
            </span>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-6">{children}</main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#131220] text-[#B4B0C2] font-mono text-xs flex items-center justify-center">
        Verifying administrative session...
      </div>
    );
  }

  const navItems = [
    { label: "Overview", href: "/console" },
    { label: "AI & Models", href: "/console/integrations" },
    { label: "Users & Roles", href: "/console/users" },
    { label: "Law Firms", href: "/console/law-firms" },
    { label: "Limits", href: "/console/settings" },
    { label: "Security", href: "/console/security" },
    { label: "Audit", href: "/console/audit" },
  ];

  return (
    <div className="min-h-screen bg-[#131220] text-[#F2EFE9] font-sans flex flex-col">
      <header className="sticky top-0 z-40 pt-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto glass-vellum rounded px-5 h-14 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/console" className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="Juris AI"
                className="w-7 h-7 rounded-sm object-cover border border-[#D6A86E]/40"
              />
              <span className="font-serif font-normal text-base text-[#F2EFE9]">
                Juris AI Console
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium editorial-transition ${
                      active
                        ? "bg-[#D6A86E]/15 text-[#F2EFE9] font-semibold"
                        : "text-[#B4B0C2] hover:text-[#F2EFE9] hover:bg-black/[0.03]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="px-3.5 py-1.5 rounded-lg border border-[#6E2830] bg-[#3B181C] hover:bg-[#4F2025] text-[#F5A3A8] text-xs font-medium editorial-transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {children}
      </main>
    </div>
  );
}
