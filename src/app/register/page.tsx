"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"business" | "common">("business");
  const [organisation, setOrganisation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          password,
          accountType,
          organisation: accountType === "business" ? organisation : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Registration failed.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Network error during registration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#0b1f33]">Create Your Juris AI Account</h1>
        <p className="text-sm text-slate-600 mt-1">
          Analyse commercial contracts across Bangladesh, US, and EU jurisdictions.
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
            Full Name
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
            placeholder="Barrister Ayesha Rahman"
          />
        </div>
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
            placeholder="ayesha@firm.bd"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
            Password (min 10 chars, at least 1 letter & 1 digit)
          </label>
          <input
            type="password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
            Account Type
          </label>
          <select
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as "business" | "common")}
            className="w-full px-3 py-2 rounded border border-slate-300 text-sm bg-white"
          >
            <option value="business">Business (30 analyses/month, 100 chats/day)</option>
            <option value="common">Common / Individual (3 analyses/month, 30 chats/day)</option>
          </select>
        </div>
        {accountType === "business" && (
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Organisation Name
            </label>
            <input
              type="text"
              value={organisation}
              onChange={(e) => setOrganisation(e.target.value)}
              className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
              placeholder="Bengal Delta Industrial Solutions Ltd."
            />
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm"
        >
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="text-xs text-slate-600 text-center">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-[#0b1f33] underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
