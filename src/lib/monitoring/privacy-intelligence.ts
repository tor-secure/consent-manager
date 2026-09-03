import "server-only";

import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { scans } from "@/db/schema/scans";
import { scanResults } from "@/db/schema/scan-results";
import { trackers } from "@/db/schema/trackers";
import { vendors } from "@/db/schema/vendors";
import { consentRecords } from "@/db/schema/consent-records";
import { privacyFindings } from "@/db/schema/privacy-findings";
import { loadCmpSnapshot } from "@/lib/monitoring/process-scan-drift";
import { calculateConsentQualityScore, type ConsentQualityInput, type ConsentQualityScore } from "@/lib/monitoring/consent-quality";
import { buildPageIntelligence, type PageIntelligence } from "@/lib/monitoring/page-intelligence";
import { isFirstPartyDomain, itemKey, type FindingSeverity, type ScanItemSnapshot } from "@/lib/monitoring/drift-engine";
import { aggregatePrivacyRisk } from "@/lib/monitoring/privacy-risk";
import { isSchemaMismatchError } from "@/lib/schema-mismatch";

export async function computeWebsiteQualityScore(websiteId: string): Promise<{
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  score: ConsentQualityScore;
} | null> {
  try {
    return await computeWebsiteQualityScoreUnsafe(websiteId);
  } catch (error) {
    if (isSchemaMismatchError(error)) return null;
    throw error;
  }
}

async function computeWebsiteQualityScoreUnsafe(websiteId: string): Promise<{
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  score: ConsentQualityScore;
} | null> {
  const loaded = await loadQualityScoreInputUnsafe(websiteId);
  if (!loaded) return null;
  return {
    websiteId: loaded.websiteId,
    websiteName: loaded.websiteName,
    websiteDomain: loaded.websiteDomain,
    score: calculateConsentQualityScore(loaded.input),
  };
}

export async function loadQualityScoreInput(websiteId: string) {
  try {
    return await loadQualityScoreInputUnsafe(websiteId);
  } catch (error) {
    if (isSchemaMismatchError(error)) return null;
    throw error;
  }
}

async function loadQualityScoreInputUnsafe(websiteId: string): Promise<{
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  input: ConsentQualityInput;
  published: boolean;
  openFindingCount: number;
} | null> {
  const cmp = await loadCmpSnapshot(websiteId);
  if (!cmp) return null;

  const [latestScan] = await db
    .select({ id: scans.id, completedAt: scans.completedAt })
    .from(scans)
    .where(and(eq(scans.websiteId, websiteId), eq(scans.status, "completed")))
    .orderBy(desc(scans.completedAt))
    .limit(1);

  const [scanRows, openFindings, consentCountRows] = await Promise.all([
    latestScan
      ? db
          .select({
            identifier: scanResults.identifier,
            name: scanResults.name,
            type: scanResults.type,
            domain: scanResults.domain,
            classificationStatus: scanResults.classificationStatus,
          })
          .from(scanResults)
          .where(eq(scanResults.scanId, latestScan.id))
      : Promise.resolve([]),
    db
      .select({
        severity: privacyFindings.severity,
        findingType: privacyFindings.findingType,
      })
      .from(privacyFindings)
      .where(
        and(
          eq(privacyFindings.organizationId, cmp.organizationId),
          eq(privacyFindings.websiteId, websiteId),
          inArray(privacyFindings.status, ["open", "reviewed"]),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.organizationId, cmp.organizationId),
          eq(consentRecords.websiteId, websiteId),
        ),
      ),
  ]);

  const thirdParty = scanRows.filter((row) => !isFirstPartyDomain(row.domain, cmp.websiteDomain));
  const trackerKeys = new Set(
    cmp.trackers.filter((row) => row.status === "active").map((row) => (row.identifier ?? "").toLowerCase()),
  );
  const scanItemsWithActiveTracker = thirdParty.filter((row) => trackerKeys.has(itemKey(row))).length;
  const nonEssential = cmp.trackers.filter((row) => row.status === "active" && !row.isEssential);
  const consentControlled = nonEssential.filter((row) => row.vendorId || row.purposeId);
  const enforcible = consentControlled.filter((row) => Boolean(row.domain || row.identifier));

  return {
    websiteId: cmp.websiteId,
    websiteName: cmp.websiteName,
    websiteDomain: cmp.websiteDomain,
    published: Boolean(cmp.publishedPolicyVersionId),
    openFindingCount: openFindings.length,
    input: {
      thirdPartyScanItems: thirdParty.length,
      scanItemsWithActiveTracker,
      nonEssentialTrackers: nonEssential.length,
      trackersWithVendor: nonEssential.filter((row) => row.vendorId).length,
      trackersWithPurpose: nonEssential.filter((row) => row.purposeId).length,
      consentControlledTrackers: consentControlled.length,
      enforcibleTrackers: enforcible.length,
      openFindings: openFindings.map((row) => ({
        severity: row.severity as FindingSeverity,
        findingType: row.findingType,
      })),
      hasPublishedPolicy: Boolean(cmp.publishedPolicyVersionId),
      consentExpireDays: cmp.publishedConsentExpireDays ?? null,
      consentRecordCount: Number(consentCountRows[0]?.count ?? 0),
      lastCompletedScanAt: latestScan?.completedAt ?? null,
    },
  };
}

