import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentRecords } from "@/db/schema/consent-records";
import { dataPrincipalRequests } from "@/db/schema/data-principal-requests";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import { websites } from "@/db/schema/websites";
import {
  buildPrivacyPreferencesUrl,
  buildRevocationDedupeKey,
  diffPreferenceChanges,
  diffRevokedDecisions,
  emailDomainHint,
  hasRevocationMailKey,
  namePreferenceChanges,
  normalizeEmail,
  readPendingPreferenceMail,
  readSubjectIdentity,
  type DecisionSnapshot,
  type PreferenceChangeItem,
  withPendingPreferenceMail,
  withRevocationMailOutcome,
  withSubjectIdentity,
} from "@/lib/consent/revocation-notification-core";
import { logger } from "@/lib/logger";
import { isNodemailerConfigured } from "@/lib/mail/send-email";
import { sendConsentRevocationEmail } from "@/lib/mail/send-consent-revocation";
import { resolvePublicAppOrigin } from "@/lib/sdk/public-origin";

export type RevocationNotifyInput = {
  organizationId: string;
  websiteId: string;
  consentRecordId: string;
  consentId: string;
  stateVersion: number;
  previous: DecisionSnapshot[];
  next: DecisionSnapshot[];
  purposeNames?: Record<string, string>;
  vendorNames?: Record<string, string>;
  revokedAt?: Date;
  timeZone?: string;
  /** When true, every previously granted item is treated as revoked (full withdraw). */
  fullWithdrawal?: boolean;
};

async function loadNameMaps(
  organizationId: string,
  items: Array<{ kind: "purpose" | "vendor"; id: string }>,
  seeded?: { purposes?: Record<string, string>; vendors?: Record<string, string> },
): Promise<{ purposes: Record<string, string>; vendors: Record<string, string> }> {
  const purposesMap = { ...(seeded?.purposes ?? {}) };
  const vendorsMap = { ...(seeded?.vendors ?? {}) };
  const purposeIds = items
    .filter((item) => item.kind === "purpose" && !purposesMap[item.id])
    .map((item) => item.id);
  const vendorIds = items
    .filter((item) => item.kind === "vendor" && !vendorsMap[item.id])
    .map((item) => item.id);

  if (purposeIds.length > 0) {
    const rows = await db
      .select({ id: purposes.id, name: purposes.name })
      .from(purposes)
      .where(and(eq(purposes.organizationId, organizationId), inArray(purposes.id, purposeIds)));
    for (const row of rows) purposesMap[row.id] = row.name;
  }
  if (vendorIds.length > 0) {
    const rows = await db
      .select({ id: vendors.id, name: vendors.name })
      .from(vendors)
      .where(and(eq(vendors.organizationId, organizationId), inArray(vendors.id, vendorIds)));
    for (const row of rows) vendorsMap[row.id] = row.name;
  }
  return { purposes: purposesMap, vendors: vendorsMap };
}

async function resolveTrustedRecipient(input: {
  organizationId: string;
  websiteId: string;
  consentId: string;
  metadata: Record<string, unknown> | null;
}): Promise<{ email: string; source: "api_key" | "dsar_verified" | "clerk_session" } | null> {
  const fromMetadata = readSubjectIdentity(input.metadata);
  if (fromMetadata) {
    return { email: fromMetadata.email, source: fromMetadata.source };
  }

  // Verified DSAR requester email only — same org/website/consentId, never admin email.
  const candidates = await db
    .select({
      requesterEmail: dataPrincipalRequests.requesterEmail,
      verificationStatus: dataPrincipalRequests.verificationStatus,
      verifiedAt: dataPrincipalRequests.verifiedAt,
    })
    .from(dataPrincipalRequests)
    .where(
      and(
        eq(dataPrincipalRequests.organizationId, input.organizationId),
        eq(dataPrincipalRequests.websiteId, input.websiteId),
        eq(dataPrincipalRequests.consentId, input.consentId),
      ),
    )
    .limit(20);

  for (const row of candidates) {
    if (row.verificationStatus !== "verified" || !row.verifiedAt) continue;
    const email = normalizeEmail(row.requesterEmail);
    if (!email) continue;
    return { email, source: "dsar_verified" };
  }

  return null;
}

