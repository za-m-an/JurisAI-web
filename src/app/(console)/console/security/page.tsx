"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ConsoleSecurityPage() {
  const router = useRouter();
  const [securityData, setSecurityData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [newRecoveryCodes, setNewRecoveryCodes] = useState<string[] | null>(null);

  // Enroll state
  const [enrollData, setEnrollData] = useState<{ secret: string; uri: string; qrCodeDataUrl: string } | null>(null);
  const [confirmCode, setConfirmCode] = useState("");

  async function loadSecurity() {
    setLoading(true);
    try {
      const res = await fetch("/api/console/security");
      if (res.ok) {
        const data = await res.json();
        setSecurityData(data);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSecurity();
  }, []);

  async function handleRegenerateCodes() {
    setMessage(null);
    setNewRecoveryCodes(null);
    const res = await fetch("/api/console/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate_recovery_codes" }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewRecoveryCodes(data.recoveryCodes);
      setMessage("8 new one-time recovery codes generated. Store them securely.");
      loadSecurity();
    } else {
      setMessage(data.message || "Failed to regenerate recovery codes.");
    }
  }

  async function handleResetTotp() {
    if (!confirm("Are you sure you want to reset your TOTP 2FA? You will be prompted to re-enroll on your next sign in.")) {
      return;
    }
    setMessage(null);
    const res = await fetch("/api/console/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset_totp" }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("TOTP 2FA reset successfully.");
      setEnrollData(null);
      loadSecurity();
    }
  }

  async function handleStartReenroll() {
    setMessage(null);
    const res = await fetch("/api/console/auth/totp/enroll", { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setEnrollData(data);
    } else {
      setMessage(data.message || "Failed to start 2FA enrollment.");
    }
  }

  async function handleConfirmReenroll(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/console/auth/totp/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: confirmCode }),
    });
    const data = await res.json();
    if (res.ok) {
      setNewRecoveryCodes(data.recoveryCodes);
      setEnrollData(null);
      setConfirmCode("");
      setMessage("Two-factor authentication successfully re-enrolled.");
      loadSecurity();
    } else {
      setMessage(data.message || "Failed to confirm verification code.");
    }
  }

  async function handleSignOutAllSessions() {
    if (!confirm("Terminate all active administrative sessions? You will need to sign in again.")) {
      return;
    }
    await fetch("/api/console/security", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout_all" }),
    });
    router.replace("/console/login");
  }

  if (loading) {
    return <div className="text-xs font-mono text-slate-500">Loading security parameters...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-lg font-mono font-bold text-slate-900 tracking-tight">
          Admin Console Security Controls
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          Manage RFC 6238 TOTP two-factor authentication, emergency recovery codes, and session invalidation.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-slate-900 text-slate-100 rounded text-xs font-mono">
          {message}
        </div>
      )}

      {/* 2FA Status & Actions */}
      <div className="bg-white p-6 rounded border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-bold text-slate-900">Two-Factor Authentication (TOTP)</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                  securityData?.totpEnabled
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {securityData?.totpEnabled ? "Active & Enforced" : "Setup Required"}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Remaining One-Time Recovery Codes: <strong className="text-slate-800">{securityData?.recoveryCodesRemaining || 0}</strong>
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-mono">
            <button
              onClick={handleRegenerateCodes}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-bold text-slate-800 transition-colors"
            >
              Regenerate Recovery Codes
            </button>
            <button
              onClick={handleResetTotp}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded font-bold text-rose-700 transition-colors"
            >
              Reset 2FA Configuration
            </button>
            {!securityData?.totpEnabled && (
              <button
                onClick={handleStartReenroll}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-bold transition-colors"
              >
                Start Enrollment
              </button>
            )}
          </div>
        </div>

        {/* Re-enrollment UI */}
        {enrollData && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded space-y-4 text-xs font-mono">
            <h2 className="font-bold text-slate-900 uppercase text-[11px]">Scan Authenticator QR Code</h2>
            <div className="flex justify-center p-3 bg-white border border-slate-200 rounded max-w-xs mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrollData.qrCodeDataUrl} alt="TOTP QR Code" className="w-40 h-40" />
            </div>
            <div>
              <span className="text-slate-500 text-[10px] uppercase">Manual Key:</span>
              <div className="font-mono text-xs font-bold text-slate-900 select-all">{enrollData.secret}</div>
            </div>
            <form onSubmit={handleConfirmReenroll} className="flex gap-2 max-w-xs">
              <input
                type="text"
                required
                maxLength={6}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="6-digit code"
                className="px-3 py-1.5 border border-slate-300 rounded text-center tracking-widest font-mono text-xs focus:outline-none focus:border-slate-500"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded"
              >
                Confirm
              </button>
            </form>
          </div>
        )}

        {/* Display New Recovery Codes */}
        {newRecoveryCodes && (
          <div className="p-4 bg-slate-950 text-slate-200 rounded border border-slate-800 space-y-3 font-mono text-xs">
            <div className="text-emerald-400 font-bold uppercase text-[11px]">
              New Recovery Codes (Save Immediately)
            </div>
            <p className="text-slate-400 text-[11px]">
              Each code is single-use. These hashes will not be displayed again.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {newRecoveryCodes.map((code, idx) => (
                <div key={idx} className="p-2 bg-slate-900 border border-slate-800 rounded text-center select-all text-amber-300 font-bold">
                  {code}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Global Session Revocation */}
      <div className="bg-white p-6 rounded border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-mono font-bold text-slate-900">Administrative Session Termination</h2>
          <p className="text-xs text-slate-500 font-mono mt-0.5">
            Immediately revokes all active admin JWT session tokens by incrementing your security token version.
          </p>
        </div>
        <button
          onClick={handleSignOutAllSessions}
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold rounded transition-colors"
        >
          Sign Out All Admin Sessions
        </button>
      </div>

      {/* Recent Logins Table */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-x-auto space-y-2 p-5">
        <h2 className="text-xs font-mono font-bold uppercase text-slate-700">Recent Security Events &amp; Logins</h2>
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
            <tr>
              <th className="p-2.5">Timestamp</th>
              <th className="p-2.5">Event</th>
              <th className="p-2.5">Client IP</th>
              <th className="p-2.5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(securityData?.recentLogins || []).map((ev: any) => (
              <tr key={ev.id}>
                <td className="p-2.5 text-slate-500 whitespace-nowrap">
                  {new Date(ev.created_at).toLocaleString()}
                </td>
                <td className="p-2.5 font-semibold text-slate-900">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] ${
                      ev.action === "login_success"
                        ? "bg-emerald-100 text-emerald-800"
                        : ev.action === "login_failed"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-slate-100 text-slate-800"
                    }`}
                  >
                    {ev.action}
                  </span>
                </td>
                <td className="p-2.5 text-slate-600">{ev.ip || "—"}</td>
                <td className="p-2.5 text-slate-500 truncate max-w-xs">{JSON.stringify(ev.meta)}</td>
              </tr>
            ))}
            {(securityData?.recentLogins || []).length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-slate-500 font-mono text-xs">
                  No recent login records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
