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
      <div className="min-h-screen bg-[#F3F3F3] text-[#121719] flex flex-col font-sans editorial-grid-bg">
        <header className="pt-3 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto glass-vellum rounded px-5 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-md bg-[#121719] text-[#F3F3F3] flex items-center justify-center font-serif font-bold text-sm">
                J
              </span>
              <span className="font-serif font-normal text-base text-[#121719]">
                Juris AI · Executive Console
              </span>
            </div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#ff4716]">
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
      <div className="min-h-screen bg-[#F3F3F3] text-[#5b6472] font-mono text-xs flex items-center justify-center">
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
    <div className="min-h-screen bg-[#F3F3F3] text-[#121719] font-sans flex flex-col">
      <header className="sticky top-0 z-40 pt-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto glass-vellum rounded px-5 h-14 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link href="/console" className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-md bg-[#121719] text-[#F3F3F3] flex items-center justify-center font-serif font-bold text-sm">
                J
              </span>
              <span className="font-serif font-normal text-base text-[#121719]">
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
                        ? "bg-[#121719]/10 text-[#121719] font-semibold"
                        : "text-[#5b6472] hover:text-[#121719] hover:bg-black/[0.03]"
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
            className="px-3.5 py-1.5 rounded-lg border border-[#FECACA] bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#991B1B] text-xs font-medium editorial-transition"
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
