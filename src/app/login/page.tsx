"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.user) {
          router.replace("/dashboard");
        }
      })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid email or password.");
        setSubmitting(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Unable to reach the authentication service. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[72vh] flex items-center justify-center py-8">
      <div className="w-full max-w-md vellum-card rounded p-8 sm:p-10 space-y-6">
        <div className="space-y-2 border-b border-[#2E2B44] pb-5">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#D6A86E]">
            Client Portal
          </span>
          <h1 className="text-3xl font-serif font-light text-[#F2EFE9]">
            Sign in to Juris AI
          </h1>
          <p className="text-sm text-[#B4B0C2]">
            Access your legal analyses, Copilot workspace, and regional counsel.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#F5A3A8] text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-medium text-[#F2EFE9]">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="counsel@firm.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#2E2B44] bg-[#131220] text-sm text-[#F2EFE9] placeholder:text-[#B4B0C2] focus:outline-none focus:border-[#D6A86E] focus:bg-[#1A1829] editorial-transition"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-medium text-[#F2EFE9]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#2E2B44] bg-[#131220] text-sm text-[#F2EFE9] placeholder:text-[#B4B0C2] focus:outline-none focus:border-[#D6A86E] focus:bg-[#1A1829] editorial-transition"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-[#121719] hover:bg-[#222729] disabled:opacity-60 text-[#F2EFE9] text-sm font-medium editorial-transition shadow-sm"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="pt-4 border-t border-[#2E2B44] text-center space-y-3">
          <p className="text-xs text-[#B4B0C2]">First time visiting Juris AI?</p>
          <Link
            href="/register"
            className="block w-full py-2.5 px-4 rounded-lg border border-[#2E2B44] bg-[#131220] hover:bg-[#1A1829] hover:border-[#D6A86E]/40 text-xs font-medium text-[#F2EFE9] editorial-transition"
          >
            If New User, Go To Registration
          </Link>
        </div>
      </div>
    </div>
  );
}
