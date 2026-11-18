"use client";

import React, { useEffect, useState } from "react";

export default function ConsoleUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [queryText, setQueryText] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"common" | "business" | "lawyer" | "admin">("business");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function loadUsers(q = queryText) {
    const res = await fetch(`/api/console/users?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users || []);
    }
  }

  useEffect(() => {
    loadUsers("");
  }, []);

  async function updateUser(patch: Record<string, any>) {
    setMessage(null);
    const res = await fetch("/api/console/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setMessage("User updated successfully.");
      loadUsers();
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/console/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: newEmail,
        fullName: newName,
        role: newRole,
        temporaryPassword: newPassword,
      }),
    });
    if (res.ok) {
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setMessage("User created with temporary password. Forced password change is active.");
      loadUsers();
    } else {
      const d = await res.json();
      setMessage(d.message || "Failed to create user.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-lg font-mono font-bold text-slate-900 tracking-tight">
          User Account Administration
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-0.5">
          Privacy guarantee: Admins have zero access to user documents, raw analyses, or chats. Counts only.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-slate-900 text-slate-100 rounded text-xs font-mono">
          {message}
        </div>
      )}

      {/* Create User Form */}
      <div className="bg-white p-5 rounded border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-xs font-mono font-bold uppercase text-slate-700">
          Provision User Account (Temporary Password)
        </h2>
        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="email"
            required
            placeholder="User Email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-slate-500"
          />
          <input
            type="text"
            required
            placeholder="Full Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-slate-500"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs font-mono bg-white focus:outline-none focus:border-slate-500"
          >
            <option value="business">business</option>
            <option value="common">common</option>
            <option value="lawyer">lawyer (reserved)</option>
            <option value="admin">admin</option>
          </select>
          <input
            type="password"
            required
            placeholder="Temp Password (min 10)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded transition-colors"
          >
            Provision Account
          </button>
        </form>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Filter by email or name..."
          value={queryText}
          onChange={(e) => {
            setQueryText(e.target.value);
            loadUsers(e.target.value);
          }}
          className="w-full max-w-sm px-3 py-1.5 border border-slate-300 rounded text-xs font-mono focus:outline-none focus:border-slate-500"
        />
      </div>

      {/* Users Table */}
      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px]">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Role</th>
              <th className="p-3">Prof. Level</th>
              <th className="p-3">Analyses / Chats</th>
              <th className="p-3">2FA / Force Reset</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="p-3">
                  <div className="font-bold text-slate-900">{u.fullName}</div>
                  <div className="text-[11px] text-slate-500">{u.email}</div>
                  {u.organisation && (
                    <div className="text-[10px] text-slate-400">Org: {u.organisation}</div>
                  )}
                </td>
                <td className="p-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateUser({ userId: u.id, role: e.target.value })}
                    className="p-1 border border-slate-300 rounded bg-white text-[11px]"
                  >
                    <option value="common">common</option>
                    <option value="business">business</option>
                    <option value="lawyer">lawyer</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="p-3">
                  <select
                    value={u.professionalLevel || ""}
                    onChange={(e) =>
                      updateUser({
                        userId: u.id,
                        professionalLevel: e.target.value || null,
                      })
                    }
                    className="p-1 border border-slate-300 rounded bg-white text-[11px]"
                  >
                    <option value="">None</option>
                    <option value="trainee">trainee</option>
                    <option value="attorney">attorney</option>
                    <option value="barrister">barrister</option>
                    <option value="advocate">advocate</option>
                  </select>
                </td>
                <td className="p-3 text-slate-600">
                  {u.analysesCount} reports · {u.conversationsCount} chats
                </td>
                <td className="p-3 text-[11px]">
                  {u.totpEnabled ? (
                    <span className="text-emerald-700 font-semibold">2FA Enabled</span>
                  ) : (
                    <span className="text-slate-400">None</span>
                  )}
                  {u.mustChangePassword && (
                    <span className="block text-amber-700 font-semibold text-[10px]">Must Change Pw</span>
                  )}
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      u.isActive
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {u.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="p-3 space-x-2">
                  <button
                    onClick={() => updateUser({ userId: u.id, isActive: !u.isActive })}
                    className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 underline"
                  >
                    {u.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => updateUser({ userId: u.id, forceLogout: true })}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-900 underline"
                  >
                    Force Logout
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500 font-mono text-xs">
                  No matching user accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
