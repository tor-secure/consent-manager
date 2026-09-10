import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentRecords } from "@/db/schema/consent-records";
import { purposes } from "@/db/schema/purposes";
import { trackers } from "@/db/schema/trackers";
import { vendors } from "@/db/schema/vendors";
import { websites } from "@/db/schema/websites";
import {
  type ConsentEvaluationRequest,
  type ConsentEvaluationResult,
  evaluateConsentSnapshot,
} from "@/lib/consent-evaluation-core";
import { appendConsentEvent } from "@/lib/consent-engine";
import { parseChildProtectionConfig } from "@/lib/children/config";
import { loadLatestSession, sessionAllowsRestricted } from "@/lib/children/service";
import { inheritCcpaApplicability } from "@/lib/ccpa/types";
import { californiaEnforcementFromRecord } from "@/lib/ccpa/state";
import { loadCaliforniaOptOut } from "@/lib/ccpa/service";

export type ConsentEvaluationContext = {
  organizationId: string;
  websiteId: string;
  consentId: string;
};

export type LoadedConsentEvaluation = {
  result: ConsentEvaluationResult;
  recordId: string;
  policyVersionId: string;
};

export async function evaluateConsentForTenant(
  context: ConsentEvaluationContext,
  request: ConsentEvaluationRequest,
): Promise<LoadedConsentEvaluation | null> {
  const [record] = await db
    .select({
      id: consentRecords.id,
      policyVersionId: consentRecords.policyVersionId,
      status: consentRecords.status,
      expiresAt: consentRecords.expiresAt,
      withdrawnAt: consentRecords.withdrawnAt,
      childProtection: websites.childProtection,
    })
    .from(consentRecords)
    .innerJoin(
      websites,
      and(
        eq(consentRecords.websiteId, websites.id),
        eq(websites.organizationId, context.organizationId),
        eq(websites.status, "active"),
        isNull(websites.deletedAt),
      ),
    )
    .where(
      and(
        eq(consentRecords.organizationId, context.organizationId),
        eq(consentRecords.websiteId, context.websiteId),
        eq(consentRecords.consentId, context.consentId),
      ),
    )
    .limit(1);

  if (!record) return null;

  const [decisionRows, purposeRows, vendorRows, trackerRows] = await Promise.all([
    db
      .select({
        purposeId: consentDecisions.purposeId,
        vendorId: consentDecisions.vendorId,
        granted: consentDecisions.granted,
      })
      .from(consentDecisions)
      .where(eq(consentDecisions.consentRecordId, record.id))
      .orderBy(asc(consentDecisions.decidedAt)),
    db
      .select({
        id: purposes.id,
        key: purposes.key,
        isRequired: purposes.isRequired,
        status: purposes.status,
        dataCategories: purposes.dataCategories,
      })
      .from(purposes)
      .where(
        and(
          eq(purposes.organizationId, context.organizationId),
          isNull(purposes.deletedAt),
        ),
      ),
    db
      .select({
        id: vendors.id,
        domain: vendors.domain,
        status: vendors.status,
        ccpaSale: vendors.ccpaSale,
        ccpaShare: vendors.ccpaShare,
        ccpaSensitivePi: vendors.ccpaSensitivePi,
      })
      .from(vendors)
      .where(
        and(
          eq(vendors.organizationId, context.organizationId),
          isNull(vendors.deletedAt),
        ),
      ),
    db
      .select({
        id: trackers.id,
        purposeId: trackers.purposeId,
        vendorId: trackers.vendorId,
        isEssential: trackers.isEssential,
        status: trackers.status,
        ccpaSale: trackers.ccpaSale,
        ccpaShare: trackers.ccpaShare,
        ccpaSensitivePi: trackers.ccpaSensitivePi,
      })
      .from(trackers)
      .where(
        and(
          eq(trackers.websiteId, context.websiteId),
          isNull(trackers.deletedAt),
        ),
      ),
  ]);

  const tenantPurposeIds = new Set(purposeRows.map((purpose) => purpose.id));
  const tenantVendorIds = new Set(vendorRows.map((vendor) => vendor.id));
  const tenantDecisions = decisionRows.filter(
    (decision) =>
      (!decision.purposeId || tenantPurposeIds.has(decision.purposeId)) &&
      (!decision.vendorId || tenantVendorIds.has(decision.vendorId)),
  );
  const tenantTrackers = trackerRows.map((tracker) => {
    const vendor = tracker.vendorId
      ? vendorRows.find((row) => row.id === tracker.vendorId)
      : null;
    return {
      ...tracker,
      purposeId:
        tracker.purposeId && tenantPurposeIds.has(tracker.purposeId)
          ? tracker.purposeId
          : null,
      vendorId:
        tracker.vendorId && tenantVendorIds.has(tracker.vendorId)
          ? tracker.vendorId
          : null,
      ccpaSale: inheritCcpaApplicability(tracker.ccpaSale, vendor?.ccpaSale),
      ccpaShare: inheritCcpaApplicability(tracker.ccpaShare, vendor?.ccpaShare),
      ccpaSensitivePi: inheritCcpaApplicability(tracker.ccpaSensitivePi, vendor?.ccpaSensitivePi),
    };
  });

  const childConfig = parseChildProtectionConfig(record.childProtection);
  const ageRow = await loadLatestSession({
    organizationId: context.organizationId,
    websiteId: context.websiteId,
    consentId: context.consentId,
  });
  const californiaRow = await loadCaliforniaOptOut({
    organizationId: context.organizationId,
    websiteId: context.websiteId,
    consentId: context.consentId,
  });

  return {
    recordId: record.id,
    policyVersionId: record.policyVersionId,
    result: evaluateConsentSnapshot(request, {
      record,
      decisions: tenantDecisions,
      purposes: purposeRows,
      vendors: vendorRows,
      trackers: tenantTrackers,
      childProtection: {
        restrictedPurposeKeys: childConfig.restrictedPurposeKeys,
        allowRestricted: sessionAllowsRestricted(childConfig, ageRow),
      },
      california: californiaRow ? californiaEnforcementFromRecord(californiaRow) : undefined,
    }),
  };
}

