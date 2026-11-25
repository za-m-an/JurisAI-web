import React from "react";
import { Newsreader, Inter, JetBrains_Mono } from "next/font/google";
import Navigation from "@/components/navigation";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
  adjustFontFallback: false,
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "Juris AI — Cross-Border Legal Counsel & Contract Intelligence",
  description:
    "Authoritative legal counsel, statutory contract analysis, and institutional case advisory across Bangladesh, the United States, and the European Union.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#18181B] font-sans antialiased selection:bg-[#134E4A]/15 selection:text-[#134E4A]">
        <Navigation />

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="border-t border-[#E5E2DC] bg-[#FAF9F6] text-[#71717A] text-xs py-6 no-print">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="font-serif font-semibold text-[#18181B] text-sm tracking-tight">
                Juris AI
              </span>
              <span className="text-[#E5E2DC]">|</span>
              <span>Statutory Counsel &amp; Legal Advisory</span>
            </div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#71717A]">
              Bangladesh · United States · European Union
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
