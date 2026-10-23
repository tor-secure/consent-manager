import Link from "next/link";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentPolicies } from "@/db/schema/consent-policies";
import { ConsentRecordControls } from "@/components/consent/record-controls";
import { Badge } from "@/components/ui/badge";
import {
  displayConsentStatus,
  isUnknownJurisdiction,
  parseRecordListQuery,
  RECORD_PAGE_SIZES,
  recordExportHref,
  recordListHref,
} from "@/lib/consent/record-list-params";
import { loadConsentRecordFilterOptions, loadConsentRecordPage } from "@/lib/consent/record-list";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

function shareOf(count: number, total: number) {
  if (total <= 0) return "0% of records";
  return `${Math.round((count / total) * 100)}% of records`;
}

function MetricStrip({
  metrics,
}: {
  metrics: { label: string; value: number; detail: string }[];
}) {
  const wide = metrics.length > 5 ? "lg:grid-cols-6" : "lg:grid-cols-5";
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div className={`grid grid-cols-2 ${wide}`}>
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={[
              "min-w-0 px-5 py-4",
              index % 2 === 1 ? "border-l border-[var(--border)]" : "",
              index >= 2 ? "border-t border-[var(--border)]" : "",
              index > 0 ? "lg:border-l lg:border-[var(--border)]" : "",
              "lg:border-t-0",
            ].join(" ")}
          >
            <p className="text-sm text-[var(--muted-foreground)]">{metric.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)] tabular-nums">
              {metric.value.toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">{metric.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status, withdrawnAt, expiresAt }: { status: string; withdrawnAt: Date | null; expiresAt: Date | null }) {
  const shown = displayConsentStatus({ status, withdrawnAt, expiresAt });
  const variantMap: Record<string, "success" | "danger" | "primary" | "neutral" | "warning"> = {
    accepted: "success",
    rejected: "danger",
    partial: "primary",
    withdrawn: "neutral",
    expired: "warning",
  };
  return (
    <Badge variant={variantMap[shown.key] ?? "neutral"} size="sm">
      {shown.label}
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
  const pct = total === 0 ? 0 : Math.round((accepted / total) * 100);
  const color = pct >= 70 ? "bg-[var(--success)]" : pct >= 40 ? "bg-[var(--warning)]" : "bg-[var(--danger)]";
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-[var(--secondary)]">
        <div className={`h-full rounded-full ${total === 0 ? "bg-[var(--border)]" : color}`} style={{ width: `${total === 0 ? 0 : Math.max(pct, 4)}%` }} />
      </div>
      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-[var(--foreground)]">
        {total === 0 ? "—" : `${pct}%`}
      </span>
    </div>
  );
}

