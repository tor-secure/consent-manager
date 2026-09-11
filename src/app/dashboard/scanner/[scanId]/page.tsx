import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { scans } from "@/db/schema/scans";
import { scanResults } from "@/db/schema/scan-results";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";

// ---------------------------------------------------------------------------
// Icons for stat cards
// ---------------------------------------------------------------------------

function IconItems() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconKnown() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconHighRisk() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function IconPages() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Type dot colours
// ---------------------------------------------------------------------------

const TYPE_DOTS: Record<string, string> = {
  cookie:      "bg-[var(--warning)]",
  pixel:       "bg-[var(--info)]",
  script:      "bg-[var(--purple)]",
  beacon:      "bg-[var(--pink)]",
  fingerprint: "bg-[var(--danger)]",
  storage:     "bg-[var(--teal)]",
  other:       "bg-[var(--muted-foreground)]",
};

const TYPE_BADGE: Record<string, string> = {
  cookie:      "bg-[var(--warning-soft)]  text-[var(--warning)]  ring-1 ring-[color-mix(in_srgb,var(--warning)_22%,transparent)]",
  pixel:       "bg-[var(--info-soft)]    text-[var(--info)]    ring-1 ring-[color-mix(in_srgb,var(--info)_22%,transparent)]",
  script:      "bg-[var(--info-soft)] text-[var(--purple)] ring-1 ring-[color-mix(in_srgb,var(--purple)_22%,transparent)]",
  beacon:      "bg-[var(--danger-soft)] text-[var(--pink)] ring-1 ring-[color-mix(in_srgb,var(--pink)_22%,transparent)]",
  fingerprint: "bg-[var(--danger-soft)]   text-[var(--danger)]   ring-1 ring-[color-mix(in_srgb,var(--danger)_22%,transparent)]",
  storage:     "bg-[var(--success-soft)] text-[var(--teal)] ring-1 ring-[color-mix(in_srgb,var(--teal)_22%,transparent)]",
  other:       "bg-[var(--secondary)] text-[var(--muted-foreground)]  ring-1 ring-[var(--border)]",
};

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_BADGE[type] ?? TYPE_BADGE.other;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {type}
    </span>
  );
}

function RiskBadge({ risk }: { risk: string | null }) {
  const map: Record<string, "danger" | "warning" | "success" | "neutral"> = {
    high:    "danger",
    medium:  "warning",
    low:     "success",
    unknown: "neutral",
  };
  const label = risk ?? "unknown";
  return <Badge variant={map[label] ?? "neutral"} size="sm" className="capitalize">{label}</Badge>;
}

function ScanStatusBadge({ status }: { status: string }) {
  const map: Record<string, "success" | "primary" | "danger" | "neutral"> = {
    completed: "success",
    running:   "primary",
    failed:    "danger",
    queued:    "neutral",
  };
  return (
    <Badge variant={map[status] ?? "neutral"} size="sm" className="capitalize">
      {status}
    </Badge>
  );
}

