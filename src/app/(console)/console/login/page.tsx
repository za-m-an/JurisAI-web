"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConsoleLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  const [step, setStep] = useState<"credentials" | "totp" | "enroll" | "recovery_display" | "change_password">("credentials");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [enrollData, setEnrollData] = useState<{ secret: string; uri: string; qrCodeDataUrl: string } | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [savedRecoveryCodes, setSavedRecoveryCodes] = useState<string[]>([]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/console/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.error === "totp_required") {
          setStep("totp");
          return;
        }
        setError(data.message || "Invalid email or password.");
        return;
      }

      if (data.user?.mustEnrollTotp) {
        await startTotpEnrollment();
        return;
      }
      if (data.user?.mustChangePassword) {
        setStep("change_password");
        return;
      }

      router.replace("/console");
    } catch {
      setError("Network error while connecting to administrative console.");
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload: any = { email, password };
      if (useRecovery) {
        payload.recoveryCode = recoveryCode.trim();
      } else {
        payload.totpCode = totpCode.trim();
      }

      const res = await fetch("/api/console/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid authentication code.");
        return;
      }

      if (data.user?.mustChangePassword) {
        setStep("change_password");
        return;
      }

      router.replace("/console");
    } catch {
      setError("Network error during two-factor verification.");
    } finally {
      setLoading(false);
    }
  }

  async function startTotpEnrollment() {
    try {
      const res = await fetch("/api/console/auth/totp/enroll", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to start 2FA enrollment.");
        return;
      }
      setEnrollData(data);
      setStep("enroll");
    } catch {
      setError("Failed to generate two-factor enrollment credentials.");
    }
  }

  async function handleConfirmEnrollment(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/console/auth/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: enrollCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Verification code failed.");
        return;
      }
      setSavedRecoveryCodes(data.recoveryCodes || []);
      setStep("recovery_display");
    } catch {
      setError("Error confirming two-factor setup.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChangeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/console/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: password, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Password change failed.");
        return;
      }
      router.replace("/console");
    } catch {
      setError("Network error while updating password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md vellum-card rounded p-8 sm:p-10 space-y-6">
      <div className="space-y-2 border-b border-[#E0E2E4] pb-5">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#ff4716]">
          Executive Gate
        </span>
        <h1 className="text-3xl font-serif font-light text-[#121719]">
          Admin Console Sign In
        </h1>
        <p className="text-xs text-[#5b6472]">
          Restricted administrative access with multi-factor verification.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs font-medium">
          {error}
        </div>
      )}

      {/* Step 1: Initial Email & Password */}
      {step === "credentials" && (
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#121719]">
              Administrator Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-sm text-[#121719] focus:outline-none focus:border-[#121719] focus:bg-white editorial-transition"
              placeholder="admin@juris.local"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#121719]">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-sm text-[#121719] focus:outline-none focus:border-[#121719] focus:bg-white editorial-transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#121719] hover:bg-[#222729] text-[#F3F3F3] text-sm font-medium editorial-transition shadow-sm"
          >
            {loading ? "Authenticating..." : "Continue"}
          </button>
        </form>
      )}

      {/* Step 2: 2FA TOTP or Recovery Code */}
      {step === "totp" && (
        <form onSubmit={handleTotpSubmit} className="space-y-4">
          {!useRecovery ? (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#121719]">
                6-Digit Authenticator Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-[#121719] text-center tracking-widest font-mono text-lg focus:outline-none focus:border-[#121719]"
                placeholder="000000"
                autoFocus
              />
              <p className="text-[11px] text-[#5b6472]">
                Enter the active 6-digit code from your authenticator app.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#121719]">
                Emergency Recovery Code
              </label>
              <input
                type="text"
                required
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-[#121719] font-mono text-sm uppercase tracking-wider text-center focus:outline-none focus:border-[#121719]"
                placeholder="XXXXX-XXXXX"
                autoFocus
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#121719] hover:bg-[#222729] text-[#F3F3F3] text-sm font-medium editorial-transition"
          >
            {loading ? "Verifying..." : "Verify & Sign In"}
          </button>

          <div className="flex items-center justify-between text-xs text-[#5b6472]">
            <button
              type="button"
              onClick={() => setUseRecovery(!useRecovery)}
              className="hover:text-[#121719] underline"
            >
              {useRecovery ? "Use Authenticator App" : "Use Recovery Code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setTotpCode("");
                setRecoveryCode("");
              }}
              className="hover:text-[#121719]"
            >
              Back
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Mandatory TOTP Enrollment */}
      {step === "enroll" && enrollData && (
        <form onSubmit={handleConfirmEnrollment} className="space-y-4">
          <div className="p-4 bg-[#F3F3F3] border border-[#E0E2E4] rounded text-xs space-y-3">
            <p className="text-[#121719] font-medium">
              Two-factor authentication is required for administrative access.
            </p>
            <div className="flex justify-center p-2 bg-white rounded-lg border border-[#E0E2E4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollData.qrCodeDataUrl} alt="TOTP QR Code" className="w-40 h-40" />
            </div>
            <div>
              <div className="text-[10px] text-[#5b6472] font-mono uppercase">Manual Secret Key:</div>
              <div className="font-mono text-xs font-semibold text-[#121719] select-all break-all">
                {enrollData.secret}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#121719]">
              Confirm 6-Digit Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={enrollCode}
              onChange={(e) => setEnrollCode(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-center font-mono text-base tracking-widest"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#121719] hover:bg-[#222729] text-[#F3F3F3] text-sm font-medium"
          >
            {loading ? "Activating..." : "Activate Two-Factor"}
          </button>
        </form>
      )}

      {/* Step 4: Recovery Codes Display */}
      {step === "recovery_display" && (
        <div className="space-y-4">
          <div className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded space-y-1.5">
            <h2 className="text-xs font-mono font-bold uppercase text-[#166534]">
              Save Emergency Recovery Codes
            </h2>
            <p className="text-[11px] text-[#166534]/80">
              Each code can be used once if your authenticator device is lost.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 bg-[#F3F3F3] border border-[#E0E2E4] rounded font-mono text-xs text-center text-[#121719]">
            {savedRecoveryCodes.map((c, i) => (
              <div key={i} className="p-1.5 bg-white border border-[#E0E2E4] rounded select-all">
                {c}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => router.replace("/console")}
            className="w-full py-2.5 rounded-lg bg-[#121719] hover:bg-[#222729] text-[#F3F3F3] text-sm font-medium"
          >
            I Have Saved These Codes — Enter Console
          </button>
        </div>
      )}

      {/* Step 5: Forced Password Change */}
      {step === "change_password" && (
        <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
          <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs text-[#92400E]">
            Initial setup requires updating the temporary administrator password.
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#121719]">
              New Password (min 10 chars, letter + digit)
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#121719]">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E0E2E4] bg-[#F3F3F3] text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#121719] hover:bg-[#222729] text-[#F3F3F3] text-sm font-medium"
          >
            {loading ? "Updating..." : "Update Password & Enter Console"}
          </button>
        </form>
      )}
    </div>
  );
}
