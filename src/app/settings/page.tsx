"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Input } from "@/components/ui/primitives";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const u = d?.user || null;
        setUser(u);
        if (u) {
          setFullName(u.fullName || "");
          setOrganisation(u.organisation || "");
        }
      });
  }, []);

  async function handleProfileUpdate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        organisation: user?.role === "business" ? organisation : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.message || "Failed to update profile.");
      return;
    }
    setUser((prev: any) => ({ ...prev, fullName: data.user.full_name || data.user.fullName, organisation: data.user.organisation }));
    setMessage("Profile details saved successfully.");
  }

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
    setMessage("Password successfully updated. All other active sessions have been revoked.");
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
    if (!confirm("Are you certain you want to permanently delete your account and all associated analyses?")) return;
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
    <div className="max-w-3xl mx-auto py-6 space-y-8">
      <div className="border-b border-hairline pb-4">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
          Account & Security Settings
        </h1>
        <p className="text-xs text-ink-muted mt-1">
          Manage your personal details, credentials, data portability, and active sessions.
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-md bg-[#E8F5EE] border border-[#A3D9BD] text-[#1B6E42] text-xs font-medium">
          {message}
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* 1. Profile Details */}
      <form
        onSubmit={handleProfileUpdate}
        className="bg-white border border-hairline rounded-lg p-6 shadow-subtle space-y-4"
      >
        <h2 className="font-serif text-lg font-bold text-ink border-b border-hairline pb-2">
          Profile Information
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ""}
              className="w-full px-3 py-2 bg-paper-warm border border-hairline rounded-md text-xs text-ink-muted cursor-not-allowed"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Account Role:
          </span>
          <Badge variant="neutral" className="uppercase font-mono text-[10px]">
            {user?.role || "common"}
          </Badge>
        </div>

        {user?.role === "business" && (
          <Input
            label="Organisation Name"
            type="text"
            value={organisation}
            onChange={(e) => setOrganisation(e.target.value)}
          />
        )}

        <div className="pt-2">
          <Button type="submit" variant="primary" size="md">
            Save Profile Changes
          </Button>
        </div>
      </form>

      {/* 2. Change Password */}
      <form
        onSubmit={handleChangePassword}
        className="bg-white border border-hairline rounded-lg p-6 shadow-subtle space-y-4"
      >
        <div>
          <h2 className="font-serif text-lg font-bold text-ink">Change Password</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Updating your password increments your security token version, automatically terminating other open sessions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Current Password"
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />

          <Input
            label="New Password"
            type="password"
            required
            minLength={10}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            helperText="Minimum 10 characters, at least 1 letter & 1 digit"
          />
        </div>

        <div className="pt-2">
          <Button type="submit" variant="secondary" size="md">
            Update Password
          </Button>
        </div>
      </form>

      {/* 3. Data Portability & Session Control */}
      <div className="bg-white border border-hairline rounded-lg p-6 shadow-subtle space-y-4">
        <div>
          <h2 className="font-serif text-lg font-bold text-ink">Data Portability & Sessions</h2>
          <p className="text-xs text-ink-muted mt-0.5">
            Download your account history or terminate all active login sessions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <a href="/api/account/export">
            <Button variant="outline" size="md">
              Export All Data (.json)
            </Button>
          </a>
          <Button variant="outline" size="md" onClick={handleLogoutEverywhere}>
            Log Out Everywhere
          </Button>
        </div>
      </div>

      {/* 4. Danger Zone: Delete Account */}
      <form
        onSubmit={handleDeleteAccount}
        className="bg-rose-50/50 border border-rose-200 rounded-lg p-6 space-y-4"
      >
        <div>
          <h2 className="font-serif text-lg font-bold text-rose-900">Danger Zone: Delete Account</h2>
          <p className="text-xs text-rose-800 mt-0.5">
            Permanently removes your account profile, all recorded contract analyses, and all chat transcripts. This action is irreversible.
          </p>
        </div>

        <Input
          label="Confirm Your Password"
          type="password"
          required
          value={deletePassword}
          onChange={(e) => setDeletePassword(e.target.value)}
          placeholder="Enter password to confirm"
        />

        <div className="pt-2">
          <Button type="submit" variant="danger" size="md">
            Permanently Delete My Account
          </Button>
        </div>
      </form>
    </div>
  );
}
