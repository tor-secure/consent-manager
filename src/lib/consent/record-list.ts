import "server-only";

import { and, asc, desc, eq, gte, inArray, lt, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentEvents } from "@/db/schema/consent-events";
import { consentEvidenceSnapshots } from "@/db/schema/consent-evidence-snapshots";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentRecords } from "@/db/schema/consent-records";
import { purposes } from "@/db/schema/purposes";
import { websites } from "@/db/schema/websites";
import { type RecordListQuery, type RecordStatusFilter } from "@/lib/consent/record-list-params";

export const RECORD_EXPORT_LIMIT = 5000;

export type ConsentListRow = {
  id: string;
  consentId: string;
  visitorId: string | null;
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  policyName: string | null;
  policyVersion: number | null;
  jurisdiction: string | null;
  status: string;
  source: string;
  consentedAt: Date | null;
  expiresAt: Date | null;
  withdrawnAt: Date | null;
  purposes?: Array<{ name: string; granted: boolean }>;
};

export type ConsentRecordsDashboardStats = {
  total: number;
  accepted: number;
  rejected: number;
  withdrawn: number;
  pending: number;
  syncedToday: number;
  lastSyncedAt: string | null;
  trends: {
    total: number;
    accepted: number;
    rejected: number;
    withdrawn: number;
    pending: number;
    syncedToday: number;
  };
  daily: Array<{ day: string; count: number }>;
  byStatus: Array<{ key: string; label: string; value: number; color: string }>;
  topPurposes: Array<{ name: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
};

function dayStart(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

function nextDay(day: string) {
  const date = dayStart(day);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function likeTerm(value: string) {
  return `%${value.replace(/[%_\\]/g, "\\$&")}%`;
}

function notWithdrawn(): SQL {
  return sql`${consentRecords.withdrawnAt} is null and ${consentRecords.status} <> 'withdrawn'`;
}

function statusCondition(status: RecordStatusFilter): SQL | undefined {
  if (!status) return undefined;
  if (status === "withdrawn") {
    return sql`(${consentRecords.withdrawnAt} is not null or ${consentRecords.status} = 'withdrawn')`;
  }
  if (status === "expired") {
    return sql`${notWithdrawn()} and ${consentRecords.expiresAt} is not null and ${consentRecords.expiresAt} < now()`;
  }
  return sql`${consentRecords.status} = ${status} and ${notWithdrawn()} and (${consentRecords.expiresAt} is null or ${consentRecords.expiresAt} >= now())`;
}

function listWhere(organizationId: string, query: RecordListQuery) {
  const filters: SQL[] = [
    eq(consentRecords.organizationId, organizationId),
    eq(websites.organizationId, organizationId),
  ];
  if (query.q) {
    const term = likeTerm(query.q);
    filters.push(sql`(
      ${consentRecords.consentId} ilike ${term} escape '\\'
      or coalesce(${consentRecords.visitorId}, '') ilike ${term} escape '\\'
      or ${websites.name} ilike ${term} escape '\\'
      or ${websites.domain} ilike ${term} escape '\\'
    )`);
  }
  const status = statusCondition(query.status);
  if (status) filters.push(status);
  if (query.websiteId) filters.push(eq(consentRecords.websiteId, query.websiteId));
  if (query.policyId) filters.push(eq(consentPolicies.id, query.policyId));
  if (query.source) filters.push(eq(consentRecords.source, query.source));
  if (query.jurisdiction === "unknown") {
    filters.push(sql`(
      ${consentRecords.jurisdiction} is null
      or btrim(${consentRecords.jurisdiction}) = ''
      or lower(${consentRecords.jurisdiction}) = 'unknown'
    )`);
  } else if (query.jurisdiction) {
    filters.push(eq(consentRecords.jurisdiction, query.jurisdiction));
  }
  if (query.from) filters.push(gte(consentRecords.consentedAt, dayStart(query.from)));
  if (query.to) filters.push(lt(consentRecords.consentedAt, nextDay(query.to)));
  return and(...filters);
}

function listOrder(query: RecordListQuery) {
  const column = query.sort === "expires" ? consentRecords.expiresAt : consentRecords.consentedAt;
  const direction = query.dir === "asc" ? sql`${column} asc nulls last` : sql`${column} desc nulls last`;
  return [direction, desc(consentRecords.createdAt)];
}

function listSelection() {
  return {
    id: consentRecords.id,
    consentId: consentRecords.consentId,
    visitorId: consentRecords.visitorId,
    websiteId: consentRecords.websiteId,
    websiteName: websites.name,
    websiteDomain: websites.domain,
    policyName: consentPolicies.name,
    policyVersion: consentPolicyVersions.version,
    jurisdiction: consentRecords.jurisdiction,
    status: consentRecords.status,
    source: consentRecords.source,
    consentedAt: consentRecords.consentedAt,
    expiresAt: consentRecords.expiresAt,
    withdrawnAt: consentRecords.withdrawnAt,
  };
}

function pctChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function loadConsentRecordsDashboardStats(
  organizationId: string,
): Promise<ConsentRecordsDashboardStats> {
  const now = new Date();
  const startToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start30 = new Date(startToday);
  start30.setUTCDate(start30.getUTCDate() - 29);
  const startPrev30 = new Date(start30);
  startPrev30.setUTCDate(startPrev30.getUTCDate() - 30);

  // Bind as ISO strings — raw Date objects in sql`` templates break pg param encoding.
  const startTodayIso = startToday.toISOString();
  const start30Iso = start30.toISOString();
  const startPrev30Iso = startPrev30.toISOString();

  const orgEq = eq(consentRecords.organizationId, organizationId);
  const acceptedExpr = sql<number>`count(*) filter (where ${consentRecords.withdrawnAt} is null and ${consentRecords.status} = 'accepted' and (${consentRecords.expiresAt} is null or ${consentRecords.expiresAt} >= now()))::int`;
  const rejectedExpr = sql<number>`count(*) filter (where ${consentRecords.withdrawnAt} is null and ${consentRecords.status} = 'rejected' and (${consentRecords.expiresAt} is null or ${consentRecords.expiresAt} >= now()))::int`;
  const withdrawnExpr = sql<number>`count(*) filter (where ${consentRecords.withdrawnAt} is not null or ${consentRecords.status} = 'withdrawn')::int`;
  const pendingExpr = sql<number>`count(*) filter (where ${consentRecords.withdrawnAt} is null and ${consentRecords.status} in ('partial', 'pending') and (${consentRecords.expiresAt} is null or ${consentRecords.expiresAt} >= now()))::int`;
  const expiredExpr = sql<number>`count(*) filter (where ${consentRecords.withdrawnAt} is null and ${consentRecords.status} <> 'withdrawn' and ${consentRecords.expiresAt} is not null and ${consentRecords.expiresAt} < now())::int`;
  const syncedTodayExpr = sql<number>`count(*) filter (where ${consentRecords.consentedAt} >= ${startTodayIso}::timestamptz)::int`;

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      accepted: acceptedExpr,
      rejected: rejectedExpr,
      withdrawn: withdrawnExpr,
      pending: pendingExpr,
      expired: expiredExpr,
      syncedToday: syncedTodayExpr,
      lastSyncedAt: sql<Date | null>`max(${consentRecords.consentedAt})`,
    })
    .from(consentRecords)
    .where(orgEq);

  const [recent] = await db
    .select({
      total: sql<number>`count(*)::int`,
      accepted: acceptedExpr,
      rejected: rejectedExpr,
      withdrawn: withdrawnExpr,
      pending: pendingExpr,
      syncedToday: syncedTodayExpr,
    })
    .from(consentRecords)
    .where(
      and(
        orgEq,
        sql`${consentRecords.consentedAt} >= ${start30Iso}::timestamptz`,
      ),
    );

  const [previous] = await db
    .select({
      total: sql<number>`count(*)::int`,
      accepted: acceptedExpr,
      rejected: rejectedExpr,
      withdrawn: withdrawnExpr,
      pending: pendingExpr,
      syncedToday: sql<number>`count(*)::int`,
    })
    .from(consentRecords)
    .where(
      and(
        orgEq,
        sql`${consentRecords.consentedAt} >= ${startPrev30Iso}::timestamptz`,
        sql`${consentRecords.consentedAt} < ${start30Iso}::timestamptz`,
      ),
    );

  const dailyRows = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${consentRecords.consentedAt}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(consentRecords)
    .where(
      and(
        orgEq,
        sql`${consentRecords.consentedAt} >= ${start30Iso}::timestamptz`,
      ),
    )
    .groupBy(sql`date_trunc('day', ${consentRecords.consentedAt})`)
    .orderBy(sql`date_trunc('day', ${consentRecords.consentedAt})`);

  const sourceRows = await db
    .select({
      source: consentRecords.source,
      count: sql<number>`count(*)::int`,
    })
    .from(consentRecords)
    .where(orgEq)
    .groupBy(consentRecords.source)
    .orderBy(desc(sql`count(*)`))
    .limit(8);

  const purposeRows = await db
    .select({
      name: purposes.name,
      count: sql<number>`count(*)::int`,
    })
    .from(consentDecisions)
    .innerJoin(consentRecords, eq(consentDecisions.consentRecordId, consentRecords.id))
    .innerJoin(purposes, eq(consentDecisions.purposeId, purposes.id))
    .where(and(orgEq, eq(consentDecisions.granted, true)))
    .groupBy(purposes.name)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  const total = Number(totals?.total ?? 0);
  const accepted = Number(totals?.accepted ?? 0);
  const rejected = Number(totals?.rejected ?? 0);
  const withdrawn = Number(totals?.withdrawn ?? 0);
  const pending = Number(totals?.pending ?? 0) + Number(totals?.expired ?? 0);
  const syncedToday = Number(totals?.syncedToday ?? 0);

  const dailyMap = new Map(dailyRows.map((row) => [row.day, Number(row.count)]));
  const daily: Array<{ day: string; count: number }> = [];
  for (let i = 0; i < 30; i += 1) {
    const day = new Date(start30);
    day.setUTCDate(start30.getUTCDate() + i);
    const key = day.toISOString().slice(0, 10);
    daily.push({ day: key, count: dailyMap.get(key) ?? 0 });
  }

  return {
    total,
    accepted,
    rejected,
    withdrawn,
    pending,
    syncedToday,
    lastSyncedAt: totals?.lastSyncedAt ? new Date(totals.lastSyncedAt).toISOString() : null,
    trends: {
      total: pctChange(Number(recent?.total ?? 0), Number(previous?.total ?? 0)),
      accepted: pctChange(Number(recent?.accepted ?? 0), Number(previous?.accepted ?? 0)),
      rejected: pctChange(Number(recent?.rejected ?? 0), Number(previous?.rejected ?? 0)),
      withdrawn: pctChange(Number(recent?.withdrawn ?? 0), Number(previous?.withdrawn ?? 0)),
      pending: pctChange(Number(recent?.pending ?? 0), Number(previous?.pending ?? 0)),
      syncedToday: pctChange(Number(recent?.syncedToday ?? 0), Number(previous?.syncedToday ?? 0)),
    },
    daily,
    byStatus: [
      { key: "accepted", label: "Accepted", value: accepted, color: "#10B981" },
      { key: "rejected", label: "Rejected", value: rejected, color: "#EF4444" },
      { key: "withdrawn", label: "Withdrawn", value: withdrawn, color: "#8B5CF6" },
      { key: "pending", label: "Pending", value: pending, color: "#F59E0B" },
    ],
    topPurposes: purposeRows.map((row) => ({ name: row.name, count: Number(row.count) })),
    bySource: sourceRows.map((row) => ({
      source: row.source || "web",
      count: Number(row.count),
    })),
  };
}

export async function loadConsentRecordPurposes(
  organizationId: string,
  recordIds: string[],
): Promise<Map<string, Array<{ name: string; granted: boolean }>>> {
  const map = new Map<string, Array<{ name: string; granted: boolean }>>();
  if (recordIds.length === 0) return map;
  const rows = await db
    .select({
      recordId: consentDecisions.consentRecordId,
      name: purposes.name,
      granted: consentDecisions.granted,
    })
    .from(consentDecisions)
    .innerJoin(consentRecords, eq(consentDecisions.consentRecordId, consentRecords.id))
    .leftJoin(purposes, eq(consentDecisions.purposeId, purposes.id))
    .where(
      and(
        eq(consentRecords.organizationId, organizationId),
        inArray(consentDecisions.consentRecordId, recordIds),
      ),
    );
  for (const row of rows) {
    const list = map.get(row.recordId) ?? [];
    list.push({ name: row.name ?? "Purpose", granted: row.granted });
    map.set(row.recordId, list);
  }
  return map;
}

function fromRecords() {
  return db
    .select(listSelection())
    .from(consentRecords)
    .innerJoin(websites, eq(consentRecords.websiteId, websites.id))
    .innerJoin(consentPolicyVersions, eq(consentRecords.policyVersionId, consentPolicyVersions.id))
    .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id));
}

