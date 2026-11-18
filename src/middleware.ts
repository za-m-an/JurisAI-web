import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

const SESSION_COOKIE_NAME = "juris_session";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/analyze",
  "/analyses",
  "/chat",
  "/history",
  "/settings",
  "/admin",
];

function getEdgeJwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (!needsAuth) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  const token = typeof cookie === "string" ? cookie : cookie?.value;
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const secret = getEdgeJwtSecret();
    let role = "common";
    if (secret) {
      const { payload } = await jose.jwtVerify(token, secret, { algorithms: ["HS256"] });
      role = String(payload.role || "common");
    } else {
      const decoded = jose.decodeJwt(token);
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }
      role = String(decoded.role || "common");
    }

    if ((pathname === "/admin" || pathname.startsWith("/admin/")) && role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  } catch {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/analyze/:path*",
    "/analyses/:path*",
    "/chat/:path*",
    "/history/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
