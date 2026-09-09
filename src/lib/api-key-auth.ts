import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { apiKeys } from "@/db/schema/api-keys";
import { organizations } from "@/db/schema/organizations";
import {
  type ApiKeyCandidateFailure,
  type ApiKeyScope,
  apiKeyHashMatches,
  getApiKeyPrefix,
  readBearerApiKey,
  validateApiKeyCandidate,
} from "@/lib/api-key-auth-logic";

export type ApiKeyAuthContext = {
  apiKeyId: string;
  organizationId: string;
  environment: string;
  scopes: string[];
};

export type ApiKeyAuthResult =
  | { ok: true; context: ApiKeyAuthContext }
  | { ok: false; reason: "missing" | ApiKeyCandidateFailure };

export async function authenticateApiKey(
  request: Request,
  requiredScope: ApiKeyScope,
): Promise<ApiKeyAuthResult> {
  const key = readBearerApiKey(request);
  if (!key) return { ok: false, reason: "missing" };

  const candidates = await db
    .select({
      id: apiKeys.id,
      organizationId: apiKeys.organizationId,
      environment: apiKeys.environment,
      status: apiKeys.status,
      keyHash: apiKeys.keyHash,
      expiresAt: apiKeys.expiresAt,
      revokedAt: apiKeys.revokedAt,
      scopes: apiKeys.scopes,
    })
    .from(apiKeys)
    .innerJoin(
      organizations,
      and(
        eq(apiKeys.organizationId, organizations.id),
        eq(organizations.status, "active"),
        isNull(organizations.deletedAt),
      ),
    )
    .where(eq(apiKeys.keyPrefix, getApiKeyPrefix(key)));

  let matchedFailure: ApiKeyCandidateFailure = "invalid";
  for (const candidate of candidates) {
    if (!apiKeyHashMatches(key, candidate.keyHash)) continue;

    const validated = validateApiKeyCandidate(
      { ...candidate, scopes: candidate.scopes ?? [] },
      key,
      requiredScope,
    );
    if (!validated.ok) {
      matchedFailure = validated.reason;
      continue;
    }

    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date(), updatedAt: new Date() })
      .where(eq(apiKeys.id, candidate.id));

    return {
      ok: true,
      context: {
        apiKeyId: candidate.id,
        organizationId: candidate.organizationId,
        environment: candidate.environment,
        scopes: candidate.scopes ?? [],
      },
    };
  }

  return { ok: false, reason: matchedFailure };
}
