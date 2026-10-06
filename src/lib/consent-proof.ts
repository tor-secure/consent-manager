import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { canonicalizePolicyNoticeSnapshot } from "./policy-context";

export const CONSENT_PROOF_ALG = "HMAC-SHA256";
export const CONSENT_PROOF_HASH_ALG = "SHA-256";

export type ConsentProofDecision = {
  purposeId: string | null;
  vendorId: string | null;
  granted: boolean;
};

export type ConsentProofClaims = {
  v: 1 | 2;
  consentId: string;
  websiteId: string;
  policyVersionId: string;
  status: string;
  choice: string | null;
  jurisdiction: string | null;
  decisions: ConsentProofDecision[];
  consentedAt: string;
  sessionId?: string | null;
};

export type ConsentCryptoProof = {
  alg: typeof CONSENT_PROOF_ALG;
  hashAlg: typeof CONSENT_PROOF_HASH_ALG;
  hash: string;
  signature: string;
  signedAt: string;
  proofVersion?: 1 | 2;
  keyId?: string;
};

function proofKey(): Buffer {
  const configuredSecret = process.env.CONSENT_PROOF_SECRET?.trim();
  const material =
    configuredSecret ||
    (process.env.NODE_ENV === "production" ? "" : "cmp-dev-consent-proof");
  if (!material) {
    throw new Error("CONSENT_PROOF_SECRET is required in production");
  }
  return createHash("sha256").update(material).digest();
}

/** Server-only key ring. `CONSENT_PROOF_KEYS` uses `id:secret,id2:secret`. */
function proofKeyFor(keyId?: string): { id: string; key: Buffer } {
  const ring = (process.env.CONSENT_PROOF_KEYS ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
  const configured = ring.map((entry) => { const at = entry.indexOf(":"); return at > 0 ? { id: entry.slice(0, at), secret: entry.slice(at + 1) } : null; }).filter((row): row is { id: string; secret: string } => Boolean(row));
  if (keyId === "legacy") return { id: "legacy", key: proofKey() };
  const selected = keyId ? configured.find((row) => row.id === keyId) : configured[0];
  if (keyId && !selected) throw new Error("Consent proof key is unavailable");
  return selected ? { id: selected.id, key: createHash("sha256").update(selected.secret).digest() } : { id: "legacy", key: proofKey() };
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
    v: claims.v,
    consentId: claims.consentId,
    websiteId: claims.websiteId,
    policyVersionId: claims.policyVersionId,
    status: claims.status,
    choice: claims.choice,
    jurisdiction: claims.jurisdiction,
    decisions,
    consentedAt: claims.consentedAt,
    ...(claims.v === 2 ? { sessionId: claims.sessionId ?? null } : {}),
  });
}

export function hashConsentProofClaims(claims: ConsentProofClaims): string {
  return createHash("sha256").update(canonicalizeConsentProofClaims(claims), "utf8").digest("hex");
}

export function signConsentProofHash(hash: string, keyId?: string): string {
  return createHmac("sha256", proofKeyFor(keyId).key).update(hash).digest("hex");
}

export function createConsentCryptoProof(claims: ConsentProofClaims, signedAt = new Date()): ConsentCryptoProof {
  const hash = hashConsentProofClaims(claims);
  const key = proofKeyFor();
  return {
    alg: CONSENT_PROOF_ALG,
    hashAlg: CONSENT_PROOF_HASH_ALG,
    hash,
    signature: createHmac("sha256", key.key).update(hash).digest("hex"),
    signedAt: signedAt.toISOString(),
    proofVersion: claims.v,
    keyId: key.id,
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
}): { hashMatches: boolean; signatureValid: boolean; versionMatches: boolean; intact: boolean } {
  const expectedHash = hashConsentProofClaims(input.claims);
  const hashMatches = hexEqual(expectedHash, input.proof.hash);
  let signatureValid = false;
  try { signatureValid = hexEqual(signConsentProofHash(input.proof.hash, input.proof.keyId), input.proof.signature); } catch { signatureValid = false; }
  const versionMatches = input.proof.proofVersion === undefined || input.proof.proofVersion === input.claims.v;
  return {
    hashMatches,
    signatureValid,
    versionMatches,
    intact: hashMatches && signatureValid && versionMatches,
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
    proofVersion: row.proofVersion === 2 ? 2 : row.proofVersion === 1 ? 1 : undefined,
    keyId: typeof row.keyId === "string" ? row.keyId : "legacy",
  };
}

export function getConsentProofKeyMetadata() {
  const entries = (process.env.CONSENT_PROOF_KEYS ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
  const ids = entries.map((entry) => entry.slice(0, entry.indexOf(":"))).filter((id) => /^[A-Za-z0-9._-]{1,64}$/.test(id));
  return { algorithm: CONSENT_PROOF_ALG, activeKeyId: ids[0] ?? "legacy", keys: ids.map((id, index) => ({ keyId: id, status: index === 0 ? "active" : "verification_only" })) };
}

export function createHistoricalConsentEvidenceProof(
  evidence: unknown,
): { hash: string; signature: string; keyId: string; proofVersion: 1 } {
  const hash = createHash("sha256")
    .update(canonicalizePolicyNoticeSnapshot(evidence), "utf8")
    .digest("hex");
  const key = proofKeyFor();
  return {
    hash,
    signature: createHmac("sha256", key.key).update(hash).digest("hex"),
    keyId: key.id,
    proofVersion: 1,
  };
}

export function verifyHistoricalConsentEvidenceProof(input: {
  evidence: unknown;
  hash: string;
  signature: string;
  keyId?: string;
}): { hashMatches: boolean; signatureValid: boolean; intact: boolean } {
  const expectedHash = createHash("sha256").update(canonicalizePolicyNoticeSnapshot(input.evidence), "utf8").digest("hex");
  const hashMatches = hexEqual(expectedHash, input.hash);
  let signatureValid = false;
  try { signatureValid = hexEqual(createHmac("sha256", proofKeyFor(input.keyId ?? "legacy").key).update(input.hash).digest("hex"), input.signature); } catch { signatureValid = false; }
  return {
    hashMatches,
    signatureValid,
    intact: hashMatches && signatureValid,
  };
}
