import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export const POLICY_CONTEXT_ALGORITHM = "HMAC-SHA256" as const;
export const POLICY_CONTEXT_VERSION = 1 as const;
export const DEFAULT_POLICY_CONTEXT_TTL_MS = 30 * 60 * 1000;

const MAX_POLICY_CONTEXT_TTL_MS = 2 * 60 * 60 * 1000;
const MAX_TOKEN_LENGTH = 16_384;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH_RE = /^[0-9a-f]{64}$/;

export type PolicyContextClaims = {
  version: typeof POLICY_CONTEXT_VERSION;
  algorithm: typeof POLICY_CONTEXT_ALGORITHM;
  contextId: string;
  organizationId: string;
  websiteId: string;
  siteKey: string;
  policyId: string;
  policyVersionId: string;
  policyVersionNumber: number;
  jurisdiction: string;
  locale: string;
  variantId: string | null;
  noticeHash: string;
  issuedAt: string;
  expiresAt: string;
};

export type SignedPolicyContext = {
  token: string;
  claims: PolicyContextClaims;
  noticeSnapshot: PolicyNoticeSnapshot;
};

export type PolicyNoticeSnapshot = {
  policy: {
    id: string;
    name: string;
    versionId: string;
    version: number;
  };
  jurisdiction: string;
  locale: string;
  variantId: string | null;
  bannerConfig: Record<string, unknown>;
  purposes: Array<Record<string, unknown>>;
  vendors: Array<Record<string, unknown>>;
  grievance: Record<string, unknown>;
};

export type PolicyContextVerification =
  | { ok: true; claims: PolicyContextClaims }
  | {
      ok: false;
      reason:
        | "missing"
        | "malformed"
        | "invalid_signature"
        | "invalid_claims"
        | "expired";
    };

export type PolicyContextEnvelopeVerification =
  | { ok: true; claims: PolicyContextClaims; noticeSnapshot: PolicyNoticeSnapshot }
  | {
      ok: false;
      reason:
        | "missing"
        | "malformed"
        | "invalid_signature"
        | "invalid_claims"
        | "expired"
        | "notice_hash_mismatch"
        | "notice_identity_mismatch";
    };

function contextSecret(): Buffer {
  const configured =
    process.env.POLICY_CONTEXT_SECRET?.trim() ||
    process.env.CONSENT_PROOF_SECRET?.trim();
  const material =
    configured ||
    (process.env.NODE_ENV === "production" ? "" : "cmp-dev-policy-context");
  if (!material) {
    throw new Error(
      "POLICY_CONTEXT_SECRET or CONSENT_PROOF_SECRET is required in production",
    );
  }
  return createHash("sha256")
    .update(material)
    .digest();
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stableValue(child)]),
  );
}

export function canonicalizePolicyNoticeSnapshot(snapshot: unknown): string {
  return JSON.stringify(stableValue(snapshot));
}

export function hashPolicyNoticeSnapshot(snapshot: unknown): string {
  return createHash("sha256")
    .update(canonicalizePolicyNoticeSnapshot(snapshot), "utf8")
    .digest("hex");
}

export function buildPolicyNoticeSnapshot(
  snapshot: PolicyNoticeSnapshot,
): PolicyNoticeSnapshot {
  return {
    policy: {
      id: snapshot.policy.id,
      name: snapshot.policy.name,
      versionId: snapshot.policy.versionId,
      version: snapshot.policy.version,
    },
    jurisdiction: snapshot.jurisdiction,
    locale: snapshot.locale,
    variantId: snapshot.variantId,
    bannerConfig: { ...snapshot.bannerConfig },
    purposes: snapshot.purposes.map((purpose) => ({ ...purpose })),
    vendors: snapshot.vendors.map((vendor) => ({ ...vendor })),
    grievance: { ...snapshot.grievance },
  };
}

function encodeClaims(claims: PolicyContextClaims): string {
  return Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
}

function signPayload(encodedClaims: string): string {
  return createHmac("sha256", contextSecret())
    .update(encodedClaims, "ascii")
    .digest("base64url");
}

