import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto my-16 bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center space-y-4">
      <div className="text-4xl font-serif font-bold text-[#0b1f33]">404</div>
      <h1 className="text-xl font-serif font-bold text-[#0b1f33]">Page Not Found</h1>
      <p className="text-sm text-slate-600 leading-relaxed">
        The legal analysis, conversation, or platform page you requested does not exist or has been moved.
      </p>
      <div className="pt-4 flex justify-center gap-3">
        <Link
          href="/dashboard"
          className="px-4 py-2 rounded-lg bg-[#0b1f33] hover:bg-[#102a43] text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
        >
          Return to Dashboard
        </Link>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
        >
          Home Page
        </Link>
      </div>
    </div>
  );
}
