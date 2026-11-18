import crypto from "crypto";
import fs from "fs";
import path from "path";

const DEV_KEY_PATH = path.resolve(process.cwd(), ".data", "dev-enc-key");

export function getEncryptionKey(): Buffer {
  const envKey = (process.env.SETTINGS_ENC_KEY || "").trim();
  if (envKey) {
    const buf = Buffer.from(envKey, "base64");
    if (buf.length !== 32) {
      throw new Error("SETTINGS_ENC_KEY must decode to exactly 32 bytes (base64)");
    }
    return buf;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SETTINGS_ENC_KEY environment variable is required in production");
  }

  fs.mkdirSync(path.dirname(DEV_KEY_PATH), { recursive: true });
  if (fs.existsSync(DEV_KEY_PATH)) {
    const saved = fs.readFileSync(DEV_KEY_PATH, "utf8").trim();
    const buf = Buffer.from(saved, "base64");
    if (buf.length === 32) return buf;
  }

  const generated = crypto.randomBytes(32);
  fs.writeFileSync(DEV_KEY_PATH, generated.toString("base64"), { mode: 0o600 });
  return generated;
}

/**
 * Encrypt plaintext secret with AES-256-GCM.
 * Format: v1:<iv_b64>:<tag_b64>:<ciphertext_b64>
 */
export function encryptSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Decrypt v1:<iv_b64>:<tag_b64>:<ciphertext_b64> secret using AES-256-GCM.
 */
export function decryptSecret(payload: string): string {
  const parts = (payload || "").split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted secret format");
  }
  const key = getEncryptionKey();
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const ciphertext = Buffer.from(parts[3], "base64");
  if (iv.length !== 12 || tag.length !== 16) {
    throw new Error("Invalid IV or authentication tag length");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Return write-only masked preview: •••• + last 4 characters.
 */
export function maskApiKey(secret: string | null | undefined): string | null {
  if (!secret) return null;
  const trimmed = secret.trim();
  if (!trimmed) return null;
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}
