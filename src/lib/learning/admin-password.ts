import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEYLEN = 64;
const RESET_TOKEN_BYTES = 32;

/** Opaque reset token for email links; store only the hash in the DB. */
export function createAdminPasswordResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(RESET_TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashAdminPasswordResetToken(token) };
}

export function hashAdminPasswordResetToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Format: scrypt$N$r$p$saltHex$hashHex */
export function hashAdminPassword(password: string): string {
  const N = 16384;
  const r = 8;
  const p = 1;
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEYLEN, { N, r, p });
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyAdminPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltHex = parts[4] ?? "";
  const hashHex = parts[5] ?? "";
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p) || !saltHex || !hashHex) {
    return false;
  }
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(password, salt, expected.length, { N, r, p });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function generateAdminPassword(bytes = 12): string {
  // URL-safe, no ambiguous characters.
  return randomBytes(bytes).toString("base64url");
}
