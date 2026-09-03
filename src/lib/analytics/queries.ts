import "server-only";

import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentEvents } from "@/db/schema/consent-events";
import { purposes } from "@/db/schema/purposes";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import {
  parseAnalyticsPeriod,
  rate,
} from "@/lib/analytics/consent-metrics";
import {
  browserDisplayName,
  countryDisplayName,
  deviceDisplayName,
} from "@/lib/analytics/client-hints";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ConsentAnalyticsFilters = {
  websiteId?: string | null;
  days?: string | null;
  from?: string | null;
  to?: string | null;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  purposeId?: string | null;
  policyVersionId?: string | null;
};

const countryExpr = sql<string>`coalesce(
  nullif(upper(${consentRecords.metadata} #>> '{analytics,country}'), ''),
  case
    when ${consentRecords.jurisdiction} ~ '^[A-Za-z]{2}$' then upper(${consentRecords.jurisdiction})
    else 'unknown'
  end
)`;

const deviceExpr = sql<string>`coalesce(nullif(${consentRecords.metadata} #>> '{analytics,device}', ''), 'unknown')`;
const browserExpr = sql<string>`coalesce(nullif(${consentRecords.metadata} #>> '{analytics,browser}', ''), 'unknown')`;

function optionalUuid(value: string | null | undefined): string | null {
  if (!value) return null;
  return UUID_RE.test(value) ? value : null;
}

