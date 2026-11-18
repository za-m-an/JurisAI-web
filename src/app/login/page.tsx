"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input } from "@/components/ui/primitives";

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
      router.push("/dashboard");
    } catch {
      setError("Network error while signing in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Calm Trust Statement */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#7B1E22]/10 border border-[#7B1E22]/20 text-[#7B1E22] text-xs font-semibold">
            <span>Juris AI</span>
            <span className="text-[#7B1E22]/40">·</span>
            <span>Legal Analysis Platform</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-tight">
            A principled instrument for cross-border legal risk.
          </h1>

          <p className="text-sm text-ink-muted leading-relaxed">
            Designed for in-house counsel, commercial directors, and cross-border businesses navigating the conflicting statutory demands of Bangladesh, the United States, and the European Union.
          </p>

          <div className="pt-2 space-y-4 border-t border-hairline">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-paper-warm border border-hairline flex items-center justify-center text-[11px] font-bold text-accent shrink-0 mt-0.5">
                ✓
              </div>
              <div>
                <h2 className="text-xs font-bold text-ink uppercase tracking-wide">Zero Document Retention</h2>
                <p className="text-xs text-ink-muted leading-relaxed mt-0.5">
                  Uploaded agreements exist strictly in volatile application memory during parsing and are permanently purged. Zero disk writes, zero database bytes stored.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-paper-warm border border-hairline flex items-center justify-center text-[11px] font-bold text-accent shrink-0 mt-0.5">
                ✓
              </div>
              <div>
                <h2 className="text-xs font-bold text-ink uppercase tracking-wide">Deterministic Verification</h2>
                <p className="text-xs text-ink-muted leading-relaxed mt-0.5">
                  Every legal citation is cross-examined against primary statutory records in pure Python. Hallucinated or unverified citations are purged before generation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-paper-warm border border-hairline flex items-center justify-center text-[11px] font-bold text-accent shrink-0 mt-0.5">
                ✓
              </div>
              <div>
                <h2 className="text-xs font-bold text-ink uppercase tracking-wide">Multi-Jurisdictional Scope</h2>
                <p className="text-xs text-ink-muted leading-relaxed mt-0.5">
                  Tri-jurisdictional grounding across Bangladesh competition law, US antitrust & UCC, and EU Article 101/102 TFEU & VBER.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In Form */}
        <div className="lg:col-span-6">
          <div className="bg-white border border-hairline rounded-lg p-6 sm:p-8 shadow-subtle space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink">Sign In to Juris AI</h2>
              <p className="text-xs text-ink-muted mt-1">
                Access your contract risk reports, verified citations, and legal research chat.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="counsel@firm.com"
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full mt-2"
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="pt-4 border-t border-hairline text-center text-xs text-ink-muted">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-semibold text-accent hover:underline">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
