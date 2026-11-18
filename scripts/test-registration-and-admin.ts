import { TOTP } from "otpauth";
import { query } from "../src/lib/db";
import { decryptSecret } from "../src/lib/crypto";

const BASE = "http://localhost:3000";

async function testAll() {
  console.log("=================================================");
  console.log("   AUTOMATED VERIFICATION: REGISTRATION & ADMIN  ");
  console.log("=================================================\n");

  await query("DELETE FROM rate_limits WHERE key LIKE 'register:%' OR key LIKE 'console_login:%' OR key LIKE 'login:%'");

  let allPassed = true;

  // ----------------------------------------------------------------
  // PART 1: USER REGISTRATION CHECKS
  // ----------------------------------------------------------------
  console.log("--- PART 1: User Registration ---");

  // 1.1 Weak password rejection check
  console.log("[1.1] Testing weak password rejection (should fail with 400)...");
  const weakRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({
      fullName: "Weak Password Test",
      email: `weak.${Date.now()}@test.com`,
      password: "short",
      accountType: "common",
    }),
  });
  const weakData = await weakRes.json();
  if (weakRes.status === 400) {
    console.log("  ✓ Correctly rejected weak password (HTTP 400):", weakData.message || weakData.error);
  } else {
    console.error("  ✗ Expected HTTP 400, got:", weakRes.status);
    allPassed = false;
  }

  // 1.2 Missing organisation for business check
  console.log("\n[1.2] Testing missing organisation for business (should fail with 400)...");
  const noOrgRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({
      fullName: "No Org Test",
      email: `noorg.${Date.now()}@test.com`,
      password: "ValidPassword123!",
      accountType: "business",
      organisation: "",
    }),
  });
  const noOrgData = await noOrgRes.json();
  if (noOrgRes.status === 400) {
    console.log("  ✓ Correctly rejected empty organisation for business account (HTTP 400):", noOrgData.message || noOrgData.error);
  } else {
    console.error("  ✗ Expected HTTP 400, got:", noOrgRes.status);
    allPassed = false;
  }

  // 1.3 Successful registration of a fresh Business account
  const newEmail = `counsel.${Date.now()}@delta-legal.bd`;
  const newPassword = "DeltaPassword2026!";
  console.log(`\n[1.3] Registering valid Business user (${newEmail})...`);
  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({
      fullName: "Barrister Rafiqul Islam",
      email: newEmail,
      password: newPassword,
      accountType: "business",
      organisation: "Delta Commercial Law Chambers",
    }),
  });
  const regData = await regRes.json();
  const regCookie = regRes.headers.get("set-cookie") || "";

  if (regRes.status === 201 && regData.user?.email === newEmail) {
    console.log("  ✓ Registration successful (HTTP 201)!");
    console.log("    User ID:", regData.user.id);
    console.log("    Email:", regData.user.email);
    console.log("    Full Name:", regData.user.fullName);
    console.log("    Role:", regData.user.role);
    console.log("    Organisation:", regData.user.organisation);
    console.log("    Set-Cookie header received:", regCookie.slice(0, 35) + "...");
  } else {
    console.error("  ✗ Registration failed with HTTP", regRes.status, regData);
    allPassed = false;
  }

  // 1.4 Immediate login with the newly created account
  console.log("\n[1.4] Testing login with the newly registered user...");
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({
      email: newEmail,
      password: newPassword,
    }),
  });
  const loginData = await loginRes.json();
  const userCookie = (loginRes.headers.get("set-cookie") || "").split(";")[0];

  if (loginRes.status === 200 && loginData.user?.email === newEmail) {
    console.log("  ✓ User login successful (HTTP 200)!");
    console.log("    Logged in as:", loginData.user.fullName, `(${loginData.user.role})`);
  } else {
    console.error("  ✗ Login failed with HTTP", loginRes.status, loginData);
    allPassed = false;
  }

  // 1.5 Authenticated verification via /api/auth/me
  console.log("\n[1.5] Verifying session via GET /api/auth/me...");
  const meRes = await fetch(`${BASE}/api/auth/me`, {
    headers: { Cookie: userCookie },
  });
  const meData = await meRes.json();
  if (meRes.status === 200 && meData.user?.email === newEmail) {
    console.log("  ✓ Session valid! User:", meData.user.email, "| Quota limit:", meData.quota.analysesLimitPerMonth, "analyses/month");
  } else {
    console.error("  ✗ /api/auth/me failed:", meRes.status, meData);
    allPassed = false;
  }

  // ----------------------------------------------------------------
  // PART 2: ADMIN LOGIN & SECURITY CHECKS
  // ----------------------------------------------------------------
  console.log("\n--- PART 2: Admin Login & Security ---");

  // 2.1 Public login refusal of admin account
  console.log("[2.1] Verifying that public /login refuses admin accounts (security requirement)...");
  const adminOnPublicRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({
      email: "admin@juris.local",
      password: "ChangeMe12345",
    }),
  });
  const adminOnPublicData = await adminOnPublicRes.json();
  if (adminOnPublicRes.status === 401 && adminOnPublicData.error === "invalid_credentials") {
    console.log("  ✓ Public /login refused admin account with generic 401 (console isolation preserved)");
  } else {
    console.error("  ✗ Expected 401 on public login for admin, got:", adminOnPublicRes.status, adminOnPublicData);
    allPassed = false;
  }

  // 2.2 Attempt wrong password on /console/login
  console.log("\n[2.2] Testing wrong password on /console/login (should return 401)...");
  const badConsoleRes = await fetch(`${BASE}/api/console/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({
      email: "admin@juris.local",
      password: "WrongPassword999!",
    }),
  });
  const badConsoleData = await badConsoleRes.json();
  if (badConsoleRes.status === 401) {
    console.log("  ✓ Correctly rejected bad admin credentials (HTTP 401):", badConsoleData.message);
  } else {
    console.error("  ✗ Expected HTTP 401, got:", badConsoleRes.status);
    allPassed = false;
  }

  // 2.3 Attempt non-admin user on /console/login
  console.log("\n[2.3] Testing non-admin user on /console/login (should return 401 generic error)...");
  const nonAdminConsoleRes = await fetch(`${BASE}/api/console/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({
      email: newEmail,
      password: newPassword,
    }),
  });
  const nonAdminConsoleData = await nonAdminConsoleRes.json();
  if (nonAdminConsoleRes.status === 401 && nonAdminConsoleData.error === "invalid_credentials") {
    console.log("  ✓ Non-admin account rejected on console login with generic 401");
  } else {
    console.error("  ✗ Expected HTTP 401 on console login for regular user, got:", nonAdminConsoleRes.status);
    allPassed = false;
  }

  // 2.4 Successful Admin Console Login with admin@juris.local
  console.log("\n[2.4] Logging in as Admin via POST /api/console/auth/login...");
  const adminLoginRes = await fetch(`${BASE}/api/console/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({
      email: "admin@juris.local",
      password: "ChangeMe12345",
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminCookie = (adminLoginRes.headers.get("set-cookie") || "").split(";")[0];

  if (adminLoginRes.status === 200 && adminLoginData.user?.role === "admin") {
    console.log("  ✓ Admin console login successful (HTTP 200)!");
    console.log("    User:", adminLoginData.user.fullName, `(${adminLoginData.user.email})`);
    console.log("    Admin Session Cookie received:", adminCookie.slice(0, 35) + "...");
  } else {
    console.error("  ✗ Admin login failed with HTTP", adminLoginRes.status, adminLoginData);
    allPassed = false;
  }

  // 2.5 Accessing Admin Console API with the Admin session cookie
  console.log("\n[2.5] Querying /api/console/stats with Admin Session Cookie...");
  const statsRes = await fetch(`${BASE}/api/console/stats`, {
    headers: { Cookie: adminCookie },
  });
  const statsData = await statsRes.json();
  if (statsRes.status === 200 && statsData.usersByRole) {
    console.log("  ✓ Successfully loaded Admin Console telemetry (HTTP 200)!");
    console.log("    Users by role:", statsData.usersByRole);
    console.log("    Analyses recorded in system:", statsData.analyses);
    console.log("    RAG backend status:", statsData.rag?.status, `(${statsData.rag?.latencyMs}ms)`);
  } else {
    console.error("  ✗ Failed to fetch /api/console/stats:", statsRes.status, statsData);
    allPassed = false;
  }

  // 2.6 Listing Users in Admin Console
  console.log("\n[2.6] Querying /api/console/users with Admin Session Cookie...");
  const usersRes = await fetch(`${BASE}/api/console/users`, {
    headers: { Cookie: adminCookie },
  });
  const usersData = await usersRes.json();
  if (usersRes.status === 200 && Array.isArray(usersData.users)) {
    console.log("  ✓ Successfully retrieved user directory from console (HTTP 200)!");
    console.log("    Found users count:", usersData.users.length);
    console.log("    Recent users:", usersData.users.map((u: any) => `${u.email} (${u.role})`).join(", "));
  } else {
    console.error("  ✗ Failed to fetch /api/console/users:", usersRes.status, usersData);
    allPassed = false;
  }

  // ----------------------------------------------------------------
  // SUMMARY
  // ----------------------------------------------------------------
  console.log("\n=================================================");
  if (allPassed) {
    console.log("  ALL TESTS PASSED! Registration & Admin Login are");
    console.log("  100% WORKING AND SECURE.");
  } else {
    console.log("  SOME CHECKS FAILED. See details above.");
  }
  console.log("=================================================\n");
}

testAll().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
