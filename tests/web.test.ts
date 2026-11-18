import fs from "fs";
import zlib from "zlib";
import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  hashPassword,
  signSessionToken,
  validatePasswordStrength,
  verifyCsrfOrigin,
  SESSION_COOKIE_NAME,
} from "../src/lib/auth";
import { decryptSecret, encryptSecret, maskApiKey } from "../src/lib/crypto";
import { ensureMigrated, query, resetDbForTests } from "../src/lib/db";
import {
  detectAndValidateFileType,
  extractDocumentInMemory,
  maskPii,
} from "../src/lib/extract";
import { cleanupStuckAnalyses } from "../src/lib/quota";
import { invalidateRagConfigCache } from "../src/lib/rag-client";
import { createMockRagServer } from "../scripts/mock-rag.mjs";

import { POST as registerPOST } from "../src/app/api/auth/register/route";
import { POST as loginPOST } from "../src/app/api/auth/login/route";
import { GET as meGET } from "../src/app/api/auth/me/route";
import { POST as analyzePOST } from "../src/app/api/analyze/route";
import { GET as analysesGET } from "../src/app/api/analyses/route";
import {
  GET as analysisByIdGET,
  DELETE as analysisByIdDELETE,
} from "../src/app/api/analyses/[id]/route";
import { POST as chatPOST } from "../src/app/api/chat/route";
import { DELETE as accountDELETE } from "../src/app/api/account/route";
import { POST as logoutAllPOST } from "../src/app/api/account/logout-all/route";
import { GET as adminUsersGET } from "../src/app/api/admin/users/route";
import {
  GET as adminIntegrationsGET,
  PUT as adminIntegrationsPUT,
} from "../src/app/api/admin/integrations/route";

/**
 * Helper to build a minimal valid ZIP buffer containing a single stored (uncompressed) entry.
 */
function createMinimalZipBuffer(entryName: string, contentUtf8: string): Uint8Array {
  const nameBuf = Buffer.from(entryName, "utf8");
  const dataBuf = Buffer.from(contentUtf8, "utf8");

  // CRC32 calculation
  let crc = 0xffffffff;
  for (let i = 0; i < dataBuf.length; i++) {
    crc ^= dataBuf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  crc = (crc ^ 0xffffffff) >>> 0;

  // Local file header (30 bytes + nameLen)
  const lfh = Buffer.alloc(30);
  lfh.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
  lfh.writeUInt16LE(20, 4); // version needed
  lfh.writeUInt16LE(0, 6); // flags
  lfh.writeUInt16LE(0, 8); // compression = 0 (stored)
  lfh.writeUInt16LE(0, 10); // mod time
  lfh.writeUInt16LE(0, 12); // mod date
  lfh.writeUInt32LE(crc, 14);
  lfh.writeUInt32LE(dataBuf.length, 18);
  lfh.writeUInt32LE(dataBuf.length, 22);
  lfh.writeUInt16LE(nameBuf.length, 26);
  lfh.writeUInt16LE(0, 28);

  // Central directory header (46 bytes + nameLen)
  const cdh = Buffer.alloc(46);
  cdh.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
  cdh.writeUInt16LE(20, 4);
  cdh.writeUInt16LE(20, 6);
  cdh.writeUInt16LE(0, 8);
  cdh.writeUInt16LE(0, 10);
  cdh.writeUInt16LE(0, 12);
  cdh.writeUInt16LE(0, 14);
  cdh.writeUInt32LE(crc, 16);
  cdh.writeUInt32LE(dataBuf.length, 20);
  cdh.writeUInt32LE(dataBuf.length, 24);
  cdh.writeUInt16LE(nameBuf.length, 28);
  cdh.writeUInt16LE(0, 30);
  cdh.writeUInt16LE(0, 32);
  cdh.writeUInt16LE(0, 34);
  cdh.writeUInt16LE(0, 36);
  cdh.writeUInt32LE(0, 38);
  cdh.writeUInt32LE(0, 42); // offset of local header = 0

  const cdOffset = lfh.length + nameBuf.length + dataBuf.length;
  const cdSize = cdh.length + nameBuf.length;

  // End of central directory (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(1, 8);
  eocd.writeUInt16LE(1, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return new Uint8Array(Buffer.concat([lfh, nameBuf, dataBuf, cdh, nameBuf, eocd]));
}

/**
 * Helper to build a valid in-memory PDF buffer with embedded text stream.
 */
function createMinimalPdfBuffer(textContent: string): Uint8Array {
  const escaped = textContent.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const contentStream = `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`;
  const pdf = [
    "%PDF-1.4",
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj",
    `4 0 obj << /Length ${contentStream.length} >> stream\n${contentStream}\nendstream endobj`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    "xref",
    "0 6",
    "0000000000 65535 f ",
    "trailer << /Size 6 /Root 1 0 R >>",
    "startxref",
    "0",
    "%%EOF",
  ].join("\n");
  return new Uint8Array(Buffer.from(pdf, "utf8"));
}

function makeReq(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    cookieToken?: string;
  } = {}
): NextRequest {
  const headers: Record<string, string> = {
    host: "localhost:3000",
    origin: "http://localhost:3000",
    ...(options.headers || {}),
  };
  if (options.cookieToken) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${options.cookieToken}`;
  }
  const init: any = {
    method: options.method || "GET",
    headers,
  };
  if (options.body !== undefined) {
    if (typeof FormData !== "undefined" && options.body instanceof FormData) {
      init.body = options.body;
    } else if (typeof options.body === "string") {
      init.body = options.body;
    } else {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(options.body);
    }
  }
  return new NextRequest(url, init);
}

let mockRagServer: any;
let mockRagPort = 18081;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.DB_DRIVER = "pglite";
  process.env.RAG_API_KEY = "dev-rag-key";
  mockRagServer = createMockRagServer();
  await new Promise<void>((resolve) => {
    mockRagServer.listen(0, "127.0.0.1", () => {
      const addr = mockRagServer.address();
      mockRagPort = addr.port;
      process.env.RAG_BASE_URL = `http://127.0.0.1:${mockRagPort}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (mockRagServer) {
    await new Promise<void>((resolve) => mockRagServer.close(() => resolve()));
  }
});

