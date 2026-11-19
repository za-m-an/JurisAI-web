import { NextRequest, NextResponse } from "next/server";
import * as jose from "jose";

const SESSION_COOKIE_NAME = "juris_session";
const ADMIN_SESSION_COOKIE_NAME = "juris_admin_session";
const ADMIN_AUDIENCE = "juris-admin";

const PROTECTED_USER_PREFIXES = [
  "/dashboard",
  "/analyze",
  "/analyses",
  "/chat",
  "/history",
  "/settings",
  "/lawyers",
];

function getEdgeJwtSecret(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

function return404(req: NextRequest, isApi = false): NextResponse {
  if (isApi || req.nextUrl.pathname.startsWith("/api/")) {
    return new NextResponse(
      JSON.stringify({ error: "not_found", message: "Not Found" }),
      {
        status: 404,
        headers: {
          "Content-Type": "application/json",
          "X-Robots-Tag": "noindex, nofollow, noarchive",
          "Cache-Control": "no-store",
        },
      }
    );
  }
  // Rewrite to custom 404 page while preserving 404 status
  const notFoundUrl = new URL("/not-found", req.url);
  const resp = NextResponse.rewrite(notFoundUrl, { status: 404 });
  resp.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  resp.headers.set("Cache-Control", "no-store");
  return resp;
}

function isIpAllowed(clientIp: string, allowedListStr: string): boolean {
  const allowed = allowedListStr.split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) return true;
  for (const item of allowed) {
    if (item === clientIp || clientIp === "127.0.0.1" || clientIp === "::1") return true;
    if (item.includes("/")) {
      const [subnet, bitsStr] = item.split("/");
      const bits = parseInt(bitsStr, 10);
      const subParts = subnet.split(".");
      const ipParts = clientIp.split(".");
      if (bits === 24 && subParts.slice(0, 3).join(".") === ipParts.slice(0, 3).join(".")) return true;
      if (bits === 16 && subParts.slice(0, 2).join(".") === ipParts.slice(0, 2).join(".")) return true;
      if (bits === 8 && subParts[0] === ipParts[0]) return true;
    }
  }
  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // 1. Return 404 immediately for old /admin and /api/admin paths
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  ) {
    return return404(req, isApi);
  }

  const hostHeader = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
    .split(":")[0]
    .toLowerCase();
  const adminHost = process.env.ADMIN_HOST
    ? process.env.ADMIN_HOST.split(":")[0].toLowerCase()
    : null;

  // 2. Host separation
  if (adminHost) {
    if (hostHeader === adminHost) {
      // On admin host: non-console requests redirect to /console/login
      if (!pathname.startsWith("/console") && !pathname.startsWith("/api/console")) {
        return NextResponse.redirect(new URL("/console/login", req.url));
      }
    } else {
      // On public host: any request to /console or /api/console returns 404
      if (pathname.startsWith("/console") || pathname.startsWith("/api/console")) {
        return return404(req, isApi);
      }
    }
  }

  // 3. Optional network IP control for console
  if (
    process.env.ADMIN_ALLOWED_IPS &&
    (pathname.startsWith("/console") || pathname.startsWith("/api/console"))
  ) {
    const xff = req.headers.get("x-forwarded-for");
    const clientIp = (xff ? xff.split(",")[0].trim() : req.ip) || "127.0.0.1";
    if (!isIpAllowed(clientIp, process.env.ADMIN_ALLOWED_IPS)) {
      return return404(req, isApi);
    }
  }

  // 4. Console routing & isolation
  if (pathname.startsWith("/console") || pathname.startsWith("/api/console")) {
    const isPublicConsoleEndpoint =
      pathname === "/console/login" ||
      pathname.startsWith("/api/console/auth/login") ||
      pathname.startsWith("/api/console/auth/logout");

    if (isPublicConsoleEndpoint) {
      const resp = NextResponse.next();
      resp.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      resp.headers.set("Cache-Control", "no-store");
      return resp;
    }

    // Verify dedicated admin session cookie (aud: "juris-admin")
    const adminCookie = req.cookies.get(ADMIN_SESSION_COOKIE_NAME);
    const adminToken = typeof adminCookie === "string" ? adminCookie : adminCookie?.value;

    if (!adminToken) {
      return return404(req, isApi);
    }

    try {
      const secret = getEdgeJwtSecret();
      if (secret) {
        const { payload } = await jose.jwtVerify(adminToken, secret, {
          algorithms: ["HS256"],
          audience: ADMIN_AUDIENCE,
        });
        if (payload.role !== "admin") {
          return return404(req, isApi);
        }
      } else {
        const decoded = jose.decodeJwt(adminToken);
        if (
          decoded.aud !== ADMIN_AUDIENCE ||
          decoded.role !== "admin" ||
          (decoded.exp && decoded.exp * 1000 < Date.now())
        ) {
          return return404(req, isApi);
        }
      }

      const resp = NextResponse.next();
      resp.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      resp.headers.set("Cache-Control", "no-store");
      return resp;
    } catch {
      return return404(req, isApi);
    }
  }

  // 5. User Portal Protected Routes
  const needsUserAuth = PROTECTED_USER_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
  if (needsUserAuth) {
    const cookie = req.cookies.get(SESSION_COOKIE_NAME);
    const token = typeof cookie === "string" ? cookie : cookie?.value;
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const secret = getEdgeJwtSecret();
      if (secret) {
        const { payload } = await jose.jwtVerify(token, secret, { algorithms: ["HS256"] });
        // Console token must NOT authorize user portal
        if (payload.aud === ADMIN_AUDIENCE) {
          throw new Error("Admin token rejected on public routes");
        }
      } else {
        const decoded = jose.decodeJwt(token);
        if (
          decoded.aud === ADMIN_AUDIENCE ||
          (decoded.exp && decoded.exp * 1000 < Date.now())
        ) {
          throw new Error("Token expired or invalid audience");
        }
      }
      return NextResponse.next();
    } catch {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sample_contract.txt).*)",
  ],
};
