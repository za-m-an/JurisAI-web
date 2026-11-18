"use client";

import React, { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log client error for debugging without leaking sensitive contract data
    if (process.env.NODE_ENV !== "production") {
      console.error("Application error boundary caught:", error);
    }
  }, [error]);

  return (
    <div className="max-w-xl mx-auto my-16 bg-white p-8 rounded-xl border border-rose-200 shadow-sm text-center space-y-4">
      <div className="text-4xl font-serif font-bold text-rose-800">500</div>
      <h1 className="text-xl font-serif font-bold text-[#0b1f33]">System Error Encountered</h1>
      <p className="text-sm text-slate-600 leading-relaxed">
        An unexpected application error occurred while processing your request. Uploaded files remain safe and are never persisted to disk.
      </p>
      {error.digest && (
        <p className="text-xs font-mono text-slate-400">Error reference: {error.digest}</p>
      )}
      <div className="pt-4 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-[#0b1f33] hover:bg-[#102a43] text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          Try Again
        </button>
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
