import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const MAX_TTL_MS = 2 * 60 * 60 * 1000;

export type AgeContextClaims = {
  version: 1;
  contextId: string;
  organizationId: string;
  websiteId: string;
  sessionId: string | null;
  ageStatus: string;
  guardianStatus: string;
  restrictedProcessingAllowed: boolean;
  issuedAt: string;
  expiresAt: string;
};

function secret(): Buffer {
  const configured =
    process.env.POLICY_CONTEXT_SECRET?.trim() ||
    process.env.CONSENT_PROOF_SECRET?.trim();
  return createHash("sha256")
    .update(configured || process.env.DATABASE_URL?.trim() || "cmp-dev-age-context")
    .digest();
}

function sign(encoded: string): string {
  return createHmac("sha256", secret()).update(encoded, "ascii").digest("base64url");
}

export function issueAgeContext(input: Omit<AgeContextClaims, "version" | "contextId" | "issuedAt" | "expiresAt"> & {
  ttlMs?: number;
  now?: Date;
}): { token: string; claims: AgeContextClaims } {
  const now = input.now ?? new Date();
  const ttl = Math.min(MAX_TTL_MS, Math.max(60_000, input.ttlMs ?? 30 * 60 * 1000));
  const claims: AgeContextClaims = {
    version: 1,
    contextId: randomUUID(),
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    sessionId: input.sessionId,
    ageStatus: input.ageStatus,
    guardianStatus: input.guardianStatus,
    restrictedProcessingAllowed: input.restrictedProcessingAllowed,
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttl).toISOString(),
  };
  const encoded = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return { token: `${encoded}.${sign(encoded)}`, claims };
}

export function verifyAgeContext(
  token: string | null | undefined,
  expected: { organizationId: string; websiteId: string },
  now = new Date(),
): { ok: true; claims: AgeContextClaims } | { ok: false; reason: string } {
  if (!token || typeof token !== "string" || token.length > 8_192) {
    return { ok: false, reason: "missing" };
  }
  const [encoded, supplied] = token.split(".");
  if (!encoded || !supplied) return { ok: false, reason: "malformed" };
  try {
    const expectedSig = Buffer.from(sign(encoded), "base64url");
    const actual = Buffer.from(supplied, "base64url");
    if (actual.length !== expectedSig.length || !timingSafeEqual(actual, expectedSig)) {
      return { ok: false, reason: "invalid_signature" };
    }
    const claims = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AgeContextClaims;
    if (claims.organizationId !== expected.organizationId || claims.websiteId !== expected.websiteId) {
      return { ok: false, reason: "tenant_mismatch" };
    }
    if (new Date(claims.expiresAt).getTime() <= now.getTime()) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, claims };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
