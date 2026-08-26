import { auth } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { trackers } from "@/db/schema/trackers";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { TrackerList, type TrackerRow } from "@/components/trackers/tracker-list";

// Auth + bootstrap guaranteed by the dashboard layout.
export default async function TrackersPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  // Trackers scope through websites — get org websites first.
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
          })
          .from(trackers)
          .where(inArray(trackers.websiteId, websiteIds))
          .orderBy(trackers.name)
      : [];

  // Resolve vendor and purpose names in bulk.
  const vendorIds = [
    ...new Set(trackerRows.map((t) => t.vendorId).filter(Boolean) as string[]),
  ];
  const purposeIds = [
    ...new Set(trackerRows.map((t) => t.purposeId).filter(Boolean) as string[]),
  ];

  const [vendorRows, purposeRows] = await Promise.all([
    vendorIds.length > 0
      ? db
          .select({ id: vendors.id, name: vendors.name })
          .from(vendors)
          .where(inArray(vendors.id, vendorIds))
      : Promise.resolve([]),
    purposeIds.length > 0
      ? db
          .select({ id: purposes.id, name: purposes.name })
          .from(purposes)
          .where(inArray(purposes.id, purposeIds))
      : Promise.resolve([]),
  ]);

  const vendorMap = new Map(vendorRows.map((v) => [v.id, v.name]));
  const purposeMap = new Map(purposeRows.map((p) => [p.id, p.name]));

  const rows: TrackerRow[] = trackerRows.map((t) => {
    const site = websiteMap.get(t.websiteId);
    return {
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
      websiteName: site?.name,
      websiteDomain: site?.domain,
      vendorName: t.vendorId ? (vendorMap.get(t.vendorId) ?? null) : null,
      purposeName: t.purposeId ? (purposeMap.get(t.purposeId) ?? null) : null,
    };
  });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Trackers</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Cookies and tracking technologies detected across all your websites.
        </p>
      </div>

      {/* Summary counts by type */}
      {rows.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-3">
          {[...new Set(rows.map((r) => r.type))].sort().map((type) => {
            const count = rows.filter((r) => r.type === type).length;
            return (
              <div key={type} className="rounded-lg border bg-white px-4 py-3 text-sm">
                <span className="capitalize text-neutral-600">{type}</span>
                <span className="ml-2 font-semibold text-neutral-900">{count}</span>
              </div>
            );
          })}
          <div className="rounded-lg border bg-white px-4 py-3 text-sm">
            <span className="text-neutral-600">Total</span>
            <span className="ml-2 font-semibold text-neutral-900">{rows.length}</span>
          </div>
        </div>
      )}

      <TrackerList trackers={rows} showWebsite={true} />
    </div>
  );
}
