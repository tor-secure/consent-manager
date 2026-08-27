import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { scans } from "@/db/schema/scans";
import { scanResults } from "@/db/schema/scan-results";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ScanStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    queued:    "bg-neutral-100 text-neutral-600",
    running:   "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
    completed: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
    failed:    "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[status] ?? styles.queued}`}>
      {status}
    </span>
  );
}

function RiskBadge({ risk }: { risk: string | null }) {
  const styles: Record<string, string> = {
    high:    "bg-red-50 text-red-700",
    medium:  "bg-amber-50 text-amber-700",
    low:     "bg-green-50 text-green-700",
    unknown: "bg-neutral-100 text-neutral-500",
  };
  const label = risk ?? "unknown";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[label] ?? styles.unknown}`}>
      {label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    cookie:      "bg-amber-50 text-amber-700",
    pixel:       "bg-blue-50 text-blue-700",
    script:      "bg-purple-50 text-purple-700",
    beacon:      "bg-pink-50 text-pink-700",
    fingerprint: "bg-red-50 text-red-700",
    storage:     "bg-teal-50 text-teal-700",
    other:       "bg-neutral-100 text-neutral-600",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[type] ?? styles.other}`}>
      {type}
    </span>
  );
}

function fmt(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    + " "
    + date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ---------------------------------------------------------------------------
// Page — server component
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
    .where(
      and(
        eq(scans.id, scanId),
        inArray(scans.websiteId, websiteIds),
      ),
    )
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

  // Summary by type and risk.
  const byType = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});

  const byRisk = results.reduce<Record<string, number>>((acc, r) => {
    const risk = r.riskLevel ?? "unknown";
    acc[risk] = (acc[risk] ?? 0) + 1;
    return acc;
  }, {});

  const known = results.filter((r) => r.classificationStatus === "known").length;
  const duration =
    scan.startedAt && scan.completedAt
      ? `${Math.round((scan.completedAt.getTime() - scan.startedAt.getTime()) / 1000)}s`
      : null;

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/dashboard/scanner" className="hover:text-neutral-900">Scanner</Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-900">{website?.name ?? scanId.slice(0, 8)}</span>
      </nav>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-neutral-900">
              Scan results
            </h1>
            <ScanStatusBadge status={scan.status} />
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {website?.name} ({website?.domain}) ·{" "}
            {fmt(scan.startedAt)}
            {duration && ` · ${duration}`}
          </p>
        </div>

        <Link
          href="/dashboard/scanner"
          className="shrink-0 rounded-md border bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          ← Back to scanner
        </Link>
      </div>

      {/* Error state */}
      {scan.status === "failed" && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Scan failed:</strong> {scan.errorMessage ?? "Unknown error"}
        </div>
      )}

      {/* Summary cards */}
      {scan.status === "completed" && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-white p-5">
            <p className="text-sm text-neutral-500">Items detected</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{results.length}</p>
          </div>
          <div className="rounded-lg border bg-white p-5">
            <p className="text-sm text-neutral-500">Known trackers</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{known}</p>
          </div>
          <div className="rounded-lg border bg-white p-5">
            <p className="text-sm text-neutral-500">High risk</p>
            <p className="mt-1 text-2xl font-semibold text-red-600">{byRisk.high ?? 0}</p>
          </div>
          <div className="rounded-lg border bg-white p-5">
            <p className="text-sm text-neutral-500">Pages scanned</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{scan.pagesScanned}</p>
          </div>
        </div>
      )}

      {/* Type summary */}
      {Object.keys(byType).length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {Object.entries(byType)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <div key={type} className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm">
                <TypeBadge type={type} />
                <span className="font-semibold text-neutral-900">{count}</span>
              </div>
            ))}
        </div>
      )}

      {/* Empty — no results */}
      {scan.status === "completed" && results.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">No trackers detected</p>
          <p className="mt-1 text-sm text-neutral-400">
            No third-party scripts, pixels, or tracking patterns were found on the scanned page.
          </p>
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full divide-y text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Identifier</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Classification</th>
                <th className="px-4 py-3">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {results.map((r) => (
                <tr key={r.id} className="transition hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-900">{r.name}</td>
                  <td className="px-4 py-3"><TypeBadge type={r.type} /></td>
                  <td className="px-4 py-3 text-neutral-500">
                    {r.domain ? (
                      <code className="font-mono text-xs">{r.domain}</code>
                    ) : <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {r.identifier ? (
                      <code className="max-w-[220px] block truncate font-mono text-xs text-neutral-400">
                        {r.identifier}
                      </code>
                    ) : <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="px-4 py-3"><RiskBadge risk={r.riskLevel} /></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${r.classificationStatus === "known" ? "text-green-700" : "text-neutral-400"}`}>
                      {r.classificationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize text-neutral-500">
                    {(r.details as Record<string, unknown>).category as string ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
