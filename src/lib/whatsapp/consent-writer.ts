import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { after } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentEvidenceSnapshots } from "@/db/schema/consent-evidence-snapshots";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentRecords } from "@/db/schema/consent-records";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { purposes } from "@/db/schema/purposes";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { vendors } from "@/db/schema/vendors";
import { parseBannerConfig } from "@/lib/banner-config";
import {
  appendConsentEvent,
  buildDecisionRows,
  computeExpiry,
  deriveOverallStatus,
  generateConsentId,
  type ConsentSubmission,
} from "@/lib/consent-engine";
import {
  createConsentCryptoProof,
  createHistoricalConsentEvidenceProof,
} from "@/lib/consent-proof";
import { logger } from "@/lib/logger";
import {
  canonicalizePolicyNoticeSnapshot,
  issuePolicyContext,
  type PolicyNoticeSnapshot,
} from "@/lib/policy-context";

export const WHATSAPP_CONSENT_SOURCE = "whatsapp";

export type WhatsAppConsentWriteInput = {
  organizationId: string;
  websiteId: string;
  siteKey: string;
  policyId: string;
  policyVersionId: string;
  policyVersionNumber: number;
  jurisdiction: string;
  locale: string;
  noticeHash: string;
  noticeSnapshot: PolicyNoticeSnapshot;
  phoneHash: string;
  phoneLast4: string;
  challengeId: string;
  otpMessageId: string | null;
  templateName: string;
  submission: ConsentSubmission;
};

export type WhatsAppConsentWriteResult = {
  consentRecordId: string;
  consentId: string;
  status: string;
  stateVersion: number;
  consentedAt: Date;
  expiresAt: Date;
  evidenceSnapshotId: string;
  decisions: Array<{ purposeId: string | null; vendorId: string | null; granted: boolean }>;
};

/**
 * Writes a WhatsApp-sourced consent record using the same tables and proof
 * format as the website SDK path. It is only reachable after a verified OTP.
 * The public SDK endpoint is untouched and still records source "web".
 */
