import crypto from "crypto";
import { extractText as unpdfExtractText } from "unpdf";
import mammoth from "mammoth";

export class ExtractionError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export type SupportedDocType = "pdf" | "docx" | "txt";

/**
 * Verify file format strictly using magic bytes (plus word/document.xml presence for DOCX).
 */
export function detectAndValidateFileType(
  bytes: Uint8Array,
  fileName: string,
  mimeType: string
): { docType: SupportedDocType; normalizedMime: string } {
  if (!bytes || bytes.byteLength === 0) {
    throw new ExtractionError(400, "empty_file", "Uploaded file is empty.");
  }

  // 1. Check PDF magic header: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (
    bytes.byteLength >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return { docType: "pdf", normalizedMime: "application/pdf" };
  }

  // 2. Check ZIP magic header for DOCX: PK\x03\x04 (0x50 0x4B 0x03 0x04) + "word/document.xml"
  if (
    bytes.byteLength >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    bytes[2] === 0x03 &&
    bytes[3] === 0x04
  ) {
    const rawLatin = Buffer.from(bytes).toString("latin1");
    if (rawLatin.includes("word/document.xml")) {
      return {
        docType: "docx",
        normalizedMime:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }
    throw new ExtractionError(
      400,
      "invalid_file_type",
      "ZIP archive does not contain word/document.xml (not a valid DOCX document)."
    );
  }

  // 3. Check plain text (.txt or text/plain) and ensure it is not a disguised binary file
  const lowerName = (fileName || "").toLowerCase();
  const lowerMime = (mimeType || "").toLowerCase();
  const isTxtExtOrMime = lowerName.endsWith(".txt") || lowerMime.startsWith("text/plain");
  if (isTxtExtOrMime) {
    // Reject if NUL bytes exist in the first 8 KB
    const checkLen = Math.min(bytes.byteLength, 8192);
    for (let i = 0; i < checkLen; i++) {
      if (bytes[i] === 0x00) {
        throw new ExtractionError(
          400,
          "invalid_file_type",
          "Binary content detected in .txt upload. Only valid UTF-8 text, PDF, or DOCX files are accepted."
        );
      }
    }
    return { docType: "txt", normalizedMime: "text/plain" };
  }

  throw new ExtractionError(
    400,
    "invalid_file_type",
    "Unsupported file format. Please upload a valid PDF, DOCX, or TXT file."
  );
}

/**
 * Extract text strictly in memory without writing anything to disk.
 */
export async function extractDocumentInMemory(params: {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  maxUploadMb: number;
}): Promise<{
  text: string;
  sha256: string;
  docSize: number;
  docMime: string;
}> {
  const clampedMb = Math.min(4, Math.max(1, params.maxUploadMb || 4));
  const maxBytes = clampedMb * 1024 * 1024;
  if (params.bytes.byteLength > maxBytes) {
    throw new ExtractionError(
      413,
      "file_too_large",
      `File exceeds maximum upload limit of ${clampedMb} MB.`
    );
  }

  const { docType, normalizedMime } = detectAndValidateFileType(
    params.bytes,
    params.fileName,
    params.mimeType
  );

  const sha256 = crypto.createHash("sha256").update(params.bytes).digest("hex");
  const docSize = params.bytes.byteLength;

  let extracted = "";
  if (docType === "pdf") {
    const pdfCopy = new Uint8Array(params.bytes);
    const res = await unpdfExtractText(pdfCopy, { mergePages: true });
    extracted = Array.isArray(res.text) ? res.text.join("\n") : String(res.text || "");
  } else if (docType === "docx") {
    const buf = Buffer.from(params.bytes);
    const res = await mammoth.extractRawText({ buffer: buf });
    extracted = String(res.value || "");
  } else {
    extracted = Buffer.from(params.bytes).toString("utf8");
  }

  const cleaned = extracted.replace(/\r\n/g, "\n").trim();
  const meaningfulChars = cleaned.replace(/\s+/g, "").length;
  if (meaningfulChars < 200) {
    throw new ExtractionError(
      422,
      "no_text",
      "This looks like a scanned or image-only file. Scanned documents are not supported in this version; please upload a text-based PDF, DOCX or TXT."
    );
  }

  if (cleaned.length > 150_000) {
    throw new ExtractionError(
      413,
      "too_long",
      "Document text exceeds the maximum allowed 150,000 characters."
    );
  }

  return {
    text: cleaned,
    sha256,
    docSize,
    docMime: normalizedMime,
  };
}

/**
 * Light PII masking before sending text to RAG:
 * - emails -> [EMAIL]
 * - phone-like numbers -> [PHONE]
 * - long digit runs of 9+ (national IDs, bank accounts) -> [ID]
 * Leaves company/party names intact for legal reasoning.
 */
export function maskPii(text: string): string {
  if (!text) return "";
  let out = text;

  // 1. Mask emails
  out = out.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[EMAIL]");

  // 2. Mask long contiguous digit runs of 9+ digits (national IDs, bank accounts,TINs)
  out = out.replace(/\b\d{9,}\b/g, "[ID]");

  // 3. Mask international / formatted phone numbers (e.g. +880-1711-123456, +1 (555) 234-5678, (02) 987-6543)
  out = out.replace(
    /(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\b\d{3,4}[\s.-])\d{3,4}[\s.-]\d{4}\b/g,
    "[PHONE]"
  );

  return out;
}
