import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq, and, gte, inArray, sql, desc } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentEvents } from "@/db/schema/consent-events";
import { purposes } from "@/db/schema/purposes";
import { trackers } from "@/db/schema/trackers";
import { scans } from "@/db/schema/scans";
import { DateRangeFilter } from "@/components/analytics/date-range-filter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";

// ---------------------------------------------------------------------------
// Icons for stat cards
// ---------------------------------------------------------------------------

function IconTotal() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
    </svg>
  );
}

function IconAccepted() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconRejected() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function IconPartial() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconWithdrawn() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  );
}

function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function pct(num: number, den: number): string {
  if (den === 0) return "0%";
  return `${Math.round((num / den) * 100)}%`;
}

function fmt(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    + " " + date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { orgId } = await auth();
  if (!orgId) return null;

  const { days = "30" } = await searchParams;

  const [localOrg] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  // Date range.
  const since: Date | null = (() => {
    if (days === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - (parseInt(days, 10) || 30));
    return d;
  })();

  // Org website IDs — all scoping goes through these.
  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id))
    .orderBy(websites.name);

  const websiteIds = orgWebsites.map((w) => w.id);

  // -----------------------------------------------------------------
  // 1. CONSENT RECORD TOTALS
  // -----------------------------------------------------------------

  const recordsWhere = and(
    eq(consentRecords.organizationId, localOrg.id),
    since ? gte(consentRecords.createdAt, since) : undefined,
  );

  const [recordTotals] = await db
    .select({
      total:     sql<number>`count(*)::int`,
      accepted:  sql<number>`count(*) filter (where ${consentRecords.status} = 'accepted')::int`,
      rejected:  sql<number>`count(*) filter (where ${consentRecords.status} = 'rejected')::int`,
      partial:   sql<number>`count(*) filter (where ${consentRecords.status} = 'partial')::int`,
      withdrawn: sql<number>`count(*) filter (where ${consentRecords.status} = 'withdrawn')::int`,
      pending:   sql<number>`count(*) filter (where ${consentRecords.status} = 'pending')::int`,
    })
    .from(consentRecords)
    .where(recordsWhere);

  const total     = recordTotals?.total     ?? 0;
  const accepted  = recordTotals?.accepted  ?? 0;
  const rejected  = recordTotals?.rejected  ?? 0;
  const partial   = recordTotals?.partial   ?? 0;
  const withdrawn = recordTotals?.withdrawn ?? 0;

  // -----------------------------------------------------------------
  // 2. WEBSITE-LEVEL CONSENT SUMMARY
  // -----------------------------------------------------------------

  const websiteSummary =
    websiteIds.length > 0
      ? await db
          .select({
            websiteId: consentRecords.websiteId,
            total:     sql<number>`count(*)::int`,
            accepted:  sql<number>`count(*) filter (where ${consentRecords.status} = 'accepted')::int`,
            rejected:  sql<number>`count(*) filter (where ${consentRecords.status} = 'rejected')::int`,
            partial:   sql<number>`count(*) filter (where ${consentRecords.status} = 'partial')::int`,
            withdrawn: sql<number>`count(*) filter (where ${consentRecords.status} = 'withdrawn')::int`,
          })
          .from(consentRecords)
          .where(
            and(
              eq(consentRecords.organizationId, localOrg.id),
              inArray(consentRecords.websiteId, websiteIds),
              since ? gte(consentRecords.createdAt, since) : undefined,
            ),
          )
          .groupBy(consentRecords.websiteId)
          .orderBy(sql`count(*) desc`)
      : [];

  const websiteMap = new Map(orgWebsites.map((w) => [w.id, w]));

  // -----------------------------------------------------------------
  // 3. PURPOSE-LEVEL CONSENT BREAKDOWN
  // -----------------------------------------------------------------

  // Join decisions → records (for org/date scope) → purposes.
  // Only count purpose-type decisions (purposeId IS NOT NULL).
  const purposeBreakdown =
    websiteIds.length > 0
      ? await db
          .select({
            purposeId:  consentDecisions.purposeId,
            purposeName: purposes.name,
            purposeKey:  purposes.key,
            total:   sql<number>`count(*)::int`,
            granted: sql<number>`count(*) filter (where ${consentDecisions.granted} = true)::int`,
            denied:  sql<number>`count(*) filter (where ${consentDecisions.granted} = false)::int`,
          })
          .from(consentDecisions)
          .innerJoin(
            consentRecords,
            eq(consentDecisions.consentRecordId, consentRecords.id),
          )
          .innerJoin(purposes, eq(consentDecisions.purposeId, purposes.id))
          .where(
            and(
              eq(consentRecords.organizationId, localOrg.id),
              // Scope purposes to this org — prevents cross-org purpose name
              // leakage when a purposeId from another org is present in decisions.
              eq(purposes.organizationId, localOrg.id),
              inArray(consentRecords.websiteId, websiteIds),
              sql`${consentDecisions.purposeId} IS NOT NULL`,
              since ? gte(consentRecords.createdAt, since) : undefined,
            ),
          )
          .groupBy(consentDecisions.purposeId, purposes.name, purposes.key)
          .orderBy(sql`count(*) desc`)
          .limit(20)
      : [];

  // -----------------------------------------------------------------
  // 4. RECENT CONSENT EVENTS
  // -----------------------------------------------------------------

  const recentEvents =
    websiteIds.length > 0
      ? await db
          .select({
            id:        consentEvents.id,
            eventType: consentEvents.eventType,
            source:    consentEvents.source,
            occurredAt: consentEvents.occurredAt,
            consentId: consentRecords.consentId,
            websiteId: consentRecords.websiteId,
          })
          .from(consentEvents)
          .innerJoin(consentRecords, eq(consentEvents.consentRecordId, consentRecords.id))
          .where(
            and(
              eq(consentRecords.organizationId, localOrg.id),
              inArray(consentRecords.websiteId, websiteIds),
              since ? gte(consentEvents.occurredAt, since) : undefined,
            ),
          )
          .orderBy(desc(consentEvents.occurredAt))
          .limit(15)
      : [];

  // -----------------------------------------------------------------
  // 5. TRACKER SUMMARY
  // -----------------------------------------------------------------

  const trackerSummary =
    websiteIds.length > 0
      ? await db
          .select({
            total:       sql<number>`count(*)::int`,
            essential:   sql<number>`count(*) filter (where ${trackers.isEssential} = true)::int`,
            nonEssential: sql<number>`count(*) filter (where ${trackers.isEssential} = false)::int`,
            withPurpose: sql<number>`count(*) filter (where ${trackers.purposeId} is not null)::int`,
            unclassified: sql<number>`count(*) filter (where ${trackers.purposeId} is null and ${trackers.isEssential} = false)::int`,
          })
          .from(trackers)
          .where(
            and(
              inArray(trackers.websiteId, websiteIds),
              eq(trackers.status, "active"),
            ),
          )
      : [];

  const tk = trackerSummary[0];

  // -----------------------------------------------------------------
  // 6. SCAN SUMMARY
  // -----------------------------------------------------------------

  const scanSummary =
    websiteIds.length > 0
      ? await db
          .select({
            total:     sql<number>`count(*)::int`,
            completed: sql<number>`count(*) filter (where ${scans.status} = 'completed')::int`,
            failed:    sql<number>`count(*) filter (where ${scans.status} = 'failed')::int`,
            items:     sql<number>`coalesce(sum(${scans.itemsDetected}), 0)::int`,
          })
          .from(scans)
          .where(
            and(
              inArray(scans.websiteId, websiteIds),
              since ? gte(scans.createdAt, since) : undefined,
            ),
          )
      : [];

  const sc = scanSummary[0];

  // -----------------------------------------------------------------
  // 7. EVENT TYPE BREAKDOWN
  // -----------------------------------------------------------------

  const eventTypes =
    websiteIds.length > 0
      ? await db
          .select({
            eventType: consentEvents.eventType,
            count:     sql<number>`count(*)::int`,
          })
          .from(consentEvents)
          .innerJoin(consentRecords, eq(consentEvents.consentRecordId, consentRecords.id))
          .where(
            and(
              eq(consentRecords.organizationId, localOrg.id),
              inArray(consentRecords.websiteId, websiteIds),
              since ? gte(consentEvents.occurredAt, since) : undefined,
            ),
          )
          .groupBy(consentEvents.eventType)
          .orderBy(sql`count(*) desc`)
      : [];

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------

  const hasData = total > 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-slate-900">Analytics</h1>
          <p className="mt-2 text-base text-slate-500 text-balance">
            Consent metrics for{" "}
            <span className="font-medium text-slate-700">{localOrg.name}</span>.
          </p>
        </div>

        <Suspense fallback={<div className="h-11 w-72 rounded-2xl bg-white soft-shadow" />}>
          <DateRangeFilter current={days} />
        </Suspense>
      </div>

      {/* No websites */}
      {orgWebsites.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-3xl border-2 border-dashed border-slate-200 p-10 text-center bg-gradient-to-br from-slate-50 to-indigo-50/30">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl gradient-primary shadow-lg shadow-indigo-500/25">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <p className="text-base font-semibold text-slate-800">No websites yet</p>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                Add a website and collect consent to see analytics.
              </p>
              <Link
                href="/dashboard/websites/new"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl gradient-primary text-white px-6 h-11 text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/30 hover:brightness-105 transition-all duration-200"
              >
                Add website
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {orgWebsites.length > 0 && (
        <div className="space-y-10">

          {/* ── Section 1: Consent records overview ── */}
          <section>
            <SectionHeader
              title="Consent records"
              description={`All visitor consent records${days !== "all" ? ` in the last ${days} days` : ""}.`}
            />

            {!hasData ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-sm text-slate-500">No consent records in this period.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  label="Total records"
                  value={total}
                  icon={<IconTotal />}
                  iconColor="blue"
                  description="All records"
                />
                <StatCard
                  label="Accepted"
                  value={accepted}
                  icon={<IconAccepted />}
                  iconColor="green"
                  description={pct(accepted, total) + " of total"}
                />
                <StatCard
                  label="Rejected"
                  value={rejected}
                  icon={<IconRejected />}
                  iconColor="rose"
                  description={pct(rejected, total) + " of total"}
                />
                <StatCard
                  label="Partial"
                  value={partial}
                  icon={<IconPartial />}
                  iconColor="purple"
                  description={pct(partial, total) + " of total"}
                />
                <StatCard
                  label="Withdrawn"
                  value={withdrawn}
                  icon={<IconWithdrawn />}
                  iconColor="amber"
                  description={pct(withdrawn, total) + " of total"}
                />
              </div>
            )}
          </section>

          {/* ── Section 2: Website-level breakdown ── */}
          {websiteSummary.length > 0 && (
            <section>
              <SectionHeader
                title="By website"
                description="Consent records per website."
              />
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-4">Website</th>
                          <th className="px-6 py-4 text-right">Total</th>
                          <th className="px-6 py-4 text-right">Accepted</th>
                          <th className="px-6 py-4 text-right">Rejected</th>
                          <th className="px-6 py-4 text-right">Partial</th>
                          <th className="px-6 py-4 text-right">Withdrawn</th>
                          <th className="px-6 py-4 text-right">Opt-in rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {websiteSummary.map((row) => {
                          const site = websiteMap.get(row.websiteId);
                          const optIn = row.accepted + row.partial;
                          return (
                            <tr key={row.websiteId} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-semibold text-slate-900">{site?.name ?? "—"}</p>
                                {site?.domain && <p className="text-xs text-slate-400 mt-0.5">{site.domain}</p>}
                              </td>
                              <td className="px-6 py-4 text-right font-semibold tabular-nums text-slate-900">{row.total.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right text-emerald-600 font-medium tabular-nums">{row.accepted.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right text-rose-600 font-medium tabular-nums">{row.rejected.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right text-indigo-600 font-medium tabular-nums">{row.partial.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right text-slate-500 tabular-nums">{row.withdrawn.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right font-semibold tabular-nums text-slate-900">
                                {pct(optIn, row.total)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* ── Section 3: Purpose-level breakdown ── */}
          {purposeBreakdown.length > 0 && (
            <section>
              <SectionHeader
                title="Purpose consent rates"
                description="How visitors responded to each consent purpose."
              />
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-4">Purpose</th>
                          <th className="px-6 py-4 text-right">Total decisions</th>
                          <th className="px-6 py-4 text-right">Granted</th>
                          <th className="px-6 py-4 text-right">Denied</th>
                          <th className="px-6 py-4 text-right">Grant rate</th>
                          <th className="px-6 py-4 text-right w-48">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {purposeBreakdown.map((row) => {
                          const grantPct = row.total > 0 ? Math.round((row.granted / row.total) * 100) : 0;
                          return (
                            <tr key={row.purposeId} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-6 py-4">
                                <p className="font-semibold text-slate-900">{row.purposeName}</p>
                                <code className="text-xs text-slate-400">{row.purposeKey}</code>
                              </td>
                              <td className="px-6 py-4 text-right text-slate-600 tabular-nums">{row.total.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right text-emerald-600 font-medium tabular-nums">{row.granted.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right text-rose-600 font-medium tabular-nums">{row.denied.toLocaleString()}</td>
                              <td className="px-6 py-4 text-right font-semibold tabular-nums text-slate-900">{grantPct}%</td>
                              <td className="px-6 py-4">
                                <div className="ml-auto h-2.5 w-36 overflow-hidden rounded-full bg-slate-100 inner-shadow">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all shadow-sm"
                                    style={{ width: `${grantPct}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* ── Section 4: Event type breakdown ── */}
          {eventTypes.length > 0 && (
            <section>
              <SectionHeader
                title="Consent events"
                description="Count of each consent event type."
              />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {eventTypes.map((ev) => (
                  <Card key={ev.eventType}>
                    <CardContent className="py-5">
                      <code className="block truncate font-mono text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl inline-block">{ev.eventType}</code>
                      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
                        {ev.count.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* ── Section 5: Tracker summary ── */}
          {tk && (
            <section>
              <SectionHeader
                title="Tracker inventory"
                description="Active trackers across all websites (not date-filtered)."
                action={
                  <Link href="/dashboard/trackers" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors rounded-xl px-3.5 h-9 inline-flex items-center bg-indigo-50 hover:bg-indigo-100/80">
                    View all trackers
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-1.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                }
              />
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Total trackers"
                  value={tk.total ?? 0}
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="2" y1="12" x2="22" y2="12" />
                      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                  }
                  iconColor="blue"
                />
                <StatCard
                  label="Essential"
                  value={tk.essential ?? 0}
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  }
                  iconColor="green"
                  description="Never blocked"
                />
                <StatCard
                  label="Consent-controlled"
                  value={tk.withPurpose ?? 0}
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                  }
                  iconColor="purple"
                  description="Require purpose grant"
                />
                <StatCard
                  label="Unclassified"
                  value={tk.unclassified ?? 0}
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  }
                  iconColor="amber"
                  description="Always blocked"
                />
              </div>
            </section>
          )}

          {/* ── Section 6: Scan summary ── */}
          {sc && sc.total > 0 && (
            <section>
              <SectionHeader
                title="Scanner activity"
                description={`Scans run${days !== "all" ? ` in the last ${days} days` : ""}.`}
                action={
                  <Link href="/dashboard/scanner" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors rounded-xl px-3.5 h-9 inline-flex items-center bg-indigo-50 hover:bg-indigo-100/80">
                    View scanner
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-1.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                }
              />
              <div className="grid gap-5 sm:grid-cols-3">
                <StatCard
                  label="Scans run"
                  value={sc.total ?? 0}
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1.75 5V3a1.25 1.25 0 011.25-1.25H5m0 17.5H3a1.25 1.25 0 01-1.25-1.25V19M19 1.75h1a1.25 1.25 0 011.25 1.25V5m0 14v1a1.25 1.25 0 01-1.25 1.25H19M2 12h20" />
                    </svg>
                  }
                  iconColor="blue"
                />
                <StatCard
                  label="Completed"
                  value={sc.completed ?? 0}
                  icon={<IconAccepted />}
                  iconColor="green"
                />
                <StatCard
                  label="Items detected"
                  value={sc.items ?? 0}
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  }
                  iconColor="purple"
                />
              </div>
            </section>
          )}

          {/* ── Section 7: Recent activity ── */}
          {recentEvents.length > 0 && (
            <section>
              <SectionHeader
                title="Recent activity"
                description="Latest consent events across all websites."
                action={
                  <Link href="/dashboard/consent" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors rounded-xl px-3.5 h-9 inline-flex items-center bg-indigo-50 hover:bg-indigo-100/80">
                    View all consent records
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="ml-1.5">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                }
              />
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-4">Event</th>
                          <th className="px-6 py-4">Website</th>
                          <th className="px-6 py-4">Consent ID</th>
                          <th className="px-6 py-4">Source</th>
                          <th className="px-6 py-4">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentEvents.map((ev) => {
                          const site = websiteMap.get(ev.websiteId);
                          return (
                            <tr key={ev.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-6 py-4">
                                <code className="rounded-xl bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-medium text-slate-700">
                                  {ev.eventType}
                                </code>
                              </td>
                              <td className="px-6 py-4 text-slate-600">{site?.name ?? "—"}</td>
                              <td className="px-6 py-4">
                                <code className="font-mono text-xs text-slate-400">
                                  {ev.consentId.slice(0, 18)}…
                                </code>
                              </td>
                              <td className="px-6 py-4 capitalize text-slate-500">{ev.source}</td>
                              <td className="px-6 py-4 text-slate-500 text-xs">{fmt(ev.occurredAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Empty when websites exist but no consent yet */}
          {orgWebsites.length > 0 && !hasData && recentEvents.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="rounded-3xl border-2 border-dashed border-slate-200 p-10 text-center bg-gradient-to-br from-slate-50 to-indigo-50/30">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl gradient-primary shadow-lg shadow-indigo-500/25">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <p className="text-base font-semibold text-slate-800">No consent data yet</p>
                  <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                    Deploy the SDK on your website and collect your first consent record.
                  </p>
                  <Link
                    href={`/dashboard/websites/${orgWebsites[0]?.id ?? ""}/installation`}
                    className="mt-6 inline-flex items-center gap-2 rounded-2xl gradient-primary text-white px-6 h-11 text-sm font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/30 hover:brightness-105 transition-all duration-200"
                  >
                    View installation guide
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      )}
    </div>
  );
}
