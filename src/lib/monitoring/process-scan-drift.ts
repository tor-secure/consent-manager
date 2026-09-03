import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { scans } from "@/db/schema/scans";
import { scanResults } from "@/db/schema/scan-results";
import { trackers } from "@/db/schema/trackers";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { privacyFindings } from "@/db/schema/privacy-findings";
import { notifications } from "@/db/schema/notifications";
import { logger } from "@/lib/logger";
import { parseBannerConfig } from "@/lib/banner-config";
import {
  detectDrift,
  decideFindingUpsert,
  itemKey,
  shouldNotifyForDecision,
  type CmpSnapshot,
  type ScanItemSnapshot,
} from "@/lib/monitoring/drift-engine";
import { detectShadowTrackers } from "@/lib/monitoring/shadow-trackers";

function toScanItems(
  rows: Array<{
    identifier: string | null;
    name: string;
    type: string;
    domain: string | null;
    riskLevel: string | null;
    classificationStatus: string;
    pageUrl?: string | null;
    details?: Record<string, unknown> | null;
  }>,
): ScanItemSnapshot[] {
  const items: ScanItemSnapshot[] = [];
  for (const row of rows) {
    const identifier = itemKey(row);
    if (!identifier) continue;
    const details = row.details ?? {};
    items.push({
      identifier,
      name: row.name,
      type: row.type,
      domain: row.domain,
      riskLevel: row.riskLevel ?? "unknown",
      classificationStatus: row.classificationStatus,
      pageUrl: row.pageUrl ?? (typeof details.pageUrl === "string" ? details.pageUrl : null),
      wouldExecuteOnParse: details.wouldExecuteOnParse === true,
      cmpPurposeValue: typeof details.cmpPurposeValue === "string" ? details.cmpPurposeValue : typeof details.cmpPurpose === "string" ? details.cmpPurpose : null,
      resourceKind: typeof details.resourceKind === "string" ? details.resourceKind : row.type,
    });
  }
  return items;
}

function notificationType(findingType: string): string {
  return findingType.startsWith("shadow_") ? "scan.shadow_tracker" : "scan.privacy_drift";
}

function notificationPriority(severity: string): string {
  if (severity === "critical") return "urgent";
  if (severity === "high") return "high";
  if (severity === "medium") return "normal";
  return "low";
}

export async function loadCmpSnapshot(websiteId: string): Promise<CmpSnapshot | null> {
  const [website] = await db
    .select({
      id: websites.id,
      organizationId: websites.organizationId,
      name: websites.name,
      domain: websites.domain,
    })
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);

  if (!website) return null;

  const [published] = await db
    .select({
      policyId: consentPolicies.id,
      versionId: consentPolicyVersions.id,
      configuration: consentPolicyVersions.configuration,
    })
    .from(consentPolicies)
    .innerJoin(
      consentPolicyVersions,
      eq(consentPolicyVersions.policyId, consentPolicies.id),
    )
    .where(
      and(
        eq(consentPolicies.websiteId, website.id),
        eq(consentPolicyVersions.isPublished, true),
      ),
    )
    .orderBy(desc(consentPolicyVersions.publishedAt), desc(consentPolicyVersions.version))
    .limit(1);

  const publishedPurposeRows = published
    ? await db
        .select({ purposeId: policyPurposes.purposeId })
        .from(policyPurposes)
        .where(eq(policyPurposes.policyVersionId, published.versionId))
    : [];

  const [trackerRows, vendorRows, purposeRows, vendorPurposeRows] = await Promise.all([
    db
      .select({
        id: trackers.id,
        identifier: trackers.identifier,
        name: trackers.name,
        type: trackers.type,
        domain: trackers.domain,
        vendorId: trackers.vendorId,
        purposeId: trackers.purposeId,
        isEssential: trackers.isEssential,
        status: trackers.status,
      })
      .from(trackers)
      .where(and(eq(trackers.websiteId, website.id), isNull(trackers.deletedAt))),
    db
      .select({
        id: vendors.id,
        name: vendors.name,
        domain: vendors.domain,
        status: vendors.status,
      })
      .from(vendors)
      .where(eq(vendors.organizationId, website.organizationId)),
    db
      .select({
        id: purposes.id,
        name: purposes.name,
        key: purposes.key,
        isRequired: purposes.isRequired,
      })
      .from(purposes)
      .where(eq(purposes.organizationId, website.organizationId)),
    db
      .select({
        vendorId: vendorPurposes.vendorId,
        purposeId: vendorPurposes.purposeId,
        organizationId: vendors.organizationId,
      })
      .from(vendorPurposes)
      .innerJoin(vendors, eq(vendorPurposes.vendorId, vendors.id))
      .where(eq(vendors.organizationId, website.organizationId)),
  ]);

  const vendorPurposeIds: Record<string, string[]> = {};
  for (const row of vendorPurposeRows) {
    vendorPurposeIds[row.vendorId] ??= [];
    vendorPurposeIds[row.vendorId].push(row.purposeId);
  }

  let publishedConsentExpireDays: number | null = null;
  if (published?.configuration) {
    try {
      publishedConsentExpireDays = parseBannerConfig(published.configuration).consentExpireDays;
    } catch {
      publishedConsentExpireDays = null;
    }
  }

  return {
    organizationId: website.organizationId,
    websiteId: website.id,
    websiteName: website.name,
    websiteDomain: website.domain,
    publishedPolicyId: published?.policyId ?? null,
    publishedPolicyVersionId: published?.versionId ?? null,
    publishedPurposeIds: publishedPurposeRows.map((row) => row.purposeId),
    trackers: trackerRows,
    vendors: vendorRows,
    purposes: purposeRows,
    vendorPurposeIds,
    publishedConsentExpireDays,
  };
}