async function loadRecordMetadata(input: {
  consentRecordId: string;
  organizationId: string;
  websiteId: string;
}): Promise<Record<string, unknown>> {
  const [row] = await db
    .select({ metadata: consentRecords.metadata })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.id, input.consentRecordId),
        eq(consentRecords.organizationId, input.organizationId),
        eq(consentRecords.websiteId, input.websiteId),
      ),
    )
    .limit(1);
  if (row?.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)) {
    return row.metadata as Record<string, unknown>;
  }
  return {};
}

async function claimAndPersistOutcome(input: {
  consentRecordId: string;
  organizationId: string;
  websiteId: string;
  dedupeKey: string;
  status: "sent" | "skipped" | "failed";
  reason?: string;
  claimKey: boolean;
}): Promise<boolean> {
  const metadata = await loadRecordMetadata(input);
  if (input.claimKey && hasRevocationMailKey(metadata, input.dedupeKey)) {
    return false;
  }

  const nextMetadata = withRevocationMailOutcome(metadata, {
    dedupeKey: input.dedupeKey,
    status: input.status,
    reason: input.reason,
    claimKey: input.claimKey,
  });

  await db
    .update(consentRecords)
    .set({ metadata: nextMetadata, updatedAt: new Date() })
    .where(
      and(
        eq(consentRecords.id, input.consentRecordId),
        eq(consentRecords.organizationId, input.organizationId),
        eq(consentRecords.websiteId, input.websiteId),
      ),
    );

  return true;
}

/**
 * After a successful consent commit, notify the website user of preference
 * changes (revoked and/or newly granted). Failures never throw — consent stays committed.
 */
