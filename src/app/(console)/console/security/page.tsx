"use client";

import React, { useEffect, useState } from "react";

export default function ConsoleSecurityPage() {
  const [info, setInfo] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/console/security")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setInfo(d));
  }, []);

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch("/api/console/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Unable to update password.");
    } else {
      setMessage("Administrator password updated.");
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  return (
    <div className="max-w-2xl space-y-6 pb-10">
      <div className="border-b border-[#2E2B44] pb-5">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#D6A86E]">
          Account Protection
        </span>
        <h1 className="text-3xl font-serif font-light text-[#F2EFE9]">
          Administrator Security
        </h1>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#7DD3B0] text-xs font-medium">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#F5A3A8] text-xs font-medium">
          {error}
        </div>
      )}

      <div className="vellum-card rounded p-6 flex items-center justify-between">
        <div>
          <h2 className="font-serif text-lg font-medium text-[#F2EFE9]">
            Two-Factor Authentication
          </h2>
          <p className="text-xs text-[#B4B0C2]">
            {info?.totpEnabled ? "Active and protecting this console account." : "Not enrolled yet."}
          </p>
        </div>
        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-[#F0FDF4] text-[#7DD3B0] border border-[#BBF7D0]">
          {info?.totpEnabled ? "Enabled" : "Optional"}
        </span>
      </div>

      <form onSubmit={handlePasswordUpdate} className="vellum-card rounded p-6 space-y-4">
        <h2 className="font-serif text-lg font-medium text-[#F2EFE9]">Change Password</h2>
        <input
          type="password"
          required
          placeholder="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[#2E2B44] bg-[#131220] text-sm"
        />
        <input
          type="password"
          required
          placeholder="New Password (min 10 chars, letter & digit)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3.5 py-2.5 rounded-lg border border-[#2E2B44] bg-[#131220] text-sm"
        />
        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-[#D6A86E] hover:bg-[#C49356] text-[#12111D] font-semibold text-xs font-medium"
        >
          Update Password
        </button>
      </form>
    </div>
  );
}
