"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"common" | "business">("common");
  const [organisation, setOrganisation] = useState("");
  const [region, setRegion] = useState<"BD" | "US" | "EU">("BD");

  const [showTosModal, setShowTosModal] = useState(false);
  const [tosChecked, setTosChecked] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Only available to non-logged-in users
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

  function handlePreSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError("");

    if (!fullName.trim() || fullName.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Password must be at least 10 characters and include both a letter and a digit.");
      return;
    }
    if (accountType === "business" && !organisation.trim()) {
      setError("Organisation name is required for business accounts.");
      return;
    }

    setShowTosModal(true);
  }

  async function handleConfirmRegistration() {
    if (!tosChecked) return;
    setSubmitting(true);
    setError("");

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
          region,
          tosAccepted: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Registration failed. Please check your details.");
        setShowTosModal(false);
        setSubmitting(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Unable to complete registration. Please try again.");
      setShowTosModal(false);
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-8">
      <div className="w-full max-w-lg vellum-card rounded-2xl p-8 sm:p-10 space-y-6">
        <div className="space-y-2 border-b border-[#E5E2DC] pb-5">
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#B45309]">
            New Account Registration
          </span>
          <h1 className="text-3xl font-serif font-medium text-[#18181B]">
            Create your workspace
          </h1>
          <p className="text-sm text-[#52525B]">
            Configure your primary jurisdiction and begin reviewing legal agreements.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handlePreSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="block text-xs font-medium text-[#18181B]">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Tariqul Hasan"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E2DC] bg-[#FAF9F6] text-sm text-[#18181B] focus:outline-none focus:border-[#134E4A] focus:bg-white editorial-transition"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="region" className="block text-xs font-medium text-[#18181B]">
                Primary Region / Law
              </label>
              <select
                id="region"
                value={region}
                onChange={(e) => setRegion(e.target.value as "BD" | "US" | "EU")}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E2DC] bg-[#FAF9F6] text-sm text-[#18181B] focus:outline-none focus:border-[#134E4A] focus:bg-white editorial-transition"
              >
                <option value="BD">Bangladesh (BD)</option>
                <option value="US">United States (US)</option>
                <option value="EU">European Union (EU)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-xs font-medium text-[#18181B]">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E2DC] bg-[#FAF9F6] text-sm text-[#18181B] focus:outline-none focus:border-[#134E4A] focus:bg-white editorial-transition"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-xs font-medium text-[#18181B]">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 10 characters, with letter & digit"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E2DC] bg-[#FAF9F6] text-sm text-[#18181B] focus:outline-none focus:border-[#134E4A] focus:bg-white editorial-transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#18181B]">
              Account Tier
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAccountType("common")}
                className={`p-3 rounded-lg border text-left editorial-transition ${
                  accountType === "common"
                    ? "border-[#134E4A] bg-[#134E4A]/5 text-[#134E4A]"
                    : "border-[#E5E2DC] bg-[#FAF9F6] text-[#52525B]"
                }`}
              >
                <div className="text-xs font-semibold">Individual</div>
                <div className="text-[11px] opacity-80">Personal legal matters</div>
              </button>
              <button
                type="button"
                onClick={() => setAccountType("business")}
                className={`p-3 rounded-lg border text-left editorial-transition ${
                  accountType === "business"
                    ? "border-[#134E4A] bg-[#134E4A]/5 text-[#134E4A]"
                    : "border-[#E5E2DC] bg-[#FAF9F6] text-[#52525B]"
                }`}
              >
                <div className="text-xs font-semibold">Business / Enterprise</div>
                <div className="text-[11px] opacity-80">Corporate agreements</div>
              </button>
            </div>
          </div>

          {accountType === "business" && (
            <div className="space-y-1.5">
              <label htmlFor="organisation" className="block text-xs font-medium text-[#18181B]">
                Organisation Name
              </label>
              <input
                id="organisation"
                type="text"
                required
                value={organisation}
                onChange={(e) => setOrganisation(e.target.value)}
                placeholder="Bengal Industrial Distributors Ltd."
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E5E2DC] bg-[#FAF9F6] text-sm text-[#18181B] focus:outline-none focus:border-[#134E4A] focus:bg-white editorial-transition"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => handlePreSubmit()}
            className="w-full py-2.5 px-4 rounded-lg bg-[#134E4A] hover:bg-[#0F3F3C] text-[#FAF9F6] text-sm font-medium editorial-transition shadow-sm"
          >
            Register
          </button>
        </form>

        <div className="pt-4 border-t border-[#E5E2DC] text-center">
          <Link
            href="/login"
            className="text-xs font-medium text-[#52525B] hover:text-[#134E4A] editorial-transition"
          >
            Already have an account? Return to Sign In
          </Link>
        </div>
      </div>

      {/* Terms of Service Acceptance Modal (Frosted Vellum Glass) */}
      {showTosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-vellum rounded-2xl p-6 sm:p-8 space-y-5">
            <div className="border-b border-[#E5E2DC] pb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#B45309]">
                Mandatory Agreement
              </span>
              <h2 className="text-2xl font-serif font-medium text-[#18181B] mt-1">
                Terms of Service &amp; Data Handling
              </h2>
            </div>

            <div className="max-h-60 overflow-y-auto pr-2 space-y-3 text-xs text-[#52525B] leading-relaxed">
              <p>
                <strong className="text-[#18181B]">1. Document &amp; Case Confidentiality:</strong>{" "}
                Uploaded contracts and legal documents are processed transiently solely to generate
                your legal memorandum and risk evaluation. Original document files are never retained
                permanently on our storage servers.
              </p>
              <p>
                <strong className="text-[#18181B]">2. Stored Account Records:</strong>{" "}
                We store your account profile (name, email, region, organisation, and avatar),
                subscription tier, generated legal analysis reference IDs, brief executive summaries,
                and your Copilot consultation history so you can revisit ongoing cases at any time.
              </p>
              <p>
                <strong className="text-[#18181B]">3. Statutory Advisory &amp; Representation:</strong>{" "}
                Juris AI provides structured legal counsel grounded in statutory law and judicial
                precedents for your selected jurisdiction. Where formal court representation is
                required, you may engage verified regional law firms directly through our directory.
              </p>
              <p>
                <strong className="text-[#18181B]">4. User Sovereignty:</strong>{" "}
                You may update your profile, switch regions, or permanently erase your account and
                all associated case records at any time from your Settings portal.
              </p>
            </div>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#E5E2DC] bg-white/80 cursor-pointer">
              <input
                type="checkbox"
                checked={tosChecked}
                onChange={(e) => setTosChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#E5E2DC] text-[#134E4A] focus:ring-[#134E4A]"
              />
              <span className="text-xs text-[#18181B] leading-snug">
                I have read and agree to the Juris AI Terms of Service and Data Handling Policy.
              </span>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowTosModal(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg border border-[#E5E2DC] bg-white text-xs font-medium text-[#52525B] hover:text-[#18181B]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!tosChecked || submitting}
                onClick={handleConfirmRegistration}
                className="px-5 py-2 rounded-lg bg-[#134E4A] hover:bg-[#0F3F3C] disabled:opacity-50 text-[#FAF9F6] text-xs font-medium editorial-transition"
              >
                {submitting ? "Creating Account..." : "Agree & Continue"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