export async function loadConsentAnalytics(
  organizationId: string,
  filters: ConsentAnalyticsFilters,
) {
  const period = parseAnalyticsPeriod({
    days: filters.days,
    from: filters.from,
    to: filters.to,
  });

  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(eq(websites.organizationId, organizationId))
    .orderBy(websites.name);

  const websiteIds = orgWebsites.map((site) => site.id);
  const requestedWebsite = optionalUuid(filters.websiteId);
  const scopedWebsiteIds =
    requestedWebsite && websiteIds.includes(requestedWebsite)
      ? [requestedWebsite]
      : websiteIds;

  const country = filters.country?.trim().toLowerCase() === "unknown"
    ? "unknown"
    : filters.country?.trim().toUpperCase() || null;
  const device = filters.device?.trim().toLowerCase() || null;
  const browser = filters.browser?.trim().toLowerCase() || null;
  const purposeId = optionalUuid(filters.purposeId);
  const policyVersionId = optionalUuid(filters.policyVersionId);

  const recordFilters = [
    eq(consentRecords.organizationId, organizationId),
    scopedWebsiteIds.length > 0
      ? inArray(consentRecords.websiteId, scopedWebsiteIds)
      : sql`false`,
    period.since ? gte(consentRecords.updatedAt, period.since) : undefined,
    period.until ? lte(consentRecords.updatedAt, period.until) : undefined,
    country ? sql`${countryExpr} = ${country}` : undefined,
    device ? sql`${deviceExpr} = ${device}` : undefined,
    browser ? sql`${browserExpr} = ${browser}` : undefined,
    policyVersionId ? eq(consentRecords.policyVersionId, policyVersionId) : undefined,
  ];

  const recordsWhere = and(...recordFilters.filter(Boolean));

  const purposeExists = purposeId
    ? sql`exists (
        select 1 from consent_decisions cd
        where cd.consent_record_id = ${consentRecords.id}
          and cd.purpose_id = ${purposeId}::uuid
      )`
    : undefined;

  const recordsWhereWithPurpose = and(recordsWhere, purposeExists);

  if (scopedWebsiteIds.length === 0) {
    return emptyAnalytics(period.label, orgWebsites);
  }

  const [
    recordTotals,
    websiteSummary,
    purposeBreakdown,
    eventTypes,
    trendRows,
    countryRows,
    deviceRows,
    browserRows,
    policyRows,
  ] = await Promise.all([
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
      .where(recordsWhereWithPurpose),
    db
      .select({
        websiteId: consentRecords.websiteId,
        total: sql<number>`count(*)::int`,
        accepted: sql<number>`count(*) filter (where ${consentRecords.status} = 'accepted')::int`,
        rejected: sql<number>`count(*) filter (where ${consentRecords.status} = 'rejected')::int`,
        partial: sql<number>`count(*) filter (where ${consentRecords.status} = 'partial')::int`,
        withdrawn: sql<number>`count(*) filter (where ${consentRecords.status} = 'withdrawn')::int`,
      })
      .from(consentRecords)
      .where(recordsWhereWithPurpose)
      .groupBy(consentRecords.websiteId)
      .orderBy(sql`count(*) desc`),
    db
      .select({
        purposeId: consentDecisions.purposeId,
        purposeName: purposes.name,
        purposeKey: purposes.key,
        total: sql<number>`count(*)::int`,
        granted: sql<number>`count(*) filter (where ${consentDecisions.granted} = true)::int`,
        denied: sql<number>`count(*) filter (where ${consentDecisions.granted} = false)::int`,
      })
      .from(consentDecisions)
      .innerJoin(consentRecords, eq(consentDecisions.consentRecordId, consentRecords.id))
      .innerJoin(purposes, eq(consentDecisions.purposeId, purposes.id))
      .where(
        and(
          recordsWhere,
          eq(purposes.organizationId, organizationId),
          sql`${consentDecisions.purposeId} IS NOT NULL`,
          purposeId ? eq(consentDecisions.purposeId, purposeId) : undefined,
        ),
      )
      .groupBy(consentDecisions.purposeId, purposes.name, purposes.key)
      .orderBy(sql`count(*) desc`)
      .limit(20),
    db
      .select({
        eventType: consentEvents.eventType,
        count: sql<number>`count(*)::int`,
      })
      .from(consentEvents)
      .innerJoin(consentRecords, eq(consentEvents.consentRecordId, consentRecords.id))
      .where(
        and(
          recordsWhereWithPurpose,
          period.since ? gte(consentEvents.occurredAt, period.since) : undefined,
          period.until ? lte(consentEvents.occurredAt, period.until) : undefined,
        ),
      )
      .groupBy(consentEvents.eventType)
      .orderBy(sql`count(*) desc`),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${consentEvents.occurredAt}), 'YYYY-MM-DD')`,
        interactions: sql<number>`count(*) filter (where ${consentEvents.eventType} in ('consent.created','consent.updated','consent.expired_and_renewed','consent.withdrawn'))::int`,
        acceptAll: sql<number>`count(*) filter (where ${consentEvents.eventType} in ('consent.created','consent.updated','consent.expired_and_renewed') and ${consentEvents.eventData}->>'choice' = 'accept-all')::int`,
        rejectAll: sql<number>`count(*) filter (where ${consentEvents.eventType} in ('consent.created','consent.updated','consent.expired_and_renewed') and ${consentEvents.eventData}->>'choice' = 'reject-all')::int`,
        granular: sql<number>`count(*) filter (where ${consentEvents.eventType} in ('consent.created','consent.updated','consent.expired_and_renewed') and ${consentEvents.eventData}->>'choice' = 'granular')::int`,
        withdrawals: sql<number>`count(*) filter (where ${consentEvents.eventType} = 'consent.withdrawn')::int`,
      })
      .from(consentEvents)
      .innerJoin(consentRecords, eq(consentEvents.consentRecordId, consentRecords.id))
      .where(
        and(
          recordsWhereWithPurpose,
          period.since ? gte(consentEvents.occurredAt, period.since) : undefined,
          period.until ? lte(consentEvents.occurredAt, period.until) : undefined,
        ),
      )
      .groupBy(sql`date_trunc('day', ${consentEvents.occurredAt})`)
      .orderBy(sql`date_trunc('day', ${consentEvents.occurredAt})`),
    db
      .select({
        country: countryExpr,
        total: sql<number>`count(*)::int`,
        accepted: sql<number>`count(*) filter (where ${consentRecords.status} = 'accepted')::int`,
        rejected: sql<number>`count(*) filter (where ${consentRecords.status} = 'rejected')::int`,
        partial: sql<number>`count(*) filter (where ${consentRecords.status} = 'partial')::int`,
        withdrawn: sql<number>`count(*) filter (where ${consentRecords.status} = 'withdrawn')::int`,
      })
      .from(consentRecords)
      .where(recordsWhereWithPurpose)
      .groupBy(countryExpr)
      .orderBy(sql`count(*) desc`)
      .limit(25),
    db
      .select({
        device: deviceExpr,
        total: sql<number>`count(*)::int`,
        accepted: sql<number>`count(*) filter (where ${consentRecords.status} = 'accepted')::int`,
        rejected: sql<number>`count(*) filter (where ${consentRecords.status} = 'rejected')::int`,
        partial: sql<number>`count(*) filter (where ${consentRecords.status} = 'partial')::int`,
        withdrawn: sql<number>`count(*) filter (where ${consentRecords.status} = 'withdrawn')::int`,
      })
      .from(consentRecords)
      .where(recordsWhereWithPurpose)
      .groupBy(deviceExpr)
      .orderBy(sql`count(*) desc`),
    db
      .select({
        browser: browserExpr,
        total: sql<number>`count(*)::int`,
        accepted: sql<number>`count(*) filter (where ${consentRecords.status} = 'accepted')::int`,
        rejected: sql<number>`count(*) filter (where ${consentRecords.status} = 'rejected')::int`,
        partial: sql<number>`count(*) filter (where ${consentRecords.status} = 'partial')::int`,
        withdrawn: sql<number>`count(*) filter (where ${consentRecords.status} = 'withdrawn')::int`,
      })
      .from(consentRecords)
      .where(recordsWhereWithPurpose)
      .groupBy(browserExpr)
      .orderBy(sql`count(*) desc`),
    db
      .select({
        policyVersionId: consentRecords.policyVersionId,
        websiteId: consentRecords.websiteId,
        version: consentPolicyVersions.version,
        policyName: consentPolicies.name,
        total: sql<number>`count(*)::int`,
        accepted: sql<number>`count(*) filter (where ${consentRecords.status} = 'accepted')::int`,
        rejected: sql<number>`count(*) filter (where ${consentRecords.status} = 'rejected')::int`,
        partial: sql<number>`count(*) filter (where ${consentRecords.status} = 'partial')::int`,
        withdrawn: sql<number>`count(*) filter (where ${consentRecords.status} = 'withdrawn')::int`,
      })
      .from(consentRecords)
      .innerJoin(
        consentPolicyVersions,
        eq(consentRecords.policyVersionId, consentPolicyVersions.id),
      )
      .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
      .innerJoin(websites, eq(consentPolicies.websiteId, websites.id))
      .where(
        and(
          recordsWhereWithPurpose,
          eq(websites.organizationId, organizationId),
        ),
      )
      .groupBy(
        consentRecords.policyVersionId,
        consentRecords.websiteId,
        consentPolicyVersions.version,
        consentPolicies.name,
      )
      .orderBy(sql`count(*) desc`)
      .limit(20),
  ]);

  const totals = recordTotals[0] ?? {
    total: 0,
    accepted: 0,
    rejected: 0,
    partial: 0,
    withdrawn: 0,
    pending: 0,
  };

  const choiceEvents = eventTypes
    .filter((row) =>
      ["consent.created", "consent.updated", "consent.expired_and_renewed"].includes(row.eventType),
    )
    .reduce((sum, row) => sum + row.count, 0);
  const withdrawals =
    eventTypes.find((row) => row.eventType === "consent.withdrawn")?.count ?? 0;
  const interactions = eventTypes
    .filter((row) =>
      [
        "consent.created",
        "consent.updated",
        "consent.expired_and_renewed",
        "consent.withdrawn",
      ].includes(row.eventType),
    )
    .reduce((sum, row) => sum + row.count, 0);

  const trendChoice = trendRows.reduce(
    (acc, row) => ({
      acceptAll: acc.acceptAll + row.acceptAll,
      rejectAll: acc.rejectAll + row.rejectAll,
      granular: acc.granular + row.granular,
    }),
    { acceptAll: 0, rejectAll: 0, granular: 0 },
  );
  const choiceTotal = trendChoice.acceptAll + trendChoice.rejectAll + trendChoice.granular;

  const websiteMap = new Map(orgWebsites.map((site) => [site.id, site]));

  return {
    period: period.label,
    websites: orgWebsites,
    overview: {
      total: totals.total,
      accepted: totals.accepted,
      rejected: totals.rejected,
      partial: totals.partial,
      withdrawn: totals.withdrawn,
      pending: totals.pending,
      acceptRate: rate(totals.accepted, totals.total),
      rejectRate: rate(totals.rejected, totals.total),
      granularRate: rate(totals.partial, totals.total),
      withdrawalRate: rate(totals.withdrawn, totals.total),
      consentRate: rate(totals.accepted + totals.partial, totals.total),
      interactions,
      choiceEvents,
      acceptAllRate: rate(trendChoice.acceptAll, choiceTotal || choiceEvents),
      rejectAllRate: rate(trendChoice.rejectAll, choiceTotal || choiceEvents),
      interactionGranularRate: rate(trendChoice.granular, choiceTotal || choiceEvents),
      eventWithdrawalRate: rate(withdrawals, interactions),
    },
    trends: trendRows,
    websiteSummary: websiteSummary.map((row) => ({
      ...row,
      websiteName: websiteMap.get(row.websiteId)?.name ?? "—",
      websiteDomain: websiteMap.get(row.websiteId)?.domain ?? "",
      consentRate: rate(row.accepted + row.partial, row.total),
    })),
    purposes: purposeBreakdown.map((row) => ({
      ...row,
      grantRate: rate(row.granted, row.total),
    })),
    countries: countryRows.map((row) => ({
      key: row.country,
      name: countryDisplayName(row.country),
      total: row.total,
      consentRate: rate(row.accepted + row.partial, row.total),
      rejectRate: rate(row.rejected, row.total),
    })),
    devices: deviceRows.map((row) => ({
      key: row.device,
      name: deviceDisplayName(row.device),
      total: row.total,
      consentRate: rate(row.accepted + row.partial, row.total),
      rejectRate: rate(row.rejected, row.total),
    })),
    browsers: browserRows.map((row) => ({
      key: row.browser,
      name: browserDisplayName(row.browser),
      total: row.total,
      consentRate: rate(row.accepted + row.partial, row.total),
      rejectRate: rate(row.rejected, row.total),
    })),
    policyVersions: policyRows.map((row) => ({
      policyVersionId: row.policyVersionId,
      websiteId: row.websiteId,
      websiteName: websiteMap.get(row.websiteId)?.name ?? "—",
      label: `${row.policyName} v${row.version}`,
      total: row.total,
      consentRate: rate(row.accepted + row.partial, row.total),
      acceptRate: rate(row.accepted, row.total),
    })),
    eventTypes,
    filterOptions: {
      countries: countryRows.map((row) => row.country),
      devices: deviceRows.map((row) => row.device),
      browsers: browserRows.map((row) => row.browser),
      policyVersions: policyRows.map((row) => ({
        id: row.policyVersionId,
        label: `${row.policyName} v${row.version}`,
      })),
      purposes: purposeBreakdown.map((row) => ({
        id: row.purposeId,
        label: row.purposeName,
      })),
    },
  };
}

function emptyAnalytics(period: string, websites: { id: string; name: string; domain: string }[]) {
  return {
    period,
    websites,
    overview: {
      total: 0,
      accepted: 0,
      rejected: 0,
      partial: 0,
      withdrawn: 0,
      pending: 0,
      acceptRate: 0,
      rejectRate: 0,
      granularRate: 0,
      withdrawalRate: 0,
      consentRate: 0,
      interactions: 0,
      choiceEvents: 0,
      acceptAllRate: 0,
      rejectAllRate: 0,
      interactionGranularRate: 0,
      eventWithdrawalRate: 0,
    },
    trends: [],
    websiteSummary: [],
    purposes: [],
    countries: [],
    devices: [],
    browsers: [],
    policyVersions: [],
    eventTypes: [],
    filterOptions: {
      countries: [],
      devices: [],
      browsers: [],
      policyVersions: [],
      purposes: [],
    },
  };
}

export async function loadRecentConsentEvents(
  organizationId: string,
  websiteIds: string[],
  since: Date | null,
  until: Date | null,
) {
  if (websiteIds.length === 0) return [];
  return db
    .select({
      id: consentEvents.id,
      eventType: consentEvents.eventType,
      source: consentEvents.source,
      occurredAt: consentEvents.occurredAt,
      consentId: consentRecords.consentId,
      websiteId: consentRecords.websiteId,
    })
    .from(consentEvents)
    .innerJoin(consentRecords, eq(consentEvents.consentRecordId, consentRecords.id))
    .where(
      and(
        eq(consentRecords.organizationId, organizationId),
        inArray(consentRecords.websiteId, websiteIds),
        since ? gte(consentEvents.occurredAt, since) : undefined,
        until ? lte(consentEvents.occurredAt, until) : undefined,
      ),
    )
    .orderBy(desc(consentEvents.occurredAt))
    .limit(15);
}
