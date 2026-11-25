"use client";

import React, { useEffect, useState } from "react";

interface LawFirmRow {
  id: string;
  name: string;
  leadCounsel: string;
  region: "BD" | "US" | "EU";
  city: string;
  specialties: string[];
  experienceYears: number;
  phone: string;
  email: string;
  address: string;
}

export default function ConsoleLawFirmsPage() {
  const [firms, setFirms] = useState<LawFirmRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [leadCounsel, setLeadCounsel] = useState("");
  const [region, setRegion] = useState<"BD" | "US" | "EU">("BD");
  const [city, setCity] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [experienceYears, setExperienceYears] = useState(15);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [recentNews, setRecentNews] = useState("");

  async function loadFirms() {
    try {
      const res = await fetch("/api/console/law-firms");
      if (res.ok) {
        const data = await res.json();
        setFirms(data.lawFirms || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFirms();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const res = await fetch("/api/console/law-firms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        leadCounsel,
        region,
        city,
        specialties: specialties.split(",").map((s) => s.trim()).filter(Boolean),
        experienceYears: Number(experienceYears),
        notableCases: [],
        recentNews,
        phone,
        email,
        address,
      }),
    });
    if (res.ok) {
      setName("");
      setLeadCounsel("");
      setCity("");
      setSpecialties("");
      setPhone("");
      setEmail("");
      setAddress("");
      setRecentNews("");
      setMessage("Law firm added to directory.");
      loadFirms();
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/console/law-firms?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMessage("Law firm removed.");
      loadFirms();
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-xs font-mono uppercase tracking-wider text-[#B4B0C2]">
        Loading Law Firms...
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="border-b border-[#2E2B44] pb-5">
        <span className="text-[11px] font-mono uppercase tracking-widest text-[#D6A86E]">
          Regional Representation
        </span>
        <h1 className="text-3xl font-serif font-light text-[#F2EFE9]">
          Law Firms &amp; Counsel Directory
        </h1>
        <p className="text-sm text-[#B4B0C2]">
          Directly add law firms, contact details, and practice fields for automated client matching.
        </p>
      </div>

      {message && (
        <div className="p-3 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#7DD3B0] text-xs font-medium">
          {message}
        </div>
      )}

      {/* Add Law Firm Form */}
      <form onSubmit={handleCreate} className="vellum-card rounded p-6 space-y-4">
        <h2 className="font-serif text-xl font-medium text-[#F2EFE9]">Add New Law Firm</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            required
            placeholder="Firm Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-[#2E2B44] bg-[#131220] text-xs"
          />
          <input
            type="text"
            required
            placeholder="Lead Barrister / Counsel"
            value={leadCounsel}
            onChange={(e) => setLeadCounsel(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-[#2E2B44] bg-[#131220] text-xs"
          />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value as "BD" | "US" | "EU")}
            className="px-3.5 py-2 rounded-lg border border-[#2E2B44] bg-[#131220] text-xs"
          >
            <option value="BD">Bangladesh (BD)</option>
            <option value="US">United States (US)</option>
            <option value="EU">European Union (EU)</option>
          </select>
          <input
            type="text"
            required
            placeholder="City (e.g., Motijheel, Dhaka)"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-[#2E2B44] bg-[#131220] text-xs"
          />
          <input
            type="text"
            required
            placeholder="Specialties (comma-separated)"
            value={specialties}
            onChange={(e) => setSpecialties(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-[#2E2B44] bg-[#131220] text-xs"
          />
          <input
            type="number"
            min={1}
            max={150}
            required
            placeholder="Years of Experience"
            value={experienceYears}
            onChange={(e) => setExperienceYears(Number(e.target.value))}
            className="px-3.5 py-2 rounded-lg border border-[#2E2B44] bg-[#131220] text-xs"
          />
          <input
            type="text"
            required
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-[#2E2B44] bg-[#131220] text-xs"
          />
          <input
            type="email"
            required
            placeholder="Chambers Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-[#2E2B44] bg-[#131220] text-xs"
          />
          <input
            type="text"
            required
            placeholder="Office Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="px-3.5 py-2 rounded-lg border border-[#2E2B44] bg-[#131220] text-xs"
          />
        </div>
        <input
          type="text"
          placeholder="Recent Firm News / Recognition (optional)"
          value={recentNews}
          onChange={(e) => setRecentNews(e.target.value)}
          className="w-full px-3.5 py-2 rounded-lg border border-[#2E2B44] bg-[#131220] text-xs"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-5 py-2 rounded-lg bg-[#D6A86E] hover:bg-[#C49356] text-[#12111D] font-semibold text-xs font-medium"
          >
            Add Law Firm
          </button>
        </div>
      </form>

      {/* Existing Directory */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {firms.map((f) => (
          <div key={f.id} className="vellum-card rounded p-5 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-serif text-lg font-medium text-[#F2EFE9]">{f.name}</h3>
                <p className="text-xs text-[#F2EFE9]">{f.leadCounsel}</p>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#131220] border border-[#2E2B44]">
                {f.region} · {f.experienceYears} yrs
              </span>
            </div>
            <p className="text-xs text-[#B4B0C2]">{f.specialties.join(" · ")}</p>
            <p className="text-[11px] text-[#B4B0C2]">{f.phone} · {f.email}</p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => handleDelete(f.id)}
                className="text-xs text-[#F5A3A8] hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
