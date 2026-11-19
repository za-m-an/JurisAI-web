import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import * as OTPAuth from "otpauth";
import { ensureMigrated, query, resetDbForTests } from "../src/lib/db";
import { hashPassword, signSessionToken, SESSION_COOKIE_NAME } from "../src/lib/auth";
import {
  signAdminSessionToken,
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_AUDIENCE,
} from "../src/lib/admin-auth";
import { middleware } from "../src/middleware";

import { POST as publicLoginPOST } from "../src/app/api/auth/login/route";
import { GET as meGET } from "../src/app/api/auth/me/route";
import { POST as consoleLoginPOST } from "../src/app/api/console/auth/login/route";
import { POST as totpEnrollPOST } from "../src/app/api/console/auth/totp/enroll/route";
import { POST as totpVerifyPOST } from "../src/app/api/console/auth/totp/verify/route";
import { POST as consolePasswordPOST } from "../src/app/api/console/auth/password/route";
import { GET as consoleSecurityGET, POST as consoleSecurityPOST } from "../src/app/api/console/security/route";
import { GET as consoleStatsGET } from "../src/app/api/console/stats/route";
import { GET as consoleUsersGET } from "../src/app/api/console/users/route";
import { GET as consoleIntegrationsGET, PUT as consoleIntegrationsPUT } from "../src/app/api/console/integrations/route";
import { GET as analysisByIdGET } from "../src/app/api/analyses/[id]/route";