export async function notifyConsentRevocations(input: RevocationNotifyInput): Promise<void> {
  const changeRaw = input.fullWithdrawal
    ? diffRevokedDecisions(
        input.previous,
        input.previous.map((row) => ({ ...row, granted: false })),
      ).map((item) => ({ ...item, change: "revoked" as const }))
    : diffPreferenceChanges(input.previous, input.next);

  if (changeRaw.length === 0) {
    return;
  }

  const revokedRaw = changeRaw.filter((item) => item.change === "revoked");
  const grantedRaw = changeRaw.filter((item) => item.change === "granted");

  const dedupeKey = buildRevocationDedupeKey({
    consentId: input.consentId,
    stateVersion: input.stateVersion,
    revoked: revokedRaw,
    granted: grantedRaw,
  });

  const [record] = await db
    .select({
      id: consentRecords.id,
      metadata: consentRecords.metadata,
      organizationId: consentRecords.organizationId,
      websiteId: consentRecords.websiteId,
    })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.id, input.consentRecordId),
        eq(consentRecords.organizationId, input.organizationId),
        eq(consentRecords.websiteId, input.websiteId),
      ),
    )
    .limit(1);

  if (!record) {
    logger.warn("Consent preference notification skipped; record not found for tenant", {
      operation: "consent.revocation.email",
      consentRecordId: input.consentRecordId,
      reason: "record_not_found",
    });
    return;
  }

  const metadata =
    record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
      ? (record.metadata as Record<string, unknown>)
      : {};

  if (hasRevocationMailKey(metadata, dedupeKey)) {
    logger.info("Consent preference notification skipped; duplicate", {
      operation: "consent.revocation.email",
      consentRecordId: input.consentRecordId,
      reason: "duplicate",
    });
    return;
  }

  const names = await loadNameMaps(input.organizationId, changeRaw, {
    purposes: input.purposeNames,
    vendors: input.vendorNames,
  });
  const items: PreferenceChangeItem[] = namePreferenceChanges(changeRaw, names);
  const revokedAt = input.revokedAt ?? new Date();

  const recipient = await resolveTrustedRecipient({
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    consentId: input.consentId,
    metadata,
  });

  if (!recipient) {
    // Do not claim the dedupe key — binding may succeed on a later request.
    // Queue the named changes so a successful subject bind can flush the email.
    const metadataAfterSkip = withRevocationMailOutcome(
      withPendingPreferenceMail(metadata, {
        dedupeKey,
        stateVersion: input.stateVersion,
        revokedAt: revokedAt.toISOString(),
        items,
      }),
      {
        dedupeKey,
        status: "skipped",
        reason: "missing_trusted_email",
        claimKey: false,
      },
    );
    await db
      .update(consentRecords)
      .set({ metadata: metadataAfterSkip, updatedAt: new Date() })
      .where(
        and(
          eq(consentRecords.id, record.id),
          eq(consentRecords.organizationId, input.organizationId),
          eq(consentRecords.websiteId, input.websiteId),
        ),
      );
    logger.info("Consent preference notification skipped; no trusted email", {
      operation: "consent.revocation.email",
      consentRecordId: input.consentRecordId,
      reason: "missing_trusted_email",
    });
    return;
  }

  // Persist DSAR-discovered email onto the record for future updates (tenant-scoped).
  if (recipient.source === "dsar_verified" && !readSubjectIdentity(metadata)) {
    const withSubject = withSubjectIdentity(metadata, {
      email: recipient.email,
      verifiedAt: new Date().toISOString(),
      source: "dsar_verified",
    });
    await db
      .update(consentRecords)
      .set({ metadata: withSubject, updatedAt: new Date() })
      .where(
        and(
          eq(consentRecords.id, record.id),
          eq(consentRecords.organizationId, input.organizationId),
          eq(consentRecords.websiteId, input.websiteId),
        ),
      );
  }

  if (!isNodemailerConfigured()) {
    await claimAndPersistOutcome({
      consentRecordId: record.id,
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      dedupeKey,
      status: "skipped",
      reason: "smtp_not_configured",
      claimKey: true,
    });
    logger.info("Consent revocation notification skipped; SMTP not configured", {
      operation: "consent.revocation.email",
      consentRecordId: input.consentRecordId,
      reason: "smtp_not_configured",
      recipientHint: emailDomainHint(recipient.email),
    });
    return;
  }

  // Claim before send so retries/duplicates do not double-send.
  const claimed = await claimAndPersistOutcome({
    consentRecordId: record.id,
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    dedupeKey,
    status: "sent",
    reason: "sending",
    claimKey: true,
  });
  if (!claimed) {
    logger.info("Consent revocation notification skipped; duplicate claim", {
      operation: "consent.revocation.email",
      consentRecordId: input.consentRecordId,
      reason: "duplicate",
    });
    return;
  }

  const [website] = await db
    .select({
      name: websites.name,
      siteKey: websites.siteKey,
    })
    .from(websites)
    .where(
      and(
        eq(websites.id, input.websiteId),
        eq(websites.organizationId, input.organizationId),
      ),
    )
    .limit(1);

  if (!website) {
    await claimAndPersistOutcome({
      consentRecordId: record.id,
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      dedupeKey,
      status: "failed",
      reason: "website_not_found",
      claimKey: false,
    });
    return;
  }

  const appOrigin =
    resolvePublicAppOrigin({
      envOrigin: process.env.CMP_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "",
    }) || "https://www.consentguru.com";
  const preferencesUrl = buildPrivacyPreferencesUrl({
    appOrigin,
    siteKey: website.siteKey,
  });

  try {
    await sendConsentRevocationEmail({
      to: recipient.email,
      websiteName: website.name,
      revokedAt,
      timeZone: input.timeZone ?? "UTC",
      items,
      preferencesUrl,
      appOrigin,
    });

    const sentMeta = withPendingPreferenceMail(
      await loadRecordMetadata({
        consentRecordId: record.id,
        organizationId: input.organizationId,
        websiteId: input.websiteId,
      }),
      null,
    );
    await db
      .update(consentRecords)
      .set({
        metadata: withRevocationMailOutcome(sentMeta, {
          dedupeKey,
          status: "sent",
          claimKey: false,
        }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(consentRecords.id, record.id),
          eq(consentRecords.organizationId, input.organizationId),
          eq(consentRecords.websiteId, input.websiteId),
        ),
      );

    logger.info("Consent revocation confirmation email sent", {
      operation: "consent.revocation.email",
      consentRecordId: input.consentRecordId,
      itemCount: items.length,
      recipientHint: emailDomainHint(recipient.email),
      source: recipient.source,
    });
  } catch (error) {
    await claimAndPersistOutcome({
      consentRecordId: record.id,
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      dedupeKey,
      status: "failed",
      reason: "smtp_send_failed",
      claimKey: false,
    });
    logger.error("Consent revocation confirmation email failed", {
      operation: "consent.revocation.email",
      consentRecordId: input.consentRecordId,
      recipientHint: emailDomainHint(recipient.email),
      error,
    });
  }
}

/**
 * After a trusted email is bound, send any preference-change email that was
 * skipped earlier for missing_trusted_email.
 */
