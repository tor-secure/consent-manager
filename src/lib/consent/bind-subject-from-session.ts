import "server-only";

import { and, eq } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";

import { db } from "@/db";
import { consentRecords } from "@/db/schema/consent-records";
import { flushPendingPreferenceNotification } from "@/lib/consent/revocation-notification";
import {
  emailDomainHint,
  normalizeEmail,
  readSubjectIdentity,
  withSubjectIdentity,
} from "@/lib/consent/revocation-notification-core";
import { logger } from "@/lib/logger";

/**
 * Bind the signed-in Clerk user's verified primary email to a consent record
 * they already hold (consentId in the browser).
 *
 * Trust model: Clerk session + verified primary email + possession of consentId.
 * Never trusts a browser-supplied email address.
 */
export async function bindSubjectFromClerkSession(input: {
  organizationId: string;
  websiteId: string;
  consentId: string;
}): Promise<{ bound: boolean; reason?: string }> {
  const { userId } = await auth();
  if (!userId) {
    logger.info("Consent subject bind skipped", {
      operation: "consent.subject.clerk_session",
      reason: "not_signed_in",
      websiteId: input.websiteId,
    });
    return { bound: false, reason: "not_signed_in" };
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    logger.info("Consent subject bind skipped", {
      operation: "consent.subject.clerk_session",
      reason: "clerk_user_missing",
      websiteId: input.websiteId,
    });
    return { bound: false, reason: "clerk_user_missing" };
  }

  const primary = clerkUser.emailAddresses.find(
    (row) => row.id === clerkUser.primaryEmailAddressId,
  );
  if (!primary || primary.verification?.status !== "verified") {
    logger.info("Consent subject bind skipped", {
      operation: "consent.subject.clerk_session",
      reason: "email_unverified",
      websiteId: input.websiteId,
    });
    return { bound: false, reason: "email_unverified" };
  }

  const email = normalizeEmail(primary.emailAddress);
  if (!email) {
    logger.info("Consent subject bind skipped", {
      operation: "consent.subject.clerk_session",
      reason: "invalid_email",
      websiteId: input.websiteId,
    });
    return { bound: false, reason: "invalid_email" };
  }

  const [record] = await db
    .select({
      id: consentRecords.id,
      metadata: consentRecords.metadata,
    })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.consentId, input.consentId),
        eq(consentRecords.websiteId, input.websiteId),
        eq(consentRecords.organizationId, input.organizationId),
      ),
    )
    .limit(1);

  if (!record) {
    logger.info("Consent subject bind skipped", {
      operation: "consent.subject.clerk_session",
      reason: "consent_not_found",
      websiteId: input.websiteId,
      consentId: input.consentId,
    });
    return { bound: false, reason: "consent_not_found" };
  }

  const previous =
    record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
      ? (record.metadata as Record<string, unknown>)
      : {};

  const existing = readSubjectIdentity(previous);
  if (existing?.email === email) {
    await flushPendingPreferenceNotification({
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      consentRecordId: record.id,
      consentId: input.consentId,
    }).catch(() => null);
    return { bound: true, reason: "already_bound" };
  }

  const nextMetadata = withSubjectIdentity(previous, {
    email,
    verifiedAt: new Date().toISOString(),
    source: "clerk_session",
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

  logger.info("Consent subject bound from Clerk session", {
    operation: "consent.subject.clerk_session",
    consentRecordId: record.id,
    websiteId: input.websiteId,
    recipientHint: emailDomainHint(email),
  });

  await flushPendingPreferenceNotification({
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    consentRecordId: record.id,
    consentId: input.consentId,
  }).catch(() => null);

  return { bound: true };
}