export async function logConsentEvaluation({
  organizationId,
  apiKeyId,
  userId,
  requestId,
  source,
  evaluation,
  request,
}: {
  organizationId: string;
  apiKeyId?: string;
  userId?: string;
  requestId: string;
  source: "api" | "dashboard";
  evaluation: LoadedConsentEvaluation;
  request: ConsentEvaluationRequest;
}): Promise<void> {
  const counts = {
    purposes: request.purposeKeys.length,
    vendors: request.vendorDomains.length,
    trackers: request.trackerIds.length,
    dataCategories: request.dataCategories.length,
  };

  await Promise.all([
    db.insert(auditLogs).values({
      organizationId,
      userId: userId ?? null,
      action: "consent.evaluated",
      resourceType: "consent_record",
      resourceId: evaluation.recordId,
      description: `Consent enforcement evaluation ${evaluation.result.allowed ? "allowed" : "denied"}`,
      metadata: {
        requestId,
        source,
        apiKeyId: apiKeyId ?? null,
        allowed: evaluation.result.allowed,
        reasonCode: evaluation.result.reasonCode,
        consentState: evaluation.result.consentState,
        counts,
      },
    }),
    appendConsentEvent({
      consentRecordId: evaluation.recordId,
      policyVersionId: evaluation.policyVersionId,
      eventType: "consent.evaluated",
      source,
      eventData: {
        requestId,
        allowed: evaluation.result.allowed,
        reasonCode: evaluation.result.reasonCode,
        consentState: evaluation.result.consentState,
        counts,
      },
    }),
  ]);
}
