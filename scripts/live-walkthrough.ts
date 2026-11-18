import { TOTP } from "otpauth";
import { query } from "../src/lib/db";
import { decryptSecret } from "../src/lib/crypto";

const BASE = "http://localhost:3000";

async function main() {
  console.log("=== STARTING PHASE 5 LIVE VERIFICATION WALKTHROUGH ===");
  const results: Record<string, string> = {};

  const testEmail = `test.user.${Date.now()}@firm.bd`;
  const testPassword = "Password1234!";

  // 1. User Registration
  console.log("\n[1] Register User:", testEmail);
  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({
      fullName: "E2E Test Counsel",
      email: testEmail,
      password: testPassword,
      accountType: "business",
      organisation: "Bengal Delta Industrial Solutions Ltd.",
    }),
  });
  console.log("Register HTTP Status:", regRes.status);
  results["user_register"] = `HTTP ${regRes.status}`;
  if (!regRes.ok) throw new Error("Registration failed: " + (await regRes.text()));

  // 2. User Login
  console.log("\n[2] User Login");
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email: testEmail, password: testPassword }),
  });
  console.log("Login HTTP Status:", loginRes.status);
  results["user_login"] = `HTTP ${loginRes.status}`;
  const userSetCookie = loginRes.headers.get("set-cookie") || "";
  const userCookie = userSetCookie.split(";")[0];
  console.log("Got user cookie:", userCookie.slice(0, 25) + "...");

  // 3. User Me & Quota
  console.log("\n[3] GET /api/auth/me");
  const meRes = await fetch(`${BASE}/api/auth/me`, {
    headers: { Cookie: userCookie },
  });
  console.log("Me HTTP Status:", meRes.status);
  results["user_me"] = `HTTP ${meRes.status}`;
  const meData = await meRes.json();
  console.log("User role:", meData.user?.role, "Remaining quota:", meData.quota);

  // 4. Analyze Sample Contract
  console.log("\n[4] POST /api/analyze (Sample contract text)");
  const sampleContractText = `DISTRIBUTION AGREEMENT
This Exclusive Cross-Border Distribution Agreement is entered into as of January 15, 2024, by and between Apex Global Technologies Inc., a Delaware corporation ("Supplier"), and Bengal Delta Industrial Solutions Ltd., a company organized under the laws of Bangladesh ("Distributor").
1. EXCLUSIVE APPOINTMENT & TERRITORY
Supplier hereby appoints Distributor as its exclusive distributor of Products in the Territory of Bangladesh and the European Union.
2. RESALE PRICE MAINTENANCE
Distributor agrees that it shall not advertise, offer for sale, or sell Products at prices below Supplier's Minimum Advertised Price (MAP) schedule. Distributor shall maintain fixed retail consumer prices.
3. EXCLUSIVE DEALING & NON-COMPETE
Distributor shall not manufacture, market, sell, or distribute any competing industrial machinery during the term and for a period of five (5) years following termination within Bangladesh and the EU.
4. GOVERNING LAW & ARBITRATION
This Agreement shall be governed by Delaware law, without regard to conflict of laws. Any dispute shall be settled by arbitration in New York.`;

  const fd = new FormData();
  fd.append("text", sampleContractText);
  fd.append("jurisdictions", JSON.stringify(["BD", "US", "EU"]));

  const anaRes = await fetch(`${BASE}/api/analyze`, {
    method: "POST",
    headers: { Cookie: userCookie, Origin: BASE },
    body: fd,
  });
  console.log("Analyze HTTP Status:", anaRes.status);
  results["user_analyze"] = `HTTP ${anaRes.status}`;
  const anaData = await anaRes.json();
  const analysisId = anaData.analysisId;
  console.log("Created Analysis ID:", analysisId, "Risks identified:", anaData.risks?.length, "File discarded:", anaData.file_discarded);

  // 5. View Analysis Report
  console.log("\n[5] GET /api/analyses/" + analysisId);
  const getAnaRes = await fetch(`${BASE}/api/analyses/${analysisId}`, {
    headers: { Cookie: userCookie },
  });
  console.log("Get Analysis HTTP Status:", getAnaRes.status);
  results["user_get_analysis"] = `HTTP ${getAnaRes.status}`;
  const reportData = await getAnaRes.json();
  console.log("Report title:", reportData.analysis?.docName, "Verification:", reportData.analysis?.result?.verification);

  // 6. User Chat with Attached Analysis Context
  console.log("\n[6] POST /api/chat");
  const chatRes = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userCookie, Origin: BASE },
    body: JSON.stringify({
      message: "Explain the antitrust exposure of Section 2 resale price maintenance under Bangladesh Competition Act 2012 versus EU Article 101 TFEU.",
      analysisId,
    }),
  });
  console.log("Chat HTTP Status:", chatRes.status);
  results["user_chat"] = `HTTP ${chatRes.status}`;
  const chatData = await chatRes.json();
  console.log("Chat conversationId:", chatData.conversationId, "Citations returned:", chatData.citations?.length);

  // 7. User Data Export
  console.log("\n[7] GET /api/account/export");
  const exportRes = await fetch(`${BASE}/api/account/export`, {
    headers: { Cookie: userCookie },
  });
  console.log("Export HTTP Status:", exportRes.status);
  results["user_export"] = `HTTP ${exportRes.status}`;
  const exportData = await exportRes.json();
  console.log("Exported analyses count:", exportData.analyses?.length, "Conversations:", exportData.conversations?.length);

  // 8. Delete User Account
  console.log("\n[8] DELETE /api/account");
  const delRes = await fetch(`${BASE}/api/account`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", Cookie: userCookie, Origin: BASE },
    body: JSON.stringify({ password: testPassword }),
  });
  console.log("Delete Account HTTP Status:", delRes.status);
  results["user_delete_account"] = `HTTP ${delRes.status}`;

  // 9. Negative Checks: Old /admin and /api/admin
  console.log("\n[9] Negative Checks: /admin and /api/admin paths");
  const oldAdminRes = await fetch(`${BASE}/admin`);
  console.log("GET /admin Status:", oldAdminRes.status);
  results["old_admin_path"] = `HTTP ${oldAdminRes.status}`;

  const oldApiAdminRes = await fetch(`${BASE}/api/admin/users`);
  console.log("GET /api/admin/users Status:", oldApiAdminRes.status);
  results["old_api_admin_path"] = `HTTP ${oldApiAdminRes.status}`;

  // 10. Console Flow: Password + TOTP Login
  console.log("\n[10] Admin Console Flow");
  const adminEmail = "admin@juris.local";
  const adminPass = "ChangeMe12345";

  // Check admin record in DB for TOTP secret
  const adminRow = await query<{
    id: string;
    totp_secret_enc: string | null;
    totp_enabled: boolean;
  }>("SELECT id, totp_secret_enc, totp_enabled FROM users WHERE email = $1", [adminEmail]);

  let totpSecret = "";
  if (adminRow.rows[0]?.totp_secret_enc) {
    totpSecret = decryptSecret(adminRow.rows[0].totp_secret_enc);
  }

  // If not enrolled yet, generate code or enroll
  let totpCode: string | undefined = undefined;
  if (totpSecret) {
    const totp = new TOTP({ secret: totpSecret, digits: 6, period: 30 });
    totpCode = totp.generate();
    console.log("Generated live TOTP code for existing secret:", totpCode);
  }

  const consoleLoginRes = await fetch(`${BASE}/api/console/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPass,
      code: totpCode,
    }),
  });
  console.log("Console Login HTTP Status:", consoleLoginRes.status);
  results["console_login"] = `HTTP ${consoleLoginRes.status}`;
  const consoleSetCookie = consoleLoginRes.headers.get("set-cookie") || "";
  const consoleCookie = consoleSetCookie.split(";")[0];

  // 11. Console Stats
  console.log("\n[11] GET /api/console/stats");
  const statsRes = await fetch(`${BASE}/api/console/stats`, {
    headers: { Cookie: consoleCookie, Origin: BASE },
  });
  console.log("Console Stats HTTP Status:", statsRes.status);
  results["console_stats"] = `HTTP ${statsRes.status}`;
  const statsData = await statsRes.json();
  console.log("Stats totals: users =", statsData.users?.total, "analyses 24h =", statsData.analyses?.last24h, "RAG latency =", statsData.rag?.latencyMs);

  // 12. Console Integrations Test
  console.log("\n[12] POST /api/console/integrations/rag/test");
  const intTestRes = await fetch(`${BASE}/api/console/integrations/rag/test`, {
    method: "POST",
    headers: { Cookie: consoleCookie, Origin: BASE },
  });
  console.log("Integration Test HTTP Status:", intTestRes.status);
  results["console_integration_test"] = `HTTP ${intTestRes.status}`;
  const intData = await intTestRes.json();
  console.log("Integration result:", intData);

  // 13. Negative Check: Console Cookie on Public Portal
  console.log("\n[13] Negative Check: Console Cookie on /api/auth/me");
  const badMeRes = await fetch(`${BASE}/api/auth/me`, {
    headers: { Cookie: consoleCookie, Origin: BASE },
  });
  console.log("Console cookie on /api/auth/me Status:", badMeRes.status);
  results["console_cookie_on_public_api"] = `HTTP ${badMeRes.status}`;

  // 14. Negative Check: Public Cookie on Console API
  console.log("\n[14] Negative Check: User Cookie on /api/console/stats");
  const badStatsRes = await fetch(`${BASE}/api/console/stats`, {
    headers: { Cookie: userCookie },
  });
  console.log("User cookie on /api/console/stats Status:", badStatsRes.status);
  results["user_cookie_on_console_api"] = `HTTP ${badStatsRes.status}`;

  // 15. Negative Check: Public login refuses admin
  console.log("\n[15] Negative Check: Public /api/auth/login with admin email");
  const adminOnPublicLoginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email: adminEmail, password: adminPass }),
  });
  console.log("Admin on public login Status:", adminOnPublicLoginRes.status);
  results["admin_on_public_login"] = `HTTP ${adminOnPublicLoginRes.status}`;

  console.log("\n=== ALL 15 E2E LIVE WALKTHROUGH STEPS COMPLETE ===");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error("Walkthrough failed with error:", err);
  process.exit(1);
});
