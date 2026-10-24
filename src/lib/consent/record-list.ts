import "server-only";

import { and, asc, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";

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
      or ${websites.name} ilike ${term} escape '\\'
      or ${websites.domain} ilike ${term} escape '\\'
    )`);
  }
  const status = statusCondition(query.status);
  if (status) filters.push(status);
  if (query.websiteId) filters.push(eq(consentRecords.websiteId, query.websiteId));
  if (query.policyId) filters.push(eq(consentPolicies.id, query.policyId));
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
