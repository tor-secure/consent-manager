import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { purposes } from "@/db/schema/purposes";
import { trackers } from "@/db/schema/trackers";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { vendors } from "@/db/schema/vendors";
import { websites } from "@/db/schema/websites";
import { loadOrganizationVendorList } from "@/lib/processing/dashboard-queries";
import {
  VendorsWorkspace,
  type VendorWorkspaceRow,
} from "@/components/vendors/vendors-workspace";
import { StatusBanner } from "@/components/ui/status-banner";

function deriveCategory(purposeNames: string[], vendorName: string, key: string) {
  const hay = `${purposeNames.join(" ")} ${vendorName} ${key}`.toLowerCase();
  if (/necess|essential/.test(hay)) return "Necessary";
  if (/advert|market|ad\b|ads/.test(hay)) return "Advertising";
  if (/analytic|statistic|measure|clarity|hotjar/.test(hay)) return "Analytics";
  if (/function|prefer|support|chat|payment|stripe|zendesk|intercom/.test(hay)) return "Functional";
  if (purposeNames[0]) return purposeNames[0];
  return "Other";
}

export default async function VendorsPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);
  if (!localOrg) return null;

  const { rows, schemaLimited } = await loadOrganizationVendorList(localOrg.id);
  const vendorIds = rows.map((row) => row.id);

  const [descRows, purposeLinks, cookieRows] = await Promise.all([
    vendorIds.length > 0
      ? db
          .select({
            id: vendors.id,
            description: vendors.description,
            updatedAt: vendors.updatedAt,
          })
          .from(vendors)
          .where(inArray(vendors.id, vendorIds))
      : Promise.resolve([] as Array<{ id: string; description: string | null; updatedAt: Date }>),
    vendorIds.length > 0
      ? db
          .select({
            vendorId: vendorPurposes.vendorId,
            purposeName: purposes.name,
          })
          .from(vendorPurposes)
          .innerJoin(purposes, eq(vendorPurposes.purposeId, purposes.id))
          .where(inArray(vendorPurposes.vendorId, vendorIds))
      : Promise.resolve([] as Array<{ vendorId: string; purposeName: string }>),
    vendorIds.length > 0
      ? db
          .select({
            vendorId: trackers.vendorId,
            cookieCount: sql<number>`count(*)::int`,
          })
          .from(trackers)
          .innerJoin(websites, eq(trackers.websiteId, websites.id))
          .where(and(eq(websites.organizationId, localOrg.id), inArray(trackers.vendorId, vendorIds)))
          .groupBy(trackers.vendorId)
      : Promise.resolve([] as Array<{ vendorId: string | null; cookieCount: number }>),
  ]);

  const descMap = new Map(descRows.map((row) => [row.id, row]));
  const purposeMap = new Map<string, string[]>();
  for (const link of purposeLinks) {
    const list = purposeMap.get(link.vendorId) ?? [];
    if (!list.includes(link.purposeName)) list.push(link.purposeName);
    purposeMap.set(link.vendorId, list);
  }
  const cookieMap = new Map(
    cookieRows
      .filter((row): row is { vendorId: string; cookieCount: number } => Boolean(row.vendorId))
      .map((row) => [row.vendorId, Number(row.cookieCount)]),
  );

  const vendorList: VendorWorkspaceRow[] = rows.map((row) => {
    const purposeNames = purposeMap.get(row.id) ?? [];
    const extra = descMap.get(row.id);
    return {
      ...row,
      description: extra?.description ?? null,
      updatedAt: extra?.updatedAt ?? row.createdAt,
      purposes: purposeNames,
      cookieCount: cookieMap.get(row.id) ?? 0,
      category: deriveCategory(purposeNames, row.name, row.key),
    };
  });

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      {schemaLimited ? (
        <StatusBanner variant="warning">
          Vendor role and DPA columns are not in this database yet. The list still loads. Apply pending schema
          (npm run db:ensure-schema) before publishing policies that reference these vendors.
        </StatusBanner>
      ) : null}

      <VendorsWorkspace vendors={vendorList} />
    </div>
  );
}
