import { createHash, createHmac } from "node:crypto";

const DEFAULT_COUNTRY_CODE = "91";
const E164_RE = /^\+[1-9]\d{7,14}$/;

/**
 * Normalize a typed mobile number to E.164.
 *
 * - Strips spaces, dashes, dots and parentheses.
 * - A leading "00" is treated as "+".
 * - A bare 10-digit Indian mobile number gets the +91 country code.
 * - Returns null when the result is not a plausible E.164 number.
 */
export function normalizePhoneE164(raw: string): string | null {
  let value = String(raw ?? "").trim().replace(/[\s().-]/g, "");
  if (!value) return null;
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (!value.startsWith("+")) {
    const digits = value.replace(/\D/g, "");
    if (/^[6-9]\d{9}$/.test(digits)) {
      value = `+${DEFAULT_COUNTRY_CODE}${digits}`;
    } else if (/^0[6-9]\d{9}$/.test(digits)) {
      value = `+${DEFAULT_COUNTRY_CODE}${digits.slice(1)}`;
    } else if (digits.startsWith(DEFAULT_COUNTRY_CODE) && digits.length === 12) {
      value = `+${digits}`;
    } else {
      return null;
    }
  }
  if (!E164_RE.test(value)) return null;
  return value;
}

function phoneHashKey(): Buffer {
  const material =
    process.env.WHATSAPP_PHONE_HASH_SECRET?.trim() ||
    process.env.CONSENT_PROOF_SECRET?.trim() ||
    (process.env.NODE_ENV === "production" ? "" : "cmp-dev-phone-hash");
  if (!material) {
    throw new Error("WHATSAPP_PHONE_HASH_SECRET or CONSENT_PROOF_SECRET is required in production");
  }
  return createHash("sha256").update(material).digest();
}

/** Keyed hash so the phone can be looked up without storing it in visitor_id. */
export function hashPhone(e164: string): string {
  return createHmac("sha256", phoneHashKey()).update(e164).digest("hex");
}

export function phoneLast4(e164: string): string {
  return e164.slice(-4);
}

/** "+91 98765 43210" -> "+91 •••••43210" for on-screen hints. */
export function maskPhone(e164: string): string {
  const last4 = phoneLast4(e164);
  // Indian numbers are always +91 followed by 10 digits; keep the country code
  // and hide the rest so "+919876543210" becomes "+91 ••••••3210".
  const country = e164.startsWith("+91") && e164.length === 13 ? "+91" : (e164.match(/^\+\d{1,3}/)?.[0] ?? "");
  const hidden = Math.max(2, e164.length - country.length - 4);
  return `${country} ${"•".repeat(hidden)}${last4}`;
}

/** The Cloud API wants the number without "+". */
export function phoneForCloudApi(e164: string): string {
  return e164.replace(/^\+/, "");
}
