import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db";

export type HomeAnalyticsBundle = {
  websites: { id: string; name: string; domain: string }[];
  overview: {
    total: number;
    accepted: number;
    rejected: number;
    partial: number;
    withdrawn: number;
    pending: number;
  };
  websiteSummary: {
    websiteId: string;
    websiteName: string;
    websiteDomain: string;
    total: number;
    accepted: number;
    rejected: number;
    partial: number;
    withdrawn: number;
  }[];
  purposes: {
    purposeId: string | null;
    purposeName: string;
    purposeKey: string;
    total: number;
    granted: number;
    denied: number;
  }[];
  countries: {
    country: string;
    total: number;
    accepted: number;
    rejected: number;
    partial: number;
    withdrawn: number;
  }[];
  devices: {
    device: string;
    total: number;
    accepted: number;
    rejected: number;
    partial: number;
    withdrawn: number;
  }[];
  trends: {
    day: string;
    interactions: number;
    acceptAll: number;
    rejectAll: number;
    granular: number;
    withdrawals: number;
  }[];
};

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

function asArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => row && typeof row === "object") as Record<string, unknown>[];
}

/**
 * One round trip for the home dashboard charts.
 *
 * The production pool allows one connection per instance, so the previous
 * nine aggregate statements ran back to back against Neon. A single statement
 * scans the organisation's recent consent rows once (materialized) and folds
 * overview, website, country, device, purpose, and trend aggregates from that.
 */