function fmt(date: Date | null) {
  if (!date) return "—";
  return (
    date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    " " +
    date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ScanDetailPage({
  params,
}: {
  params: Promise<{ scanId: string }>;
}) {
  const { scanId } = await params;
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
  if (websiteIds.length === 0) notFound();

  const [scan] = await db
    .select()
    .from(scans)
    .where(and(eq(scans.id, scanId), inArray(scans.websiteId, websiteIds)))
    .limit(1);
  if (!scan) notFound();

  const website = orgWebsites.find((w) => w.id === scan.websiteId);

  const results = await db
    .select({
      id: scanResults.id,
      type: scanResults.type,
      name: scanResults.name,
      domain: scanResults.domain,
      identifier: scanResults.identifier,
      classificationStatus: scanResults.classificationStatus,
      riskLevel: scanResults.riskLevel,
      details: scanResults.details,
      detectedAt: scanResults.detectedAt,
      vendorName: vendors.name,
      purposeName: purposes.name,
    })
    .from(scanResults)
    .leftJoin(vendors, eq(scanResults.vendorId, vendors.id))
    .leftJoin(purposes, eq(scanResults.purposeId, purposes.id))
    .where(eq(scanResults.scanId, scan.id))
    .orderBy(scanResults.riskLevel, scanResults.name);

  const byType = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});

  const known   = results.filter((r) => r.classificationStatus === "known" || r.classificationStatus === "mapped").length;
  const highRisk = results.filter((r) => r.riskLevel === "high").length;
  const unmapped = results.filter((r) => !(r.purposeName || r.vendorName || r.classificationStatus === "mapped")).length;

  const duration =
    scan.startedAt && scan.completedAt
      ? `${Math.round((scan.completedAt.getTime() - scan.startedAt.getTime()) / 1000)}s`
      : null;

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">

      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/dashboard/scanner"
          className="transition hover:text-[var(--foreground)]">Scanner</Link>
        <span aria-hidden="true" className="text-[var(--border)]">/</span>
        <span className="text-[var(--foreground)]">{website?.name ?? scanId.slice(0, 8)}</span>
      </nav>

      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            Scan results
            <ScanStatusBadge status={scan.status} />
            {duration && <Badge variant="neutral" size="sm">{duration}</Badge>}
          </span>
        }
        description={
          <>
            {website?.name}
            {website?.domain && <span className="text-[var(--muted-foreground)]"> · {website.domain}</span>}
            {scan.startedAt && <span> · {fmt(scan.startedAt)}</span>}
          </>
        }
        action={
          <Link href="/dashboard/scanner" className="btn btn-outline">
            Back to scanner
          </Link>
        }
      />

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {scan.status === "failed" && (
        <StatusBanner variant="danger" role="alert">
          <div>
            <p className="font-semibold">Scan failed</p>
            <p className="mt-0.5">{scan.errorMessage ?? "Unknown error"}</p>
          </div>
        </StatusBanner>
      )}

      {unmapped > 0 && (
        <StatusBanner variant="warning">
          <div>
            <p className="font-semibold">{unmapped} unmapped detection{unmapped === 1 ? "" : "s"}</p>
            <p className="mt-1">
              Optional trackers without a purpose and vendor block policy publish. Map them in{" "}
              <Link href="/dashboard/trackers" className="font-semibold underline underline-offset-2">
                Trackers
              </Link>
              .
            </p>
          </div>
        </StatusBanner>
      )}

      {/* ── Stat cards ───────────────────────────────────────────────────── */}
      {scan.status === "completed" && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Items Detected"
            value={results.length}
            icon={<IconItems />}
            iconColor="blue"
          />
          <StatCard
            label="Known Trackers"
            value={known}
            icon={<IconKnown />}
            iconColor="green"
            description={results.length > 0 ? `${Math.round(known / results.length * 100)}% identified` : undefined}
          />
          <StatCard
            label="High Risk"
            value={highRisk}
            icon={<IconHighRisk />}
            iconColor="rose"
          />
          <StatCard
            label="Pages Scanned"
            value={scan.pagesScanned}
            icon={<IconPages />}
            iconColor="purple"
          />
        </div>
      )}

      {/* ── Type breakdown pills ─────────────────────────────────────────── */}
      {Object.keys(byType).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byType)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <div key={type}
                className="flex items-center gap-2 rounded-2xl bg-[var(--card)] px-4 py-2 text-sm soft-shadow">
                <span className={`h-2 w-2 rounded-full ${TYPE_DOTS[type] ?? "bg-[var(--muted-foreground)]"}`} />
                <span className="font-semibold text-[var(--foreground)]">{count}</span>
                <span className="capitalize text-[var(--muted-foreground)]">{type}</span>
              </div>
            ))}
        </div>
      )}

      {/* ── No results ───────────────────────────────────────────────────── */}
      {scan.status === "completed" && results.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--success-soft)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-[var(--foreground)]">No trackers detected</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                No third-party scripts, pixels, or tracking patterns were found.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Results table ────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <Card>
          <div className="card-section-header">
            <h2 className="text-base font-semibold leading-snug text-[var(--foreground)]">Detected items</h2>
            <span className="mt-0.5 shrink-0 rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
              {results.length} item{results.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="table-scroll scrollbar-thin">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                  {["Name", "Type", "Domain", "Matched tracker", "Purpose", "Vendor", "Status"].map((h) => (
                    <th key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {results.map((r) => (
                  <tr key={r.id} className="group transition-colors hover:bg-[var(--muted)]/80">

                    {/* Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TYPE_DOTS[r.type] ?? "bg-[var(--muted-foreground)]"}`} />
                        <span className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                          {r.name}
                        </span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-5 py-4">
                      <TypeBadge type={r.type} />
                      <div className="mt-1"><RiskBadge risk={r.riskLevel} /></div>
                    </td>

                    {/* Domain */}
                    <td className="px-5 py-4">
                      {r.domain ? (
                        <code className="rounded-lg bg-[var(--secondary)] px-2 py-0.5 font-mono text-xs text-[var(--muted-foreground)] group-hover:bg-[var(--info-soft)] group-hover:text-[var(--primary)] transition-colors">
                          {r.domain}
                        </code>
                      ) : <span className="text-[var(--muted-foreground)]">—</span>}
                    </td>

                    {/* Identifier */}
                    <td className="px-5 py-4">
                      {r.identifier ? (
                        <code className="block max-w-[200px] truncate rounded-lg bg-[var(--secondary)] px-2 py-0.5 font-mono text-xs text-[var(--muted-foreground)]">
                          {r.identifier}
                        </code>
                      ) : <span className="text-[var(--muted-foreground)]">—</span>}
                    </td>

                    <td className="px-5 py-4">
                      {((r.details as Record<string, unknown>)?.matchedTrackerName as string | undefined) || r.name}
                    </td>
                    <td className="px-5 py-4">{r.purposeName ?? <span className="text-[var(--muted-foreground)]">—</span>}</td>
                    <td className="px-5 py-4">{r.vendorName ?? <span className="text-[var(--muted-foreground)]">—</span>}</td>
                    <td className="px-5 py-4">
                      <Badge
                        variant={r.purposeName || r.vendorName || r.classificationStatus === "mapped" ? "success" : "warning"}
                        size="sm"
                      >
                        {r.purposeName || r.vendorName || r.classificationStatus === "mapped" ? "Configured" : "Unmapped"}
                      </Badge>
                      {!(r.purposeName || r.vendorName) && (
                        <Link href="/dashboard/trackers" className="mt-1 block text-xs font-medium text-[var(--primary)]">
                          Assign vendor + purpose
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
