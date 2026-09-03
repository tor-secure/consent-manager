import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";

import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { db } from "@/db";
import { privacyFindings } from "@/db/schema/privacy-findings";
import { websites } from "@/db/schema/websites";
import { trackers } from "@/db/schema/trackers";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FindingActions } from "@/components/monitoring/finding-actions";

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

export default async function MonitoringFindingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireDashboardContext();
  const { id } = await params;

  const [row] = await db
    .select({
      finding: privacyFindings,
      websiteName: websites.name,
      websiteDomain: websites.domain,
      trackerName: trackers.name,
      vendorName: vendors.name,
      purposeName: purposes.name,
    })
    .from(privacyFindings)
    .innerJoin(websites, eq(privacyFindings.websiteId, websites.id))
    .leftJoin(trackers, eq(privacyFindings.trackerId, trackers.id))
    .leftJoin(vendors, eq(privacyFindings.vendorId, vendors.id))
    .leftJoin(purposes, eq(privacyFindings.purposeId, purposes.id))
    .where(
      and(
        eq(privacyFindings.id, id),
        eq(privacyFindings.organizationId, context.organization.id),
        eq(websites.organizationId, context.organization.id),
      ),
    )
    .limit(1);

  if (!row) notFound();

  const details = row.finding.details;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/dashboard/monitoring" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        ← Privacy drift
      </Link>
      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="capitalize">{row.finding.severity}</Badge>
            <Badge className="capitalize">{row.finding.status}</Badge>
            <Badge variant="neutral" className="capitalize">
              {row.finding.findingType.replaceAll("_", " ")}
            </Badge>
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {row.finding.title}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            {row.websiteName} · {row.websiteDomain}
          </p>
        </div>
        <FindingActions findingId={row.finding.id} status={row.finding.status} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>What changed</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--foreground)]">{details.whatChanged}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Why it matters</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--foreground)]">{details.whyItMatters}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Previous state</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl bg-[var(--muted)] p-3 text-xs">
              {JSON.stringify(details.previousState ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current state</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl bg-[var(--muted)] p-3 text-xs">
              {JSON.stringify(details.currentState ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Expected state</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl bg-[var(--muted)] p-3 text-xs">
              {JSON.stringify(details.expectedState ?? {}, null, 2)}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Observed / inferred state</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-xl bg-[var(--muted)] p-3 text-xs">
              {JSON.stringify(details.observedState ?? details.currentState ?? {}, null, 2)}
            </pre>
            {details.evidenceSource || details.evidenceClass ? (
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                Evidence: {(details.evidenceClass ?? "not classified").replaceAll("_", " ")}
                {details.evidenceSource ? ` · source ${details.evidenceSource.replaceAll("_", " ")}` : ""}
                . Server-side scans infer HTML load behavior; they do not record browser network execution.
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>What is affected</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {details.whatIsAffected}
            <ul className="mt-3 space-y-1 text-[var(--muted-foreground)]">
              {row.trackerName ? <li>Tracker: {row.trackerName}</li> : null}
              {row.vendorName ? <li>Vendor: {row.vendorName}</li> : null}
              {row.purposeName ? <li>Purpose: {row.purposeName}</li> : null}
              <li>First detected: {fmt(row.finding.firstDetectedAt)}</li>
              <li>Last detected: {fmt(row.finding.lastDetectedAt)}</li>
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recommended action</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--foreground)]">
            {details.recommendedAction}
            <p className="mt-3 text-xs text-[var(--muted-foreground)]">
              This is an operational recommendation from scan-to-configuration comparison. It is not a legal or compliance certification.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
