import "server-only";

import { cache } from "react";
import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { trackers } from "@/db/schema/trackers";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import { loadConsentAnalytics } from "@/lib/analytics/queries";

function countOf(rows: { count: number }[]) {
  return Number(rows[0]?.count ?? 0);
}

export const loadHomeDashboardCounts = cache(async (organizationId: string) => {
  const orgWebsiteIds = db
    .select({ id: websites.id })
    .from(websites)
    .where(eq(websites.organizationId, organizationId));

  const [
    websiteRows,
    consentStatusTotals,
    trackerRows,
    policyRows,
    purposeRows,
    publishedRows,
    vendorRows,
    firstWebsiteRows,
    unpublishedPolicyRows,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(websites)
      .where(eq(websites.organizationId, organizationId)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        accepted: sql<number>`count(*) filter (where ${consentRecords.status} = 'accepted')::int`,
        rejected: sql<number>`count(*) filter (where ${consentRecords.status} = 'rejected')::int`,
        partial: sql<number>`count(*) filter (where ${consentRecords.status} = 'partial')::int`,
        withdrawn: sql<number>`count(*) filter (where ${consentRecords.status} = 'withdrawn')::int`,
        pending: sql<number>`count(*) filter (where ${consentRecords.status} = 'pending')::int`,
      })
      .from(consentRecords)
      .where(eq(consentRecords.organizationId, organizationId)),
    db
      .select({ count: count() })
      .from(trackers)
      .where(inArray(trackers.websiteId, orgWebsiteIds)),
    db
      .select({ count: count() })
      .from(consentPolicies)
      .where(inArray(consentPolicies.websiteId, orgWebsiteIds)),
    db
      .select({ count: count() })
      .from(purposes)
      .where(eq(purposes.organizationId, organizationId)),
    db
      .select({ count: count() })
      .from(consentPolicyVersions)
      .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
      .where(
        and(
          inArray(consentPolicies.websiteId, orgWebsiteIds),
          eq(consentPolicyVersions.isPublished, true),
        ),
      ),
    db
      .select({
        total: sql<number>`count(*)::int`,
        mapped: sql<number>`count(*) filter (where ${vendors.role} <> 'unknown')::int`,
        unknown: sql<number>`count(*) filter (where ${vendors.role} = 'unknown')::int`,
      })
      .from(vendors)
      .where(eq(vendors.organizationId, organizationId)),
    db
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.organizationId, organizationId))
      .orderBy(websites.createdAt)
      .limit(1),
    db
      .select({ id: consentPolicies.id })
      .from(consentPolicies)
      .leftJoin(
        consentPolicyVersions,
        and(
          eq(consentPolicyVersions.policyId, consentPolicies.id),
          eq(consentPolicyVersions.isPublished, true),
        ),
      )
      .where(
        and(
          inArray(consentPolicies.websiteId, orgWebsiteIds),
          isNull(consentPolicyVersions.id),
        ),
      )
      .limit(1),
  ]);

  const totals = consentStatusTotals[0] ?? {
    total: 0,
    accepted: 0,
    rejected: 0,
    partial: 0,
    withdrawn: 0,
    pending: 0,
  };

  return {
    websiteCount: countOf(websiteRows),
    trackerCount: countOf(trackerRows),
    policyCount: countOf(policyRows),
    purposeCount: countOf(purposeRows),
    publishedCount: countOf(publishedRows),
    totalConsents: totals.total,
    acceptedConsents: totals.accepted,
    partialConsents: totals.partial,
    pendingConsents: totals.pending,
    withdrawnConsents: totals.withdrawn,
    vendorCount: Number(vendorRows[0]?.total ?? 0),
    mappedVendorCount: Number(vendorRows[0]?.mapped ?? 0),
    unknownVendorCount: Number(vendorRows[0]?.unknown ?? 0),
    firstWebsiteId: firstWebsiteRows[0]?.id ?? null,
    firstUnpublishedPolicyId: unpublishedPolicyRows[0]?.id ?? null,
  };
});

export type HomeDashboardCounts = Awaited<ReturnType<typeof loadHomeDashboardCounts>>;

export const loadHomeChartAnalytics = cache(async (organizationId: string) => {
  return loadConsentAnalytics(organizationId, { days: "30" }, "charts");
});

/** Cheap existence checks for layout setup-mode. Not a substitute for home counts. */
export const loadSetupComplete = cache(async (organizationId: string) => {
  const orgWebsiteIds = db
    .select({ id: websites.id })
    .from(websites)
    .where(eq(websites.organizationId, organizationId));

  const [websiteRows, publishedRows, consentRows] = await Promise.all([
    db
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.organizationId, organizationId))
      .limit(1),
    db
      .select({ id: consentPolicyVersions.id })
      .from(consentPolicyVersions)
      .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
      .where(
        and(
          inArray(consentPolicies.websiteId, orgWebsiteIds),
          eq(consentPolicyVersions.isPublished, true),
        ),
      )
      .limit(1),
    db
      .select({ id: consentRecords.id })
      .from(consentRecords)
      .where(eq(consentRecords.organizationId, organizationId))
      .limit(1),
  ]);

  return websiteRows.length > 0 && publishedRows.length > 0 && consentRows.length > 0;
});
