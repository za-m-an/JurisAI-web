import React from "react";
import Link from "next/link";
import Navigation from "@/components/navigation";
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
        <Navigation />

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