function signatureMatches(encodedClaims: string, supplied: string): boolean {
  try {
    const expected = Buffer.from(signPayload(encodedClaims), "base64url");
    const actual = Buffer.from(supplied, "base64url");
    return (
      actual.length === expected.length &&
      actual.length > 0 &&
      timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}

export function issuePolicyContext(
  input: Omit<
    PolicyContextClaims,
    | "version"
    | "algorithm"
    | "contextId"
    | "noticeHash"
    | "issuedAt"
    | "expiresAt"
  > & { noticeSnapshot: PolicyNoticeSnapshot },
  options: { now?: Date; ttlMs?: number; contextId?: string } = {},
): SignedPolicyContext {
  const now = options.now ?? new Date();
  const ttlMs = Math.max(
    60_000,
    Math.min(options.ttlMs ?? DEFAULT_POLICY_CONTEXT_TTL_MS, MAX_POLICY_CONTEXT_TTL_MS),
  );
  const { noticeSnapshot, ...claimInput } = input;
  const claims: PolicyContextClaims = {
    version: POLICY_CONTEXT_VERSION,
    algorithm: POLICY_CONTEXT_ALGORITHM,
    contextId: options.contextId ?? randomUUID(),
    ...claimInput,
    noticeHash: hashPolicyNoticeSnapshot(noticeSnapshot),
    issuedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
  };
  const encodedClaims = encodeClaims(claims);
  return {
    token: `${encodedClaims}.${signPayload(encodedClaims)}`,
    claims,
    noticeSnapshot,
  };
}

function validClaims(value: unknown): value is PolicyContextClaims {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const claims = value as Record<string, unknown>;
  const issuedAt = Date.parse(String(claims.issuedAt ?? ""));
  const expiresAt = Date.parse(String(claims.expiresAt ?? ""));
  return (
    claims.version === POLICY_CONTEXT_VERSION &&
    claims.algorithm === POLICY_CONTEXT_ALGORITHM &&
    typeof claims.contextId === "string" &&
    UUID_RE.test(claims.contextId) &&
    typeof claims.organizationId === "string" &&
    UUID_RE.test(claims.organizationId) &&
    typeof claims.websiteId === "string" &&
    UUID_RE.test(claims.websiteId) &&
    typeof claims.siteKey === "string" &&
    claims.siteKey.length >= 8 &&
    claims.siteKey.length <= 255 &&
    typeof claims.policyId === "string" &&
    UUID_RE.test(claims.policyId) &&
    typeof claims.policyVersionId === "string" &&
    UUID_RE.test(claims.policyVersionId) &&
    Number.isInteger(claims.policyVersionNumber) &&
    Number(claims.policyVersionNumber) > 0 &&
    typeof claims.jurisdiction === "string" &&
    claims.jurisdiction.length <= 100 &&
    typeof claims.locale === "string" &&
    claims.locale.length > 0 &&
    claims.locale.length <= 35 &&
    (claims.variantId === null ||
      (typeof claims.variantId === "string" && claims.variantId.length <= 40)) &&
    typeof claims.noticeHash === "string" &&
    HASH_RE.test(claims.noticeHash) &&
    Number.isFinite(issuedAt) &&
    Number.isFinite(expiresAt) &&
    expiresAt > issuedAt &&
    expiresAt - issuedAt <= MAX_POLICY_CONTEXT_TTL_MS
  );
}

export function verifyPolicyContextToken(
  token: unknown,
  now = new Date(),
): PolicyContextVerification {
  if (typeof token !== "string" || !token.trim()) return { ok: false, reason: "missing" };
  if (token.length > MAX_TOKEN_LENGTH) return { ok: false, reason: "malformed" };
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, reason: "malformed" };
  }
  if (!signatureMatches(parts[0], parts[1])) {
    return { ok: false, reason: "invalid_signature" };
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!validClaims(decoded)) return { ok: false, reason: "invalid_claims" };
  if (Date.parse(decoded.expiresAt) <= now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true, claims: decoded };
}

export function verifyPolicyContextEnvelope(
  value: unknown,
  now = new Date(),
): PolicyContextEnvelopeVerification {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, reason: "missing" };
  }
  const envelope = value as Record<string, unknown>;
  const tokenResult = verifyPolicyContextToken(envelope.token, now);
  if (tokenResult.ok === false) {
    return { ok: false, reason: tokenResult.reason };
  }
  const snapshot = envelope.noticeSnapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { ok: false, reason: "notice_hash_mismatch" };
  }
  if (hashPolicyNoticeSnapshot(snapshot) !== tokenResult.claims.noticeHash) {
    return { ok: false, reason: "notice_hash_mismatch" };
  }
  const typedSnapshot = snapshot as PolicyNoticeSnapshot;
  if (
    !typedSnapshot.policy ||
    typedSnapshot.policy.id !== tokenResult.claims.policyId ||
    typedSnapshot.policy.versionId !== tokenResult.claims.policyVersionId ||
    typedSnapshot.policy.version !== tokenResult.claims.policyVersionNumber ||
    typedSnapshot.jurisdiction !== tokenResult.claims.jurisdiction ||
    typedSnapshot.locale !== tokenResult.claims.locale ||
    typedSnapshot.variantId !== tokenResult.claims.variantId
  ) {
    return { ok: false, reason: "notice_identity_mismatch" };
  }
  return {
    ok: true,
    claims: tokenResult.claims,
    noticeSnapshot: typedSnapshot,
  };
}

export function policyContextMatchesScope(
  claims: PolicyContextClaims,
  scope: { organizationId: string; websiteId: string; siteKey: string },
): boolean {
  return (
    claims.organizationId === scope.organizationId &&
    claims.websiteId === scope.websiteId &&
    claims.siteKey === scope.siteKey
  );
}

export function policyContextMatchesVersion(
  claims: PolicyContextClaims,
  version: { policyId: string; policyVersionId: string; policyVersionNumber: number },
): boolean {
  return (
    claims.policyId === version.policyId &&
    claims.policyVersionId === version.policyVersionId &&
    claims.policyVersionNumber === version.policyVersionNumber
  );
}
