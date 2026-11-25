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
        <div className="space-y-2 border-b border-[#E0E2E4] pb-5">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#ff4716]">
            Client Portal
          </span>
          <h1 className="text-3xl font-serif font-light text-[#121719]">
            Sign in to Juris AI
          </h1>
          <p className="text-sm text-[#5b6472]">
            Access your legal analyses, Copilot workspace, and regional counsel.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-medium text-[#121719]">
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
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-sm text-[#121719] placeholder:text-[#5b6472] focus:outline-none focus:border-[#121719] focus:bg-white editorial-transition"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-medium text-[#121719]">
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
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-sm text-[#121719] placeholder:text-[#5b6472] focus:outline-none focus:border-[#121719] focus:bg-white editorial-transition"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-lg bg-[#121719] hover:bg-[#222729] disabled:opacity-60 text-[#F3F3F3] text-sm font-medium editorial-transition shadow-sm"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="pt-4 border-t border-[#E0E2E4] text-center space-y-3">
          <p className="text-xs text-[#5b6472]">First time visiting Juris AI?</p>
          <Link
            href="/register"
            className="block w-full py-2.5 px-4 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] hover:bg-white hover:border-[#121719]/40 text-xs font-medium text-[#121719] editorial-transition"
          >
            If New User, Go To Registration
          </Link>
        </div>
      </div>
    </div>
  );
}
