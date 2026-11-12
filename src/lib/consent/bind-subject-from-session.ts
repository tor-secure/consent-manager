import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { consentRecords } from "@/db/schema/consent-records";
import {
  flushPendingPreferenceNotification,
} from "@/lib/consent/revocation-notification";
import {
  normalizeEmail,
  readSubjectIdentity,
  withSubjectIdentity,
} from "@/lib/consent/revocation-notification-core";
import { logger } from "@/lib/logger";

/**
 * Bind a trusted email onto a guest consentId record (metadata.subject).
 * Account ownership still uses (websiteId, subjectKey) via subject sessions;
 * this only attaches notification/identity metadata to the consent receipt.
 */
export async function bindSubjectFromClerkSession(input: {
  organizationId: string;
  websiteId: string;
  consentId: string;
  email: string;
  source?: "clerk_session" | "api_key";
}): Promise<{ bound: boolean; reason?: string }> {
  const email = normalizeEmail(input.email);
  const consentId = String(input.consentId || "").trim();
  const source = input.source === "api_key" ? "api_key" : "clerk_session";
  if (!email) return { bound: false, reason: "invalid_email" };
  if (!consentId || consentId.length > 255) return { bound: false, reason: "invalid_consent_id" };

  const [record] = await db
    .select({
      id: consentRecords.id,
      metadata: consentRecords.metadata,
      consentId: consentRecords.consentId,
    })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.organizationId, input.organizationId),
        eq(consentRecords.websiteId, input.websiteId),
        eq(consentRecords.consentId, consentId),
      ),
    )
    .limit(1);

  if (!record) {
    logger.info("Consent subject email bind skipped; consent record not found", {
      operation: "consent.subject.bind_email",
      reason: "consent_not_found",
      websiteId: input.websiteId,
      consentId,
    });
    return { bound: false, reason: "consent_not_found" };
  }

  const metadata =
    record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
      ? (record.metadata as Record<string, unknown>)
      : {};

  const existing = readSubjectIdentity(metadata);
  if (existing && existing.email === email && existing.source === source) {
    return { bound: true, reason: "already_bound" };
  }

  const verifiedAt = new Date().toISOString();
  const nextMetadata = withSubjectIdentity(metadata, {
    email,
    verifiedAt,
    source,
  });

  await db
    .update(consentRecords)
    .set({ metadata: nextMetadata, updatedAt: new Date() })
    .where(
      and(
        eq(consentRecords.id, record.id),
        eq(consentRecords.organizationId, input.organizationId),
        eq(consentRecords.websiteId, input.websiteId),
      ),
    );

  void flushPendingPreferenceNotification({
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    consentRecordId: record.id,
    consentId: record.consentId,
  }).catch(() => null);

  logger.info("Consent subject email bound to consentId", {
    operation: "consent.subject.bind_email",
    websiteId: input.websiteId,
    consentId,
    source,
  });

  return { bound: true };
}
