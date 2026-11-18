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
}

interface QuotaInfo {
  used: number;
  limit: number;
}

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  // Skip rendering public navigation on console routes
  const isConsole = pathname.startsWith("/console");

  useEffect(() => {
    if (isConsole) {
      setLoading(false);
      return;
    }

    let active = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data) => {
        if (!active) return;
        if (data?.user) {
          setUser(data.user);
          // Fetch user quota usage
          try {
            const anRes = await fetch("/api/analyses");
            if (anRes.ok) {
              const anData = await anRes.json();
              if (anData.quota) {
                setQuota(anData.quota);
              }
            }
          } catch {
            // Quota fetch fallback
          }
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

  // Close dropdown on click outside
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
    router.push("/login");
  }

  if (isConsole) {
    return null;
  }

  // Calculate initials for avatar
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header className="bg-[#0b1f33] text-white border-b border-slate-800 no-print sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-8">
          <Link
            href="/"
            className="text-xl font-serif font-bold tracking-tight text-amber-100 hover:text-white transition-colors"
          >
            Juris AI
          </Link>

          {/* Primary Navigation — Logged In */}
          {user && (
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              <Link
                href="/dashboard"
                className={`transition-colors ${
                  pathname === "/dashboard"
                    ? "text-amber-200 font-semibold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/analyze"
                className={`transition-colors ${
                  pathname === "/analyze"
                    ? "text-amber-200 font-semibold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Analyze
              </Link>
              <Link
                href="/chat"
                className={`transition-colors ${
                  pathname === "/chat" || pathname.startsWith("/chat/")
                    ? "text-amber-200 font-semibold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                Chats
              </Link>
              <Link
                href="/history"
                className={`transition-colors ${
                  pathname === "/history"
                    ? "text-amber-200 font-semibold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                History
              </Link>
            </nav>
          )}
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center space-x-4">
          {loading ? (
            <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse" />
          ) : user ? (
            /* Logged In Account Menu */
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-label="User Account Menu"
                className="flex items-center space-x-2 p-1 rounded-full border border-slate-700 hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-amber-600 text-white font-bold text-xs flex items-center justify-center font-mono">
                  {initials}
                </div>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white text-slate-900 rounded-lg shadow-xl border border-slate-200 py-2 z-50 text-xs">
                  {/* Account Header Details */}
                  <div className="px-4 py-2 border-b border-slate-100 space-y-1">
                    <p className="font-bold text-slate-900 truncate">{user.fullName}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{user.email}</p>
                    {user.role === "business" && user.organisation && (
                      <p className="text-[11px] text-slate-600 font-medium">
                        Organisation: {user.organisation}
                      </p>
                    )}
                    {quota && (
                      <div className="pt-1.5 text-[11px] text-amber-900 font-medium">
                        Monthly Quota: {quota.used} / {quota.limit} used
                      </div>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <Link
                      href="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 hover:bg-slate-50 text-slate-700 transition-colors"
                    >
                      Settings
                    </Link>
                    <Link
                      href="/privacy"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 hover:bg-slate-50 text-slate-700 transition-colors"
                    >
                      Privacy
                    </Link>
                    <Link
                      href="/how-verification-works"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 hover:bg-slate-50 text-slate-700 transition-colors"
                    >
                      How verification works
                    </Link>
                  </div>

                  {/* Sign Out */}
                  <div className="border-t border-slate-100 pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-rose-700 hover:bg-rose-50 font-semibold transition-colors"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Logged Out Navigation */
            <nav className="flex items-center space-x-4 text-xs font-medium">
              <Link
                href="/how-verification-works"
                className="text-slate-300 hover:text-white transition-colors"
              >
                How it works
              </Link>
              <Link
                href="/privacy"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded border border-slate-600 hover:border-slate-400 text-slate-200 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold transition-colors"
              >
                Create account
              </Link>
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