export async function flushPendingPreferenceNotification(input: {
  organizationId: string;
  websiteId: string;
  consentRecordId: string;
  consentId: string;
}): Promise<void> {
  const [record] = await db
    .select({
      id: consentRecords.id,
      metadata: consentRecords.metadata,
      stateVersion: consentRecords.stateVersion,
    })
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.id, input.consentRecordId),
        eq(consentRecords.organizationId, input.organizationId),
        eq(consentRecords.websiteId, input.websiteId),
      ),
    )
    .limit(1);

  if (!record) return;

  const metadata =
    record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
      ? (record.metadata as Record<string, unknown>)
      : {};

  const pending = readPendingPreferenceMail(metadata);
  if (!pending) return;

  if (hasRevocationMailKey(metadata, pending.dedupeKey)) {
    await db
      .update(consentRecords)
      .set({
        metadata: withPendingPreferenceMail(metadata, null),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(consentRecords.id, record.id),
          eq(consentRecords.organizationId, input.organizationId),
          eq(consentRecords.websiteId, input.websiteId),
        ),
      );
    return;
  }

  const recipient = await resolveTrustedRecipient({
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    consentId: input.consentId,
    metadata,
  });
  if (!recipient) return;

  if (!isNodemailerConfigured()) {
    logger.info("Pending preference notification skipped; SMTP not configured", {
      operation: "consent.revocation.email",
      consentRecordId: input.consentRecordId,
      reason: "smtp_not_configured",
    });
    return;
  }

  const claimed = await claimAndPersistOutcome({
    consentRecordId: record.id,
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    dedupeKey: pending.dedupeKey,
    status: "sent",
    reason: "sending_pending",
    claimKey: true,
  });
  if (!claimed) return;

  // Clear pending after claim so retries don't double-queue.
  const afterClaim = await loadRecordMetadata({
    consentRecordId: record.id,
    organizationId: input.organizationId,
    websiteId: input.websiteId,
  });
  await db
    .update(consentRecords)
    .set({
      metadata: withPendingPreferenceMail(afterClaim, null),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(consentRecords.id, record.id),
        eq(consentRecords.organizationId, input.organizationId),
        eq(consentRecords.websiteId, input.websiteId),
      ),
    );

  const [website] = await db
    .select({
      name: websites.name,
      siteKey: websites.siteKey,
    })
    .from(websites)
    .where(
      and(
        eq(websites.id, input.websiteId),
        eq(websites.organizationId, input.organizationId),
      ),
    )
    .limit(1);

  if (!website) {
    await claimAndPersistOutcome({
      consentRecordId: record.id,
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      dedupeKey: pending.dedupeKey,
      status: "failed",
      reason: "website_not_found",
      claimKey: false,
    });
    return;
  }

  const appOrigin =
    resolvePublicAppOrigin({
      envOrigin: process.env.CMP_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || "",
    }) || "https://www.consentguru.com";
  const preferencesUrl = buildPrivacyPreferencesUrl({
    appOrigin,
    siteKey: website.siteKey,
  });

  try {
    await sendConsentRevocationEmail({
      to: recipient.email,
      websiteName: website.name,
      revokedAt: new Date(pending.revokedAt),
      timeZone: "UTC",
      items: pending.items,
      preferencesUrl,
      appOrigin,
    });
    await claimAndPersistOutcome({
      consentRecordId: record.id,
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      dedupeKey: pending.dedupeKey,
      status: "sent",
      claimKey: false,
    });
    logger.info("Pending consent preference confirmation email sent", {
      operation: "consent.revocation.email",
      consentRecordId: input.consentRecordId,
      itemCount: pending.items.length,
      recipientHint: emailDomainHint(recipient.email),
      source: recipient.source,
      reason: "flushed_after_bind",
    });
  } catch (error) {
    await claimAndPersistOutcome({
      consentRecordId: record.id,
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      dedupeKey: pending.dedupeKey,
      status: "failed",
      reason: "smtp_send_failed",
      claimKey: false,
    });
    logger.error("Pending consent preference confirmation email failed", {
      operation: "consent.revocation.email",
      consentRecordId: input.consentRecordId,
      recipientHint: emailDomainHint(recipient.email),
      error,
    });
  }
}

export async function loadDecisionSnapshots(
  consentRecordId: string,
): Promise<DecisionSnapshot[]> {
  const rows = await db
    .select({
      purposeId: consentDecisions.purposeId,
      vendorId: consentDecisions.vendorId,
      granted: consentDecisions.granted,
    })
    .from(consentDecisions)
    .where(eq(consentDecisions.consentRecordId, consentRecordId));

  return rows.map((row) => ({
    purposeId: row.purposeId,
    vendorId: row.vendorId,
    granted: row.granted,
  }));
}