function makeReq(
  urlStr: string,
  options: {
    method?: string;
    body?: any;
    cookieToken?: string;
    adminCookieToken?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const url = new URL(urlStr);
  const headers = new Headers(options.headers || {});
  headers.set("Host", url.host || "localhost:3000");
  if (!headers.has("Origin")) {
    headers.set("Origin", url.origin || "http://localhost:3000");
  }
  const cookies: string[] = [];
  if (options.cookieToken) {
    cookies.push(`${SESSION_COOKIE_NAME}=${options.cookieToken}`);
  }
  if (options.adminCookieToken) {
    cookies.push(`${ADMIN_SESSION_COOKIE_NAME}=${options.adminCookieToken}`);
  }
  if (cookies.length > 0) {
    headers.set("Cookie", cookies.join("; "));
  }
  if (options.body) {
    headers.set("Content-Type", "application/json");
  }

  return new NextRequest(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

describe("Administrative Console Isolation & Security Suite", () => {
  let adminId: string;
  let userId: string;

  beforeEach(async () => {
    resetDbForTests();
    await ensureMigrated();
    await query("DELETE FROM rate_limits WHERE key LIKE 'console_login:%' OR key LIKE 'login:%'");

    // Create test admin
    const adminPw = await hashPassword("AdminSecret12345");
    const adminRes = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, role, is_active, token_version, must_change_password, must_enroll_totp)
       VALUES ('console_admin@juris.local', $1, 'Admin Master', 'admin', TRUE, 0, TRUE, TRUE)
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = 'admin',
           is_active = TRUE,
           token_version = 0,
           must_change_password = TRUE,
           must_enroll_totp = TRUE,
           totp_secret_enc = NULL,
           totp_enabled = FALSE,
           totp_recovery_hashes = ARRAY[]::TEXT[]
       RETURNING id`,
      [adminPw]
    );
    adminId = adminRes.rows[0].id;

    // Create test regular business user
    const userPw = await hashPassword("UserPass12345");
    const userRes = await query<{ id: string }>(
      `INSERT INTO users (email, password_hash, full_name, role, organisation, is_active, token_version)
       VALUES ('biz_user@juris.local', $1, 'Biz Client', 'business', 'Acme Corp', TRUE, 0)
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = 'business',
           is_active = TRUE,
           token_version = 0
       RETURNING id`,
      [userPw]
    );
    userId = userRes.rows[0].id;
  });

  it("1. rejects public session cookies on console APIs and returns 404", async () => {
    const publicToken = await signSessionToken({ sub: userId, role: "business", tv: 0 });

    const res = await consoleStatsGET(
      makeReq("http://localhost:3000/api/console/stats", { cookieToken: publicToken })
    );
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("not_found");
  });

  it("2. rejects admin console session cookies on public portal APIs", async () => {
    const adminConsoleToken = await signAdminSessionToken({ sub: adminId, tv: 0 });

    const res = await meGET(
      makeReq("http://localhost:3000/api/auth/me", { cookieToken: adminConsoleToken })
    );
    // Public meGET only reads juris_session, so an adminConsoleToken is rejected as unauthorized
    expect(res.status).toBe(401);
  });

  it("3. non-admin users receive 404 on console APIs even if forged", async () => {
    const forgedToken = await signAdminSessionToken({ sub: userId, tv: 0 });

    const res = await consoleUsersGET(
      makeReq("http://localhost:3000/api/console/users", { adminCookieToken: forgedToken })
    );
    // requireAdminConsole checks user.role === 'admin'; returns 404 if not
    expect(res.status).toBe(404);
  });

  it("4. middleware returns 404 for old /admin and /api/admin paths", async () => {
    const adminPageReq = makeReq("http://localhost:3000/admin");
    const adminPageRes = await middleware(adminPageReq);
    expect(adminPageRes.status).toBe(404);

    const adminApiReq = makeReq("http://localhost:3000/api/admin/users");
    const adminApiRes = await middleware(adminApiReq);
    expect(adminApiRes.status).toBe(404);
    const json = await adminApiRes.json();
    expect(json.error).toBe("not_found");
  });

  it("5. enforces generic error equality on public /api/auth/login (admin vs non-admin vs missing)", async () => {
    // Attempt login as admin on public endpoint
    const adminLoginRes = await publicLoginPOST(
      makeReq("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: { email: "console_admin@juris.local", password: "AdminSecret12345" },
      })
    );
    expect(adminLoginRes.status).toBe(401);
    const adminJson = await adminLoginRes.json();

    // Attempt login with wrong password
    const badPwRes = await publicLoginPOST(
      makeReq("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: { email: "biz_user@juris.local", password: "WrongPassword999" },
      })
    );
    expect(badPwRes.status).toBe(401);
    const badPwJson = await badPwRes.json();

    // Attempt login with non-existent email
    const missingRes = await publicLoginPOST(
      makeReq("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: { email: "doesnotexist@juris.local", password: "SomePassword123" },
      })
    );
    expect(missingRes.status).toBe(401);
    const missingJson = await missingRes.json();

    // Generic error equality check
    expect(adminJson.message).toBe("Invalid email or password.");
    expect(badPwJson.message).toBe("Invalid email or password.");
    expect(missingJson.message).toBe("Invalid email or password.");
  });

  it("6. enforces complete TOTP enrollment, verification, and recovery code burning", async () => {
    // 1. Initial admin login flags mustEnrollTotp
    const login1 = await consoleLoginPOST(
      makeReq("http://localhost:3000/api/console/auth/login", {
        method: "POST",
        body: { email: "console_admin@juris.local", password: "AdminSecret12345" },
      })
    );
    expect(login1.status).toBe(200);
    const login1Json = await login1.json();
    expect(login1Json.user.mustEnrollTotp).toBe(true);

    const adminSessionToken = await signAdminSessionToken({ sub: adminId, tv: 0 });

    // 2. Start TOTP enrollment
    const enrollRes = await totpEnrollPOST(
      makeReq("http://localhost:3000/api/console/auth/totp/enroll", {
        method: "POST",
        adminCookieToken: adminSessionToken,
      })
    );
    expect(enrollRes.status).toBe(200);
    const enrollJson = await enrollRes.json();
    expect(enrollJson.secret).toBeDefined();
    expect(enrollJson.qrCodeDataUrl).toContain("data:image/png;base64");

    // 3. Generate valid TOTP token and verify
    const totp = new OTPAuth.TOTP({
      issuer: "Juris AI",
      label: "console_admin@juris.local",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(enrollJson.secret),
    });
    const code = totp.generate();

    const verifyRes = await totpVerifyPOST(
      makeReq("http://localhost:3000/api/console/auth/totp/verify", {
        method: "POST",
        adminCookieToken: adminSessionToken,
        body: { code },
      })
    );
    expect(verifyRes.status).toBe(200);
    const verifyJson = await verifyRes.json();
    expect(verifyJson.recoveryCodes).toHaveLength(8);
    const recoveryCodeToUse = verifyJson.recoveryCodes[0];

    // 4. Later login without TOTP or recovery code prompts for totp_required
    await query("DELETE FROM rate_limits WHERE key LIKE 'console_login:%'");
    const noTotpRes = await consoleLoginPOST(
      makeReq("http://localhost:3000/api/console/auth/login", {
        method: "POST",
        body: { email: "console_admin@juris.local", password: "AdminSecret12345" },
      })
    );
    expect(noTotpRes.status).toBe(401);
    const noTotpJson = await noTotpRes.json();
    expect(noTotpJson.error).toBe("totp_required");

    // 5. Login with recovery code succeeds and burns the code
    const recoveryLoginRes = await consoleLoginPOST(
      makeReq("http://localhost:3000/api/console/auth/login", {
        method: "POST",
        body: {
          email: "console_admin@juris.local",
          password: "AdminSecret12345",
          recoveryCode: recoveryCodeToUse,
        },
      })
    );
    expect(recoveryLoginRes.status).toBe(200);

    // 6. Reusing burned recovery code fails
    const reuseRecoveryRes = await consoleLoginPOST(
      makeReq("http://localhost:3000/api/console/auth/login", {
        method: "POST",
        body: {
          email: "console_admin@juris.local",
          password: "AdminSecret12345",
          recoveryCode: recoveryCodeToUse,
        },
      })
    );
    expect(reuseRecoveryRes.status).toBe(401);
    const reuseJson = await reuseRecoveryRes.json();
    expect(reuseJson.error).toBe("invalid_recovery_code");
  }, 15000);

  it("7. console responses carry noindex, nofollow, and no-store headers", async () => {
    const adminSessionToken = await signAdminSessionToken({ sub: adminId, tv: 0 });

    const res = await consoleStatsGET(
      makeReq("http://localhost:3000/api/console/stats", { adminCookieToken: adminSessionToken })
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("X-Robots-Tag")).toBe("noindex, nofollow, noarchive");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("8. admins cannot read user private analyses (returns 403)", async () => {
    // Create an analysis owned by the user
    const anRes = await query<{ id: string }>(
      `INSERT INTO analyses (user_id, doc_name, doc_size, doc_mime, doc_sha256, jurisdictions, status)
       VALUES ($1, 'secret_deal.pdf', 1024, 'application/pdf', 'dummy_hash', ARRAY['BD'], 'done')
       RETURNING id`,
      [userId]
    );
    const analysisId = anRes.rows[0].id;

    const adminToken = await signSessionToken({ sub: adminId, role: "admin", tv: 0 });
    const viewRes = await analysisByIdGET(
      makeReq(`http://localhost:3000/api/analyses/${analysisId}`, { cookieToken: adminToken }),
      { params: { id: analysisId } }
    );
    expect(viewRes.status).toBe(403);
  });
});
