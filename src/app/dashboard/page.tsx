"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  EmptyState,
  Skeleton,
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/primitives";

export default function DashboardPage() {
  const [me, setMe] = useState<any>(null);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/analyses").then((r) => (r.ok ? r.json() : { analyses: [] })),
    ])
      .then(([meData, anaData]) => {
        setMe(meData);
        setAnalyses(anaData?.analyses || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const user = me?.user;
  const quota = me?.quota;

  const analysisPercent = quota
    ? Math.min(100, Math.round((quota.analysesUsedThisMonth / (quota.analysesLimitPerMonth || 1)) * 100))
    : 0;
  const chatPercent = quota
    ? Math.min(100, Math.round((quota.chatUsedToday / (quota.chatLimitPerDay || 1)) * 100))
    : 0;

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-8">
      {/* Header with Title and Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
              Legal Workspace{user?.fullName ? ` · ${user.fullName}` : ""}
            </h1>
            <Badge variant="neutral" className="uppercase font-mono text-[10px]">
              {user?.role || "user"}
            </Badge>
          </div>
          <p className="text-xs text-ink-muted mt-1">
            {user?.organisation ? `${user.organisation} · ` : ""}
            Multi-jurisdiction legal risk intelligence for BD, US, and EU commercial contracts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/analyze">
            <Button variant="primary" size="md">
              + Launch Agentic Analysis
            </Button>
          </Link>
          <Link href="/chat">
            <Button variant="secondary" size="md">
              Legal AI Copilot
            </Button>
          </Link>
          <Link href="/lawyers">
            <Button variant="outline" size="md">
              Recommended Lawyers
            </Button>
          </Link>
        </div>
      </div>

      {/* Quota Usage Metrics */}
      {quota && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white border border-hairline rounded-lg p-5 shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Monthly Contract Analyses
              </span>
              <span className="text-xs font-mono font-semibold text-ink">
                {quota.analysesUsedThisMonth} / {quota.analysesLimitPerMonth}
              </span>
            </div>
            <div className="w-full bg-paper-warm rounded-full h-2 overflow-hidden border border-hairline">
              <div
                className={`h-full transition-all duration-300 ${
                  analysisPercent > 85 ? "bg-rose-700" : "bg-[#7B1E22]"
                }`}
                style={{ width: `${analysisPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-ink-subtle">
              Usage resets at the beginning of each calendar month. Files are strictly in-memory.
            </p>
          </div>

          <div className="bg-white border border-hairline rounded-lg p-5 shadow-subtle space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Daily Legal Research Queries
              </span>
              <span className="text-xs font-mono font-semibold text-ink">
                {quota.chatUsedToday} / {quota.chatLimitPerDay}
              </span>
            </div>
            <div className="w-full bg-paper-warm rounded-full h-2 overflow-hidden border border-hairline">
              <div
                className={`h-full transition-all duration-300 ${
                  chatPercent > 85 ? "bg-rose-700" : "bg-ink"
                }`}
                style={{ width: `${chatPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-ink-subtle">
              Questions submitted today across all active research threads.
            </p>
          </div>
        </div>
      )}

      {/* Recent Analyses Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-lg font-bold text-ink">Recent Contract Analyses</h2>
            <p className="text-xs text-ink-muted">
              Completed cross-border analyses and generated memoranda.
            </p>
          </div>
          {analyses.length > 0 && (
            <Link href="/history" className="text-xs font-semibold text-accent hover:underline">
              View All History →
            </Link>
          )}
        </div>

        {analyses.length === 0 ? (
          <EmptyState
            title="No analyses recorded yet"
            description="Upload an agreement (PDF, DOCX, or TXT) or test the pre-loaded cross-border sample contract to view identified risks and citation verification badges."
            action={
              <Link href="/analyze">
                <Button variant="primary" size="sm">
                  Run First Analysis
                </Button>
              </Link>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <th className="p-3">Document</th>
                <th className="p-3">Status</th>
                <th className="p-3">Jurisdictions</th>
                <th className="p-3">Risks</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </TableHeader>
            <tbody>
              {analyses.slice(0, 8).map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/analyses/${a.id}`}
                      className="text-ink font-semibold hover:text-accent hover:underline"
                    >
                      {a.docName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        a.status === "completed"
                          ? "verified"
                          : a.status === "failed"
                          ? "unverified"
                          : "neutral"
                      }
                      className="uppercase text-[10px]"
                    >
                      {a.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {(a.jurisdictions || []).map((j: string) => (
                        <span
                          key={j}
                          className="px-1.5 py-0.5 rounded bg-paper-warm border border-hairline text-[10px] font-mono text-ink-muted"
                        >
                          {j}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{a.risksCount || 0}</TableCell>
                  <TableCell className="text-ink-muted text-[11px]">
                    {new Date(a.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/analyses/${a.id}`}>
                      <Button variant="outline" size="sm">
                        View Report
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </div>

      {/* Recommended Cross-Border Legal Counsel Preview */}
      <div className="bg-white border border-hairline rounded-lg p-6 shadow-subtle space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase text-ink-subtle">Advisory Directory</span>
            <h2 className="font-serif text-lg font-bold text-ink">
              Recommended Cross-Border Legal Practitioners
            </h2>
            <p className="text-xs text-ink-muted">
              Pre-screened counsel admitted to practice before Supreme Courts and Competition Tribunals.
            </p>
          </div>
          <Link href="/lawyers">
            <Button variant="outline" size="sm">
              View All Practitioners →
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="p-4 rounded border border-hairline bg-paper-warm/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-xs text-ink">Barrister Rafiqul Islam, KC</span>
              <Badge variant="high">BD Counsel</Badge>
            </div>
            <p className="text-[11px] text-ink-muted font-sans line-clamp-2">
              Senior Advocate, Supreme Court of Bangladesh. Specialized in Competition Act 2012 &amp; Contract Act 1872.
            </p>
            <Link href="/lawyers" className="text-[11px] font-semibold text-accent hover:underline block pt-1">
              Consult Chambers →
            </Link>
          </div>

          <div className="p-4 rounded border border-hairline bg-paper-warm/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-xs text-ink">Eleanor Vance, Esq.</span>
              <Badge variant="medium">US Counsel</Badge>
            </div>
            <p className="text-[11px] text-ink-muted font-sans line-clamp-2">
              Partner, Antitrust &amp; Trade Regulation (NY &amp; DC Bar). Sherman Act §§ 1-2 &amp; Clayton Act § 3 defense.
            </p>
            <Link href="/lawyers" className="text-[11px] font-semibold text-accent hover:underline block pt-1">
              Consult Chambers →
            </Link>
          </div>

          <div className="p-4 rounded border border-hairline bg-paper-warm/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-serif font-bold text-xs text-ink">Dr. Maximilian Becker</span>
              <Badge variant="verified">EU Counsel</Badge>
            </div>
            <p className="text-[11px] text-ink-muted font-sans line-clamp-2">
              Partner, Brussels &amp; Frankfurt. Specialized in TFEU Article 101/102 and VBER cross-border distribution.
            </p>
            <Link href="/lawyers" className="text-[11px] font-semibold text-accent hover:underline block pt-1">
              Consult Chambers →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
