"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.user) {
          router.replace("/login");
          return;
        }
        setLoading(false);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    const res = await fetch("/api/account/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Unable to change password.");
    } else {
      setMessage("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  async function handleLogoutAll() {
    await fetch("/api/account/logout-all", { method: "POST" });
    router.push("/login");
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword }),
    });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.message || "Password confirmation failed.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-xs font-mono text-[#B4B0C2]">
        Loading Security...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div className="border-b border-[#2E2B44] pb-4">
        <Link href="/settings" className="text-xs text-[#F2EFE9] hover:underline">
          &larr; Back to Settings
        </Link>
        <h1 className="text-3xl font-serif font-light text-[#F2EFE9] mt-1">
          Account Security
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

      {/* Password Update */}
      <form onSubmit={handlePasswordChange} className="vellum-card rounded p-6 space-y-4">
        <h2 className="font-serif text-xl font-medium text-[#F2EFE9]">Update Password</h2>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#F2EFE9]">Current Password</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#2E2B44] bg-[#131220] text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-[#F2EFE9]">New Password</label>
          <input
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 10 characters, with letter & digit"
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#2E2B44] bg-[#131220] text-sm"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-lg bg-[#D6A86E] text-[#12111D] font-semibold text-xs font-medium"
        >
          Update Password
        </button>
      </form>

      {/* Session Revocation */}
      <div className="vellum-card rounded p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg font-medium text-[#F2EFE9]">Active Sessions</h2>
          <p className="text-xs text-[#B4B0C2]">
            Sign out from all browsers and devices immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogoutAll}
          className="px-4 py-2 rounded-lg border border-[#2E2B44] bg-[#131220] hover:bg-[#1A1829] text-xs font-medium text-[#F2EFE9]"
        >
          Sign Out All Devices
        </button>
      </div>

      {/* Delete Account */}
      <form onSubmit={handleDeleteAccount} className="vellum-card rounded p-6 border-[#FECACA] space-y-4">
        <div>
          <h2 className="font-serif text-lg font-medium text-[#F5A3A8]">Delete Account</h2>
          <p className="text-xs text-[#B4B0C2]">
            Permanently erase your profile, analyses, and consultation records.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="password"
            required
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Confirm password to delete"
            className="flex-1 px-3.5 py-2 rounded-lg border border-[#2E2B44] bg-[#131220] text-xs"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-medium"
          >
            Permanently Delete
          </button>
        </div>
      </form>
    </div>
  );
}
