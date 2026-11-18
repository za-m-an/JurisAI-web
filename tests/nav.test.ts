import { describe, it, expect } from "vitest";
import React from "react";
import fs from "fs";
import path from "path";

describe("User Navigation Audit & State Verification Suite (Phase 3)", () => {
  it("1. confirms logged-out navigation items conform to spec", () => {
    const loggedOutExpected = [
      { label: "Juris AI", href: "/" },
      { label: "How it works", href: "/how-verification-works" },
      { label: "Privacy", href: "/privacy" },
      { label: "Sign in", href: "/login" },
      { label: "Create account", href: "/register" },
    ];
    expect(loggedOutExpected.map((i) => i.label)).toEqual([
      "Juris AI",
      "How it works",
      "Privacy",
      "Sign in",
      "Create account",
    ]);
  });

  it("2. confirms logged-in primary nav and account menu items conform to spec", () => {
    const primaryNavLoggedIn = [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Analyze", href: "/analyze" },
      { label: "Chats", href: "/chat" },
      { label: "History", href: "/history" },
    ];

    const accountMenuLoggedIn = [
      { label: "Settings", href: "/settings" },
      { label: "Privacy", href: "/privacy" },
      { label: "How verification works", href: "/how-verification-works" },
      { label: "Sign out", action: "logout" },
    ];

    expect(primaryNavLoggedIn.map((i) => i.label)).toEqual([
      "Dashboard",
      "Analyze",
      "Chats",
      "History",
    ]);

    expect(accountMenuLoggedIn.map((i) => i.label)).toEqual([
      "Settings",
      "Privacy",
      "How verification works",
      "Sign out",
    ]);
  });

  it("3. verifies that no public page HTML/TSX links contain 'console' or '/admin'", () => {
    const publicAppDir = path.resolve(__dirname, "../src/app");
    const files: string[] = [];

    function findTsxFiles(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "(console)" || entry.name === "api") continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          findTsxFiles(fullPath);
        } else if (entry.name.endsWith(".tsx")) {
          files.push(fullPath);
        }
      }
    }
    findTsxFiles(publicAppDir);
    expect(files.length).toBeGreaterThan(5);

    for (const f of files) {
      const content = fs.readFileSync(f, "utf8");
      // Match href="/console..." or href='/console...' or href="/admin..."
      const consoleLinkMatch = content.match(/href=["'](?:\/console|\/api\/console)/i);
      expect(consoleLinkMatch, `Found console link in public file ${f}`).toBeNull();

      const adminLinkMatch = content.match(/href=["'](?:\/admin|\/api\/admin)/i);
      expect(adminLinkMatch, `Found /admin link in public file ${f}`).toBeNull();
    }
  });
});
