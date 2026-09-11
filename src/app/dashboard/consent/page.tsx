import Link from "next/link";
import { and, eq, desc, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentPolicies } from "@/db/schema/consent-policies";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconConsents() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12l2 2 4-4" />
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
    </svg>
  );
}

function IconAccepted() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconRejected() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function IconWithdrawn() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M3 12h18M3 18h7" />
      <path d="M17 17l4-4-4-4M21 13h-7" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Status badge mapped to the design system Badge component
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, "success" | "danger" | "primary" | "neutral" | "warning"> = {
    accepted: "success",
    rejected: "danger",
    partial: "primary",
    withdrawn: "neutral",
    pending: "warning",
    active: "success",
  };
  return (
    <Badge variant={variantMap[status] ?? "neutral"} size="sm" className="capitalize">
      {status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function OptInRate({ accepted, total }: { accepted: number; total: number }) {
  if (total === 0) return <span className="text-[var(--muted-foreground)]">—</span>;
  const pct = Math.round((accepted / total) * 100);
  const color = pct >= 70 ? "bg-[var(--success)]" : pct >= 40 ? "bg-[var(--warning)]" : "bg-[var(--danger)]";
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--secondary)]">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-[var(--muted-foreground)]">{pct}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ConsentRecordsPage() {
  const { organization: localOrg } = await requireDashboardContext();

  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id));

  const websiteIds = orgWebsites.map((w) => w.id);
  const websiteMap = new Map(orgWebsites.map((w) => [w.id, w]));

  const LIST_LIMIT = 50;

  const emptyTotals = {
    total: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
    partial: 0,
    pending: 0,
  };

  const [statusRows, websiteStatRows, records, publishedPolicyRows] = await Promise.all([
    websiteIds.length > 0
      ? db
          .select({
            total: sql<number>`count(*)::int`,
            accepted: sql<number>`count(*) filter (where ${consentRecords.status} = 'accepted')::int`,
            rejected: sql<number>`count(*) filter (where ${consentRecords.status} = 'rejected')::int`,
            withdrawn: sql<number>`count(*) filter (where ${consentRecords.status} = 'withdrawn')::int`,
            partial: sql<number>`count(*) filter (where ${consentRecords.status} = 'partial')::int`,
            pending: sql<number>`count(*) filter (where ${consentRecords.status} = 'pending')::int`,
          })
          .from(consentRecords)
          .where(inArray(consentRecords.websiteId, websiteIds))
      : Promise.resolve([emptyTotals]),
    websiteIds.length > 0
      ? db
          .select({
            websiteId: consentRecords.websiteId,
            total: sql<number>`count(*)::int`,
            accepted: sql<number>`count(*) filter (where ${consentRecords.status} = 'accepted')::int`,
          })
          .from(consentRecords)
          .where(inArray(consentRecords.websiteId, websiteIds))
          .groupBy(consentRecords.websiteId)
      : Promise.resolve([]),
    websiteIds.length > 0
      ? db
          .select({
            id: consentRecords.id,
            consentId: consentRecords.consentId,
            websiteId: consentRecords.websiteId,
            policyVersionId: consentRecords.policyVersionId,
            visitorId: consentRecords.visitorId,
            jurisdiction: consentRecords.jurisdiction,
            status: consentRecords.status,
            source: consentRecords.source,
            consentedAt: consentRecords.consentedAt,
            expiresAt: consentRecords.expiresAt,
            withdrawnAt: consentRecords.withdrawnAt,
            createdAt: consentRecords.createdAt,
          })
          .from(consentRecords)
          .where(inArray(consentRecords.websiteId, websiteIds))
          .orderBy(desc(consentRecords.createdAt))
          .limit(LIST_LIMIT)
      : Promise.resolve([]),
    websiteIds.length > 0
      ? db
          .select({ id: consentPolicyVersions.id })
          .from(consentPolicyVersions)
          .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
          .where(
            and(
              inArray(consentPolicies.websiteId, websiteIds),
              eq(consentPolicyVersions.isPublished, true),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  const versionIds = [...new Set(records.map((r) => r.policyVersionId))];
  const versionRows =
    versionIds.length > 0
      ? await db
          .select({
            id: consentPolicyVersions.id,
            version: consentPolicyVersions.version,
            policyId: consentPolicyVersions.policyId,
          })
          .from(consentPolicyVersions)
          .where(inArray(consentPolicyVersions.id, versionIds))
      : [];

  const policyIds = [...new Set(versionRows.map((v) => v.policyId))];
  const policyRows =
    policyIds.length > 0
      ? await db
          .select({ id: consentPolicies.id, name: consentPolicies.name })
          .from(consentPolicies)
          .where(inArray(consentPolicies.id, policyIds))
      : [];

  const versionMap = new Map(versionRows.map((v) => [v.id, v]));
  const policyMap = new Map(policyRows.map((p) => [p.id, p]));
  const websiteStats = new Map(websiteStatRows.map((row) => [row.websiteId, row]));

  const totals = statusRows[0] ?? emptyTotals;
  const total = totals.total;
  const accepted = totals.accepted;
  const rejected = totals.rejected;
  const withdrawn = totals.withdrawn;
  const partial = totals.partial;
  const pending = totals.pending;

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">

      <PageHeader
        eyebrow={<SectionEyebrow href="/dashboard/consent-management">Consent Management</SectionEyebrow>}
        title="Consent Records"
        description="Visitor consent records across all your websites."
        action={
          total > 0 ? (
            <div className="flex items-center gap-1.5 self-start rounded-2xl bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--muted-foreground)] soft-shadow">
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
              {total.toLocaleString()} record{total !== 1 ? "s" : ""}
            </div>
          ) : undefined
        }
      />

      {/* ── No websites empty state ──────────────────────────────────────── */}
      {websiteIds.length === 0 && (
        <EmptyState
          title="No websites yet"
          description="Add a website to start collecting consent records."
          actionLabel="Add a website"
          actionHref="/dashboard/websites/new"
        />
      )}

      {/* ── Has websites, no records yet ─────────────────────────────────── */}
      {websiteIds.length > 0 && total === 0 && (
        <>
          {/* Still show zeroed stat cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Records" value={0} icon={<IconConsents />} iconColor="blue" />
            <StatCard label="Accepted" value={0} icon={<IconAccepted />} iconColor="green" />
            <StatCard label="Rejected" value={0} icon={<IconRejected />} iconColor="rose" />
            <StatCard label="Withdrawn" value={0} icon={<IconWithdrawn />} iconColor="amber" />
          </div>

          <EmptyState
            title="No consent records yet"
            description={
              publishedPolicyRows.length > 0
                ? "A policy is published. Install the SDK so visitors can see the banner and leave a record."
                : "Publish a policy, then install the SDK. Records appear after a visitor makes a choice."
            }
            actionLabel={publishedPolicyRows.length > 0 ? "Install SDK" : "Review and publish"}
            actionHref={
              publishedPolicyRows.length > 0
                ? `/dashboard/websites/${orgWebsites[0].id}/installation`
                : "/dashboard/policies"
            }
          />
        </>
      )}

      {/* ── Records present ───────────────────────────────────────────────── */}
      {total > 0 && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Records"
              value={total}
              icon={<IconConsents />}
              iconColor="blue"
              description="all time"
            />
            <StatCard
              label="Accepted"
              value={accepted}
              icon={<IconAccepted />}
              iconColor="green"
              trend={
                total > 0
                  ? {
                      direction: "neutral",
                      value: `${Math.round((accepted / total) * 100)}%`,
                      label: "opt-in rate",
                    }
                  : undefined
              }
            />
            <StatCard
              label="Rejected"
              value={rejected}
              icon={<IconRejected />}
              iconColor="rose"
              description={total > 0 ? `${Math.round((rejected / total) * 100)}% of total` : undefined}
            />
            <StatCard
              label="Withdrawn"
              value={withdrawn}
              icon={<IconWithdrawn />}
              iconColor="amber"
              description={partial > 0 ? `${partial} partial` : undefined}
            />
          </div>

          {/* Status breakdown pills */}
          {(partial > 0 || pending > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {partial > 0 && (
                <div className="flex items-center gap-2 rounded-2xl bg-[var(--card)] px-4 py-2 text-sm soft-shadow">
                  <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                  <span className="font-medium text-[var(--foreground)]">{partial}</span>
                  <span className="text-[var(--muted-foreground)]">partial</span>
                </div>
              )}
              {pending > 0 && (
                <div className="flex items-center gap-2 rounded-2xl bg-[var(--card)] px-4 py-2 text-sm soft-shadow">
                  <span className="h-2 w-2 rounded-full bg-[var(--warning)]" />
                  <span className="font-medium text-[var(--foreground)]">{pending}</span>
                  <span className="text-[var(--muted-foreground)]">pending</span>
                </div>
              )}
            </div>
          )}

          {/* Opt-in rate bar — per website summary */}
          {orgWebsites.length > 1 && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Opt-in rate by website</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {orgWebsites.map((site) => {
                    const stats = websiteStats.get(site.id);
                    const siteTotal = stats?.total ?? 0;
                    const siteAccepted = stats?.accepted ?? 0;
                    return (
                      <div key={site.id} className="flex items-start gap-4">
                        <div className="w-36 min-w-0 shrink-0">
                          <p className="truncate text-sm font-medium leading-snug text-[var(--foreground)]">{site.name}</p>
                          <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{site.domain}</p>
                        </div>
                        <div className="mt-0.5 min-w-0 flex-1">
                          <OptInRate accepted={siteAccepted} total={siteTotal} />
                        </div>
                        <span className="mt-0.5 ml-auto text-xs text-[var(--muted-foreground)]">
                          {siteTotal.toLocaleString()} records
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Records table */}
          <Card>
            <CardHeader className="border-b border-[var(--border)] pb-4">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base">Recent records</CardTitle>
                <span className="rounded-full bg-[var(--secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                  {total > LIST_LIMIT ? `${LIST_LIMIT} of ${total.toLocaleString()}` : total.toLocaleString()} shown
                </span>
              </div>
            </CardHeader>
            <div className="table-scroll scrollbar-thin">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Consent ID
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Website
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Policy
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Source
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Jurisdiction
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Consented
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      Expires
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {records.map((record) => {
                    const site = websiteMap.get(record.websiteId);
                    const ver = versionMap.get(record.policyVersionId);
                    const pol = ver ? policyMap.get(ver.policyId) : null;

                    return (
                      <tr
                        key={record.id}
                        className="group transition-colors hover:bg-[var(--muted)]/80"
                      >
                        {/* Consent ID */}
                        <td className="px-5 py-3.5">
                          <code className="rounded-lg bg-[var(--secondary)] px-2 py-1 font-mono text-xs text-[var(--muted-foreground)] group-hover:bg-[var(--info-soft)] group-hover:text-[var(--primary)] transition-colors">
                            {record.consentId.slice(0, 18)}…
                          </code>
                          <Link
                            href={`/dashboard/consent/${record.consentId}`}
                            className="mt-1 block text-[11px] font-medium text-[var(--primary)] hover:text-[var(--primary)]"
                          >
                            Proof
                          </Link>
                        </td>

                        {/* Website */}
                        <td className="px-5 py-3.5">
                          {site ? (
                            <Link
                              href={`/dashboard/websites/${site.id}`}
                              className="group/link"
                            >
                              <p className="font-medium text-[var(--foreground)] group-hover/link:text-[var(--primary)] transition-colors">
                                {site.name}
                              </p>
                              <p className="text-xs text-[var(--muted-foreground)]">{site.domain}</p>
                            </Link>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">—</span>
                          )}
                        </td>

                        {/* Policy */}
                        <td className="px-5 py-3.5">
                          {pol ? (
                            <div>
                              <p className="font-medium text-[var(--foreground)]">{pol.name}</p>
                              {ver && (
                                <Badge variant="neutral" size="sm" className="mt-0.5">
                                  v{ver.version}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <StatusBadge status={record.status} />
                        </td>

                        {/* Source */}
                        <td className="px-5 py-3.5">
                          <span className="capitalize text-[var(--muted-foreground)]">{record.source ?? "—"}</span>
                        </td>

                        {/* Jurisdiction */}
                        <td className="px-5 py-3.5">
                          {record.jurisdiction ? (
                            <Badge variant="default" size="sm">
                              {record.jurisdiction}
                            </Badge>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">—</span>
                          )}
                        </td>

                        {/* Consented */}
                        <td className="px-5 py-3.5 text-[var(--muted-foreground)]">
                          {fmt(record.consentedAt)}
                        </td>

                        {/* Expires / Withdrawn */}
                        <td className="px-5 py-3.5">
                          {record.withdrawnAt ? (
                            <div>
                              <Badge variant="neutral" size="sm">Withdrawn</Badge>
                              <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                                {fmt(record.withdrawnAt)}
                              </p>
                            </div>
                          ) : record.expiresAt ? (
                            <span className="text-[var(--muted-foreground)]">{fmt(record.expiresAt)}</span>
                          ) : (
                            <span className="text-[var(--muted-foreground)]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {total > LIST_LIMIT && (
              <div className="border-t border-[var(--border)] px-5 py-3 text-center">
                <p className="text-xs text-[var(--muted-foreground)]">
                  Showing the {LIST_LIMIT} most recent records. Use the API to export all records.
                </p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
