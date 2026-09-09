import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Portable consent proof is a signed, integrity-checked bundle that can be
// exchanged across domains/devices.
//
// Unlike `src/lib/consent-proof.ts`, we intentionally sign *keys/domains*
// (purposeKey + vendorDomain) so a visitor's consent can be mapped onto a
// different site's active policy.

export const PORTABLE_CONSENT_PROOF_ALG = "HMAC-SHA256";
export const PORTABLE_CONSENT_PROOF_HASH_ALG = "SHA-256";

export type PortableConsentDecision = {
  purposeKey: string | null;
  vendorDomain: string | null;
  granted: boolean;
};

export type PortableConsentClaims = {
  v: 2;
  jti: string;
  consentId: string;
  originWebsiteId: string;
  targetWebsiteId: string;
  audience: "portable-consent-import";
  status: string;
  choice: string | null;
  jurisdiction: string | null;
  consentedAt: string;
  expiresAt: string | null;
  issuedAt: string;
  exchangeExpiresAt: string;
  // Decisions use purposeKey/vendorDomain for cross-domain portability.
  decisions: PortableConsentDecision[];
};

export type PortableConsentCryptoProof = {
  alg: typeof PORTABLE_CONSENT_PROOF_ALG;
  hashAlg: typeof PORTABLE_CONSENT_PROOF_HASH_ALG;
  hash: string;
  signature: string;
  signedAt: string;
};

export const PORTABLE_EXCHANGE_TTL_MS = 10 * 60 * 1000;

export function createPortableExchangeCode(): string {
  const value = randomBytes(6).toString("base64url").toUpperCase();
  return `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`;
}

export function hashPortableExchangeSecret(value: string): string {
  return createHash("sha256").update(value.trim(), "utf8").digest("hex");
}

function proofKey(): Buffer {
  const configuredSecret = process.env.CONSENT_PROOF_SECRET?.trim();
  if (!configuredSecret && process.env.NODE_ENV === "production") {
    throw new Error("CONSENT_PROOF_SECRET is required in production");
  }
  const material =
    configuredSecret ||
    process.env.DATABASE_URL?.trim() ||
    "cmp-dev-consent-proof";
  return createHash("sha256").update(material).digest();
}

function hexEqual(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    if (a.length === 0 || a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function canonicalizePortableConsentClaims(claims: PortableConsentClaims): string {
  const decisions = [...claims.decisions]
    .map((row) => ({
      purposeKey: row.purposeKey ?? null,
      vendorDomain: row.vendorDomain ?? null,
      granted: Boolean(row.granted),
    }))
    .sort((a, b) => {
      const left = `${a.purposeKey ?? ""}:${a.vendorDomain ?? ""}`;
      const right = `${b.purposeKey ?? ""}:${b.vendorDomain ?? ""}`;
      return left.localeCompare(right);
    });

  return JSON.stringify({
    v: 2,
    jti: claims.jti,
    consentId: claims.consentId,
    originWebsiteId: claims.originWebsiteId,
    targetWebsiteId: claims.targetWebsiteId,
    audience: claims.audience,
    status: claims.status,
    choice: claims.choice,
    jurisdiction: claims.jurisdiction,
    consentedAt: claims.consentedAt,
    expiresAt: claims.expiresAt,
    issuedAt: claims.issuedAt,
    exchangeExpiresAt: claims.exchangeExpiresAt,
    decisions,
  });
}

export function hashPortableConsentClaims(claims: PortableConsentClaims): string {
  return createHash("sha256")
    .update(canonicalizePortableConsentClaims(claims), "utf8")
    .digest("hex");
}

export function signPortableConsentProofHash(hash: string): string {
  return createHmac("sha256", proofKey()).update(hash).digest("hex");
}

export function createPortableConsentCryptoProof(
  claims: PortableConsentClaims,
  signedAt = new Date(),
): PortableConsentCryptoProof {
  const hash = hashPortableConsentClaims(claims);
  return {
    alg: PORTABLE_CONSENT_PROOF_ALG,
    hashAlg: PORTABLE_CONSENT_PROOF_HASH_ALG,
    hash,
    signature: signPortableConsentProofHash(hash),
    signedAt: signedAt.toISOString(),
  };
}

export function verifyPortableConsentCryptoProof(input: {
  claims: PortableConsentClaims;
  proof: PortableConsentCryptoProof;
}): { hashMatches: boolean; signatureValid: boolean; intact: boolean } {
  const expectedHash = hashPortableConsentClaims(input.claims);
  const hashMatches = hexEqual(expectedHash, input.proof.hash);
  const expectedSignature = signPortableConsentProofHash(input.proof.hash);
  const signatureValid = hexEqual(expectedSignature, input.proof.signature);
  return {
    hashMatches,
    signatureValid,
    intact: hashMatches && signatureValid,
  };
}

