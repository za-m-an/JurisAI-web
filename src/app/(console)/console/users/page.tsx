"use client";

import React, { useEffect, useState } from "react";

interface UserRow {
  id: string;
  email: string;
  fullName: string;
  role: "common" | "business" | "lawyer" | "admin";
  organisation: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function ConsoleUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadUsers() {
    try {
      const res = await fetch("/api/console/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleRoleChange(userId: string, role: string) {
    setMessage(null);
    const res = await fetch("/api/console/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    if (res.ok) {
      setMessage("User role updated.");
      loadUsers();
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setMessage(null);
    const res = await fetch("/api/console/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isActive }),
    });
    if (res.ok) {
      setMessage(`Account ${isActive ? "activated" : "suspended"}.`);
      loadUsers();
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-xs font-mono uppercase tracking-wider text-[#B4B0C2]">
        Loading Users...
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="border-b border-[#2E2B44] pb-5">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#D6A86E]">
          Access Control
        </span>
        <h1 className="text-3xl font-serif font-light text-[#F2EFE9]">
          Users &amp; Role Management
        </h1>
        <p className="text-sm text-[#B4B0C2]">
          Manage account roles and access status across all registered users.
        </p>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#7DD3B0] text-xs font-medium">
          {message}
        </div>
      )}

      <div className="vellum-card rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#2E2B44] bg-[#131220] text-[10px] font-mono uppercase tracking-wider text-[#B4B0C2]">
                <th className="py-3.5 px-5">Name &amp; Email</th>
                <th className="py-3.5 px-4">Organisation</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2E2B44]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#222036]/60">
                  <td className="py-3.5 px-5">
                    <div className="font-medium text-[#F2EFE9]">{u.fullName}</div>
                    <div className="text-[11px] text-[#B4B0C2]">{u.email}</div>
                  </td>
                  <td className="py-3.5 px-4 text-[#B4B0C2]">
                    {u.organisation || "—"}
                  </td>
                  <td className="py-3.5 px-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-[#2E2B44] bg-[#131220] text-xs font-medium text-[#F2EFE9]"
                    >
                      <option value="common">Common</option>
                      <option value="business">Business</option>
                      <option value="lawyer">Lawyer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                        u.isActive
                          ? "bg-[#122D25] text-[#7DD3B0] border-[#225444]"
                          : "bg-[#3B181C] text-[#F5A3A8] border-[#6E2830]"
                      }`}
                    >
                      {u.isActive ? "Active" : "Suspended"}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(u.id, !u.isActive)}
                      className="text-xs font-medium text-[#F2EFE9] hover:underline"
                    >
                      {u.isActive ? "Suspend" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
