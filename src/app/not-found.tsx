import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto my-16 bg-[#1A1829] border border-hairline rounded-lg p-8 shadow-subtle text-center space-y-4">
      <div className="font-serif text-5xl font-bold text-accent">404</div>
      <h1 className="font-serif text-xl font-bold text-ink">Document or Page Not Found</h1>
      <p className="text-xs text-ink-muted leading-relaxed">
        The legal analysis report, conversation thread, or platform resource you requested does not exist or has been removed.
      </p>
      <div className="pt-4 flex justify-center gap-3">
        <Link href="/dashboard">
          <Button variant="primary" size="sm">
            Return to Dashboard
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" size="sm">
            Home Page
          </Button>
        </Link>
      </div>
    </div>
  );
}
