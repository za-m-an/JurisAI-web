import React from "react";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "Juris AI — Multi-Jurisdictional Legal Risk & Citation Verification",
  description:
    "AI-powered commercial contract risk analysis across Bangladesh (BD), United States (US), and European Union (EU) with corpus-verified citations and zero file retention.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#fdfbf7] text-[#102a43]">
        <header className="bg-[#0b1f33] text-white border-b border-slate-700 no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-xl font-serif font-bold tracking-tight text-amber-100">
                Juris AI
              </Link>
              <nav className="hidden md:flex items-center space-x-5 text-sm text-slate-200">
                <Link href="/dashboard" className="hover:text-amber-200">
                  Dashboard
                </Link>
                <Link href="/analyze" className="hover:text-amber-200">
                  Analyse Document
                </Link>
                <Link href="/chat" className="hover:text-amber-200">
                  Legal Chat
                </Link>
                <Link href="/history" className="hover:text-amber-200">
                  History
                </Link>
                <Link href="/settings" className="hover:text-amber-200">
                  Settings
                </Link>
                <Link href="/admin" className="hover:text-amber-200">
                  Admin
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-3 text-sm">
              <Link
                href="/privacy"
                className="text-slate-300 hover:text-white px-2 py-1"
              >
                Privacy Promise
              </Link>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded border border-slate-500 hover:border-amber-200 text-slate-100"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-medium"
              >
                Register
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="bg-[#061423] text-slate-400 text-xs py-6 border-t border-slate-800 no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p>
              <strong>Juris AI</strong> — Multi-Jurisdiction Legal Risk Advisory Platform (BD · US · EU). Files are analysed strictly in memory and never stored.
            </p>
            <p className="text-slate-400">
              Informational AI analysis only — not formal legal advice. Always review with qualified legal counsel.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
