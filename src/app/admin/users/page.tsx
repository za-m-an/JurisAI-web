"use client";

import React, { useEffect, useState } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [queryText, setQueryText] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"common" | "business" | "lawyer" | "admin">("business");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function loadUsers(q = queryText) {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
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
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setMessage("User updated.");
      loadUsers();
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/admin/users", {
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
      setMessage("User created with temporary password.");
      loadUsers();
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#0b1f33]">User Management</h1>
          <p className="text-xs text-slate-500">
            Privacy by design: only aggregate analysis and conversation counts are visible.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search email or name..."
            className="px-3 py-1.5 rounded border border-slate-300 text-xs bg-white"
          />
          <button
            type="button"
            onClick={() => loadUsers(queryText)}
            className="px-3 py-1.5 rounded bg-[#0b1f33] text-white text-xs font-semibold"
          >
            Search
          </button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          {message}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 uppercase">
            <tr>
              <th className="p-3">Email / Name</th>
              <th className="p-3">Role</th>
              <th className="p-3">Prof. Level</th>
              <th className="p-3">Status</th>
              <th className="p-3">Analyses / Chats</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="p-3">
                  <div className="font-bold text-[#0b1f33]">{u.email}</div>
                  <div className="text-slate-500">{u.fullName}</div>
                </td>
                <td className="p-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateUser({ userId: u.id, role: e.target.value })}
                    className="px-2 py-1 rounded border border-slate-300 bg-white"
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
                    className="px-2 py-1 rounded border border-slate-300 bg-white"
                  >
                    <option value="">None</option>
                    <option value="trainee">trainee</option>
                    <option value="attorney">attorney</option>
                    <option value="barrister">barrister</option>
                    <option value="advocate">advocate</option>
                  </select>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded font-semibold ${
                      u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {u.isActive ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="p-3">
                  {u.analysesCount} analyses · {u.conversationsCount} chats
                </td>
                <td className="p-3 space-x-2">
                  <button
                    type="button"
                    onClick={() => updateUser({ userId: u.id, isActive: !u.isActive })}
                    className="underline font-semibold text-[#0b1f33]"
                  >
                    {u.isActive ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateUser({ userId: u.id, forceLogout: true })}
                    className="underline text-rose-700"
                  >
                    Force Logout (tv={u.tokenVersion})
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Form */}
      <form
        onSubmit={handleCreateUser}
        className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4"
      >
        <h2 className="text-lg font-serif font-bold text-[#0b1f33]">
          Create User with Temporary Password
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="Email"
            className="px-3 py-2 rounded border border-slate-300"
          />
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Full Name"
            className="px-3 py-2 rounded border border-slate-300"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as any)}
            className="px-3 py-2 rounded border border-slate-300 bg-white"
          >
            <option value="business">business</option>
            <option value="common">common</option>
            <option value="lawyer">lawyer</option>
            <option value="admin">admin</option>
          </select>
          <input
            type="password"
            required
            minLength={10}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Temp password (10+ chars)"
            className="px-3 py-2 rounded border border-slate-300"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-amber-600 text-white text-xs font-semibold"
        >
          Create User
        </button>
      </form>
    </div>
  );
}
