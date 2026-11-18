"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setUser(d?.user || null));
  }, []);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Failed to update password.");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setMessage("Password updated and active token_version incremented.");
  }

  async function handleLogoutEverywhere() {
    const res = await fetch("/api/account/logout-all", { method: "POST" });
    if (res.ok) {
      router.push("/login");
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Failed to delete account.");
      return;
    }
    router.push("/");
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-serif font-bold text-[#0b1f33]">Account & Security Settings</h1>

      {message && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2 text-sm">
        <h2 className="text-lg font-serif font-bold text-[#0b1f33]">Profile Information</h2>
        <div>
          <strong>Name:</strong> {user?.fullName}
        </div>
        <div>
          <strong>Email:</strong> {user?.email}
        </div>
        <div>
          <strong>Role:</strong> {user?.role}
        </div>
        {user?.organisation && (
          <div>
            <strong>Organisation:</strong> {user.organisation}
          </div>
        )}
      </div>

      {/* Change Password */}
      <form
        onSubmit={handleChangePassword}
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
      >
        <h2 className="text-lg font-serif font-bold text-[#0b1f33]">
          Change Password (Revokes Other Sessions)
        </h2>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Current password"
          className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
        />
        <input
          type="password"
          required
          minLength={10}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New password (min 10 chars, letter + digit)"
          className="w-full px-3 py-2 rounded border border-slate-300 text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-[#0b1f33] text-white text-xs font-semibold"
        >
          Update Password
        </button>
      </form>

      {/* Session & Data Portability */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div>
          <h2 className="text-lg font-serif font-bold text-[#0b1f33]">
            Sessions & Data Portability
          </h2>
          <p className="text-xs text-slate-600">
            Download all saved analysis outputs and chat logs as JSON, or sign out all devices immediately.
          </p>
        </div>
        <div className="flex gap-3">
          <a
            href="/api/account/export"
            className="px-4 py-2 rounded bg-amber-600 text-white text-xs font-semibold"
          >
            Export My Data (.json)
          </a>
          <button
            type="button"
            onClick={handleLogoutEverywhere}
            className="px-4 py-2 rounded border border-slate-300 text-xs font-semibold"
          >
            Log Out Everywhere
          </button>
        </div>
      </div>

      {/* Delete Account */}
      <form
        onSubmit={handleDeleteAccount}
        className="bg-rose-50 p-6 rounded-xl border border-rose-200 space-y-4"
      >
        <h2 className="text-lg font-serif font-bold text-rose-950">
          Delete Account & All Saved Data
        </h2>
        <p className="text-xs text-rose-800">
          This permanently deletes your profile, all saved contract analyses, and all chat conversations via cascading deletion.
        </p>
        <input
          type="password"
          required
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          placeholder="Confirm your password to delete account"
          className="w-full px-3 py-2 rounded border border-rose-300 text-sm bg-white"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded bg-rose-700 hover:bg-rose-600 text-white text-xs font-semibold"
        >
          Permanently Delete My Account
        </button>
      </form>
    </div>
  );
}