export async function loadConsentRecordPage(organizationId: string, query: RecordListQuery) {
  const where = listWhere(organizationId, query);
  const pageRows = await db
    .select({
      ...listSelection(),
      total: sql<number>`count(*) over()::int`.as("filtered_total"),
    })
    .from(consentRecords)
    .innerJoin(websites, eq(consentRecords.websiteId, websites.id))
    .innerJoin(consentPolicyVersions, eq(consentRecords.policyVersionId, consentPolicyVersions.id))
    .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
    .where(where)
    .orderBy(...listOrder(query))
    .limit(query.size)
    .offset((query.page - 1) * query.size);

  if (pageRows.length > 0) {
    const total = Number(pageRows[0]?.total ?? 0);
    return {
      rows: pageRows.map(({ total: _total, ...row }) => row),
      total,
    };
  }
  if (query.page <= 1) return { rows: [], total: 0 };

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(consentRecords)
    .innerJoin(websites, eq(consentRecords.websiteId, websites.id))
    .innerJoin(consentPolicyVersions, eq(consentRecords.policyVersionId, consentPolicyVersions.id))
    .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
    .where(where);
  return { rows: [], total: Number(countRow?.total ?? 0) };
}

export async function loadConsentRecordExport(organizationId: string, query: RecordListQuery) {
  const where = listWhere(organizationId, query);
  return fromRecords().where(where).orderBy(...listOrder(query)).limit(RECORD_EXPORT_LIMIT);
}

