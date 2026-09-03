import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { trackers } from "@/db/schema/trackers";
import { isSchemaMismatchError } from "@/lib/schema-mismatch";
import type { ConsentGraphSnapshot } from "@/lib/intelligence/graph-model";

export type { ConsentGraphSnapshot, GraphPurpose, GraphVendor, GraphTracker } from "@/lib/intelligence/graph-model";
export { graphToTrackerRules } from "@/lib/intelligence/graph-model";

async function loadPurposes(organizationId: string) {
  try {
    return await db
      .select({
        id: purposes.id,
        key: purposes.key,
        name: purposes.name,
        isRequired: purposes.isRequired,
        dataCategories: purposes.dataCategories,
        legalBasis: purposes.legalBasis,
      })
      .from(purposes)
      .where(and(eq(purposes.organizationId, organizationId), isNull(purposes.deletedAt)));
  } catch (error) {
    if (!isSchemaMismatchError(error)) throw error;
    const rows = await db
      .select({
        id: purposes.id,
        key: purposes.key,
        name: purposes.name,
        isRequired: purposes.isRequired,
      })
      .from(purposes)
      .where(and(eq(purposes.organizationId, organizationId), isNull(purposes.deletedAt)));
    return rows.map((row) => ({ ...row, dataCategories: [] as string[], legalBasis: null as string | null }));
  }
}

export async function loadConsentGraph(
  organizationId: string,
  websiteId: string,
): Promise<ConsentGraphSnapshot | null> {
  const [website] = await db
    .select({
      id: websites.id,
      name: websites.name,
      domain: websites.domain,
    })
    .from(websites)
    .where(
      and(
        eq(websites.id, websiteId),
        eq(websites.organizationId, organizationId),
        isNull(websites.deletedAt),
      ),
    )
    .limit(1);
  if (!website) return null;

  const [purposeRows, vendorRows, trackerRows, links] = await Promise.all([
    loadPurposes(organizationId),
    db
      .select({
        id: vendors.id,
        name: vendors.name,
        domain: vendors.domain,
        country: vendors.country,
      })
      .from(vendors)
      .where(and(eq(vendors.organizationId, organizationId), isNull(vendors.deletedAt))),
    db
      .select({
        id: trackers.id,
        name: trackers.name,
        type: trackers.type,
        domain: trackers.domain,
        identifier: trackers.identifier,
        purposeId: trackers.purposeId,
        vendorId: trackers.vendorId,
        isEssential: trackers.isEssential,
        status: trackers.status,
      })
      .from(trackers)
      .where(and(eq(trackers.websiteId, websiteId), isNull(trackers.deletedAt))),
    db
      .select({
        vendorId: vendorPurposes.vendorId,
        purposeId: vendorPurposes.purposeId,
      })
      .from(vendorPurposes),
  ]);

  const vendorIds = new Set(vendorRows.map((row) => row.id));
  const purposeByVendor = new Map<string, string[]>();
  for (const link of links) {
    if (!vendorIds.has(link.vendorId)) continue;
    const list = purposeByVendor.get(link.vendorId) ?? [];
    list.push(link.purposeId);
    purposeByVendor.set(link.vendorId, list);
  }

  return {
    website,
    purposes: purposeRows.map((row) => ({
      ...row,
      dataCategories: row.dataCategories ?? [],
    })),
    vendors: vendorRows.map((row) => ({
      ...row,
      purposeIds: purposeByVendor.get(row.id) ?? [],
    })),
    trackers: trackerRows,
  };
}
