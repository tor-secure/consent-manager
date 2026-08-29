import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq, desc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { scans } from "@/db/schema/scans";
import { StartScanForm } from "@/components/scanner/start-scan-form";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconScans() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function IconCompleted() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function IconItems() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconFailed() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
function IconEmpty() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      className="text-slate-300">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(date: Date | null) {
  if (!date) return "—";
  return (
    date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    " " +
    date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

// ---------------------------------------------------------------------------
// Page
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

  const totalScans     = scanHistory.length;
  const completedScans = scanHistory.filter((s) => s.status === "completed").length;
  const failedScans    = scanHistory.filter((s) => s.status === "failed").length;
  const totalItems     = scanHistory.reduce((sum, s) => sum + s.itemsDetected, 0);

  return (
    <div className="px-5 py-8 md:px-8 md:py-10 space-y-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Scanner</h1>
        <p className="mt-1 text-sm text-slate-500">
          Scan your websites for cookies, scripts, pixels, and tracking technologies.
        </p>
      </div>

      {/* ── No websites empty state ──────────────────────────────────────── */}
      {orgWebsites.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
              <IconEmpty />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-700">No websites yet</p>
              <p className="mt-1 text-sm text-slate-500">
                Add a website before running a scan.
              </p>
            </div>
            <Link href="/dashboard/websites/new"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700">
              Add a website
            </Link>
          </CardContent>
        </Card>
      )}

      {orgWebsites.length > 0 && (
        <>
          {/* ── Start scan form ─────────────────────────────────────────── */}
          <StartScanForm websites={orgWebsites} />

          {/* ── Stat cards ──────────────────────────────────────────────── */}
          {totalScans > 0 && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="Total Scans"
                value={totalScans}
                icon={<IconScans />}
                iconColor="blue"
                description="all time"
              />
              <StatCard
                label="Completed"
                value={completedScans}
                icon={<IconCompleted />}
                iconColor="green"
                description={totalScans > 0 ? `${Math.round(completedScans / totalScans * 100)}% success rate` : undefined}
              />
              <StatCard
                label="Items Detected"
                value={totalItems}
                icon={<IconItems />}
                iconColor="purple"
                description="across all scans"
              />
              <StatCard
                label="Failed"
                value={failedScans}
                icon={<IconFailed />}
                iconColor="rose"
              />
            </div>
          )}

          {/* ── Scan history ─────────────────────────────────────────────── */}
          {scanHistory.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-14 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
                  <IconEmpty />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-700">No scans yet</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Run your first scan to detect cookies and tracking technologies.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h2 className="text-base font-semibold text-slate-900">Scan history</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                  {totalScans} scan{totalScans !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {["Website", "Type", "Status", "Items", "Started", "Duration", ""].map((h) => (
                        <th key={h}
                          className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {scanHistory.map((scan) => {
                      const site = websiteMap.get(scan.websiteId);
                      const duration =
                        scan.startedAt && scan.completedAt
                          ? `${Math.round((scan.completedAt.getTime() - scan.startedAt.getTime()) / 1000)}s`
                          : "—";

                      return (
                        <tr key={scan.id} className="group transition-colors hover:bg-slate-50/80">
                          {/* Website */}
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                              {site?.name ?? "—"}
                            </p>
                            {site?.domain && (
                              <p className="text-xs text-slate-400">{site.domain}</p>
                            )}
                          </td>

                          {/* Type */}
                          <td className="px-5 py-4">
                            <Badge variant="neutral" size="sm" className="capitalize">
                              {scan.scanType}
                            </Badge>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              <ScanStatusBadge status={scan.status} />
                              {scan.errorMessage && (
                                <p className="max-w-[200px] truncate text-xs text-rose-500">
                                  {scan.errorMessage}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Items */}
                          <td className="px-5 py-4">
                            {scan.status === "completed" ? (
                              <span className="font-semibold text-slate-800">{scan.itemsDetected}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Started */}
                          <td className="px-5 py-4 text-slate-500">{fmt(scan.startedAt)}</td>

                          {/* Duration */}
                          <td className="px-5 py-4">
                            {scan.startedAt && scan.completedAt ? (
                              <Badge variant="neutral" size="sm">{duration}</Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-5 py-4 text-right">
                            {scan.status === "completed" && (
                              <Link
                                href={`/dashboard/scanner/${scan.id}`}
                                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                              >
                                View results →
                              </Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
