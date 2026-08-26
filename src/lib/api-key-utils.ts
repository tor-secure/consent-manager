import "server-only";
import { createHash, randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Key format:  cmp_{env}_{32-byte-base64url}
// Example:     cmp_live_4Xk9...
//
// keyPrefix  — first 12 chars of the full key, stored in DB, shown in UI
// keyHash    — SHA-256 hex of the full key, stored in DB for verification
// ---------------------------------------------------------------------------

export type GeneratedKey = {
  fullKey: string;   // Returned ONCE to the caller; never stored in plaintext
  keyPrefix: string; // Stored in DB; shown in UI permanently
  keyHash: string;   // Stored in DB; used for verification
};

export function generateApiKey(environment: "live" | "test"): GeneratedKey {
  const secret = randomBytes(32).toString("base64url");
  const fullKey = `cmp_${environment}_${secret}`;
  const keyPrefix = fullKey.slice(0, 16); // "cmp_live_XXXXXXX" (16 chars)
  const keyHash = createHash("sha256").update(fullKey).digest("hex");

  return { fullKey, keyPrefix, keyHash };
}

export function hashApiKey(fullKey: string): string {
  return createHash("sha256").update(fullKey).digest("hex");
}
