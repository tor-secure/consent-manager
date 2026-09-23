import "server-only";

import { cache } from "react";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { loadConsentAnalytics } from "@/lib/analytics/queries";
import { readTtlCache, writeTtlCache } from "@/lib/ttl-cache";

const HOME_CACHE_TTL_MS = 30_000;

function num(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export const loadHomeDashboardCounts = cache(async (organizationId: string) => {
  const cacheKey = `home-counts:${organizationId}`;
  const cached = readTtlCache<HomeDashboardCounts>(cacheKey);
  if (cached) return cached;

  const result = await db.execute(sql`
    SELECT jsonb_build_object(
      'websiteCount', (SELECT count(*)::int FROM websites WHERE organization_id = ${organizationId}::uuid),
      'consent', (
        SELECT jsonb_build_object(
          'total', count(*)::int,
          'accepted', count(*) FILTER (WHERE status = 'accepted')::int,
          'partial', count(*) FILTER (WHERE status = 'partial')::int,
          'withdrawn', count(*) FILTER (WHERE status = 'withdrawn')::int,
          'pending', count(*) FILTER (WHERE status = 'pending')::int
        )
        FROM consent_records
        WHERE organization_id = ${organizationId}::uuid
      ),
      'trackerCount', (
        SELECT count(*)::int FROM trackers
        WHERE website_id IN (SELECT id FROM websites WHERE organization_id = ${organizationId}::uuid)
      ),
      'policyCount', (
        SELECT count(*)::int FROM consent_policies
        WHERE website_id IN (SELECT id FROM websites WHERE organization_id = ${organizationId}::uuid)
      ),
      'purposeCount', (SELECT count(*)::int FROM purposes WHERE organization_id = ${organizationId}::uuid),
      'publishedCount', (
        SELECT count(*)::int
        FROM consent_policy_versions v
        INNER JOIN consent_policies p ON p.id = v.policy_id
        WHERE v.is_published = true
          AND p.website_id IN (SELECT id FROM websites WHERE organization_id = ${organizationId}::uuid)
      ),
      'vendors', (
        SELECT jsonb_build_object(
          'total', count(*)::int,
          'mapped', count(*) FILTER (WHERE role <> 'unknown')::int,
          'unknown', count(*) FILTER (WHERE role = 'unknown')::int
        )
        FROM vendors
        WHERE organization_id = ${organizationId}::uuid
      ),
      'firstWebsiteId', (
        SELECT id FROM websites
        WHERE organization_id = ${organizationId}::uuid
        ORDER BY created_at ASC
        LIMIT 1
      ),
      'firstUnpublishedPolicyId', (
        SELECT p.id
        FROM consent_policies p
        LEFT JOIN consent_policy_versions v
          ON v.policy_id = p.id AND v.is_published = true
        WHERE p.website_id IN (SELECT id FROM websites WHERE organization_id = ${organizationId}::uuid)
          AND v.id IS NULL
        LIMIT 1
      )
    ) AS payload
  `);

  const first = (result as unknown as { payload?: unknown }[])[0];
  const raw = first?.payload;
  const payload = asRecord(typeof raw === "string" ? JSON.parse(raw) : raw);
  const consent = asRecord(payload.consent);
  const vendors = asRecord(payload.vendors);

  const counts: HomeDashboardCounts = {
    websiteCount: num(payload.websiteCount),
    trackerCount: num(payload.trackerCount),
    policyCount: num(payload.policyCount),
    purposeCount: num(payload.purposeCount),
    publishedCount: num(payload.publishedCount),
    totalConsents: num(consent.total),
    acceptedConsents: num(consent.accepted),
    partialConsents: num(consent.partial),
    pendingConsents: num(consent.pending),
    withdrawnConsents: num(consent.withdrawn),
    vendorCount: num(vendors.total),
    mappedVendorCount: num(vendors.mapped),
    unknownVendorCount: num(vendors.unknown),
    firstWebsiteId: payload.firstWebsiteId ? String(payload.firstWebsiteId) : null,
    firstUnpublishedPolicyId: payload.firstUnpublishedPolicyId
      ? String(payload.firstUnpublishedPolicyId)
      : null,
  };

  writeTtlCache(cacheKey, counts, HOME_CACHE_TTL_MS);
  return counts;
});

export type HomeDashboardCounts = {
  websiteCount: number;
  trackerCount: number;
  policyCount: number;
  purposeCount: number;
  publishedCount: number;
  totalConsents: number;
  acceptedConsents: number;
  partialConsents: number;
  pendingConsents: number;
  withdrawnConsents: number;
  vendorCount: number;
  mappedVendorCount: number;
  unknownVendorCount: number;
  firstWebsiteId: string | null;
  firstUnpublishedPolicyId: string | null;
};

export const loadHomeChartAnalytics = cache(async (organizationId: string) => {
  const cacheKey = `home-charts:${organizationId}`;
  const cached = readTtlCache<Awaited<ReturnType<typeof loadConsentAnalytics>>>(cacheKey);
  if (cached) return cached;
  const value = await loadConsentAnalytics(organizationId, { days: "30" }, "home");
  writeTtlCache(cacheKey, value, HOME_CACHE_TTL_MS);
  return value;
});

/** Cheap existence checks for layout setup-mode. Not a substitute for home counts. */
export const loadSetupComplete = cache(async (organizationId: string) => {
  const result = await db.execute(sql`
    SELECT
      EXISTS (SELECT 1 FROM websites WHERE organization_id = ${organizationId}::uuid) AS has_website,
      EXISTS (
        SELECT 1
        FROM consent_policy_versions v
        INNER JOIN consent_policies p ON p.id = v.policy_id
        WHERE v.is_published = true
          AND p.website_id IN (SELECT id FROM websites WHERE organization_id = ${organizationId}::uuid)
      ) AS has_published,
      EXISTS (
        SELECT 1 FROM consent_records WHERE organization_id = ${organizationId}::uuid
      ) AS has_consent
  `);
  const row = (result as unknown as {
    has_website?: boolean;
    has_published?: boolean;
    has_consent?: boolean;
  }[])[0];
  return Boolean(row?.has_website && row?.has_published && row?.has_consent);
});