export async function loadConsentRecordFilterOptions(organizationId: string) {
  const [policyRows, jurisdictionRows] = await Promise.all([
    db
      .select({ id: consentPolicies.id, name: consentPolicies.name })
      .from(consentPolicies)
      .innerJoin(websites, eq(consentPolicies.websiteId, websites.id))
      .where(eq(websites.organizationId, organizationId))
      .orderBy(asc(consentPolicies.name)),
    db
      .selectDistinct({ value: consentRecords.jurisdiction })
      .from(consentRecords)
      .where(eq(consentRecords.organizationId, organizationId))
      .limit(200),
  ]);
  const jurisdictions = jurisdictionRows
    .map((row) => row.value?.trim() ?? "")
    .filter((value) => value.length > 0 && value.toLowerCase() !== "unknown");
  return {
    policies: policyRows,
    jurisdictions: [...new Set(jurisdictions)].sort((a, b) => a.localeCompare(b)),
  };
}

export async function loadConsentRecordDetail(organizationId: string, consentId: string) {
  const [record] = await db
    .select({
      id: consentRecords.id,
      consentId: consentRecords.consentId,
      visitorId: consentRecords.visitorId,
      jurisdiction: consentRecords.jurisdiction,
      status: consentRecords.status,
      source: consentRecords.source,
      consentedAt: consentRecords.consentedAt,
      expiresAt: consentRecords.expiresAt,
      withdrawnAt: consentRecords.withdrawnAt,
      createdAt: consentRecords.createdAt,
      websiteId: websites.id,
      websiteName: websites.name,
      websiteDomain: websites.domain,
      policyName: consentPolicies.name,
      policyVersion: consentPolicyVersions.version,
    })
    .from(consentRecords)
    .innerJoin(websites, eq(consentRecords.websiteId, websites.id))
    .innerJoin(consentPolicyVersions, eq(consentRecords.policyVersionId, consentPolicyVersions.id))
    .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
    .where(and(eq(consentRecords.organizationId, organizationId), eq(consentRecords.consentId, consentId), eq(websites.organizationId, organizationId)))
    .limit(1);

  if (!record) return null;

  const [decisions, events, snapshot] = await Promise.all([
    db
      .select({
        id: consentDecisions.id,
        decision: consentDecisions.decision,
        granted: consentDecisions.granted,
        purposeName: purposes.name,
        dataCategories: purposes.dataCategories,
      })
      .from(consentDecisions)
      .leftJoin(purposes, and(eq(consentDecisions.purposeId, purposes.id), eq(purposes.organizationId, organizationId)))
      .where(eq(consentDecisions.consentRecordId, record.id)),
    db
      .select({
        id: consentEvents.id,
        eventType: consentEvents.eventType,
        source: consentEvents.source,
        occurredAt: consentEvents.occurredAt,
      })
      .from(consentEvents)
      .where(and(eq(consentEvents.consentRecordId, record.id), eq(consentEvents.organizationId, organizationId)))
      .orderBy(desc(consentEvents.occurredAt))
      .limit(40),
    db
      .select({
        noticeHash: consentEvidenceSnapshots.noticeHash,
        policyVersionNumber: consentEvidenceSnapshots.policyVersionNumber,
        evidenceHash: consentEvidenceSnapshots.evidenceHash,
        noticeSnapshot: consentEvidenceSnapshots.noticeSnapshot,
        consentedAt: consentEvidenceSnapshots.consentedAt,
      })
      .from(consentEvidenceSnapshots)
      .where(and(eq(consentEvidenceSnapshots.organizationId, organizationId), eq(consentEvidenceSnapshots.consentId, consentId)))
      .orderBy(desc(consentEvidenceSnapshots.consentedAt))
      .limit(1),
  ]);

  const notice = snapshot[0] ?? null;
  const noticePolicy = notice?.noticeSnapshot?.policy;
  return {
    record,
    decisions,
    events,
    notice: notice
      ? {
          hash: notice.noticeHash,
          policyName: noticePolicy?.name ?? null,
          policyVersion: noticePolicy?.version ?? notice.policyVersionNumber,
          evidenceHash: notice.evidenceHash,
          consentedAt: notice.consentedAt,
        }
      : null,
  };
}
