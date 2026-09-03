import { Suspense } from "react";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { trackers } from "@/db/schema/trackers";
import { scans } from "@/db/schema/scans";
import { AnalyticsFilters } from "@/components/analytics/analytics-filters";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { loadConsentAnalytics, loadRecentConsentEvents } from "@/lib/analytics/queries";
import { parseAnalyticsPeriod } from "@/lib/analytics/consent-metrics";
import {
  browserDisplayName,
  countryDisplayName,
  deviceDisplayName,
} from "@/lib/analytics/client-hints";

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

function EmptyNote({ text }: { text: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-sm text-slate-500">{text}</p>
      </CardContent>
    </Card>
  );
}

function RateBar({ value }: { value: number }) {
  return (
    <div className="ml-auto h-2.5 w-36 overflow-hidden rounded-full bg-slate-100 inner-shadow">
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{
    days?: string;
    websiteId?: string;
    country?: string;
    device?: string;
    browser?: string;
    purposeId?: string;
    policyVersionId?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const { orgId } = await auth();
  if (!orgId) return null;

  const params = await searchParams;
  const days = params.days ?? "30";

  const [localOrg] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  const analytics = await loadConsentAnalytics(localOrg.id, params);
  const period = parseAnalyticsPeriod({ days: params.days, from: params.from, to: params.to });
  const websiteIds = analytics.websites.map((site) => site.id);
  const websiteMap = new Map(analytics.websites.map((site) => [site.id, site]));

  const [trackerSummary, scanSummary, recentEvents] = await Promise.all([
    websiteIds.length > 0
      ? db
          .select({
            total: sql<number>`count(*)::int`,
            essential: sql<number>`count(*) filter (where ${trackers.isEssential} = true)::int`,
            withPurpose: sql<number>`count(*) filter (where ${trackers.purposeId} is not null)::int`,
            unclassified: sql<number>`count(*) filter (where ${trackers.purposeId} is null and ${trackers.isEssential} = false)::int`,
          })
          .from(trackers)
          .where(and(inArray(trackers.websiteId, websiteIds), eq(trackers.status, "active")))
      : Promise.resolve([]),
    websiteIds.length > 0
      ? db
          .select({
            total: sql<number>`count(*)::int`,
            completed: sql<number>`count(*) filter (where ${scans.status} = 'completed')::int`,
            items: sql<number>`coalesce(sum(${scans.itemsDetected}), 0)::int`,
          })
          .from(scans)
          .where(
            and(
              inArray(scans.websiteId, websiteIds),
              period.since ? gte(scans.createdAt, period.since) : undefined,
            ),
          )
      : Promise.resolve([]),
    loadRecentConsentEvents(localOrg.id, websiteIds, period.since, period.until),
  ]);

  const tk = trackerSummary[0];
  const sc = scanSummary[0];
  const hasData = analytics.overview.total > 0;
  const maxTrend = Math.max(1, ...analytics.trends.map((row) => row.interactions));

  return (
    <div className="page-wrap space-y-8 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-description">
            Aggregated consent metrics for{" "}
            <span className="font-medium text-slate-700">{localOrg.name}</span>
            {" · "}
            {analytics.period}.
          </p>
        </div>
        <Suspense fallback={<div className="h-11 w-72 rounded-2xl bg-white soft-shadow" />}>
          <AnalyticsFilters
            currentDays={days}
            websites={analytics.websites.map((site) => ({ value: site.id, label: site.name }))}
            countries={analytics.filterOptions.countries.map((code) => ({
              value: code,
              label: countryDisplayName(code),
            }))}
            devices={analytics.filterOptions.devices.map((value) => ({
              value,
              label: deviceDisplayName(value),
            }))}
            browsers={analytics.filterOptions.browsers.map((value) => ({
              value,
              label: browserDisplayName(value),
            }))}
            purposes={analytics.filterOptions.purposes.map((row) => ({
              value: row.id ?? "",
              label: row.label ?? "",
            })).filter((row) => row.value)}
            policyVersions={analytics.filterOptions.policyVersions.map((row) => ({
              value: row.id,
              label: row.label,
            }))}
          />
        </Suspense>
      </div>

      {analytics.websites.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center bg-white">
              <p className="text-base font-semibold text-slate-800">No websites yet</p>
              <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                Add a website and collect consent to see analytics.
              </p>
              <Link href="/dashboard/websites/new" className="mt-6 btn btn-primary">
                Add website
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {analytics.websites.length > 0 && (
        <div className="space-y-10">
          <section>
            <SectionHeader
              title="Consent overview"
              description={`Visitor consent records · ${analytics.period}.`}
            />
            {!hasData ? (
              <EmptyNote text="No consent records updated in this period. Install the SDK, publish a policy, and collect a choice — or widen the date range." />
            ) : (
              <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard label="Total records" value={analytics.overview.total} icon={<IconTotal />} iconColor="blue" description="One row per consent record" />
                <StatCard label="Accepted" value={analytics.overview.accepted} icon={<IconAccepted />} iconColor="green" description={`${analytics.overview.acceptRate}% of records`} />
                <StatCard label="Rejected" value={analytics.overview.rejected} icon={<IconRejected />} iconColor="rose" description={`${analytics.overview.rejectRate}% of records`} />
                <StatCard label="Granular" value={analytics.overview.partial} icon={<IconPartial />} iconColor="purple" description={`${analytics.overview.granularRate}% of records`} />
                <StatCard label="Withdrawn" value={analytics.overview.withdrawn} icon={<IconWithdrawn />} iconColor="amber" description={`${analytics.overview.withdrawalRate}% of records`} />
              </div>
            )}
          </section>

          <section>
            <SectionHeader
              title="Consent trends"
              description={`Daily unique consent events · ${analytics.period}. Each event id is counted once.`}
            />
            {analytics.trends.length === 0 ? (
              <EmptyNote text="Not enough event data to chart trends for this period." />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="table-scroll scrollbar-thin">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-4">Day</th>
                          <th className="px-6 py-4">Volume</th>
                          <th className="px-6 py-4 text-right">Interactions</th>
                          <th className="px-6 py-4 text-right">Accept all</th>
                          <th className="px-6 py-4 text-right">Reject all</th>
                          <th className="px-6 py-4 text-right">Granular</th>
                          <th className="px-6 py-4 text-right">Withdrawals</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analytics.trends.map((row) => (
                          <tr key={row.day}>
                            <td className="px-6 py-3 font-medium text-slate-800">{row.day}</td>
                            <td className="px-6 py-3">
                              <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100">
                                <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(row.interactions / maxTrend) * 100}%` }} />
                              </div>
                            </td>
                            <td className="px-6 py-3 text-right tabular-nums">{row.interactions}</td>
                            <td className="px-6 py-3 text-right tabular-nums text-emerald-600">{row.acceptAll}</td>
                            <td className="px-6 py-3 text-right tabular-nums text-rose-600">{row.rejectAll}</td>
                            <td className="px-6 py-3 text-right tabular-nums text-indigo-600">{row.granular}</td>
                            <td className="px-6 py-3 text-right tabular-nums">{row.withdrawals}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <SectionHeader
              title="Consent outcomes"
              description={`Accept / reject / granular / withdraw rates from stored records and choice events · ${analytics.period}.`}
            />
            {analytics.overview.choiceEvents > 0 || analytics.overview.interactions > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Accept-all rate" value={`${analytics.overview.acceptAllRate}%`} icon={<IconAccepted />} iconColor="green" description="From choice events" />
                <StatCard label="Reject-all rate" value={`${analytics.overview.rejectAllRate}%`} icon={<IconRejected />} iconColor="rose" description="From choice events" />
                <StatCard label="Granular rate" value={`${analytics.overview.interactionGranularRate}%`} icon={<IconPartial />} iconColor="purple" description="From choice events" />
                <StatCard label="Withdrawal rate" value={`${analytics.overview.eventWithdrawalRate}%`} icon={<IconWithdrawn />} iconColor="amber" description="Withdraw events / interactions" />
              </div>
            ) : (
              <EmptyNote text="Choice rates appear after the SDK records accept, reject, granular, or withdraw events." />
            )}
          </section>

          {analytics.websiteSummary.length > 0 && (
            <section>
              <SectionHeader title="By website" description="Consent records per website." />
              <Card>
                <CardContent className="p-0">
                  <div className="table-scroll scrollbar-thin">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-4">Website</th>
                          <th className="px-6 py-4 text-right">Total</th>
                          <th className="px-6 py-4 text-right">Accepted</th>
                          <th className="px-6 py-4 text-right">Rejected</th>
                          <th className="px-6 py-4 text-right">Partial</th>
                          <th className="px-6 py-4 text-right">Withdrawn</th>
                          <th className="px-6 py-4 text-right">Consent rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analytics.websiteSummary.map((row) => (
                          <tr key={row.websiteId}>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">{row.websiteName}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{row.websiteDomain}</p>
                            </td>
                            <td className="px-6 py-4 text-right font-semibold tabular-nums">{row.total.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-emerald-600 tabular-nums">{row.accepted.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-rose-600 tabular-nums">{row.rejected.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-indigo-600 tabular-nums">{row.partial.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right tabular-nums">{row.withdrawn.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right font-semibold tabular-nums">{row.consentRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          <section>
            <SectionHeader title="Purpose acceptance" description={`Canonical purpose keys from consent decisions · ${analytics.period}.`} />
            {analytics.purposes.length === 0 ? (
              <EmptyNote text="No purpose decisions in this period." />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="table-scroll scrollbar-thin">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-4">Purpose</th>
                          <th className="px-6 py-4 text-right">Decisions</th>
                          <th className="px-6 py-4 text-right">Granted</th>
                          <th className="px-6 py-4 text-right">Denied</th>
                          <th className="px-6 py-4 text-right">Grant rate</th>
                          <th className="px-6 py-4 text-right w-48">Progress</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analytics.purposes.map((row) => (
                          <tr key={row.purposeId}>
                            <td className="px-6 py-4">
                              <p className="font-semibold text-slate-900">{row.purposeName}</p>
                              <code className="text-xs text-slate-400">{row.purposeKey}</code>
                            </td>
                            <td className="px-6 py-4 text-right tabular-nums">{row.total.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-emerald-600 tabular-nums">{row.granted.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right text-rose-600 tabular-nums">{row.denied.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right font-semibold tabular-nums">{row.grantRate}%</td>
                            <td className="px-6 py-4"><RateBar value={row.grantRate} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <SectionHeader
              title="Geography"
              description={`Country from CDN country headers or ISO jurisdiction on the record. Raw IPs are not stored. · ${analytics.period}.`}
            />
            {analytics.countries.length === 0 || analytics.countries.every((row) => row.key === "unknown") ? (
              <EmptyNote text="No reliable country data is stored for this period." />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="table-scroll scrollbar-thin">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-4">Country</th>
                          <th className="px-6 py-4 text-right">Records</th>
                          <th className="px-6 py-4 text-right">Consent rate</th>
                          <th className="px-6 py-4 text-right">Reject rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analytics.countries.map((row) => (
                          <tr key={row.key}>
                            <td className="px-6 py-4 font-semibold text-slate-900">{row.name}</td>
                            <td className="px-6 py-4 text-right tabular-nums">{row.total.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right font-semibold tabular-nums">{row.consentRate}%</td>
                            <td className="px-6 py-4 text-right tabular-nums">{row.rejectRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <SectionHeader title="Device" description={`Normalized device class from User-Agent at write time. Raw user-agents are not shown. · ${analytics.period}.`} />
            {analytics.devices.length === 0 || analytics.devices.every((row) => row.key === "unknown") ? (
              <EmptyNote text="No trustworthy device classification is stored for older records in this period." />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="table-scroll scrollbar-thin">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-4">Device</th>
                          <th className="px-6 py-4 text-right">Interactions</th>
                          <th className="px-6 py-4 text-right">Acceptance</th>
                          <th className="px-6 py-4 text-right">Rejection</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analytics.devices.map((row) => (
                          <tr key={row.key}>
                            <td className="px-6 py-4 font-semibold text-slate-900">{row.name}</td>
                            <td className="px-6 py-4 text-right tabular-nums">{row.total.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right tabular-nums">{row.consentRate}%</td>
                            <td className="px-6 py-4 text-right tabular-nums">{row.rejectRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <SectionHeader title="Browser" description={`Normalized browser class only · ${analytics.period}.`} />
            {analytics.browsers.length === 0 || analytics.browsers.every((row) => row.key === "unknown") ? (
              <EmptyNote text="No normalized browser data is stored for this period." />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="table-scroll scrollbar-thin">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-4">Browser</th>
                          <th className="px-6 py-4 text-right">Records</th>
                          <th className="px-6 py-4 text-right">Acceptance</th>
                          <th className="px-6 py-4 text-right">Rejection</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analytics.browsers.map((row) => (
                          <tr key={row.key}>
                            <td className="px-6 py-4 font-semibold text-slate-900">{row.name}</td>
                            <td className="px-6 py-4 text-right tabular-nums">{row.total.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right tabular-nums">{row.consentRate}%</td>
                            <td className="px-6 py-4 text-right tabular-nums">{row.rejectRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <SectionHeader title="Policy versions" description={`Consent behavior grouped by the policy version on each record, per website · ${analytics.period}.`} />
            {analytics.policyVersions.length === 0 ? (
              <EmptyNote text="No policy-version linked consent records in this period." />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <div className="table-scroll scrollbar-thin">
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead>
                        <tr className="bg-slate-50/70 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-6 py-4">Website</th>
                          <th className="px-6 py-4">Policy version</th>
                          <th className="px-6 py-4 text-right">Records</th>
                          <th className="px-6 py-4 text-right">Acceptance</th>
                          <th className="px-6 py-4 text-right">Consent rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {analytics.policyVersions.map((row) => (
                          <tr key={`${row.websiteId}-${row.policyVersionId}`}>
                            <td className="px-6 py-4 text-slate-700">{row.websiteName}</td>
                            <td className="px-6 py-4 font-semibold text-slate-900">{row.label}</td>
                            <td className="px-6 py-4 text-right tabular-nums">{row.total.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right tabular-nums">{row.acceptRate}%</td>
                            <td className="px-6 py-4 text-right font-semibold tabular-nums">{row.consentRate}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          {analytics.eventTypes.length > 0 && (
            <section>
              <SectionHeader title="Consent events" description="Count of each consent event type." />
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {analytics.eventTypes.map((ev) => (
                  <Card key={ev.eventType}>
                    <CardContent className="py-5">
                      <code className="block truncate font-mono text-[11px] font-medium text-slate-500 bg-slate-50 px-2.5 py-1 rounded-xl">{ev.eventType}</code>
                      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{ev.count.toLocaleString()}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {tk && (
            <section>
              <SectionHeader
                title="Tracker inventory"
                description="Active trackers across all websites (not date-filtered)."
                action={
                  <Link href="/dashboard/trackers" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors rounded-xl px-3.5 h-9 inline-flex items-center bg-indigo-50 hover:bg-indigo-100/80">
                    View all trackers
                  </Link>
                }
              />
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Total trackers" value={tk.total ?? 0} icon={<IconTotal />} iconColor="blue" />
                <StatCard label="Essential" value={tk.essential ?? 0} icon={<IconAccepted />} iconColor="green" description="Never blocked" />
                <StatCard label="Consent-controlled" value={tk.withPurpose ?? 0} icon={<IconPartial />} iconColor="purple" description="Require purpose grant" />
                <StatCard label="Unclassified" value={tk.unclassified ?? 0} icon={<IconWithdrawn />} iconColor="amber" description="Always blocked" />
              </div>
            </section>
          )}

          {sc && sc.total > 0 && (
            <section>
              <SectionHeader
                title="Scanner activity"
                description={`Scans run${days !== "all" ? ` in the last ${days} days` : ""}. Scanner results do not overwrite consent analytics.`}
                action={
                  <Link href="/dashboard/scanner" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors rounded-xl px-3.5 h-9 inline-flex items-center bg-indigo-50 hover:bg-indigo-100/80">
                    View scanner
                  </Link>
                }
              />
              <div className="grid gap-5 sm:grid-cols-3">
                <StatCard label="Scans run" value={sc.total ?? 0} icon={<IconTotal />} iconColor="blue" />
                <StatCard label="Completed" value={sc.completed ?? 0} icon={<IconAccepted />} iconColor="green" />
                <StatCard label="Items detected" value={sc.items ?? 0} icon={<IconPartial />} iconColor="purple" />
              </div>
            </section>
          )}

          {recentEvents.length > 0 && (
            <section>
              <SectionHeader
                title="Recent activity"
                description="Latest consent event types. Identifiers are truncated."
                action={
                  <Link href="/dashboard/consent" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors rounded-xl px-3.5 h-9 inline-flex items-center bg-indigo-50 hover:bg-indigo-100/80">
                    View all consent records
                  </Link>
                }
              />
              <Card>
                <CardContent className="p-0">
                  <div className="table-scroll scrollbar-thin">
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
                            <tr key={ev.id}>
                              <td className="px-6 py-4">
                                <code className="rounded-xl bg-slate-50 px-2.5 py-1 font-mono text-[11px] font-medium text-slate-700">
                                  {ev.eventType}
                                </code>
                              </td>
                              <td className="px-6 py-4 text-slate-600">{site?.name ?? "—"}</td>
                              <td className="px-6 py-4">
                                <code className="font-mono text-xs text-slate-400">{ev.consentId.slice(0, 18)}…</code>
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

          {analytics.websites.length > 0 && !hasData && recentEvents.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center bg-white">
                  <p className="text-base font-semibold text-slate-800">No consent data yet</p>
                  <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                    Deploy the SDK on your website and collect your first consent record.
                  </p>
                  <Link
                    href={`/dashboard/websites/${analytics.websites[0]?.id ?? ""}/installation`}
                    className="mt-6 btn btn-primary"
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
