"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConsoleLoginPage() {
  const router = useRouter();

  // Login credentials state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);

  // Workflow states
  const [step, setStep] = useState<"credentials" | "totp" | "enroll" | "recovery_display" | "change_password">("credentials");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Enrollment data
  const [enrollData, setEnrollData] = useState<{ secret: string; uri: string; qrCodeDataUrl: string } | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [savedRecoveryCodes, setSavedRecoveryCodes] = useState<string[]>([]);

  // Password change state
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

      // Check if user needs enrollment or password change
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
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-2xl space-y-6">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-slate-500 mb-1">
          Authentication Gate
        </div>
        <h1 className="text-xl font-mono font-bold text-white tracking-tight">
          Admin Console Sign In
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Restricted administrative access. All actions are cryptographically verified and audited.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-mono">
          {error}
        </div>
      )}

      {/* Step 1: Initial Email & Password */}
      {step === "credentials" && (
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Admin Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 text-sm font-mono focus:outline-none focus:border-slate-500"
              placeholder="admin@juris.local"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 text-sm font-mono focus:outline-none focus:border-slate-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-slate-100 hover:bg-white text-slate-950 font-mono font-bold text-xs uppercase rounded transition-colors"
          >
            {loading ? "Authenticating..." : "Continue"}
          </button>
        </form>
      )}

      {/* Step 2: 2FA TOTP or Recovery Code */}
      {step === "totp" && (
        <form onSubmit={handleTotpSubmit} className="space-y-4">
          {!useRecovery ? (
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                6-Digit Authenticator Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 text-center tracking-widest font-mono text-lg focus:outline-none focus:border-slate-500"
                placeholder="000000"
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Enter the active 6-digit code from your authenticator app.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
                Emergency Recovery Code
              </label>
              <input
                type="text"
                required
                value={recoveryCode}
                onChange={(e) => setRecoveryCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono text-sm uppercase tracking-wider text-center focus:outline-none focus:border-slate-500"
                placeholder="XXXXX-XXXXX"
                autoFocus
              />
              <p className="text-[11px] text-slate-500 mt-1">
                A one-time recovery code will be burned upon successful sign in.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-slate-100 hover:bg-white text-slate-950 font-mono font-bold text-xs uppercase rounded transition-colors"
          >
            {loading ? "Verifying..." : "Verify & Sign In"}
          </button>

          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <button
              type="button"
              onClick={() => setUseRecovery(!useRecovery)}
              className="hover:text-slate-200 underline"
            >
              {useRecovery ? "Use Authenticator App" : "Use Emergency Recovery Code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setTotpCode("");
                setRecoveryCode("");
              }}
              className="hover:text-slate-200"
            >
              Back
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Mandatory TOTP Enrollment */}
      {step === "enroll" && enrollData && (
        <form onSubmit={handleConfirmEnrollment} className="space-y-4">
          <div className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-3">
            <p className="text-slate-300 font-medium">
              Two-factor authentication is required for all administrative accounts.
            </p>
            <div className="flex justify-center p-2 bg-white rounded">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollData.qrCodeDataUrl} alt="TOTP QR Code" className="w-44 h-44" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-mono uppercase">Manual Secret Key:</div>
              <div className="font-mono text-xs font-bold text-amber-300 select-all break-all">
                {enrollData.secret}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Confirm 6-Digit Code
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={enrollCode}
              onChange={(e) => setEnrollCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 text-center font-mono text-base tracking-widest focus:outline-none focus:border-slate-500"
              placeholder="000000"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-slate-100 hover:bg-white text-slate-950 font-mono font-bold text-xs uppercase rounded transition-colors"
          >
            {loading ? "Activating..." : "Activate Two-Factor"}
          </button>
        </form>
      )}

      {/* Step 4: Recovery Codes Display */}
      {step === "recovery_display" && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-950/40 border border-emerald-800/40 rounded space-y-2">
            <h2 className="text-xs font-mono font-bold uppercase text-emerald-300">
              Save Emergency Recovery Codes
            </h2>
            <p className="text-[11px] text-emerald-200/80">
              These codes provide access if your 2FA device is lost. Each code can only be used once. Store them in a secure password manager.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-950 border border-slate-800 rounded font-mono text-xs text-center text-slate-300">
            {savedRecoveryCodes.map((c, i) => (
              <div key={i} className="p-1 bg-slate-900 border border-slate-800 rounded select-all">
                {c}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              router.replace("/console");
            }}
            className="w-full py-2 bg-slate-100 hover:bg-white text-slate-950 font-mono font-bold text-xs uppercase rounded transition-colors"
          >
            I Have Saved These Codes — Enter Console
          </button>
        </div>
      )}

      {/* Step 5: Forced Password Change */}
      {step === "change_password" && (
        <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
          <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded text-xs text-amber-300">
            Initial setup requires changing the default/temporary administrator password.
          </div>
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              New Password (min 10 chars, letter + digit)
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
            />
          </div>
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 font-mono text-sm focus:outline-none focus:border-slate-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-slate-100 hover:bg-white text-slate-950 font-mono font-bold text-xs uppercase rounded transition-colors"
          >
            {loading ? "Updating..." : "Update Password & Enter Console"}
          </button>
        </form>
      )}
    </div>
  );
}
