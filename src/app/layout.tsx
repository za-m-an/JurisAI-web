import React from "react";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import Navigation from "@/components/navigation";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
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
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-[#F3F3F3] text-[#121719] font-sans antialiased selection:bg-[#ff4716]/15 selection:text-[#121719]">
        <Navigation />

        <main className="flex-1 w-full max-w-[90rem] mx-auto px-[4vw] sm:px-[6vw] py-8">
          {children}
        </main>

        <footer className="u-mode-dark border-t border-[#222729] text-[#acaeae] text-xs py-10 no-print">
          <div className="max-w-[90rem] mx-auto px-[4vw] sm:px-[6vw] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#ff4716]" />
              <span className="font-serif font-normal text-white text-base tracking-tight">
                Juris AI
              </span>
              <span className="text-[#414547]">|</span>
              <span className="text-[#acaeae]">Statutory Counsel &amp; Legal Advisory</span>
            </div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#acaeae]">
              Bangladesh · United States · European Union
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
