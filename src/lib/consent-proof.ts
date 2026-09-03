import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const CONSENT_PROOF_ALG = "HMAC-SHA256";
export const CONSENT_PROOF_HASH_ALG = "SHA-256";

export type ConsentProofDecision = {
  purposeId: string | null;
  vendorId: string | null;
  granted: boolean;
};

export type ConsentProofClaims = {
  v: 1;
  consentId: string;
  websiteId: string;
  policyVersionId: string;
  status: string;
  choice: string | null;
  jurisdiction: string | null;
  decisions: ConsentProofDecision[];
  consentedAt: string;
};

export type ConsentCryptoProof = {
  alg: typeof CONSENT_PROOF_ALG;
  hashAlg: typeof CONSENT_PROOF_HASH_ALG;
  hash: string;
  signature: string;
  signedAt: string;
};

function proofKey(): Buffer {
  const material =
    process.env.CONSENT_PROOF_SECRET?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    "cmp-dev-consent-proof";
  return createHash("sha256").update(material).digest();
}

export function canonicalizeConsentProofClaims(claims: ConsentProofClaims): string {
  const decisions = [...claims.decisions]
    .map((row) => ({
      purposeId: row.purposeId,
      vendorId: row.vendorId,
      granted: Boolean(row.granted),
    }))
    .sort((a, b) => {
      const left = `${a.purposeId ?? ""}:${a.vendorId ?? ""}`;
      const right = `${b.purposeId ?? ""}:${b.vendorId ?? ""}`;
      return left.localeCompare(right);
    });

  return JSON.stringify({
    v: 1,
    consentId: claims.consentId,
    websiteId: claims.websiteId,
    policyVersionId: claims.policyVersionId,
    status: claims.status,
    choice: claims.choice,
    jurisdiction: claims.jurisdiction,
    decisions,
    consentedAt: claims.consentedAt,
  });
}

export function hashConsentProofClaims(claims: ConsentProofClaims): string {
  return createHash("sha256").update(canonicalizeConsentProofClaims(claims), "utf8").digest("hex");
}

export function signConsentProofHash(hash: string): string {
  return createHmac("sha256", proofKey()).update(hash).digest("hex");
}

export function createConsentCryptoProof(claims: ConsentProofClaims, signedAt = new Date()): ConsentCryptoProof {
  const hash = hashConsentProofClaims(claims);
  return {
    alg: CONSENT_PROOF_ALG,
    hashAlg: CONSENT_PROOF_HASH_ALG,
    hash,
    signature: signConsentProofHash(hash),
    signedAt: signedAt.toISOString(),
  };
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

export function verifyConsentCryptoProof(input: {
  claims: ConsentProofClaims;
  proof: ConsentCryptoProof;
}): { hashMatches: boolean; signatureValid: boolean; intact: boolean } {
  const expectedHash = hashConsentProofClaims(input.claims);
  const hashMatches = hexEqual(expectedHash, input.proof.hash);
  const expectedSignature = signConsentProofHash(input.proof.hash);
  const signatureValid = hexEqual(expectedSignature, input.proof.signature);
  return {
    hashMatches,
    signatureValid,
    intact: hashMatches && signatureValid,
  };
}

export function readStoredCryptoProof(metadata: unknown): ConsentCryptoProof | null {
  if (!metadata || typeof metadata !== "object") return null;
  const proof = (metadata as { cryptoProof?: unknown }).cryptoProof;
  if (!proof || typeof proof !== "object") return null;
  const row = proof as Record<string, unknown>;
  if (typeof row.hash !== "string" || typeof row.signature !== "string") return null;
  return {
    alg: CONSENT_PROOF_ALG,
    hashAlg: CONSENT_PROOF_HASH_ALG,
    hash: row.hash,
    signature: row.signature,
    signedAt: typeof row.signedAt === "string" ? row.signedAt : "",
  };
}
