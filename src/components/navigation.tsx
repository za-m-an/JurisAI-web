"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: "common" | "business" | "lawyer" | "admin";
  organisation: string | null;
  region?: "BD" | "US" | "EU";
  language?: "en" | "bn";
  avatarUrl?: string | null;
  subscriptionTier?: string;
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  const isConsole = pathname.startsWith("/console");

  useEffect(() => {
    if (isConsole) {
      setLoading(false);
      return;
    }

    let active = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        if (data?.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pathname, isConsole]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setMenuOpen(false);
    setMobileOpen(false);
    router.push("/login");
  }

  if (isConsole) {
    return null;
  }

  const isAdmin = user?.role === "admin";
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  const navItems = [
    { href: "/chat", label: "Copilot" },
    { href: "/analyze", label: "Document Analyzer" },
    { href: "/lawyers", label: "Law Firms" },
    { href: "/settings", label: "Settings" },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) || (href === "/analyze" && pathname.startsWith("/analyses"));

  return (
    <header className="sticky top-0 z-40 no-print pt-3 px-[4vw] sm:px-[6vw]">
      <div className="max-w-[90rem] mx-auto glass-vellum rounded px-5 h-14 flex items-center justify-between editorial-transition">
        <div className="flex items-center gap-8">
          <Link
            href={user && !isAdmin ? "/dashboard" : "/"}
            className="flex items-center gap-2.5 group"
          >
            <span className="w-6 h-6 rounded-sm bg-[#121719] text-white flex items-center justify-center font-serif font-medium text-sm group-hover:bg-[#ff4716] editorial-transition">
              J
            </span>
            <span className="text-lg font-serif font-normal tracking-tight text-[#121719]">
              Juris AI
            </span>
          </Link>

          {user && !isAdmin && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded text-[13px] font-medium editorial-transition ${
                      active
                        ? "bg-[#121719] text-white"
                        : "text-[#5b6472] hover:text-[#121719] hover:bg-black/[0.04]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!loading && !user && (
            <Link
              href="/login"
              className="px-5 py-2 rounded bg-[#121719] hover:bg-[#222729] text-white text-[13px] font-medium tracking-tight editorial-transition"
            >
              Get Started
            </Link>
          )}

          {!loading && user && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded border border-[#E0E2E4] bg-white hover:border-[#121719]/30 editorial-transition"
                aria-label="Account menu"
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="w-6 h-6 rounded-sm object-cover"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-sm bg-[#121719] text-white text-[11px] font-mono font-semibold flex items-center justify-center">
                    {initials}
                  </span>
                )}
                <span className="hidden sm:inline text-xs font-medium text-[#121719] max-w-[120px] truncate">
                  {user.fullName}
                </span>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 glass-vellum rounded py-1.5 z-50">
                  <div className="px-3.5 py-2 border-b border-[#E0E2E4]">
                    <p className="text-xs font-semibold text-[#121719] truncate">{user.fullName}</p>
                    <p className="text-[11px] text-[#5b6472] truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#121719]/5 text-[#121719]">
                      {user.region || "BD"} · {user.subscriptionTier || "Standard"}
                    </span>
                  </div>
                  <Link
                    href="/settings/profile"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3.5 py-2 text-xs text-[#5b6472] hover:text-[#121719] hover:bg-black/[0.03]"
                  >
                    Profile &amp; Avatar
                  </Link>
                  <Link
                    href="/settings/subscription"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3.5 py-2 text-xs text-[#5b6472] hover:text-[#121719] hover:bg-black/[0.03]"
                  >
                    Subscription
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="block px-3.5 py-2 text-xs text-[#5b6472] hover:text-[#121719] hover:bg-black/[0.03]"
                  >
                    All Settings
                  </Link>
                  <div className="border-t border-[#E0E2E4] mt-1 pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left px-3.5 py-2 text-xs text-[#ff4716] hover:bg-[#ff4716]/5 font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {user && !isAdmin && (
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-1.5 rounded text-[#5b6472] hover:text-[#121719]"
              aria-label="Toggle navigation"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={mobileOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          )}
        </div>
      </div>

      {mobileOpen && user && !isAdmin && (
        <div className="md:hidden max-w-[90rem] mx-auto mt-2 glass-vellum rounded p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded text-sm font-medium ${
                isActive(item.href)
                  ? "bg-[#121719] text-white"
                  : "text-[#5b6472] hover:text-[#121719]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
