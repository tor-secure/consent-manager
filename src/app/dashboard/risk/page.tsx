import Link from "next/link";
import { isNull, eq, and } from "drizzle-orm";

import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { loadOrgRiskSnapshot } from "@/lib/monitoring/privacy-intelligence";
import {
  FINDING_SEVERITIES,
  FINDING_STATUSES,
  FINDING_TYPES,
} from "@/lib/monitoring/drift-engine";
import { qualityCategoryLabel } from "@/lib/monitoring/consent-quality";

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

function severityVariant(severity: string): "danger" | "warning" | "primary" | "neutral" | "success" {
  if (severity === "critical") return "danger";
  if (severity === "high") return "warning";
  if (severity === "medium") return "primary";
  if (severity === "clear" || severity === "excellent") return "success";
  return "neutral";
}

function typeLabel(type: string) {
  return type.replaceAll("_", " ");
}

function IconRisk() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

export default async function PrivacyRiskPage({
  searchParams,
}: {
  searchParams: Promise<{
    website?: string;
    severity?: string;
    type?: string;
    status?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const context = await requireDashboardContext();
  const params = await searchParams;
  const organizationId = context.organization.id;

  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name })
    .from(websites)
    .where(and(eq(websites.organizationId, organizationId), isNull(websites.deletedAt)))
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
    : undefined;
  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;

  const snapshot = await loadOrgRiskSnapshot(organizationId, {
    websiteId: websiteFilter,
    severity,
    findingType,
    status,
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
  });

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">Discovery & Monitoring</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
          Privacy risk
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-[var(--muted-foreground)]">
          Operational view of open drift and shadow-tracker findings for this organization. This is not a legal compliance score.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Overall status"
          value={snapshot.overallStatus.replaceAll("_", " ")}
          icon={<IconRisk />}
          iconColor={snapshot.overallStatus === "critical" || snapshot.overallStatus === "high" ? "rose" : "blue"}
        />
        <StatCard label="Unresolved" value={snapshot.unresolvedCount} icon={<IconRisk />} iconColor="amber" />
        <StatCard label="New (7 days)" value={snapshot.newFindings} icon={<IconRisk />} iconColor="purple" />
        <StatCard label="Affected websites" value={snapshot.affectedWebsites.length} icon={<IconRisk />} iconColor="teal" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {(["critical", "high", "medium", "low"] as const).map((key) => (
          <Card key={key}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">{key}</p>
              <p className="mt-1 text-2xl font-semibold">{snapshot.bySeverity[key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/dashboard/risk">
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
        <select name="status" defaultValue={status ?? ""} className="field-input h-10">
          <option value="">All statuses</option>
          {FINDING_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={params.from ?? ""} className="field-input h-10" aria-label="From date" />
        <input type="date" name="to" defaultValue={params.to ?? ""} className="field-input h-10" aria-label="To date" />
        <button type="submit" className="h-10 rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-white">
          Filter
        </button>
        <Link href="/dashboard/risk" className="inline-flex h-10 items-center px-3 text-sm text-[var(--muted-foreground)]">
          Reset
        </Link>
      </form>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold">Top affected trackers</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {snapshot.topTrackers.length === 0 ? (
                <li className="text-[var(--muted-foreground)]">None in this filter.</li>
              ) : (
                snapshot.topTrackers.map((row) => (
                  <li key={row.name} className="flex justify-between gap-2">
                    <span>{row.name}</span>
                    <span className="text-[var(--muted-foreground)]">{row.count}</span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold">Top affected vendors</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {snapshot.topVendors.length === 0 ? (
                <li className="text-[var(--muted-foreground)]">None in this filter.</li>
              ) : (
                snapshot.topVendors.map((row) => (
                  <li key={row.name} className="flex justify-between gap-2">
                    <span>{row.name}</span>
                    <span className="text-[var(--muted-foreground)]">{row.count}</span>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold">Consent quality by website</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {snapshot.qualityScores.length === 0 ? (
                <li className="text-[var(--muted-foreground)]">No websites.</li>
              ) : (
                snapshot.qualityScores.map((row) => (
                  <li key={row.websiteId} className="flex items-center justify-between gap-2">
                    <Link href={`/dashboard/websites/${row.websiteId}`} className="text-[var(--primary)] hover:underline">
                      {row.websiteName}
                    </Link>
                    <Badge variant={severityVariant(row.score.category)}>
                      {row.score.overall} · {qualityCategoryLabel(row.score.category)}
                    </Badge>
                  </li>
                ))
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold">Recently resolved</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {snapshot.recentResolved.length === 0 ? (
              <li className="text-[var(--muted-foreground)]">No resolved findings yet.</li>
            ) : (
              snapshot.recentResolved.map((row) => (
                <li key={row.id} className="flex flex-wrap justify-between gap-2">
                  <Link href={`/dashboard/monitoring/${row.id}`} className="text-[var(--primary)] hover:underline">
                    {row.title}
                  </Link>
                  <span className="text-[var(--muted-foreground)]">
                    {row.websiteName} · {fmt(row.resolvedAt)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </CardContent>
      </Card>

      {snapshot.findings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">
            No findings for this filter. Run a website scan to compare HTML inventory with CMP configuration.
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
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last detected</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.findings.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/monitoring/${row.id}`} className="font-medium text-[var(--primary)] hover:underline">
                        {row.title}
                      </Link>
                      <p className="mt-1 max-w-xl text-xs text-[var(--muted-foreground)]">
                        {row.details.whatChanged}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{row.websiteName}</td>
                    <td className="px-4 py-3 capitalize">{typeLabel(row.findingType)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={severityVariant(row.severity)} className="capitalize">
                        {row.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 capitalize">{row.status}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)]">{fmt(row.lastDetectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
