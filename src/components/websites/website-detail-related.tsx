import Link from "next/link";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { trackers } from "@/db/schema/trackers";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { consentPolicies } from "@/db/schema/consent-policies";
import { scans } from "@/db/schema/scans";
import { TrackerList, type TrackerRow } from "@/components/trackers/tracker-list";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function IconPolicy() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
function IconTracker() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconScanner() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}

export async function WebsiteDetailRelated({ websiteId }: { websiteId: string }) {
  const [trackerRawRows, policyRows, scanRows] = await Promise.all([
    db
      .select({
        id: trackers.id,
        vendorId: trackers.vendorId,
        purposeId: trackers.purposeId,
        name: trackers.name,
        type: trackers.type,
        domain: trackers.domain,
        identifier: trackers.identifier,
        status: trackers.status,
        isEssential: trackers.isEssential,
        detectionMethod: trackers.detectionMethod,
        lastSeenAt: trackers.lastSeenAt,
        firstSeenAt: trackers.firstSeenAt,
      })
      .from(trackers)
      .where(eq(trackers.websiteId, websiteId))
      .orderBy(trackers.name),
    db
      .select({ id: consentPolicies.id, name: consentPolicies.name, status: consentPolicies.status })
      .from(consentPolicies)
      .where(eq(consentPolicies.websiteId, websiteId)),
    db
      .select({ id: scans.id, status: scans.status, createdAt: scans.createdAt })
      .from(scans)
      .where(eq(scans.websiteId, websiteId))
      .orderBy(scans.createdAt),
  ]);

  const vendorIds = [...new Set(trackerRawRows.map((t) => t.vendorId).filter(Boolean) as string[])];
  const purposeIds = [...new Set(trackerRawRows.map((t) => t.purposeId).filter(Boolean) as string[])];

  const [vendorRows, purposeRows] = await Promise.all([
    vendorIds.length > 0
      ? db.select({ id: vendors.id, name: vendors.name }).from(vendors).where(inArray(vendors.id, vendorIds))
      : Promise.resolve([]),
    purposeIds.length > 0
      ? db.select({ id: purposes.id, name: purposes.name }).from(purposes).where(inArray(purposes.id, purposeIds))
      : Promise.resolve([]),
  ]);

  const vendorMap = new Map(vendorRows.map((v) => [v.id, v.name]));
  const purposeMap = new Map(purposeRows.map((p) => [p.id, p.name]));

  const trackerRows: TrackerRow[] = trackerRawRows.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    domain: t.domain,
    identifier: t.identifier,
    status: t.status,
    isEssential: t.isEssential,
    detectionMethod: t.detectionMethod,
    lastSeenAt: t.lastSeenAt,
    firstSeenAt: t.firstSeenAt,
    vendorName: t.vendorId ? (vendorMap.get(t.vendorId) ?? null) : null,
    purposeName: t.purposeId ? (purposeMap.get(t.purposeId) ?? null) : null,
  }));

  const policyCount = policyRows.length;
  const trackerCount = trackerRows.length;
  const scanCount = scanRows.length;
  const lastScan = scanRows[scanRows.length - 1] ?? null;
  const completedScans = scanRows.filter((s) => s.status === "completed").length;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Consent Policies"
          value={policyCount}
          icon={<IconPolicy />}
          iconColor="blue"
          description={policyCount === 0 ? "No policies yet" : undefined}
        />
        <StatCard
          label="Trackers Detected"
          value={trackerCount}
          icon={<IconTracker />}
          iconColor="purple"
          description={trackerCount === 0 ? "Run a scan to detect" : undefined}
        />
        <StatCard
          label="Scanner Runs"
          value={scanCount}
          icon={<IconScanner />}
          iconColor="green"
          description={
            lastScan
              ? `Last: ${lastScan.status}`
              : completedScans > 0
                ? `${completedScans} completed`
                : "No scans yet"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <div className="card-section-header">
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-snug text-[var(--foreground)]">Consent Policies</h2>
            <p className="mt-0.5 text-sm leading-5 text-[var(--muted-foreground)]">
              Policies define what visitors are asked to accept.
            </p>
          </div>
          {policyRows.length > 0 && (
            <span className="mt-0.5 shrink-0 rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
              {policyRows.length}
            </span>
          )}
        </div>
        <CardContent className="pt-2">
          {policyRows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm font-medium text-slate-600">No policies yet</p>
              <Link
                href={`/dashboard/policies/new?websiteId=${websiteId}`}
                className="inline-flex items-center gap-1 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                Create first policy
              </Link>
            </div>
          ) : (
            <div>
              <ul role="list" className="divide-y divide-slate-100">
                {policyRows.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-3 text-sm group">
                    <Link
                      href={`/dashboard/policies/${p.id}`}
                      className="font-medium text-slate-800 transition-colors group-hover:text-indigo-600"
                    >
                      {p.name}
                    </Link>
                    <Badge
                      variant={p.status === "active" ? "success" : "neutral"}
                      size="sm"
                      className="capitalize"
                    >
                      {p.status}
                    </Badge>
                  </li>
                ))}
              </ul>
              <div className="mt-2 border-t border-slate-100 pt-3">
                <Link
                  href={`/dashboard/policies/new?websiteId=${websiteId}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 transition hover:text-indigo-800"
                >
                  Add policy
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <div className="card-section-header">
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-snug text-[var(--foreground)]">Trackers</h2>
            <p className="mt-0.5 text-sm leading-5 text-[var(--muted-foreground)]">
              Cookies and tracking technologies detected on this website.
            </p>
          </div>
          {trackerCount > 0 && (
            <span className="mt-0.5 shrink-0 rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
              {trackerCount}
            </span>
          )}
        </div>
        <CardContent className="pt-2">
          <TrackerList trackers={trackerRows} showWebsite={false} />
        </CardContent>
      </Card>

      <Card>
        <div className="card-section-header">
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-snug text-[var(--foreground)]">Scanner</h2>
            <p className="mt-0.5 text-sm leading-5 text-[var(--muted-foreground)]">
              Automatically scan your website for cookies and trackers.
            </p>
          </div>
        </div>
        <CardContent>
          {scanCount === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <p className="text-sm font-medium text-slate-600">No scans yet</p>
              <Link
                href="/dashboard/scanner"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
              >
                Go to scanner
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Total runs", value: scanCount },
                  { label: "Completed", value: completedScans },
                  { label: "Failed", value: scanRows.filter((s) => s.status === "failed").length },
                ].map((s) => (
                  <div key={s.label}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                    <span className="font-semibold text-slate-800">{s.value}</span>
                    <span className="text-slate-500">{s.label}</span>
                  </div>
                ))}
              </div>
              {lastScan && (
                <p className="text-xs text-slate-400">
                  Last scan status:{" "}
                  <Badge
                    variant={
                      lastScan.status === "completed" ? "success"
                        : lastScan.status === "failed" ? "danger" : "primary"
                    }
                    size="sm"
                    className="capitalize"
                  >
                    {lastScan.status}
                  </Badge>
                </p>
              )}
              <Link
                href="/dashboard/scanner"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                View all scans →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </>
  );
}