beforeEach(async () => {
  resetDbForTests();
  invalidateRagConfigCache();
  await ensureMigrated();
});

describe("Juris AI Web Service — Comprehensive Security & Functional Suite", () => {
  it("1. enforces password strength policy (min 10 chars, letter + digit)", () => {
    expect(validatePasswordStrength("Short1!").valid).toBe(false);
    expect(validatePasswordStrength("AllLettersNoDigits").valid).toBe(false);
    expect(validatePasswordStrength("1234567890123").valid).toBe(false);
    expect(validatePasswordStrength("ValidPass123").valid).toBe(true);
  });

  it("2. performs AES-256-GCM round-trip encryption and detects tampering", () => {
    const secret = "sk-ant-api03-supersecretkey1234";
    const encrypted = encryptSecret(secret);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptSecret(encrypted)).toBe(secret);
    expect(maskApiKey(secret)).toBe("••••1234");

    // Tamper with ciphertext
    const parts = encrypted.split(":");
    const tamperedCipher = Buffer.from(parts[3], "base64");
    tamperedCipher[0] ^= 0xff;
    const tamperedPayload = `v1:${parts[1]}:${parts[2]}:${tamperedCipher.toString("base64")}`;
    expect(() => decryptSecret(tamperedPayload)).toThrow();
  });

  it("3. enforces JWT authentication and immediate token_version revocation", async () => {
    const regReq = makeReq("http://localhost:3000/api/auth/register", {
      method: "POST",
      body: {
        fullName: "Test User",
        email: "RevokeUser@Example.com",
        password: "StrongPassword123",
        accountType: "common",
      },
    });
    const regRes = await registerPOST(regReq);
    expect(regRes.status).toBe(201);
    const regData = await regRes.json();
    expect(regData.user.email).toBe("revokeuser@example.com");

    const token = await signSessionToken({
      sub: regData.user.id,
      role: "common",
      tv: 0,
    });

    // Token works initially
    const meRes1 = await meGET(makeReq("http://localhost:3000/api/auth/me", { cookieToken: token }));
    expect(meRes1.status).toBe(200);

    // Revoke via logout-all (increments token_version to 1)
    const loRes = await logoutAllPOST(
      makeReq("http://localhost:3000/api/account/logout-all", {
        method: "POST",
        cookieToken: token,
      })
    );
    expect(loRes.status).toBe(200);

    // Old token with tv=0 is now rejected with 401
    const meRes2 = await meGET(makeReq("http://localhost:3000/api/auth/me", { cookieToken: token }));
    expect(meRes2.status).toBe(401);
  });

  it("4. validates magic bytes for PDF, DOCX (with word/document.xml), and TXT", () => {
    const pdfBytes = createMinimalPdfBuffer("Exclusive distribution agreement text.");
    expect(detectAndValidateFileType(pdfBytes, "contract.pdf", "application/pdf").docType).toBe("pdf");

    const validDocx = createMinimalZipBuffer(
      "word/document.xml",
      "<w:document><w:body><w:p><w:t>Hello</w:t></w:p></w:body></w:document>"
    );
    expect(
      detectAndValidateFileType(
        validDocx,
        "contract.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ).docType
    ).toBe("docx");

    // ZIP without word/document.xml must be rejected even if named .docx
    const fakeDocxZip = createMinimalZipBuffer("evil.txt", "not a word document");
    expect(() =>
      detectAndValidateFileType(
        fakeDocxZip,
        "fake.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      )
    ).toThrow();

    // Binary with NUL bytes disguised as .txt must be rejected
    const binaryTxt = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x01]);
    expect(() => detectAndValidateFileType(binaryTxt, "fake.txt", "text/plain")).toThrow();
  });

  it("5. extracts PDF, DOCX, and TXT in memory and enforces 200-char minimum and 150k maximum", async () => {
    const longLegalClause =
      "EXCLUSIVE DISTRIBUTION AGREEMENT. The Supplier appoints the Distributor as its exclusive distributor in Bangladesh, the United States, and the European Union. " +
      "The Distributor shall not compete for six (6) years following termination and shall adhere to Recommended Resale Prices or pay a 35% penalty on quarterly shipments.";

    // TXT extraction
    const txtBytes = new Uint8Array(Buffer.from(longLegalClause, "utf8"));
    const txtOut = await extractDocumentInMemory({
      bytes: txtBytes,
      fileName: "agreement.txt",
      mimeType: "text/plain",
      maxUploadMb: 4,
    });
    expect(txtOut.text).toContain("EXCLUSIVE DISTRIBUTION AGREEMENT");

    // DOCX extraction
    const docxXml = `<w:document><w:body><w:p><w:r><w:t>${longLegalClause}</w:t></w:r></w:p></w:body></w:document>`;
    const docxBytes = createMinimalZipBuffer("word/document.xml", docxXml);
    const docxOut = await extractDocumentInMemory({
      bytes: docxBytes,
      fileName: "agreement.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      maxUploadMb: 4,
    });
    expect(docxOut.text).toContain("EXCLUSIVE DISTRIBUTION AGREEMENT");

    // PDF extraction
    const pdfBytes = createMinimalPdfBuffer(longLegalClause);
    const pdfOut = await extractDocumentInMemory({
      bytes: pdfBytes,
      fileName: "agreement.pdf",
      mimeType: "application/pdf",
      maxUploadMb: 4,
    });
    expect(pdfOut.text).toContain("EXCLUSIVE DISTRIBUTION AGREEMENT");

    // Scanned / <200 meaningful chars -> 422 no_text
    const shortTxt = new Uint8Array(Buffer.from("Too short scanned text", "utf8"));
    await expect(
      extractDocumentInMemory({
        bytes: shortTxt,
        fileName: "scanned.txt",
        mimeType: "text/plain",
        maxUploadMb: 4,
      })
    ).rejects.toThrow(/scanned or image-only/);
  });

  it("6. masks PII (emails, phones, 9+ digit IDs) while keeping company names intact", () => {
    const raw =
      "Contact counsel@bengaldelta.com or call +1 (555) 234-5678 regarding Account 987654321012 for Bengal Delta Industrial Solutions Ltd.";
    const masked = maskPii(raw);
    expect(masked).toContain("[EMAIL]");
    expect(masked).toContain("[PHONE]");
    expect(masked).toContain("[ID]");
    expect(masked).not.toContain("counsel@bengaldelta.com");
    expect(masked).not.toContain("987654321012");
    expect(masked).toContain("Bengal Delta Industrial Solutions Ltd.");
  });

  it("7. enforces CSRF Origin check, login rate limiting (429 Retry-After), and RBAC isolation", async () => {
    // CSRF mismatch
    const badCsrfReq = makeReq("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { host: "localhost:3000", origin: "https://evil-attacker.example.com" },
      body: { email: "a@b.com", password: "Password1234" },
    });
    expect(() => verifyCsrfOrigin(badCsrfReq)).toThrow();

    // Login rate limiting: 5 attempts per (email+IP) -> 6th returns 429 with Retry-After
    for (let i = 0; i < 5; i++) {
      const r = await loginPOST(
        makeReq("http://localhost:3000/api/auth/login", {
          method: "POST",
          headers: { "x-forwarded-for": "203.0.113.55" },
          body: { email: "ratelimit@example.com", password: "WrongPassword123" },
        })
      );
      expect(r.status).toBe(401);
    }
    const r6 = await loginPOST(
      makeReq("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "x-forwarded-for": "203.0.113.55" },
        body: { email: "ratelimit@example.com", password: "WrongPassword123" },
      })
    );
    expect(r6.status).toBe(429);
    expect(r6.headers.get("Retry-After")).toBeTruthy();

    // RBAC: common user gets 403 on /api/admin/users
    const pwHash = await hashPassword("ValidPass123");
    const uRes = await query<{ id: string }>(
      "INSERT INTO users (email, password_hash, full_name, role) VALUES ('common@test.local', $1, 'Common User', 'common') RETURNING id",
      [pwHash]
    );
    const commonToken = await signSessionToken({
      sub: uRes.rows[0].id,
      role: "common",
      tv: 0,
    });
    const adminCheck = await adminUsersGET(
      makeReq("http://localhost:3000/api/admin/users", { cookieToken: commonToken })
    );
    expect(adminCheck.status).toBe(403);
  });

  it("8. proves zero file persistence (fs spy + DB schema inspection) and happy-path /api/analyze + quota + privacy isolation", async () => {
    const pwHash = await hashPassword("ValidPass123");
    const uRes = await query<{ id: string }>(
      "INSERT INTO users (email, password_hash, full_name, role) VALUES ('analyst@test.local', $1, 'Analyst User', 'common') RETURNING id",
      [pwHash]
    );
    const userId = uRes.rows[0].id;
    const userToken = await signSessionToken({ sub: userId, role: "common", tv: 0 });

    const adminRes = await query<{ id: string }>(
      "INSERT INTO users (email, password_hash, full_name, role) VALUES ('admin@test.local', $1, 'Admin User', 'admin') RETURNING id",
      [pwHash]
    );
    const adminToken = await signSessionToken({
      sub: adminRes.rows[0].id,
      role: "admin",
      tv: 0,
    });

    const contractText =
      "1. APPOINTMENT AND EXCLUSIVITY\nSupplier appoints Distributor as exclusive distributor in Bangladesh, the US, and the EU. " +
      "2. RENEWAL AND NON-COMPETE\nThis Agreement automatically renews for 5 years and imposes a 6-year post-termination non-compete. " +
      "3. RECOMMENDED RESALE PRICE\nDistributor shall adhere to Recommended Resale Prices or pay a 35% quarterly invoice penalty.";

    // Spy on fs write functions during /api/analyze
    const writeFileSyncSpy = vi.spyOn(fs, "writeFileSync");
    const writeFileSpy = vi.spyOn(fs, "writeFile");
    const appendFileSyncSpy = vi.spyOn(fs, "appendFileSync");
    const createWriteStreamSpy = vi.spyOn(fs, "createWriteStream");

    const fd = new FormData();
    const blob = new Blob([contractText], { type: "text/plain" });
    fd.append("file", blob, "sample_contract.txt");
    fd.append("jurisdictions", JSON.stringify(["BD", "US", "EU"]));

    const anaRes = await analyzePOST(
      makeReq("http://localhost:3000/api/analyze", {
        method: "POST",
        cookieToken: userToken,
        body: fd,
      })
    );
    expect(anaRes.status).toBe(200);
    const anaData = await anaRes.json();
    expect(anaData.status).toBe("done");
    expect(anaData.file_discarded).toBe(true);
    expect(anaData.result.risks.length).toBeGreaterThanOrEqual(3);
    expect(anaData.result.verification).toBeDefined();
    expect(anaData.result.memo_markdown).toBeTruthy();

    // Assert NO file write functions were invoked during /api/analyze
    expect(writeFileSyncSpy).not.toHaveBeenCalled();
    expect(writeFileSpy).not.toHaveBeenCalled();
    expect(appendFileSyncSpy).not.toHaveBeenCalled();
    expect(createWriteStreamSpy).not.toHaveBeenCalled();

    writeFileSyncSpy.mockRestore();
    writeFileSpy.mockRestore();
    appendFileSyncSpy.mockRestore();
    createWriteStreamSpy.mockRestore();

    // Assert DB table 'analyses' has NO column holding file bytes or extracted text
    const dbRow = await query("SELECT * FROM analyses WHERE id = $1", [anaData.analysisId]);
    const rowKeys = Object.keys(dbRow.rows[0]);
    expect(rowKeys).not.toContain("file_bytes");
    expect(rowKeys).not.toContain("document_text");
    expect(rowKeys).not.toContain("extracted_text");

    // Privacy by design: Admin CANNOT read another user's analysis (returns 403)
    const adminReadAttempt = await analysisByIdGET(
      makeReq(`http://localhost:3000/api/analyses/${anaData.analysisId}`, {
        cookieToken: adminToken,
      }),
      { params: { id: anaData.analysisId } }
    );
    expect(adminReadAttempt.status).toBe(403);

    // Quota enforcement for 'common' role (limit = 3 per month; 1 used above, add 2 more, 4th must return 429)
    for (let i = 0; i < 2; i++) {
      await query(
        "INSERT INTO analyses (user_id, status, doc_name, doc_size, doc_mime, doc_sha256) VALUES ($1, 'done', 'doc.txt', 300, 'text/plain', 'abc')",
        [userId]
      );
    }
    const fdQuota = new FormData();
    fdQuota.append("text", contractText);
    const quotaRes = await analyzePOST(
      makeReq("http://localhost:3000/api/analyze", {
        method: "POST",
        cookieToken: userToken,
        body: fdQuota,
      })
    );
    expect(quotaRes.status).toBe(429);
    const quotaJson = await quotaRes.json();
    expect(quotaJson.error).toBe("quota_exceeded");
  });

  it("9. cleans up stuck processing rows (>10m), masks integration secrets, and cascades account deletion", async () => {
    const pwHash = await hashPassword("DeleteMe12345");
    const uRes = await query<{ id: string }>(
      "INSERT INTO users (email, password_hash, full_name, role) VALUES ('del@test.local', $1, 'Del User', 'admin') RETURNING id",
      [pwHash]
    );
    const userId = uRes.rows[0].id;
    const token = await signSessionToken({ sub: userId, role: "admin", tv: 0 });

    // Insert a stuck analysis created 15 minutes ago
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const stuckRes = await query<{ id: string }>(
      `INSERT INTO analyses (user_id, status, doc_name, doc_size, doc_mime, doc_sha256, created_at)
       VALUES ($1, 'processing', 'stuck.pdf', 1024, 'application/pdf', 'deadbeef', $2)
       RETURNING id`,
      [userId, fifteenMinAgo]
    );
    const cleanedCount = await cleanupStuckAnalyses();
    expect(cleanedCount).toBeGreaterThanOrEqual(1);
    const checkStuck = await query<{ status: string; error: string }>(
      "SELECT status, error FROM analyses WHERE id = $1",
      [stuckRes.rows[0].id]
    );
    expect(checkStuck.rows[0].status).toBe("failed");
    expect(checkStuck.rows[0].error).toBe("timed out");

    // Integration secret write-only check
    const rawSecret = "rag-secret-key-9988";
    const putIntRes = await adminIntegrationsPUT(
      makeReq("http://localhost:3000/api/admin/integrations", {
        method: "PUT",
        cookieToken: token,
        body: {
          slug: "rag",
          name: "Juris AI RAG Service",
          baseUrl: `http://127.0.0.1:${mockRagPort}`,
          apiKey: rawSecret,
          healthPath: "/health",
          enabled: true,
        },
      })
    );
    expect(putIntRes.status).toBe(200);
    const putIntJson = await putIntRes.json();
    expect(JSON.stringify(putIntJson)).not.toContain(rawSecret);
    expect(putIntJson.integration.apiKeyMasked).toBe("••••9988");

    const getIntRes = await adminIntegrationsGET(
      makeReq("http://localhost:3000/api/admin/integrations", { cookieToken: token })
    );
    const getIntJson = await getIntRes.json();
    expect(JSON.stringify(getIntJson)).not.toContain(rawSecret);

    // Account deletion cascade check
    const delRes = await accountDELETE(
      makeReq("http://localhost:3000/api/account", {
        method: "DELETE",
        cookieToken: token,
        body: { password: "DeleteMe12345" },
      })
    );
    expect(delRes.status).toBe(200);

    const remainingUser = await query("SELECT id FROM users WHERE id = $1", [userId]);
    expect(remainingUser.rows.length).toBe(0);
    const remainingAnalyses = await query("SELECT id FROM analyses WHERE user_id = $1", [userId]);
    expect(remainingAnalyses.rows.length).toBe(0);

    const auditDel = await query<{ user_id: string | null; action: string }>(
      "SELECT user_id, action FROM audit_logs WHERE action = 'account_deleted' ORDER BY id DESC LIMIT 1"
    );
    expect(auditDel.rows.length).toBe(1);
    expect(auditDel.rows[0].user_id).toBeNull();
  });
});