const SITE_COLUMNS = "grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 sm:grid-cols-[minmax(11rem,16rem)_minmax(8rem,1fr)_7.5rem] sm:items-center";

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ConsentRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    policy?: string;
    jurisdiction?: string;
    from?: string;
    to?: string;
    sort?: string;
    dir?: string;
    page?: string;
    size?: string;
  }>;
}) {
  const listQuery = parseRecordListQuery(await searchParams);
  const { organization: localOrg } = await requireDashboardContext();

  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain, deletedAt: websites.deletedAt })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id));

  const websiteIds = orgWebsites.map((w) => w.id);

  const [websiteStatRows, publishedPolicyRows, recordPage, filterOptions] = await Promise.all([
    websiteIds.length > 0
      ? db
          .select({
            websiteId: consentRecords.websiteId,
            total: sql<number>`count(*)::int`,
            accepted: sql<number>`count(*) filter (where ${consentRecords.status} = 'accepted')::int`,
            rejected: sql<number>`count(*) filter (where ${consentRecords.status} = 'rejected')::int`,
            withdrawn: sql<number>`count(*) filter (where ${consentRecords.status} = 'withdrawn')::int`,
            partial: sql<number>`count(*) filter (where ${consentRecords.status} = 'partial')::int`,
            pending: sql<number>`count(*) filter (where ${consentRecords.status} = 'pending')::int`,
          })
          .from(consentRecords)
          .where(eq(consentRecords.organizationId, localOrg.id))
          .groupBy(consentRecords.websiteId)
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
    loadConsentRecordPage(localOrg.id, listQuery),
    loadConsentRecordFilterOptions(localOrg.id),
  ]);

  const records = recordPage.rows;
  const filteredTotal = recordPage.total;
  const pageCount = Math.max(1, Math.ceil(filteredTotal / listQuery.size));
  const websiteStats = new Map(websiteStatRows.map((row) => [row.websiteId, row]));

  const totals = websiteStatRows.reduce(
    (acc, row) => ({
      total: acc.total + Number(row.total),
      accepted: acc.accepted + Number(row.accepted),
      rejected: acc.rejected + Number(row.rejected),
      withdrawn: acc.withdrawn + Number(row.withdrawn),
      partial: acc.partial + Number(row.partial),
      pending: acc.pending + Number(row.pending),
    }),
    { total: 0, accepted: 0, rejected: 0, withdrawn: 0, partial: 0, pending: 0 },
  );
  const total = totals.total;
  const accepted = totals.accepted;
  const rejected = totals.rejected;
  const withdrawn = totals.withdrawn;
  const partial = totals.partial;
  const pending = totals.pending;
  const activeWebsites = orgWebsites
    .filter((site) => site.deletedAt == null)
    .sort((a, b) => {
      const delta = (websiteStats.get(b.id)?.total ?? 0) - (websiteStats.get(a.id)?.total ?? 0);
      return delta || a.name.localeCompare(b.name);
    });
  const metrics = [
    { label: "Total records", value: total, detail: "All time" },
    { label: "Accepted", value: accepted, detail: shareOf(accepted, total) },
    { label: "Granular", value: partial, detail: shareOf(partial, total) },
    { label: "Rejected", value: rejected, detail: shareOf(rejected, total) },
    { label: "Withdrawn", value: withdrawn, detail: shareOf(withdrawn, total) },
    ...(pending > 0 ? [{ label: "Pending", value: pending, detail: shareOf(pending, total) }] : []),
  ];

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">

      <PageHeader
        eyebrow={<SectionEyebrow href="/dashboard/consent-management">Consent Management</SectionEyebrow>}
        title="Consent Records"
        description="Visitor consent records across all your websites."
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
          <MetricStrip metrics={metrics} />

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
          <MetricStrip metrics={metrics} />

          {activeWebsites.length > 0 && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 pb-2 pt-4">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Opt-in rate by website</h2>
              <div className={`mt-4 hidden text-xs font-medium text-[var(--muted-foreground)] sm:grid ${SITE_COLUMNS}`}>
                <span>Site</span>
                <span>Opt-in rate</span>
                <span className="text-right">Records</span>
              </div>
              <ul className="mt-2 sm:mt-0">
                {activeWebsites.map((site) => {
                  const stats = websiteStats.get(site.id);
                  const siteTotal = stats?.total ?? 0;
                  const siteAccepted = stats?.accepted ?? 0;
                  return (
                    <li key={site.id} className={`grid border-t border-[var(--border)] py-3 ${SITE_COLUMNS}`}>
                      <div className="col-start-1 row-start-1 min-w-0">
                        <p className="truncate text-sm font-medium text-[var(--foreground)]">{site.name}</p>
                        <p className="truncate text-xs text-[var(--muted-foreground)]" title={site.domain}>
                          {site.domain}
                        </p>
                      </div>
                      <div className="col-span-2 col-start-1 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
                        <OptInRate accepted={siteAccepted} total={siteTotal} />
                      </div>
                      <p className="col-start-2 row-start-1 text-right text-sm tabular-nums text-[var(--muted-foreground)] sm:col-start-3">
                        {siteTotal.toLocaleString()}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Recent records</h2>
              <span className="rounded-full bg-[var(--secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                {filteredTotal === 0
                  ? "0 shown"
                  : `${(listQuery.page - 1) * listQuery.size + 1}–${Math.min(filteredTotal, listQuery.page * listQuery.size)} of ${filteredTotal.toLocaleString()}`}
              </span>
            </div>
            <div className="border-b border-[var(--border)] px-5 py-4">
              <ConsentRecordControls
                query={listQuery}
                policies={filterOptions.policies}
                jurisdictions={filterOptions.jurisdictions}
                exportHref={recordExportHref(listQuery)}
              />
            </div>
            {records.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">
                No records match these filters.{" "}
                <Link href="/dashboard/consent" className="font-medium text-[var(--primary)]">
                  Clear filters
                </Link>
              </p>
            ) : (
              <div className="table-scroll scrollbar-thin">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Consent ID</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Website</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Policy</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Source</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">Jurisdiction</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                        <Link href={recordListHref(listQuery, { sort: "consented", dir: listQuery.sort === "consented" && listQuery.dir === "desc" ? "asc" : "desc", page: 1 })}>
                          Consented{listQuery.sort === "consented" ? (listQuery.dir === "asc" ? " ↑" : " ↓") : ""}
                        </Link>
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                        <Link href={recordListHref(listQuery, { sort: "expires", dir: listQuery.sort === "expires" && listQuery.dir === "desc" ? "asc" : "desc", page: 1 })}>
                          Expires{listQuery.sort === "expires" ? (listQuery.dir === "asc" ? " ↑" : " ↓") : ""}
                        </Link>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {records.map((record) => {
                      const shown = displayConsentStatus(record);
                      const domain = record.websiteDomain.includes(".deleted.") ? "Removed site" : record.websiteDomain;
                      return (
                        <tr key={record.id} className="group transition-colors hover:bg-[var(--muted)]/80">
                          <td className="px-5 py-3.5">
                            <Link href={`/dashboard/consent/${encodeURIComponent(record.consentId)}/details`} className="rounded-lg bg-[var(--secondary)] px-2 py-1 font-mono text-xs text-[var(--muted-foreground)] transition-colors group-hover:bg-[var(--info-soft)] group-hover:text-[var(--primary)]">
                              {record.consentId.length > 18 ? `${record.consentId.slice(0, 18)}…` : record.consentId}
                            </Link>
                            <Link href={`/dashboard/consent/${encodeURIComponent(record.consentId)}`} className="mt-1 block text-[11px] font-medium text-[var(--primary)]">
                              Proof
                            </Link>
                          </td>
                          <td className="px-5 py-3.5">
                            <Link href={`/dashboard/websites/${record.websiteId}`} className="group/link">
                              <p className="font-medium text-[var(--foreground)] transition-colors group-hover/link:text-[var(--primary)]">{record.websiteName}</p>
                              <p className="text-xs text-[var(--muted-foreground)]">{domain}</p>
                            </Link>
                          </td>
                          <td className="px-5 py-3.5">
                            {record.policyName ? (
                              <div>
                                <p className="font-medium text-[var(--foreground)]">{record.policyName}</p>
                                {record.policyVersion != null ? (
                                  <Badge variant="neutral" size="sm" className="mt-0.5">v{record.policyVersion}</Badge>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-[var(--muted-foreground)]">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={record.status} withdrawnAt={record.withdrawnAt} expiresAt={record.expiresAt} />
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="capitalize text-[var(--muted-foreground)]">{record.source || "—"}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            {isUnknownJurisdiction(record.jurisdiction) ? (
                              <Badge variant="warning" size="sm">Unknown</Badge>
                            ) : (
                              <Badge variant="default" size="sm">{record.jurisdiction}</Badge>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-[var(--muted-foreground)]">{fmt(record.consentedAt)}</td>
                          <td className={`px-5 py-3.5 ${shown.key === "expired" ? "font-medium text-[var(--warning)]" : "text-[var(--muted-foreground)]"}`}>
                            {record.expiresAt ? fmt(record.expiresAt) : "—"}
                            {record.withdrawnAt ? <p className="mt-0.5 text-xs font-normal text-[var(--muted-foreground)]">Withdrawn {fmt(record.withdrawnAt)}</p> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <span>Rows</span>
                {RECORD_PAGE_SIZES.map((size) => (
                  <Link
                    key={size}
                    href={recordListHref(listQuery, { size, page: 1 })}
                    className={size === listQuery.size ? "font-semibold text-[var(--foreground)]" : "hover:text-[var(--foreground)]"}
                    aria-current={size === listQuery.size ? "page" : undefined}
                  >
                    {size}
                  </Link>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs">
                {listQuery.page > 1 ? (
                  <Link href={recordListHref(listQuery, { page: listQuery.page - 1 })} className="font-medium text-[var(--primary)]">Previous</Link>
                ) : (
                  <span className="text-[var(--muted-foreground)]">Previous</span>
                )}
                <span className="tabular-nums text-[var(--muted-foreground)]">Page {Math.min(listQuery.page, pageCount)} of {pageCount}</span>
                {listQuery.page < pageCount ? (
                  <Link href={recordListHref(listQuery, { page: listQuery.page + 1 })} className="font-medium text-[var(--primary)]">Next</Link>
                ) : (
                  <span className="text-[var(--muted-foreground)]">Next</span>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
