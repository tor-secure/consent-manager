import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq, desc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { scans } from "@/db/schema/scans";
import { StartScanForm } from "@/components/scanner/start-scan-form";

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
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? styles.queued}`}>
      {status}
    </span>
  );
}

function fmt(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  }) + " " + date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// Page — server component
// ---------------------------------------------------------------------------

export default async function ScannerPage() {
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
    .where(eq(websites.organizationId, localOrg.id))
    .orderBy(websites.name);

  const websiteIds = orgWebsites.map((w) => w.id);
  const websiteMap = new Map(orgWebsites.map((w) => [w.id, w]));

  const scanHistory =
    websiteIds.length > 0
      ? await db
          .select({
            id: scans.id,
            websiteId: scans.websiteId,
            status: scans.status,
            scanType: scans.scanType,
            pagesScanned: scans.pagesScanned,
            itemsDetected: scans.itemsDetected,
            errorMessage: scans.errorMessage,
            startedAt: scans.startedAt,
            completedAt: scans.completedAt,
            createdAt: scans.createdAt,
          })
          .from(scans)
          .where(inArray(scans.websiteId, websiteIds))
          .orderBy(desc(scans.createdAt))
          .limit(100)
      : [];

  const completedScans = scanHistory.filter((s) => s.status === "completed").length;
  const totalItems = scanHistory.reduce((sum, s) => sum + s.itemsDetected, 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Scanner</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Scan your websites for cookies, scripts, pixels, and tracking technologies.
          {completedScans > 0 && (
            <> {completedScans} scan{completedScans !== 1 ? "s" : ""} completed · {totalItems} items detected total.</>
          )}
        </p>
      </div>

      {/* Start scan form */}
      <div className="mb-8">
        {orgWebsites.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-sm font-medium text-neutral-600">No websites yet</p>
            <p className="mt-1 text-sm text-neutral-400">Add a website before running a scan.</p>
            <Link href="/dashboard/websites/new" className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
              Add website
            </Link>
          </div>
        ) : (
          <StartScanForm websites={orgWebsites} />
        )}
      </div>

      {/* Scan history */}
      {scanHistory.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-neutral-900">Scan history</h2>
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="min-w-full divide-y text-sm">
              <thead>
                <tr className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Started</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {scanHistory.map((scan) => {
                  const site = websiteMap.get(scan.websiteId);
                  const duration =
                    scan.startedAt && scan.completedAt
                      ? `${Math.round((scan.completedAt.getTime() - scan.startedAt.getTime()) / 1000)}s`
                      : "—";

                  return (
                    <tr key={scan.id} className="transition hover:bg-neutral-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900">{site?.name ?? "—"}</p>
                        {site?.domain && <p className="text-xs text-neutral-400">{site.domain}</p>}
                      </td>
                      <td className="px-4 py-3 capitalize text-neutral-600">{scan.scanType}</td>
                      <td className="px-4 py-3">
                        <ScanStatusBadge status={scan.status} />
                        {scan.errorMessage && (
                          <p className="mt-0.5 max-w-xs truncate text-xs text-red-500">
                            {scan.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {scan.status === "completed" ? scan.itemsDetected : "—"}
                      </td>
                      <td className="px-4 py-3 text-neutral-500">{fmt(scan.startedAt)}</td>
                      <td className="px-4 py-3 text-neutral-500">{duration}</td>
                      <td className="px-4 py-3 text-right">
                        {scan.status === "completed" && (
                          <Link
                            href={`/dashboard/scanner/${scan.id}`}
                            className="text-sm font-medium text-neutral-900 hover:underline"
                          >
                            View results
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {orgWebsites.length > 0 && scanHistory.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">No scans yet</p>
          <p className="mt-1 text-sm text-neutral-400">
            Run your first scan to detect cookies and tracking technologies.
          </p>
        </div>
      )}
    </div>
  );
}