export async function persistDetectedFindings(input: {
  cmp: CmpSnapshot;
  scanId: string | null;
  findings: ReturnType<typeof detectDrift>;
}): Promise<{ created: number; updated: number; reopened: number }> {
  const counts = { created: 0, updated: 0, reopened: 0 };
  const now = new Date();

  for (const finding of input.findings) {
    const [existing] = await db
      .select({
        id: privacyFindings.id,
        fingerprint: privacyFindings.fingerprint,
        status: privacyFindings.status,
      })
      .from(privacyFindings)
      .where(
        and(
          eq(privacyFindings.organizationId, input.cmp.organizationId),
          eq(privacyFindings.fingerprint, finding.fingerprint),
        ),
      )
      .limit(1);

    const decision = decideFindingUpsert(
      existing
        ? { fingerprint: existing.fingerprint, status: existing.status as "open" | "reviewed" | "resolved" }
        : null,
    );

    if (decision === "create") {
      const [created] = await db
        .insert(privacyFindings)
        .values({
          organizationId: input.cmp.organizationId,
          websiteId: input.cmp.websiteId,
          findingType: finding.findingType,
          severity: finding.severity,
          status: "open",
          trackerId: finding.trackerId,
          vendorId: finding.vendorId,
          purposeId: finding.purposeId,
          fingerprint: finding.fingerprint,
          title: finding.title,
          details: finding.details,
          firstDetectedAt: now,
          lastDetectedAt: now,
          lastScanId: input.scanId,
        })
        .returning({ id: privacyFindings.id });
      counts.created += 1;
      if (created && shouldNotifyForDecision(decision)) {
        await db.insert(notifications).values({
          organizationId: input.cmp.organizationId,
          userId: null,
          type: notificationType(finding.findingType),
          priority: notificationPriority(finding.severity),
          title: finding.title,
          message: finding.details.whatChanged,
          resourceType: "privacy_finding",
          resourceId: created.id,
          metadata: {
            fingerprint: finding.fingerprint,
            websiteId: input.cmp.websiteId,
            findingType: finding.findingType,
            severity: finding.severity,
          },
        });
      }
      continue;
    }

    if (!existing) continue;

    await db
      .update(privacyFindings)
      .set({
        severity: finding.severity,
        title: finding.title,
        details: finding.details,
        trackerId: finding.trackerId,
        vendorId: finding.vendorId,
        purposeId: finding.purposeId,
        lastDetectedAt: now,
        lastScanId: input.scanId,
        updatedAt: now,
        ...(decision === "reopen"
          ? {
              status: "open" as const,
              resolvedAt: null,
              resolvedBy: null,
              reviewedAt: null,
              reviewedBy: null,
            }
          : {}),
      })
      .where(
        and(
          eq(privacyFindings.id, existing.id),
          eq(privacyFindings.organizationId, input.cmp.organizationId),
        ),
      );

    if (decision === "reopen") {
      counts.reopened += 1;
      await db.insert(notifications).values({
        organizationId: input.cmp.organizationId,
        userId: null,
        type: notificationType(finding.findingType),
        priority: notificationPriority(finding.severity),
        title: `Reopened: ${finding.title}`,
        message: finding.details.whatChanged,
        resourceType: "privacy_finding",
        resourceId: existing.id,
        metadata: {
          fingerprint: finding.fingerprint,
          websiteId: input.cmp.websiteId,
          findingType: finding.findingType,
          severity: finding.severity,
          reopened: true,
        },
      });
    } else {
      counts.updated += 1;
    }
  }

  return counts;
}

export async function runDriftForScan(scanId: string, websiteId: string): Promise<void> {
  const cmp = await loadCmpSnapshot(websiteId);
  if (!cmp) {
    logger.warn("Drift skipped — website not found", {
      operation: "monitoring.drift",
      scanId,
      websiteId,
    });
    return;
  }

  const latestRows = await db
    .select({
      identifier: scanResults.identifier,
      name: scanResults.name,
      type: scanResults.type,
      domain: scanResults.domain,
      riskLevel: scanResults.riskLevel,
      classificationStatus: scanResults.classificationStatus,
      pageUrl: scanResults.pageUrl,
      details: scanResults.details,
    })
    .from(scanResults)
    .where(eq(scanResults.scanId, scanId));

  const previousCandidates = await db
    .select({ id: scans.id, completedAt: scans.completedAt })
    .from(scans)
    .where(and(eq(scans.websiteId, websiteId), eq(scans.status, "completed")))
    .orderBy(desc(scans.completedAt))
    .limit(5);

  const previousId =
    previousCandidates.find((row) => row.id !== scanId)?.id ?? null;

  const previousRows = previousId
    ? await db
        .select({
          identifier: scanResults.identifier,
          name: scanResults.name,
          type: scanResults.type,
          domain: scanResults.domain,
          riskLevel: scanResults.riskLevel,
          classificationStatus: scanResults.classificationStatus,
          pageUrl: scanResults.pageUrl,
          details: scanResults.details,
        })
        .from(scanResults)
        .where(eq(scanResults.scanId, previousId))
    : null;

  const latestItems = toScanItems(latestRows);
  const findings = [
    ...detectDrift({
      latest: latestItems,
      previous: previousRows ? toScanItems(previousRows) : null,
      cmp,
      scanId,
      previousScanId: previousId,
    }),
    ...detectShadowTrackers({
      latest: latestItems,
      cmp,
      scanId,
    }),
  ];

  const counts = await persistDetectedFindings({ cmp, scanId, findings });
  logger.info("Privacy intelligence processed", {
    operation: "monitoring.drift",
    scanId,
    websiteId,
    organizationId: cmp.organizationId,
    findingCount: findings.length,
    ...counts,
  });
}
