import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_RESEND_DELAY_MS = 30 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_MAX_SENDS = 4;

const OTP_RE = /^\d{6}$/;

function otpKey(): Buffer {
  const material =
    process.env.WHATSAPP_OTP_SECRET?.trim() ||
    process.env.CONSENT_PROOF_SECRET?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "cmp-dev-whatsapp-otp");
  if (!material) {
    throw new Error("WHATSAPP_OTP_SECRET or CONSENT_PROOF_SECRET is required in production");
  }
  return createHash("sha256").update(material).digest();
}

export function generateOtp(): string {
  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

export function isValidOtpFormat(value: string): boolean {
  return OTP_RE.test(value);
}

/** Bind the hash to the challenge so a code cannot be replayed across rows. */
export function hashOtp(challengeId: string, code: string): string {
  return createHmac("sha256", otpKey()).update(`${challengeId}:${code}`).digest("hex");
}

export function otpMatches(challengeId: string, code: string, storedHash: string): boolean {
  const actual = Buffer.from(hashOtp(challengeId, code), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Opaque bearer the browser holds after a correct OTP. Only its hash is stored. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionTokenMatches(token: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  const actual = Buffer.from(hashSessionToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
