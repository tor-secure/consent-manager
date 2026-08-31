import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { scans } from "@/db/schema/scans";
import { scanResults } from "@/db/schema/scan-results";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
  cookie:      "bg-amber-500",
  pixel:       "bg-sky-500",
  script:      "bg-violet-500",
  beacon:      "bg-pink-500",
  fingerprint: "bg-rose-500",
  storage:     "bg-teal-500",
  other:       "bg-slate-400",
};

const TYPE_BADGE: Record<string, string> = {
  cookie:      "bg-amber-50  text-amber-700  ring-1 ring-amber-500/20",
  pixel:       "bg-sky-50    text-sky-700    ring-1 ring-sky-500/20",
  script:      "bg-violet-50 text-violet-700 ring-1 ring-violet-500/20",
  beacon:      "bg-pink-50   text-pink-700   ring-1 ring-pink-500/20",
  fingerprint: "bg-rose-50   text-rose-700   ring-1 ring-rose-500/20",
  storage:     "bg-teal-50   text-teal-700   ring-1 ring-teal-500/20",
  other:       "bg-slate-100 text-slate-600  ring-1 ring-slate-200",
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
    })
    .from(scanResults)
    .where(eq(scanResults.scanId, scan.id))
    .orderBy(scanResults.riskLevel, scanResults.name);

  const byType = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});

  const known   = results.filter((r) => r.classificationStatus === "known").length;
  const highRisk = results.filter((r) => r.riskLevel === "high").length;

  const duration =
    scan.startedAt && scan.completedAt
      ? `${Math.round((scan.completedAt.getTime() - scan.startedAt.getTime()) / 1000)}s`
      : null;

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">

      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/scanner"
          className="transition hover:text-slate-900">Scanner</Link>
        <span aria-hidden="true" className="text-slate-300">/</span>
        <span className="text-slate-900">{website?.name ?? scanId.slice(0, 8)}</span>
      </nav>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Scan results
            </h1>
            <ScanStatusBadge status={scan.status} />
            {duration && <Badge variant="neutral" size="sm">{duration}</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {website?.name}
            {website?.domain && <span className="text-slate-400"> · {website.domain}</span>}
            {scan.startedAt && <span> · {fmt(scan.startedAt)}</span>}
          </p>
        </div>
        <Link
          href="/dashboard/scanner"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back to scanner
        </Link>
      </div>

      {/* ── Error state ──────────────────────────────────────────────────── */}
      {scan.status === "failed" && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          <p className="font-semibold">Scan failed</p>
          <p className="mt-0.5 text-rose-700">{scan.errorMessage ?? "Unknown error"}</p>
        </div>
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
                className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm soft-shadow">
                <span className={`h-2 w-2 rounded-full ${TYPE_DOTS[type] ?? "bg-slate-400"}`} />
                <span className="font-semibold text-slate-800">{count}</span>
                <span className="capitalize text-slate-500">{type}</span>
              </div>
            ))}
        </div>
      )}

      {/* ── No results ───────────────────────────────────────────────────── */}
      {scan.status === "completed" && results.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-slate-700">No trackers detected</p>
              <p className="mt-1 text-sm text-slate-500">
                No third-party scripts, pixels, or tracking patterns were found.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Results table ────────────────────────────────────────────────── */}
      {results.length > 0 && (
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Detected items</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
              {results.length} item{results.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="table-scroll scrollbar-thin">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {["Name", "Type", "Domain", "Identifier", "Risk", "Classification", "Category"].map((h) => (
                    <th key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((r) => (
                  <tr key={r.id} className="group transition-colors hover:bg-slate-50/80">

                    {/* Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TYPE_DOTS[r.type] ?? "bg-slate-400"}`} />
                        <span className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {r.name}
                        </span>
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-5 py-4"><TypeBadge type={r.type} /></td>

                    {/* Domain */}
                    <td className="px-5 py-4">
                      {r.domain ? (
                        <code className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                          {r.domain}
                        </code>
                      ) : <span className="text-slate-400">—</span>}
                    </td>

                    {/* Identifier */}
                    <td className="px-5 py-4">
                      {r.identifier ? (
                        <code className="block max-w-[200px] truncate rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">
                          {r.identifier}
                        </code>
                      ) : <span className="text-slate-400">—</span>}
                    </td>

                    {/* Risk */}
                    <td className="px-5 py-4">
                      <RiskBadge risk={r.riskLevel} />
                    </td>

                    {/* Classification */}
                    <td className="px-5 py-4">
                      <Badge
                        variant={r.classificationStatus === "known" ? "success" : "neutral"}
                        size="sm"
                        className="capitalize"
                      >
                        {r.classificationStatus}
                      </Badge>
                    </td>

                    {/* Category */}
                    <td className="px-5 py-4">
                      {(r.details as Record<string, unknown>)?.category ? (
                        <Badge variant="neutral" size="sm" className="capitalize">
                          {(r.details as Record<string, unknown>).category as string}
                        </Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
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
