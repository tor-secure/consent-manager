import "server-only";

import { createHash, timingSafeEqual } from "crypto";

export const API_KEY_SCOPES = ["consent:evaluate", "data:redact"] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

const API_KEY_RE = /^cmp_(live|test)_[A-Za-z0-9_-]{43}$/;

export type ApiKeyCandidate = {
  status: string;
  keyHash: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  scopes: string[];
};

export type ApiKeyCandidateFailure =
  | "invalid"
  | "inactive"
  | "expired"
  | "insufficient_scope";

export function readBearerApiKey(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer ([^\s]+)$/i.exec(authorization);
  const key = match?.[1] ?? "";
  return API_KEY_RE.test(key) ? key : null;
}

export function getApiKeyPrefix(key: string): string {
  return key.slice(0, 16);
}

export function hashApiKeyBuffer(key: string): Buffer {
  return createHash("sha256").update(key).digest();
}

export function apiKeyHashMatches(key: string, storedHexHash: string): boolean {
  const candidate = hashApiKeyBuffer(key);
  let stored: Buffer;
  try {
    stored = Buffer.from(storedHexHash, "hex");
  } catch {
    return false;
  }
  return stored.length === candidate.length && timingSafeEqual(candidate, stored);
}

export function validateApiKeyCandidate(
  candidate: ApiKeyCandidate,
  key: string,
  requiredScope: ApiKeyScope,
  now = new Date(),
): { ok: true } | { ok: false; reason: ApiKeyCandidateFailure } {
  if (!apiKeyHashMatches(key, candidate.keyHash)) return { ok: false, reason: "invalid" };
  if (candidate.status !== "active" || candidate.revokedAt) {
    return { ok: false, reason: "inactive" };
  }
  if (candidate.expiresAt && candidate.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  if (!candidate.scopes.includes(requiredScope)) {
    return { ok: false, reason: "insufficient_scope" };
  }
  return { ok: true };
}
