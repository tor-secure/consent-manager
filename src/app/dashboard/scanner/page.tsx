import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq, desc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { scans } from "@/db/schema/scans";
import { websiteScanSchedules } from "@/db/schema/website-scan-schedules";
import { StartScanForm } from "@/components/scanner/start-scan-form";
import { ScanSchedulePanel } from "@/components/scanner/scan-schedule-panel";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

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

  const scheduleRows =
    websiteIds.length > 0
      ? await db
          .select({
            websiteId: websiteScanSchedules.websiteId,
            enabled: websiteScanSchedules.enabled,
            frequency: websiteScanSchedules.frequency,
            timezone: websiteScanSchedules.timezone,
            nextScanAt: websiteScanSchedules.nextScanAt,
            lastScanAt: websiteScanSchedules.lastScanAt,
            lastScanStatus: websiteScanSchedules.lastScanStatus,
            lastError: websiteScanSchedules.lastError,
          })
          .from(websiteScanSchedules)
          .where(eq(websiteScanSchedules.organizationId, localOrg.id))
      : [];
  const scheduleMap = new Map(scheduleRows.map((row) => [row.websiteId, row]));

  const scanHistory =
    websiteIds.length > 0
      ? await db
          .select({
            id: scans.id,
            websiteId: scans.websiteId,
            status: scans.status,
            scanType: scans.scanType,
            triggeredBy: scans.triggeredBy,
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
    <div className="page-wrap space-y-6 sm:space-y-8">

      <PageHeader
        title="Scanner"
        description="Scan your websites for cookies, scripts, pixels, and tracking technologies."
      />

      {/* ── No websites empty state ──────────────────────────────────────── */}
      {orgWebsites.length === 0 && (
        <EmptyState
          title="No websites yet"
          description="Add a website before running a scan."
          actionLabel="Add a website"
          actionHref="/dashboard/websites/new"
        />
      )}

      {orgWebsites.length > 0 && (
        <>
          {/* ── Start scan form ─────────────────────────────────────────── */}
          <div id="start-scan">
            <StartScanForm websites={orgWebsites} />
          </div>

          <ScanSchedulePanel
            schedules={orgWebsites.map((site) => {
              const schedule = scheduleMap.get(site.id);
              return {
                websiteId: site.id,
                websiteName: site.name,
                websiteDomain: site.domain,
                enabled: schedule?.enabled ?? false,
                frequency: schedule?.frequency ?? "weekly",
                timezone: schedule?.timezone ?? "UTC",
                nextScanAt: schedule?.nextScanAt?.toISOString() ?? null,
                lastScanAt: schedule?.lastScanAt?.toISOString() ?? null,
                lastScanStatus: schedule?.lastScanStatus ?? null,
                lastError: schedule?.lastError ?? null,
              };
            })}
          />

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
            <EmptyState
              title="No scans yet"
              description="Use the form above to run your first scan and detect cookies and tracking technologies."
              actionLabel="Start a scan"
              actionHref="#start-scan"
            />
          ) : (
            <Card>
              <div className="card-section-header">
                <h2 className="text-base font-semibold leading-snug text-[var(--foreground)]">Scan history</h2>
                <span className="mt-0.5 shrink-0 rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                  {totalScans} scan{totalScans !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="table-scroll scrollbar-thin">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                      {["Website", "Type", "Trigger", "Status", "Items", "Started", "Duration", ""].map((h) => (
                        <th key={h}
                          className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {scanHistory.map((scan) => {
                      const site = websiteMap.get(scan.websiteId);
                      const duration =
                        scan.startedAt && scan.completedAt
                          ? `${Math.round((scan.completedAt.getTime() - scan.startedAt.getTime()) / 1000)}s`
                          : "—";

                      return (
                        <tr key={scan.id} className="group transition-colors hover:bg-[var(--muted)]/80">
                          {/* Website */}
                          <td className="px-5 py-4">
                            <p className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                              {site?.name ?? "—"}
                            </p>
                            {site?.domain && (
                              <p className="text-xs text-[var(--muted-foreground)]">{site.domain}</p>
                            )}
                          </td>

                          {/* Type */}
                          <td className="px-5 py-4">
                            <Badge variant="neutral" size="sm" className="capitalize">
                              {scan.scanType}
                            </Badge>
                          </td>

                          <td className="px-5 py-4">
                            <Badge variant="neutral" size="sm" className="capitalize">
                              {scan.triggeredBy}
                            </Badge>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              <ScanStatusBadge status={scan.status} />
                              {scan.errorMessage && (
                                <p className="max-w-[200px] truncate text-xs text-[var(--danger)]">
                                  {scan.errorMessage}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Items */}
                          <td className="px-5 py-4">
                            {scan.status === "completed" ? (
                              <span className="font-semibold text-[var(--foreground)]">{scan.itemsDetected}</span>
                            ) : (
                              <span className="text-[var(--muted-foreground)]">—</span>
                            )}
                          </td>

                          {/* Started */}
                          <td className="px-5 py-4 text-[var(--muted-foreground)]">{fmt(scan.startedAt)}</td>

                          {/* Duration */}
                          <td className="px-5 py-4">
                            {scan.startedAt && scan.completedAt ? (
                              <Badge variant="neutral" size="sm">{duration}</Badge>
                            ) : (
                              <span className="text-[var(--muted-foreground)]">—</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-5 py-4 text-right">
                            {scan.status === "completed" && (
                              <Link
                                href={`/dashboard/scanner/${scan.id}`}
                                className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] shadow-sm transition hover:border-[var(--ring)] hover:bg-[var(--info-soft)] hover:text-[var(--primary)]"
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
