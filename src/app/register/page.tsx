"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Select } from "@/components/ui/primitives";

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
    <div className="max-w-5xl mx-auto py-6 sm:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Calm Trust Statement */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#7B1E22]/10 border border-[#7B1E22]/20 text-[#7B1E22] text-xs font-semibold">
            <span>Juris AI</span>
            <span className="text-[#7B1E22]/40">·</span>
            <span>Registration</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-ink leading-tight">
            Create your legal intelligence workstation.
          </h1>

          <p className="text-sm text-ink-muted leading-relaxed">
            Gain immediate access to multi-jurisdiction risk analysis, statutory citation cross-referencing, and persistent legal research threads.
          </p>

          <div className="pt-2 space-y-4 border-t border-hairline">
            <div className="bg-paper-warm border border-hairline rounded-lg p-4 space-y-2">
              <div className="text-xs font-bold uppercase text-ink">Account Tiers</div>
              <div className="text-xs text-ink-muted space-y-1">
                <div>
                  <strong className="text-ink">Business:</strong> 30 contract analyses per month, 100 legal research queries per day, organisation tagging.
                </div>
                <div>
                  <strong className="text-ink">Common / Individual:</strong> 3 contract analyses per month, 30 legal queries per day.
                </div>
              </div>
            </div>

            <div className="text-xs text-ink-subtle leading-relaxed">
              * By registering, you acknowledge that Juris AI is an analytical research assistant and not an attorney-client engagement. All legal opinions must be confirmed with licensed counsel.
            </div>
          </div>
        </div>

        {/* Right Column: Register Form */}
        <div className="lg:col-span-6">
          <div className="bg-white border border-hairline rounded-lg p-6 sm:p-8 shadow-subtle space-y-6">
            <div>
              <h2 className="font-serif text-2xl font-bold text-ink">Create an Account</h2>
              <p className="text-xs text-ink-muted mt-1">
                Start analysing contracts across Bangladesh, US, and EU jurisdictions.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Barrister Ayesha Rahman"
              />

              <Input
                label="Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="counsel@firm.bd"
              />

              <Input
                label="Password"
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Minimum 10 characters, at least 1 letter and 1 digit"
              />

              <Select
                label="Account Type"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as "business" | "common")}
              >
                <option value="business">Business (30 analyses / month)</option>
                <option value="common">Common / Individual (3 analyses / month)</option>
              </Select>

              {accountType === "business" && (
                <Input
                  label="Organisation Name"
                  type="text"
                  value={organisation}
                  onChange={(e) => setOrganisation(e.target.value)}
                  placeholder="Bengal Delta Industrial Solutions Ltd."
                />
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full mt-2"
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>

            <div className="pt-4 border-t border-hairline text-center text-xs text-ink-muted">
              Already registered?{" "}
              <Link href="/login" className="font-semibold text-accent hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
