import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq, desc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentPolicies } from "@/db/schema/consent-policies";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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

function IconEmpty() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300">
      <path d="M9 12l2 2 4-4" />
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
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
  if (total === 0) return <span className="text-slate-400">—</span>;
  const pct = Math.round((accepted / total) * 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-slate-600">{pct}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ConsentRecordsPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id));

  const websiteIds = orgWebsites.map((w) => w.id);
  const websiteMap = new Map(orgWebsites.map((w) => [w.id, w]));

  const records =
    websiteIds.length > 0
      ? await db
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
          .limit(200)
      : [];

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

  // Summary counts
  const total = records.length;
  const accepted = records.filter((r) => r.status === "accepted").length;
  const rejected = records.filter((r) => r.status === "rejected").length;
  const withdrawn = records.filter((r) => r.status === "withdrawn").length;
  const partial = records.filter((r) => r.status === "partial").length;
  const pending = records.filter((r) => r.status === "pending").length;

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Consent Records
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Visitor consent records across all your websites.
          </p>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-1.5 self-start rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-600 soft-shadow">
            <span className="h-2 w-2 rounded-full bg-indigo-500" />
            {total.toLocaleString()} record{total !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* ── No websites empty state ──────────────────────────────────────── */}
      {websiteIds.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
              <IconEmpty />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-700">No websites yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Add a website to start collecting consent records.
              </p>
            </div>
            <Link
              href="/dashboard/websites/new"
              className="mt-1 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
            >
              Add a website
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ── Has websites, no records yet ─────────────────────────────────── */}
      {websiteIds.length > 0 && records.length === 0 && (
        <>
          {/* Still show zeroed stat cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Records" value={0} icon={<IconConsents />} iconColor="blue" />
            <StatCard label="Accepted" value={0} icon={<IconAccepted />} iconColor="green" />
            <StatCard label="Rejected" value={0} icon={<IconRejected />} iconColor="rose" />
            <StatCard label="Withdrawn" value={0} icon={<IconWithdrawn />} iconColor="amber" />
          </div>

          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
                <IconEmpty />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-700">No consent records yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  Records appear here as visitors interact with your consent banner.
                </p>
              </div>
              <Link
                href="/dashboard/policies"
                className="mt-1 inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                View policies
              </Link>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Records present ───────────────────────────────────────────────── */}
      {records.length > 0 && (
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
                <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm soft-shadow">
                  <span className="h-2 w-2 rounded-full bg-indigo-400" />
                  <span className="font-medium text-slate-700">{partial}</span>
                  <span className="text-slate-500">partial</span>
                </div>
              )}
              {pending > 0 && (
                <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm soft-shadow">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span className="font-medium text-slate-700">{pending}</span>
                  <span className="text-slate-500">pending</span>
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
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {orgWebsites.map((site) => {
                    const siteRecords = records.filter((r) => r.websiteId === site.id);
                    const siteAccepted = siteRecords.filter((r) => r.status === "accepted").length;
                    return (
                      <div key={site.id} className="flex items-center gap-4">
                        <div className="w-36 min-w-0 shrink-0">
                          <p className="truncate text-sm font-medium text-slate-700">{site.name}</p>
                          <p className="truncate text-xs text-slate-400">{site.domain}</p>
                        </div>
                        <OptInRate accepted={siteAccepted} total={siteRecords.length} />
                        <span className="ml-auto text-xs text-slate-400">
                          {siteRecords.length.toLocaleString()} records
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
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base">Recent records</CardTitle>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                  {total > 200 ? "200 of " + total.toLocaleString() : total.toLocaleString()} shown
                </span>
              </div>
            </CardHeader>
            <div className="table-scroll scrollbar-thin">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Consent ID
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Website
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Policy
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Source
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Jurisdiction
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Consented
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Expires
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => {
                    const site = websiteMap.get(record.websiteId);
                    const ver = versionMap.get(record.policyVersionId);
                    const pol = ver ? policyMap.get(ver.policyId) : null;

                    return (
                      <tr
                        key={record.id}
                        className="group transition-colors hover:bg-slate-50/80"
                      >
                        {/* Consent ID */}
                        <td className="px-5 py-3.5">
                          <code className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                            {record.consentId.slice(0, 18)}…
                          </code>
                          <Link
                            href={`/dashboard/consent/${record.consentId}`}
                            className="mt-1 block text-[11px] font-medium text-indigo-600 hover:text-indigo-700"
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
                              <p className="font-medium text-slate-800 group-hover/link:text-indigo-600 transition-colors">
                                {site.name}
                              </p>
                              <p className="text-xs text-slate-400">{site.domain}</p>
                            </Link>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Policy */}
                        <td className="px-5 py-3.5">
                          {pol ? (
                            <div>
                              <p className="font-medium text-slate-700">{pol.name}</p>
                              {ver && (
                                <Badge variant="neutral" size="sm" className="mt-0.5">
                                  v{ver.version}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <StatusBadge status={record.status} />
                        </td>

                        {/* Source */}
                        <td className="px-5 py-3.5">
                          <span className="capitalize text-slate-500">{record.source ?? "—"}</span>
                        </td>

                        {/* Jurisdiction */}
                        <td className="px-5 py-3.5">
                          {record.jurisdiction ? (
                            <Badge variant="default" size="sm">
                              {record.jurisdiction}
                            </Badge>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Consented */}
                        <td className="px-5 py-3.5 text-slate-500">
                          {fmt(record.consentedAt)}
                        </td>

                        {/* Expires / Withdrawn */}
                        <td className="px-5 py-3.5">
                          {record.withdrawnAt ? (
                            <div>
                              <Badge variant="neutral" size="sm">Withdrawn</Badge>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {fmt(record.withdrawnAt)}
                              </p>
                            </div>
                          ) : record.expiresAt ? (
                            <span className="text-slate-500">{fmt(record.expiresAt)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {total > 200 && (
              <div className="border-t border-slate-100 px-5 py-3 text-center">
                <p className="text-xs text-slate-400">
                  Showing the 200 most recent records. Use the API to export all records.
                </p>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