export async function writeWhatsAppConsent(
  input: WhatsAppConsentWriteInput,
): Promise<WhatsAppConsentWriteResult> {
  const [version] = await db
    .select({
      id: consentPolicyVersions.id,
      version: consentPolicyVersions.version,
      policyId: consentPolicyVersions.policyId,
      configuration: consentPolicyVersions.configuration,
    })
    .from(consentPolicyVersions)
    .where(
      and(
        eq(consentPolicyVersions.id, input.policyVersionId),
        eq(consentPolicyVersions.policyId, input.policyId),
        eq(consentPolicyVersions.version, input.policyVersionNumber),
      ),
    )
    .limit(1);
  if (!version) throw new Error("Policy version no longer exists");

  const bannerConfig = parseBannerConfig(
    (version.configuration ?? {}) as Record<string, unknown>,
  );

  const versionPurposes = await db
    .select({
      id: purposes.id,
      key: purposes.key,
      name: purposes.name,
      isRequired: purposes.isRequired,
    })
    .from(policyPurposes)
    .innerJoin(purposes, eq(policyPurposes.purposeId, purposes.id))
    .where(eq(policyPurposes.policyVersionId, version.id));
  const purposeIds = versionPurposes.map((row) => row.id);
  const requiredPurposeIds = new Set(versionPurposes.filter((row) => row.isRequired).map((row) => row.id));

  const vendorRows =
    purposeIds.length > 0
      ? await db
          .select({ id: vendors.id })
          .from(vendorPurposes)
          .innerJoin(vendors, eq(vendorPurposes.vendorId, vendors.id))
          .where(inArray(vendorPurposes.purposeId, purposeIds))
      : [];
  const vendorIds = [...new Set(vendorRows.map((row) => row.id))];

  const decisionRows = buildDecisionRows(input.submission, purposeIds, vendorIds, requiredPurposeIds);
  const overallStatus = deriveOverallStatus(decisionRows);
  const now = new Date();
  const expiresAt = computeExpiry(bannerConfig.consentExpireDays);
  const consentId = generateConsentId();
  const submissionId = randomUUID();

  // Fresh signed context over the snapshot captured when the OTP was sent.
  // The notice hash must match what the person was shown.
  const signed = issuePolicyContext({
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    siteKey: input.siteKey,
    policyId: version.policyId,
    policyVersionId: version.id,
    policyVersionNumber: version.version,
    jurisdiction: input.jurisdiction,
    locale: input.locale,
    variantId: null,
    noticeSnapshot: input.noticeSnapshot,
  });
  if (signed.claims.noticeHash !== input.noticeHash) {
    throw new Error("Notice snapshot does not match the stored notice hash");
  }
  const policyContext = signed.claims;

  const requestHash = createHash("sha256")
    .update(
      canonicalizePolicyNoticeSnapshot({
        websiteId: input.websiteId,
        challengeId: input.challengeId,
        policyVersionId: version.id,
        noticeHash: input.noticeHash,
        submission: input.submission,
      }),
      "utf8",
    )
    .digest("hex");

  const purposeKeys = versionPurposes.map((row) => row.key).sort();
  const purposeNames = versionPurposes.map((row) => row.name).sort();
  const presentedBanner = input.noticeSnapshot.bannerConfig;
  const presentedText = (key: string) =>
    typeof presentedBanner[key] === "string" ? (presentedBanner[key] as string) : "";

  const evidenceMetadata: Record<string, unknown> = {
    policyId: version.policyId,
    policyVersionId: version.id,
    policyVersionNumber: version.version,
    policyContextId: policyContext.contextId,
    noticeHash: input.noticeHash,
    noticeTitle: presentedText("title"),
    noticeDescription: presentedText("description"),
    noticeLanguage: input.locale,
    bannerLayout: presentedBanner.layout ?? bannerConfig.layout,
    bannerPosition: presentedBanner.position ?? bannerConfig.position,
    purposeCount: versionPurposes.length,
    vendorCount: vendorIds.length,
    purposeKeys,
    purposeNames,
    consentExpireDays: bannerConfig.consentExpireDays,
    defaultConsent: bannerConfig.defaultConsent,
    choice: input.submission.choice,
    channel: WHATSAPP_CONSENT_SOURCE,
    whatsapp: {
      challengeId: input.challengeId,
      otpMessageId: input.otpMessageId,
      templateName: input.templateName,
      phoneLast4: input.phoneLast4,
      verifiedBy: "otp",
    },
    capturedAt: now.toISOString(),
    cryptoProof: createConsentCryptoProof(
      {
        v: 1,
        consentId,
        websiteId: input.websiteId,
        policyVersionId: version.id,
        status: overallStatus,
        choice: input.submission.choice,
        jurisdiction: input.jurisdiction,
        decisions: decisionRows.map((row) => ({
          purposeId: row.purposeId,
          vendorId: row.vendorId,
          granted: row.granted,
        })),
        consentedAt: now.toISOString(),
      },
      now,
    ),
  };

  const evidenceDecisions = decisionRows.map((row) => ({
    purposeId: row.purposeId,
    vendorId: row.vendorId,
    granted: row.granted,
    decision: row.decision,
    decidedAt: row.decidedAt.toISOString(),
  }));
  const signals = {
    tcString: null,
    gppString: null,
    parsedSections: {},
    hash: createHash("sha256").update("\n").digest("hex"),
    gvlVersion: null,
    applicableSections: [],
    generatedByServer: true,
    channel: WHATSAPP_CONSENT_SOURCE,
  };
  const historicalPayload = {
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    consentId,
    policyId: version.policyId,
    policyVersionId: version.id,
    policyVersionNumber: version.version,
    policyContextId: policyContext.contextId,
    jurisdiction: input.jurisdiction,
    locale: input.locale,
    noticeHash: input.noticeHash,
    noticeSnapshot: input.noticeSnapshot,
    choice: input.submission.choice,
    status: overallStatus,
    source: WHATSAPP_CONSENT_SOURCE,
    decisions: evidenceDecisions,
    consentedAt: now.toISOString(),
  };
  const proof = createHistoricalConsentEvidenceProof(historicalPayload);

  let savedRecord: typeof consentRecords.$inferSelect | null = null;
  let evidenceSnapshotId = "";
  await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(consentRecords)
      .values({
        organizationId: input.organizationId,
        websiteId: input.websiteId,
        policyVersionId: version.id,
        consentId,
        visitorId: input.phoneHash,
        jurisdiction: input.jurisdiction,
        status: overallStatus,
        source: WHATSAPP_CONSENT_SOURCE,
        consentedAt: now,
        expiresAt,
        metadata: evidenceMetadata,
      })
      .returning();
    savedRecord = inserted;

    if (decisionRows.length > 0) {
      await tx.insert(consentDecisions).values(
        decisionRows.map((row) => ({
          consentRecordId: inserted.id,
          purposeId: row.purposeId,
          vendorId: row.vendorId,
          decision: row.decision,
          granted: row.granted,
          decidedAt: row.decidedAt,
        })),
      );
    }

    const [evidence] = await tx
      .insert(consentEvidenceSnapshots)
      .values({
        organizationId: input.organizationId,
        websiteId: input.websiteId,
        policyId: version.policyId,
        policyVersionId: version.id,
        policyVersionNumber: version.version,
        consentRecordId: inserted.id,
        consentId,
        submissionId,
        requestHash,
        policyContextId: policyContext.contextId,
        jurisdiction: input.jurisdiction,
        locale: input.locale,
        variantId: null,
        noticeHash: input.noticeHash,
        choice: input.submission.choice,
        status: overallStatus,
        stateVersion: inserted.stateVersion,
        source: WHATSAPP_CONSENT_SOURCE,
        policyContext,
        noticeSnapshot: input.noticeSnapshot,
        decisions: evidenceDecisions,
        signals,
        evidenceHash: proof.hash,
        evidenceSignature: proof.signature,
        consentedAt: now,
      })
      .returning({ id: consentEvidenceSnapshots.id });
    evidenceSnapshotId = evidence.id;
  });

  const record = savedRecord as typeof consentRecords.$inferSelect | null;
  if (!record) throw new Error("Consent record was not saved");

  after(() =>
    appendConsentEvent({
      consentRecordId: record.id,
      policyVersionId: version.id,
      eventType: "consent.created",
      source: WHATSAPP_CONSENT_SOURCE,
      eventData: {
        choice: input.submission.choice,
        status: overallStatus,
        decisionCount: decisionRows.length,
        policyVersionNumber: version.version,
        policyContextId: policyContext.contextId,
        noticeHash: input.noticeHash,
        purposeKeys,
        channel: WHATSAPP_CONSENT_SOURCE,
        challengeId: input.challengeId,
      },
    }).catch((error) => {
      logger.error("WhatsApp consent event append failed", {
        operation: "whatsapp.consent.event",
        consentRecordId: record.id,
        error,
      });
    }),
  );

  return {
    consentRecordId: record.id,
    consentId,
    status: overallStatus,
    stateVersion: record.stateVersion,
    consentedAt: now,
    expiresAt,
    evidenceSnapshotId,
    decisions: decisionRows.map((row) => ({
      purposeId: row.purposeId,
      vendorId: row.vendorId,
      granted: row.granted,
    })),
  };
}
