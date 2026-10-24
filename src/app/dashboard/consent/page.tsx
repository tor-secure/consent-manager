import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentPolicies } from "@/db/schema/consent-policies";
import { ConsentRecordControls } from "@/components/consent/record-controls";
import { ConsentRecordFade, ConsentRecordMotion } from "@/components/consent/record-fade";
import { Badge } from "@/components/ui/badge";
import {
  displayConsentStatus,
  isUnknownJurisdiction,
  parseRecordListQuery,
  recordExportHref,
  recordListHref,
} from "@/lib/consent/record-list-params";
import { loadConsentRecordFilterOptions, loadConsentRecordPage } from "@/lib/consent/record-list";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

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

function pageItems(current: number, count: number) {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1);
  const wanted = [1, count, current - 1, current, current + 1].filter((page) => page >= 1 && page <= count);
  const pages = [...new Set(wanted)].sort((a, b) => a - b);
  const items: Array<number | "gap"> = [];
  for (const page of pages) {
    const previous = items.at(-1);
    if (typeof previous === "number" && page - previous > 1) items.push("gap");
    items.push(page);
  }
  return items;
}

function fmt(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ConsentRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    website?: string;
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

  const [orgWebsites, countRows, publishedPolicyRows, recordPage, filterOptions] = await Promise.all([
    db
      .select({ id: websites.id, name: websites.name, domain: websites.domain, deletedAt: websites.deletedAt })
      .from(websites)
      .where(eq(websites.organizationId, localOrg.id)),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(consentRecords)
      .where(eq(consentRecords.organizationId, localOrg.id)),
    db
      .select({ id: consentPolicyVersions.id })
      .from(consentPolicyVersions)
      .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
      .innerJoin(websites, eq(consentPolicies.websiteId, websites.id))
      .where(and(eq(websites.organizationId, localOrg.id), eq(consentPolicyVersions.isPublished, true)))
      .limit(1),
    loadConsentRecordPage(localOrg.id, listQuery),
    loadConsentRecordFilterOptions(localOrg.id),
  ]);

  const websiteIds = orgWebsites.map((w) => w.id);

  const siteOptions = orgWebsites
    .filter((site) => site.deletedAt == null)
    .sort((a, b) => a.name.localeCompare(b.name) || a.domain.localeCompare(b.domain));
  const records = recordPage.rows;
  const filteredTotal = recordPage.total;
  const pageCount = Math.max(1, Math.ceil(filteredTotal / listQuery.size));
  const total = Number(countRows[0]?.total ?? 0);
  const pageNumber = Math.min(listQuery.page, pageCount);
  const rangeStart = filteredTotal === 0 ? 0 : (listQuery.page - 1) * listQuery.size + 1;
  const rangeEnd = Math.min(filteredTotal, listQuery.page * listQuery.size);

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">

      <PageHeader
        eyebrow={<SectionEyebrow href="/dashboard/consent-management">Consent Management</SectionEyebrow>}
        title="Consent records"
        description="Search every visitor choice, filter by status or site, and open the stored proof."
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
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
            <ConsentRecordMotion>
            <div className="border-b border-[var(--border)] bg-[var(--muted)]/40 px-5 py-4">
              <ConsentRecordControls
                query={listQuery}
                websites={siteOptions}
                policies={filterOptions.policies}
                jurisdictions={filterOptions.jurisdictions}
                exportHref={recordExportHref(listQuery)}
              />
            </div>
            <ConsentRecordFade>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
              <p className="text-sm font-medium tabular-nums text-[var(--foreground)]">
                {filteredTotal === 0 ? "0" : `${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()}`}
                <span className="font-normal text-[var(--muted-foreground)]"> of {filteredTotal.toLocaleString()}</span>
                <span className="ml-3 font-normal text-[var(--muted-foreground)]">Page {pageNumber} of {pageCount}</span>
              </p>
              <nav aria-label="Record pages" className="flex flex-wrap items-center gap-1">
                {listQuery.page > 1 ? (
                  <Link href={recordListHref(listQuery, { page: listQuery.page - 1 })} className="btn btn-secondary btn-sm">Previous</Link>
                ) : (
                  <span className="btn btn-secondary btn-sm pointer-events-none opacity-40">Previous</span>
                )}
                {pageItems(pageNumber, pageCount).map((item, index) =>
                  item === "gap" ? (
                    <span key={`gap-${index}`} className="px-1 text-sm text-[var(--muted-foreground)]" aria-hidden="true">…</span>
                  ) : item === pageNumber ? (
                    <span key={item} aria-current="page" className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-[var(--foreground)] px-2 text-sm font-semibold tabular-nums text-[var(--card)]">
                      {item}
                    </span>
                  ) : (
                    <Link
                      key={item}
                      href={recordListHref(listQuery, { page: item })}
                      className="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-medium tabular-nums text-[var(--foreground)] hover:bg-[var(--secondary)]"
                    >
                      {item}
                    </Link>
                  ),
                )}
                {listQuery.page < pageCount ? (
                  <Link href={recordListHref(listQuery, { page: listQuery.page + 1 })} className="btn btn-secondary btn-sm">Next</Link>
                ) : (
                  <span className="btn btn-secondary btn-sm pointer-events-none opacity-40">Next</span>
                )}
              </nav>
            </div>
            {records.length === 0 ? (
              <p className="px-5 py-14 text-center text-sm text-[var(--muted-foreground)]">
                No records match these filters.{" "}
                <Link href="/dashboard/consent" className="font-medium text-[var(--primary)]">
                  Clear filters
                </Link>
              </p>
            ) : (
              <>
                <ul className="divide-y divide-[var(--border)] lg:hidden">
                  {records.map((record) => {
                    const domain = record.websiteDomain.includes(".deleted.") ? "Removed site" : record.websiteDomain;
                    const detailsHref = `/dashboard/consent/${encodeURIComponent(record.consentId)}/details`;
                    const proofHref = `/dashboard/consent/${encodeURIComponent(record.consentId)}`;
                    return (
                      <li key={record.id} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <StatusBadge status={record.status} withdrawnAt={record.withdrawnAt} expiresAt={record.expiresAt} />
                            <Link href={`/dashboard/websites/${record.websiteId}`} className="mt-2 block truncate text-sm font-medium text-[var(--foreground)]">
                              {record.websiteName}
                            </Link>
                            <p className="truncate text-xs text-[var(--muted-foreground)]">{domain}</p>
                          </div>
                          <p className="shrink-0 text-xs tabular-nums text-[var(--muted-foreground)]">{fmt(record.consentedAt)}</p>
                        </div>
                        <p className="mt-3 truncate font-mono text-xs text-[var(--muted-foreground)]">{record.consentId}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Link href={detailsHref} className="btn btn-secondary btn-sm">Open</Link>
                          <Link href={proofHref} className="btn btn-ghost btn-sm">Proof</Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="table-scroll scrollbar-thin hidden lg:block">
                  <table className="data-table w-full min-w-[68rem] table-fixed">
                    <colgroup>
                      <col className="w-[11%]" />
                      <col className="w-[16%]" />
                      <col className="w-[16%]" />
                      <col className="w-[16%]" />
                      <col className="w-[10%]" />
                      <col className="w-[11%]" />
                      <col className="w-[11%]" />
                      <col className="w-[9%]" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>Website</th>
                        <th>Consent ID</th>
                        <th>Policy</th>
                        <th>Jurisdiction</th>
                        <th>
                          <Link href={recordListHref(listQuery, { sort: "consented", dir: listQuery.sort === "consented" && listQuery.dir === "desc" ? "asc" : "desc", page: 1 })}>
                            Consented{listQuery.sort === "consented" ? (listQuery.dir === "asc" ? " ↑" : " ↓") : ""}
                          </Link>
                        </th>
                        <th>
                          <Link href={recordListHref(listQuery, { sort: "expires", dir: listQuery.sort === "expires" && listQuery.dir === "desc" ? "asc" : "desc", page: 1 })}>
                            Expires{listQuery.sort === "expires" ? (listQuery.dir === "asc" ? " ↑" : " ↓") : ""}
                          </Link>
                        </th>
                        <th className="text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => {
                        const shown = displayConsentStatus(record);
                        const domain = record.websiteDomain.includes(".deleted.") ? "Removed site" : record.websiteDomain;
                        const detailsHref = `/dashboard/consent/${encodeURIComponent(record.consentId)}/details`;
                        const proofHref = `/dashboard/consent/${encodeURIComponent(record.consentId)}`;
                        return (
                          <tr key={record.id}>
                            <td>
                              <StatusBadge status={record.status} withdrawnAt={record.withdrawnAt} expiresAt={record.expiresAt} />
                              {record.source ? <p className="mt-1 capitalize text-xs text-[var(--muted-foreground)]">{record.source}</p> : null}
                            </td>
                            <td>
                              <Link href={`/dashboard/websites/${record.websiteId}`} className="block truncate font-medium text-[var(--foreground)] hover:text-[var(--primary)]">
                                {record.websiteName}
                              </Link>
                              <p className="truncate text-xs text-[var(--muted-foreground)]">{domain}</p>
                            </td>
                            <td>
                              <Link href={detailsHref} className="block truncate font-mono text-xs text-[var(--foreground)] hover:text-[var(--primary)]" title={record.consentId}>
                                {record.consentId}
                              </Link>
                            </td>
                            <td>
                              {record.policyName ? (
                                <div className="flex min-w-0 items-center gap-1.5">
                                  <span className="truncate text-[var(--foreground)]">{record.policyName}</span>
                                  {record.policyVersion != null ? <Badge variant="neutral" size="sm" className="shrink-0">v{record.policyVersion}</Badge> : null}
                                </div>
                              ) : (
                                <span className="text-[var(--muted-foreground)]">—</span>
                              )}
                            </td>
                            <td>
                              {isUnknownJurisdiction(record.jurisdiction) ? (
                                <Badge variant="warning" size="sm">Unknown</Badge>
                              ) : (
                                <Badge variant="default" size="sm">{record.jurisdiction}</Badge>
                              )}
                            </td>
                            <td className="whitespace-nowrap text-[var(--muted-foreground)]">{fmt(record.consentedAt)}</td>
                            <td className={`whitespace-nowrap ${shown.key === "expired" ? "font-medium text-[var(--warning)]" : "text-[var(--muted-foreground)]"}`}>
                              {record.expiresAt ? fmt(record.expiresAt) : "—"}
                              {record.withdrawnAt ? <p className="mt-0.5 text-xs font-normal text-[var(--muted-foreground)]">Withdrawn {fmt(record.withdrawnAt)}</p> : null}
                            </td>
                            <td className="text-right">
                              <div className="flex items-center justify-end gap-3">
                                <Link href={detailsHref} className="text-xs font-semibold text-[var(--primary)]">Open</Link>
                                <Link href={proofHref} className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)]">Proof</Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            </ConsentRecordFade>
            </ConsentRecordMotion>
          </section>
        </>
      )}
    </div>
  );
}
