import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";

import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { db } from "@/db";
import { privacyFindings } from "@/db/schema/privacy-findings";
import { websites } from "@/db/schema/websites";
import { trackers } from "@/db/schema/trackers";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  FINDING_SEVERITIES,
  FINDING_STATUSES,
  FINDING_TYPES,
} from "@/lib/monitoring/drift-engine";

function fmt(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function severityVariant(severity: string): "danger" | "warning" | "primary" | "neutral" {
  if (severity === "critical") return "danger";
  if (severity === "high") return "warning";
  if (severity === "medium") return "primary";
  return "neutral";
}

function statusVariant(status: string): "danger" | "warning" | "success" | "neutral" {
  if (status === "open") return "danger";
  if (status === "reviewed") return "warning";
  if (status === "resolved") return "success";
  return "neutral";
}

function typeLabel(type: string) {
  return type.replaceAll("_", " ");
}

function IconOpen() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default async function MonitoringPage({
  searchParams,
}: {
  searchParams: Promise<{ website?: string; severity?: string; type?: string; status?: string }>;
}) {
  const context = await requireDashboardContext();
  const params = await searchParams;
  const organizationId = context.organization.id;

  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(eq(websites.organizationId, organizationId))
    .orderBy(websites.name);

  const websiteFilter = orgWebsites.find((site) => site.id === params.website)?.id;
  const severity = FINDING_SEVERITIES.includes(params.severity as (typeof FINDING_SEVERITIES)[number])
    ? params.severity
    : undefined;
  const findingType = FINDING_TYPES.includes(params.type as (typeof FINDING_TYPES)[number])
    ? params.type
    : undefined;
  const status = FINDING_STATUSES.includes(params.status as (typeof FINDING_STATUSES)[number])
    ? params.status
    : "open";

  const filters = [eq(privacyFindings.organizationId, organizationId)];
  if (websiteFilter) filters.push(eq(privacyFindings.websiteId, websiteFilter));
  if (severity) filters.push(eq(privacyFindings.severity, severity));
  if (findingType) filters.push(eq(privacyFindings.findingType, findingType));
  if (status) filters.push(eq(privacyFindings.status, status));

  const [summaryRows, findings] = await Promise.all([
    db
      .select({
        severity: privacyFindings.severity,
        status: privacyFindings.status,
        count: sql<number>`count(*)::int`,
      })
      .from(privacyFindings)
      .where(eq(privacyFindings.organizationId, organizationId))
      .groupBy(privacyFindings.severity, privacyFindings.status),
    db
      .select({
        id: privacyFindings.id,
        websiteId: privacyFindings.websiteId,
        findingType: privacyFindings.findingType,
        severity: privacyFindings.severity,
        status: privacyFindings.status,
        title: privacyFindings.title,
        firstDetectedAt: privacyFindings.firstDetectedAt,
        lastDetectedAt: privacyFindings.lastDetectedAt,
        trackerName: trackers.name,
        vendorName: vendors.name,
        purposeName: purposes.name,
      })
      .from(privacyFindings)
      .leftJoin(trackers, eq(privacyFindings.trackerId, trackers.id))
      .leftJoin(vendors, eq(privacyFindings.vendorId, vendors.id))
      .leftJoin(purposes, eq(privacyFindings.purposeId, purposes.id))
      .where(and(...filters))
      .orderBy(desc(privacyFindings.lastDetectedAt))
      .limit(200),
  ]);

  const openCount = summaryRows
    .filter((row) => row.status === "open")
    .reduce((sum, row) => sum + Number(row.count), 0);
  const criticalOpen = summaryRows
    .filter((row) => row.status === "open" && row.severity === "critical")
    .reduce((sum, row) => sum + Number(row.count), 0);
  const highOpen = summaryRows
    .filter((row) => row.status === "open" && row.severity === "high")
    .reduce((sum, row) => sum + Number(row.count), 0);

  const websiteIds = [...new Set(findings.map((row) => row.websiteId))];
  const websiteRows =
    websiteIds.length > 0
      ? await db
          .select({ id: websites.id, name: websites.name, domain: websites.domain })
          .from(websites)
          .where(and(eq(websites.organizationId, organizationId), inArray(websites.id, websiteIds)))
      : [];
  const websiteMap = new Map(websiteRows.map((row) => [row.id, row]));

  function hrefFor(next: Record<string, string | undefined>) {
    const query = new URLSearchParams();
    const merged = {
      website: websiteFilter,
      severity,
      type: findingType,
      status,
      ...next,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) query.set(key, value);
    }
    const qs = query.toString();
    return qs ? `/dashboard/monitoring?${qs}` : "/dashboard/monitoring";
  }

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">Discovery & Monitoring</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Privacy drift
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Findings are produced after a website scan by comparing the latest scan, the previous completed scan, and current CMP mappings. This is not a background scheduler and is not a legal determination.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Open findings" value={openCount} icon={<IconOpen />} iconColor="rose" />
        <StatCard label="Open critical" value={criticalOpen} icon={<IconOpen />} iconColor="amber" />
        <StatCard label="Open high" value={highOpen} icon={<IconOpen />} iconColor="blue" />
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/dashboard/monitoring">
        <select name="website" defaultValue={websiteFilter ?? ""} className="field-input h-10 min-w-[10rem]">
          <option value="">All websites</option>
          {orgWebsites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </select>
        <select name="severity" defaultValue={severity ?? ""} className="field-input h-10">
          <option value="">All severities</option>
          {FINDING_SEVERITIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={findingType ?? ""} className="field-input h-10">
          <option value="">All types</option>
          {FINDING_TYPES.map((value) => (
            <option key={value} value={value}>
              {typeLabel(value)}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status ?? "open"} className="field-input h-10">
          {FINDING_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button type="submit" className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white">
          Filter
        </button>
        <Link href="/dashboard/monitoring" className="inline-flex h-10 items-center px-3 text-sm text-[var(--muted-foreground)]">
          Reset
        </Link>
      </form>

      {findings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">
            No findings for this filter. Run a website scan from Scanner to compare the latest results with CMP configuration.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--muted)] text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-4 py-3">Finding</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Mapped to</th>
                  <th className="px-4 py-3">First detected</th>
                  <th className="px-4 py-3">Last detected</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((row) => {
                  const site = websiteMap.get(row.websiteId);
                  return (
                    <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/dashboard/monitoring/${row.id}`} className="font-medium text-[var(--primary)] hover:underline">
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {site ? `${site.name}` : "Website"}
                      </td>
                      <td className="px-4 py-3 capitalize">{typeLabel(row.findingType)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={severityVariant(row.severity)} className="capitalize">
                          {row.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">
                        {[row.trackerName, row.vendorName, row.purposeName].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{fmt(row.firstDetectedAt)}</td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{fmt(row.lastDetectedAt)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(row.status)} className="capitalize">
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <p className="mt-4 text-xs text-[var(--muted-foreground)]">
        <Link href={hrefFor({ status: "open" })} className="hover:underline">Open</Link>
        {" · "}
        <Link href={hrefFor({ status: "reviewed" })} className="hover:underline">Reviewed</Link>
        {" · "}
        <Link href={hrefFor({ status: "resolved" })} className="hover:underline">Resolved</Link>
      </p>
    </div>
  );
}