export async function loadHomeAnalyticsBundle(input: {
  organizationId: string;
  since: Date | null;
  until: Date | null;
  websiteId: string | null;
}): Promise<HomeAnalyticsBundle> {
  const result = await db.execute(sql`
    WITH filtered AS MATERIALIZED (
      SELECT
        cr.id,
        cr.website_id,
        cr.status,
        coalesce(
          nullif(upper(cr.metadata #>> '{analytics,country}'), ''),
          CASE
            WHEN cr.jurisdiction ~ '^[A-Za-z]{2}$' THEN upper(cr.jurisdiction)
            ELSE 'unknown'
          END
        ) AS country,
        coalesce(nullif(cr.metadata #>> '{analytics,device}', ''), 'unknown') AS device
      FROM consent_records cr
      WHERE cr.organization_id = ${input.organizationId}::uuid
        AND (${input.since}::timestamptz IS NULL OR cr.updated_at >= ${input.since}::timestamptz)
        AND (${input.until}::timestamptz IS NULL OR cr.updated_at <= ${input.until}::timestamptz)
        AND (${input.websiteId}::uuid IS NULL OR cr.website_id = ${input.websiteId}::uuid)
    )
    SELECT jsonb_build_object(
      'websites', coalesce((
        SELECT jsonb_agg(
          jsonb_build_object('id', w.id, 'name', w.name, 'domain', w.domain)
          ORDER BY w.name
        )
        FROM websites w
        WHERE w.organization_id = ${input.organizationId}::uuid
      ), '[]'::jsonb),
      'overview', (
        SELECT jsonb_build_object(
          'total', count(*)::int,
          'accepted', count(*) FILTER (WHERE status = 'accepted')::int,
          'rejected', count(*) FILTER (WHERE status = 'rejected')::int,
          'partial', count(*) FILTER (WHERE status = 'partial')::int,
          'withdrawn', count(*) FILTER (WHERE status = 'withdrawn')::int,
          'pending', count(*) FILTER (WHERE status = 'pending')::int
        )
        FROM filtered
      ),
      'websiteSummary', coalesce((
        SELECT jsonb_agg(to_jsonb(s) ORDER BY s.total DESC)
        FROM (
          SELECT
            f.website_id AS "websiteId",
            ws.name AS "websiteName",
            ws.domain AS "websiteDomain",
            count(*)::int AS total,
            count(*) FILTER (WHERE f.status = 'accepted')::int AS accepted,
            count(*) FILTER (WHERE f.status = 'rejected')::int AS rejected,
            count(*) FILTER (WHERE f.status = 'partial')::int AS partial,
            count(*) FILTER (WHERE f.status = 'withdrawn')::int AS withdrawn
          FROM filtered f
          INNER JOIN websites ws
            ON ws.id = f.website_id
           AND ws.organization_id = ${input.organizationId}::uuid
          GROUP BY f.website_id, ws.name, ws.domain
        ) s
      ), '[]'::jsonb),
      'countries', coalesce((
        SELECT jsonb_agg(to_jsonb(c) ORDER BY c.total DESC)
        FROM (
          SELECT
            country,
            count(*)::int AS total,
            count(*) FILTER (WHERE status = 'accepted')::int AS accepted,
            count(*) FILTER (WHERE status = 'rejected')::int AS rejected,
            count(*) FILTER (WHERE status = 'partial')::int AS partial,
            count(*) FILTER (WHERE status = 'withdrawn')::int AS withdrawn
          FROM filtered
          GROUP BY country
          ORDER BY count(*) DESC
          LIMIT 25
        ) c
      ), '[]'::jsonb),
      'devices', coalesce((
        SELECT jsonb_agg(to_jsonb(d) ORDER BY d.total DESC)
        FROM (
          SELECT
            device,
            count(*)::int AS total,
            count(*) FILTER (WHERE status = 'accepted')::int AS accepted,
            count(*) FILTER (WHERE status = 'rejected')::int AS rejected,
            count(*) FILTER (WHERE status = 'partial')::int AS partial,
            count(*) FILTER (WHERE status = 'withdrawn')::int AS withdrawn
          FROM filtered
          GROUP BY device
          ORDER BY count(*) DESC
          LIMIT 25
        ) d
      ), '[]'::jsonb),
      'purposes', coalesce((
        SELECT jsonb_agg(to_jsonb(p) ORDER BY p.total DESC)
        FROM (
          SELECT
            cd.purpose_id AS "purposeId",
            pu.name AS "purposeName",
            pu.key AS "purposeKey",
            count(*)::int AS total,
            count(*) FILTER (WHERE cd.granted = true)::int AS granted,
            count(*) FILTER (WHERE cd.granted = false)::int AS denied
          FROM consent_decisions cd
          INNER JOIN filtered f ON f.id = cd.consent_record_id
          INNER JOIN purposes pu ON pu.id = cd.purpose_id
          WHERE pu.organization_id = ${input.organizationId}::uuid
            AND cd.purpose_id IS NOT NULL
          GROUP BY cd.purpose_id, pu.name, pu.key
          ORDER BY count(*) DESC
          LIMIT 20
        ) p
      ), '[]'::jsonb),
      'trends', coalesce((
        SELECT jsonb_agg(to_jsonb(t) ORDER BY t.day)
        FROM (
          SELECT
            to_char(date_trunc('day', e.occurred_at), 'YYYY-MM-DD') AS day,
            count(*) FILTER (
              WHERE e.event_type IN (
                'consent.created',
                'consent.updated',
                'consent.expired_and_renewed',
                'consent.withdrawn'
              )
            )::int AS interactions,
            count(*) FILTER (
              WHERE e.event_type IN (
                'consent.created',
                'consent.updated',
                'consent.expired_and_renewed'
              )
              AND e.event_data->>'choice' = 'accept-all'
            )::int AS "acceptAll",
            count(*) FILTER (
              WHERE e.event_type IN (
                'consent.created',
                'consent.updated',
                'consent.expired_and_renewed'
              )
              AND e.event_data->>'choice' = 'reject-all'
            )::int AS "rejectAll",
            count(*) FILTER (
              WHERE e.event_type IN (
                'consent.created',
                'consent.updated',
                'consent.expired_and_renewed'
              )
              AND e.event_data->>'choice' = 'granular'
            )::int AS granular,
            count(*) FILTER (WHERE e.event_type = 'consent.withdrawn')::int AS withdrawals
          FROM consent_events e
          INNER JOIN filtered f ON f.id = e.consent_record_id
          WHERE e.organization_id = ${input.organizationId}::uuid
            AND (${input.since}::timestamptz IS NULL OR e.occurred_at >= ${input.since}::timestamptz)
            AND (${input.until}::timestamptz IS NULL OR e.occurred_at <= ${input.until}::timestamptz)
          GROUP BY date_trunc('day', e.occurred_at)
        ) t
      ), '[]'::jsonb)
    ) AS payload
  `);

  const first = (result as unknown as { payload?: unknown }[])[0];
  const raw = first?.payload;
  const payload = asRecord(typeof raw === "string" ? JSON.parse(raw) : raw);
  const overview = asRecord(payload.overview);

  return {
    websites: asArray(payload.websites).map((row) => ({
      id: String(row.id ?? ""),
      name: String(row.name ?? ""),
      domain: String(row.domain ?? ""),
    })),
    overview: {
      total: num(overview.total),
      accepted: num(overview.accepted),
      rejected: num(overview.rejected),
      partial: num(overview.partial),
      withdrawn: num(overview.withdrawn),
      pending: num(overview.pending),
    },
    websiteSummary: asArray(payload.websiteSummary).map((row) => ({
      websiteId: String(row.websiteId ?? ""),
      websiteName: String(row.websiteName ?? "—"),
      websiteDomain: String(row.websiteDomain ?? ""),
      total: num(row.total),
      accepted: num(row.accepted),
      rejected: num(row.rejected),
      partial: num(row.partial),
      withdrawn: num(row.withdrawn),
    })),
    purposes: asArray(payload.purposes).map((row) => ({
      purposeId: row.purposeId == null ? null : String(row.purposeId),
      purposeName: String(row.purposeName ?? ""),
      purposeKey: String(row.purposeKey ?? ""),
      total: num(row.total),
      granted: num(row.granted),
      denied: num(row.denied),
    })),
    countries: asArray(payload.countries).map((row) => ({
      country: String(row.country ?? "unknown"),
      total: num(row.total),
      accepted: num(row.accepted),
      rejected: num(row.rejected),
      partial: num(row.partial),
      withdrawn: num(row.withdrawn),
    })),
    devices: asArray(payload.devices).map((row) => ({
      device: String(row.device ?? "unknown"),
      total: num(row.total),
      accepted: num(row.accepted),
      rejected: num(row.rejected),
      partial: num(row.partial),
      withdrawn: num(row.withdrawn),
    })),
    trends: asArray(payload.trends).map((row) => ({
      day: String(row.day ?? ""),
      interactions: num(row.interactions),
      acceptAll: num(row.acceptAll),
      rejectAll: num(row.rejectAll),
      granular: num(row.granular),
      withdrawals: num(row.withdrawals),
    })),
  };
}
