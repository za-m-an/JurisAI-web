"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid email or password.");
        return;
      }
      router.push(data.user?.role === "admin" ? "/admin" : "/dashboard");
    } catch {
      setError("Network error while signing in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#0b1f33]">Sign In to Juris AI</h1>
        <p className="text-sm text-slate-600 mt-1">
          Access your contract risk reports and multi-jurisdictional legal chat.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
            placeholder="counsel@company.com"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded bg-[#0b1f33] hover:bg-[#102a43] text-white font-medium text-sm"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="text-xs text-slate-600 text-center">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-[#0b1f33] underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
