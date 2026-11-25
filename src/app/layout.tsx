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
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
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
      <body className="min-h-screen flex flex-col bg-[#12111D] text-[#F2EFE9] font-sans antialiased selection:bg-[#D6A86E]/25 selection:text-[#F2EFE9]">
        <Navigation />

        <main className="flex-1 w-full max-w-[90rem] mx-auto px-[4vw] sm:px-[6vw] py-8">
          {children}
        </main>

        <footer className="bg-[#0E0D17] border-t border-[#2E2B44] text-[#B4B0C2] text-xs py-10 no-print">
          <div className="max-w-[90rem] mx-auto px-[4vw] sm:px-[6vw] flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.jpg"
                alt="Juris AI"
                className="w-6 h-6 rounded-sm object-cover border border-[#D6A86E]/30"
              />
              <span className="font-serif font-normal text-[#F2EFE9] text-base tracking-tight">
                Juris AI
              </span>
              <span className="text-[#2E2B44]">|</span>
              <span className="text-[#B4B0C2]">Statutory Counsel &amp; Legal Advisory</span>
            </div>
            <div className="font-mono text-[11px] uppercase tracking-wider text-[#8A859C]">
              Bangladesh · United States · European Union
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