export async function loadPageIntelligence(websiteId: string): Promise<PageIntelligence[] | null> {
  try {
    return await loadPageIntelligenceUnsafe(websiteId);
  } catch (error) {
    if (isSchemaMismatchError(error)) return [];
    throw error;
  }
}

async function loadPageIntelligenceUnsafe(websiteId: string): Promise<PageIntelligence[] | null> {
  const cmp = await loadCmpSnapshot(websiteId);
  if (!cmp) return null;

  const [latestScan] = await db
    .select({ id: scans.id })
    .from(scans)
    .where(and(eq(scans.websiteId, websiteId), eq(scans.status, "completed")))
    .orderBy(desc(scans.completedAt))
    .limit(1);

  if (!latestScan) return [];

  const [items, findings] = await Promise.all([
    db
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
      .where(eq(scanResults.scanId, latestScan.id)),
    db
      .select({
        findingType: privacyFindings.findingType,
        severity: privacyFindings.severity,
        details: privacyFindings.details,
        fingerprint: privacyFindings.fingerprint,
      })
      .from(privacyFindings)
      .where(
        and(
          eq(privacyFindings.organizationId, cmp.organizationId),
          eq(privacyFindings.websiteId, websiteId),
          inArray(privacyFindings.status, ["open", "reviewed"]),
        ),
      ),
  ]);

  const snapshots: ScanItemSnapshot[] = items.map((row) => ({
    identifier: itemKey(row) || row.name,
    name: row.name,
    type: row.type,
    domain: row.domain,
    riskLevel: row.riskLevel ?? "unknown",
    classificationStatus: row.classificationStatus,
    pageUrl: row.pageUrl,
  }));

  return buildPageIntelligence({
    websiteDomain: cmp.websiteDomain,
    items: snapshots,
    trackers: cmp.trackers,
    vendorNamesById: Object.fromEntries(cmp.vendors.map((row) => [row.id, row.name])),
    purposeNamesById: Object.fromEntries(cmp.purposes.map((row) => [row.id, row.name])),
    purposeRequiredById: Object.fromEntries(cmp.purposes.map((row) => [row.id, row.isRequired])),
    findings: findings.map((row) => ({
      findingType: row.findingType,
      severity: row.severity,
      detailsPageUrl: row.details.pageUrl ?? null,
      subjectKey: row.details.subjectKey,
    })),
  });
}

