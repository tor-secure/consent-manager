import { auth } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { trackers } from "@/db/schema/trackers";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { TrackerManager, type ManagedTracker, type UnmappedTracker } from "@/components/trackers/tracker-manager";
import { isUnmappedForReview } from "@/lib/trackers/management";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, PageHeaderLink } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconScript() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconEssential() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconBlocked() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Type breakdown mini-card
// ---------------------------------------------------------------------------

const TYPE_DOTS: Record<string, string> = {
  cookie:      "bg-[var(--warning)]",
  pixel:       "bg-[var(--info)]",
  script:      "bg-[var(--purple)]",
  iframe:      "bg-[var(--primary)]",
  beacon:      "bg-[var(--pink)]",
  fingerprint: "bg-[var(--danger)]",
  storage:     "bg-[var(--teal)]",
  other:       "bg-[var(--muted-foreground)]",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function TrackersPage() {
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

  const trackerRows =
    websiteIds.length > 0
      ? await db
          .select({
            id: trackers.id,
            websiteId: trackers.websiteId,
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
            category: trackers.category,
            party: trackers.party,
            description: trackers.description,
            cookieNames: trackers.cookieNames,
            storageTypes: trackers.storageTypes,
            localStorageKeys: trackers.localStorageKeys,
            sessionStorageKeys: trackers.sessionStorageKeys,
            scriptUrlPatterns: trackers.scriptUrlPatterns,
            iframeUrlPatterns: trackers.iframeUrlPatterns,
            pixelUrlPatterns: trackers.pixelUrlPatterns,
            duration: trackers.duration,
            deletionBehavior: trackers.deletionBehavior,
            scannerClassification: trackers.scannerClassification,
            updatedAt: trackers.updatedAt,
          })
          .from(trackers)
          .where(inArray(trackers.websiteId, websiteIds))
          .orderBy(trackers.name)
      : [];

  const [vendorRows, purposeRows] = await Promise.all([
    db.select({ id: vendors.id, name: vendors.name }).from(vendors).where(eq(vendors.organizationId, localOrg.id)),
    db.select({ id: purposes.id, name: purposes.name }).from(purposes).where(eq(purposes.organizationId, localOrg.id)),
  ]);

  const vendorMap  = new Map(vendorRows.map((v) => [v.id, v.name]));
  const purposeMap = new Map(purposeRows.map((p) => [p.id, p.name]));

  const rows: ManagedTracker[] = trackerRows.map((t) => {
    const site = websiteMap.get(t.websiteId);
    return {
      id: t.id,
      websiteId: t.websiteId,
      name: t.name,
      type: t.type,
      domain: t.domain,
      identifier: t.identifier,
      status: t.status,
      isEssential: t.isEssential,
      category: t.category,
      party: t.party,
      description: t.description,
      vendorId: t.vendorId,
      purposeId: t.purposeId,
      vendorName:  t.vendorId  ? (vendorMap.get(t.vendorId)   ?? null) : null,
      purposeName: t.purposeId ? (purposeMap.get(t.purposeId) ?? null) : null,
      cookieNames: t.cookieNames ?? [],
      storageTypes: t.storageTypes ?? [],
      localStorageKeys: t.localStorageKeys ?? [],
      sessionStorageKeys: t.sessionStorageKeys ?? [],
      scriptUrlPatterns: t.scriptUrlPatterns ?? [],
      iframeUrlPatterns: t.iframeUrlPatterns ?? [],
      pixelUrlPatterns: t.pixelUrlPatterns ?? [],
      duration: t.duration,
      deletionBehavior: t.deletionBehavior,
      scannerClassification: t.scannerClassification,
      updatedAt: t.updatedAt,
      websiteName: site?.name,
      websiteDomain: site?.domain,
    };
  });

  const unmapped: UnmappedTracker[] = rows
    .filter((row) => isUnmappedForReview({
      purposeId: row.purposeId,
      vendorId: row.vendorId,
      isEssential: row.isEssential,
      status: row.status,
      scannerClassification: row.scannerClassification,
    }))
    .map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      domain: row.domain,
      identifier: row.identifier,
      websiteId: row.websiteId,
      websiteName: row.websiteName ?? "Website",
      recommendedAction: "Assign vendor + purpose + classification",
      detectionCount: 1,
      firstDetected: trackerRows.find((item) => item.id === row.id)?.firstSeenAt ?? null,
      lastDetected: trackerRows.find((item) => item.id === row.id)?.lastSeenAt ?? null,
      pages: [],
    }));

  const total     = rows.filter((r) => r.status !== "archived").length;
  const essential = rows.filter((r) => r.isEssential && r.status === "active").length;
  const blocked   = unmapped.length;
  const byType    = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">

      <PageHeader
        title="Trackers"
        description="Map cookies and tracking technologies to vendors and purposes. Changes update the live SDK configuration without a rebuild."
        action={
          <PageHeaderLink href="/dashboard/scanner">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            Run scan
          </PageHeaderLink>
        }
      />

      {/* ── No websites ─────────────────────────────────────────────────── */}
      {websiteIds.length === 0 && (
        <EmptyState
          title="No websites yet"
          description="Add a website and run a scan to detect trackers."
          actionLabel="Add a website"
          actionHref="/dashboard/websites/new"
        />
      )}

      {/* ── Has data: stat cards + type breakdown + table ───────────────── */}
      {websiteIds.length > 0 && (
        <>
          {/* Stat cards — always shown even when total = 0 */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Trackers"
              value={total}
              icon={<IconShield />}
              iconColor="blue"
              description="across all websites"
            />
            <StatCard
              label="Scripts & Pixels"
              value={(byType.script ?? 0) + (byType.pixel ?? 0)}
              icon={<IconScript />}
              iconColor="purple"
              description={total > 0 ? `${Math.round(((byType.script ?? 0) + (byType.pixel ?? 0)) / total * 100)}% of total` : undefined}
            />
            <StatCard
              label="Essential"
              value={essential}
              icon={<IconEssential />}
              iconColor="green"
              description="always allowed"
            />
            <StatCard
              label="Unmapped"
              value={blocked}
              icon={<IconBlocked />}
              iconColor="rose"
              description="need vendor and purpose"
            />
          </div>

          {/* Type breakdown pills */}
          {total > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(byType)
                .sort((a, b) => b[1] - a[1])
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

          <TrackerManager
            trackers={rows}
            unmapped={unmapped}
            websites={orgWebsites.map((site) => ({ id: site.id, name: site.name }))}
            vendors={vendorRows}
            purposes={purposeRows}
          />
        </>
      )}
    </div>
  );
}
