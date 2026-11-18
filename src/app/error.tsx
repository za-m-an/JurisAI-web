"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/primitives";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error("Application error boundary caught:", error);
    }
  }, [error]);

  return (
    <div className="max-w-lg mx-auto my-16 bg-white border border-rose-200 rounded-lg p-8 shadow-subtle text-center space-y-4">
      <div className="font-serif text-5xl font-bold text-rose-800">500</div>
      <h1 className="font-serif text-xl font-bold text-ink">System Error Encountered</h1>
      <p className="text-xs text-ink-muted leading-relaxed">
        An unexpected application error occurred while processing your request. Uploaded files remain confidential and are never persisted to disk.
      </p>
      {error.digest && (
        <p className="text-[11px] font-mono text-ink-subtle">Error reference: {error.digest}</p>
      )}
      <div className="pt-4 flex justify-center gap-3">
        <Button variant="primary" size="sm" onClick={() => reset()}>
          Try Again
        </Button>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