export async function loadOrgRiskSnapshot(organizationId: string, filters: {
  websiteId?: string;
  severity?: string;
  findingType?: string;
  status?: string;
  from?: Date;
  to?: Date;
}) {
  const orgSites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(and(eq(websites.organizationId, organizationId), isNull(websites.deletedAt)));

  const conditions = [eq(privacyFindings.organizationId, organizationId)];
  if (filters.websiteId) conditions.push(eq(privacyFindings.websiteId, filters.websiteId));
  if (filters.severity) conditions.push(eq(privacyFindings.severity, filters.severity));
  if (filters.findingType) conditions.push(eq(privacyFindings.findingType, filters.findingType));
  if (filters.status) conditions.push(eq(privacyFindings.status, filters.status));
  if (filters.from) conditions.push(gte(privacyFindings.lastDetectedAt, filters.from));
  if (filters.to) conditions.push(sql`${privacyFindings.lastDetectedAt} <= ${filters.to}`);

  const [findings, recentResolved] = await Promise.all([
    db
      .select({
        id: privacyFindings.id,
        websiteId: privacyFindings.websiteId,
        findingType: privacyFindings.findingType,
        severity: privacyFindings.severity,
        status: privacyFindings.status,
        title: privacyFindings.title,
        trackerId: privacyFindings.trackerId,
        vendorId: privacyFindings.vendorId,
        firstDetectedAt: privacyFindings.firstDetectedAt,
        lastDetectedAt: privacyFindings.lastDetectedAt,
        resolvedAt: privacyFindings.resolvedAt,
        details: privacyFindings.details,
      })
      .from(privacyFindings)
      .where(and(...conditions))
      .orderBy(desc(privacyFindings.lastDetectedAt))
      .limit(300),
    db
      .select({
        id: privacyFindings.id,
        title: privacyFindings.title,
        resolvedAt: privacyFindings.resolvedAt,
        websiteId: privacyFindings.websiteId,
      })
      .from(privacyFindings)
      .where(
        and(
          eq(privacyFindings.organizationId, organizationId),
          eq(privacyFindings.status, "resolved"),
        ),
      )
      .orderBy(desc(privacyFindings.resolvedAt))
      .limit(8),
  ]);

  const aggregated = aggregatePrivacyRisk(findings);
  const qualityTargets = filters.websiteId
    ? orgSites.filter((site) => site.id === filters.websiteId)
    : orgSites;

  const [trackerNames, vendorNames, qualityRows] = await Promise.all([
    aggregated.topTrackerIds.length
      ? db
          .select({ id: trackers.id, name: trackers.name })
          .from(trackers)
          .innerJoin(websites, eq(trackers.websiteId, websites.id))
          .where(
            and(
              eq(websites.organizationId, organizationId),
              inArray(trackers.id, aggregated.topTrackerIds),
            ),
          )
      : Promise.resolve([]),
    aggregated.topVendorIds.length
      ? db.select({ id: vendors.id, name: vendors.name }).from(vendors).where(
          and(eq(vendors.organizationId, organizationId), inArray(vendors.id, aggregated.topVendorIds)),
        )
      : Promise.resolve([]),
    Promise.all(qualityTargets.map((site) => computeWebsiteQualityScore(site.id))),
  ]);

  const siteById = new Map(orgSites.map((site) => [site.id, site]));

  return {
    websites: orgSites,
    overallStatus: aggregated.overallStatus,
    bySeverity: aggregated.bySeverity,
    unresolvedCount: aggregated.unresolvedCount,
    newFindings: aggregated.newFindings,
    affectedWebsites: aggregated.affectedWebsiteIds
      .map((id) => siteById.get(id))
      .filter((site): site is (typeof orgSites)[number] => Boolean(site)),
    findings: findings.map((row) => ({
      ...row,
      websiteName: siteById.get(row.websiteId)?.name ?? "Website",
      websiteDomain: siteById.get(row.websiteId)?.domain ?? "",
    })),
    recentResolved: recentResolved.map((row) => ({
      ...row,
      websiteName: siteById.get(row.websiteId)?.name ?? "Website",
    })),
    topTrackers: trackerNames.map((row) => ({
      name: row.name,
      count: aggregated.trackerCounts.get(row.id) ?? 0,
    })),
    topVendors: vendorNames.map((row) => ({
      name: row.name,
      count: aggregated.vendorCounts.get(row.id) ?? 0,
    })),
    qualityScores: qualityRows.filter((row): row is NonNullable<typeof row> => Boolean(row)),
  };
}