import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { purposes } from "@/db/schema/purposes";
import {
  crossBorderTransfers,
  processingActivities,
  vendorRelationships,
} from "@/db/schema/processing-inventory";
import { trackers } from "@/db/schema/trackers";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { vendors } from "@/db/schema/vendors";
import { websites } from "@/db/schema/websites";
import { isSchemaMismatchError } from "@/lib/schema-mismatch";
import type { VendorEditorModel } from "@/components/vendors/vendor-editor";

export type VendorListRecord = {
  id: string;
  key: string;
  name: string;
  domain: string | null;
  country: string | null;
  status: string;
  source: string;
  role: string;
  dpaStatus: string;
  createdAt: Date;
};

const vendorListLegacy = {
  id: vendors.id,
  key: vendors.key,
  name: vendors.name,
  domain: vendors.domain,
  country: vendors.country,
  status: vendors.status,
  source: vendors.source,
  createdAt: vendors.createdAt,
};

function toEditorVendor(row: Record<string, unknown>): VendorEditorModel {
  const countries = row.processingCountries;
  return {
    id: String(row.id),
    name: String(row.name),
    key: String(row.key),
    legalName: (row.legalName as string | null) ?? null,
    domain: (row.domain as string | null) ?? null,
    websiteUrl: (row.websiteUrl as string | null) ?? null,
    privacyPolicyUrl: (row.privacyPolicyUrl as string | null) ?? null,
    country: (row.country as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    role: String(row.role ?? "unknown"),
    processingCountries: Array.isArray(countries) ? countries.map(String) : [],
    dpaStatus: String(row.dpaStatus ?? "not_configured"),
    dpaEffectiveAt: (row.dpaEffectiveAt as Date | string | null) ?? null,
    dpaReviewAt: (row.dpaReviewAt as Date | string | null) ?? null,
    dpaReference: (row.dpaReference as string | null) ?? null,
    downstreamDsarMode: String(row.downstreamDsarMode ?? "not_required"),
    ccpaSale: String(row.ccpaSale ?? "unknown"),
    ccpaShare: String(row.ccpaShare ?? "unknown"),
    ccpaSensitivePi: String(row.ccpaSensitivePi ?? "unknown"),
    status: String(row.status ?? "active"),
  };
}

export async function loadOrganizationVendorList(organizationId: string): Promise<{
  rows: VendorListRecord[];
  schemaLimited: boolean;
}> {
  try {
    const rows = await db
      .select({
        ...vendorListLegacy,
        role: vendors.role,
        dpaStatus: vendors.dpaStatus,
      })
      .from(vendors)
      .where(eq(vendors.organizationId, organizationId))
      .orderBy(vendors.name);
    return { rows, schemaLimited: false };
  } catch (error) {
    if (!isSchemaMismatchError(error)) throw error;
    const rows = await db
      .select(vendorListLegacy)
      .from(vendors)
      .where(eq(vendors.organizationId, organizationId))
      .orderBy(vendors.name);
    return {
      rows: rows.map((row) => ({
        ...row,
        role: "unknown",
        dpaStatus: "not_configured",
      })),
      schemaLimited: true,
    };
  }
}

export async function loadVendorEditorPage(organizationId: string, vendorId: string) {
  let vendorRow: Record<string, unknown> | null = null;
  let schemaLimited = false;

  try {
    const [row] = await db
      .select()
      .from(vendors)
      .where(and(eq(vendors.id, vendorId), eq(vendors.organizationId, organizationId)))
      .limit(1);
    vendorRow = row ?? null;
  } catch (error) {
    if (!isSchemaMismatchError(error)) throw error;
    schemaLimited = true;
    const [row] = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        key: vendors.key,
        domain: vendors.domain,
        websiteUrl: vendors.websiteUrl,
        privacyPolicyUrl: vendors.privacyPolicyUrl,
        country: vendors.country,
        description: vendors.description,
        status: vendors.status,
      })
      .from(vendors)
      .where(and(eq(vendors.id, vendorId), eq(vendors.organizationId, organizationId)))
      .limit(1);
    vendorRow = row ?? null;
  }

  if (!vendorRow) return null;

  const vendor = toEditorVendor(vendorRow);

  let purposeLinks: Array<{ purposeName: string; purposeKey: string; processingRole: string | null }> = [];
  let activities: Array<{
    id: string;
    processingRole: string;
    dataCategories: string[];
    status: string;
    transferRequired: boolean;
  }> = [];
  let transfers: Array<{
    id: string;
    sourceCountry: string | null;
    destinationCountry: string | null;
    destinationRegion: string | null;
    mechanism: string;
    status: string;
  }> = [];
  let relationships: Array<{ id: string; relationshipType: string; childVendorId: string; status: string }> = [];
  let trackerRows: Array<{ id: string; name: string; status: string }> = [];
  let orgVendors: Array<{ id: string; name: string }> = [];
  let orgWebsites: Array<{ id: string; name: string }> = [];
  let orgPurposes: Array<{ id: string; name: string }> = [];
  let activityLogs: Array<{
    id: string;
    action: string;
    description: string | null;
    createdAt: Date;
  }> = [];

  try {
    [purposeLinks, activities, transfers, relationships, trackerRows, orgVendors, orgWebsites, orgPurposes, activityLogs] =
      await Promise.all([
        db
          .select({
            purposeName: purposes.name,
            purposeKey: purposes.key,
            processingRole: vendorPurposes.processingRole,
          })
          .from(vendorPurposes)
          .innerJoin(purposes, eq(vendorPurposes.purposeId, purposes.id))
          .where(and(eq(vendorPurposes.vendorId, vendor.id), eq(purposes.organizationId, organizationId))),
        db
          .select()
          .from(processingActivities)
          .where(and(eq(processingActivities.organizationId, organizationId), eq(processingActivities.vendorId, vendor.id))),
        db
          .select()
          .from(crossBorderTransfers)
          .where(and(eq(crossBorderTransfers.organizationId, organizationId), eq(crossBorderTransfers.vendorId, vendor.id))),
        db
          .select()
          .from(vendorRelationships)
          .where(
            and(
              eq(vendorRelationships.organizationId, organizationId),
              eq(vendorRelationships.parentVendorId, vendor.id),
            ),
          ),
        db
          .select({ id: trackers.id, name: trackers.name, status: trackers.status })
          .from(trackers)
          .where(eq(trackers.vendorId, vendor.id))
          .limit(20),
        db
          .select({ id: vendors.id, name: vendors.name })
          .from(vendors)
          .where(eq(vendors.organizationId, organizationId))
          .orderBy(vendors.name),
        db.select({ id: websites.id, name: websites.name }).from(websites).where(eq(websites.organizationId, organizationId)),
        db.select({ id: purposes.id, name: purposes.name }).from(purposes).where(eq(purposes.organizationId, organizationId)),
        db
          .select({
            id: auditLogs.id,
            action: auditLogs.action,
            description: auditLogs.description,
            createdAt: auditLogs.createdAt,
          })
          .from(auditLogs)
          .where(
            and(
              eq(auditLogs.organizationId, organizationId),
              eq(auditLogs.resourceType, "vendor"),
              eq(auditLogs.resourceId, vendor.id),
            ),
          )
          .orderBy(desc(auditLogs.createdAt))
          .limit(20),
      ]);
  } catch (error) {
    if (!isSchemaMismatchError(error)) throw error;
    schemaLimited = true;
    try {
      purposeLinks = await db
        .select({
          purposeName: purposes.name,
          purposeKey: purposes.key,
        })
        .from(vendorPurposes)
        .innerJoin(purposes, eq(vendorPurposes.purposeId, purposes.id))
        .where(and(eq(vendorPurposes.vendorId, vendor.id), eq(purposes.organizationId, organizationId)))
        .then((rows) => rows.map((row) => ({ ...row, processingRole: null })));
    } catch (purposeError) {
      if (!isSchemaMismatchError(purposeError)) throw purposeError;
    }
    try {
      [trackerRows, orgVendors, orgWebsites, orgPurposes] = await Promise.all([
        db
          .select({ id: trackers.id, name: trackers.name, status: trackers.status })
          .from(trackers)
          .where(eq(trackers.vendorId, vendor.id))
          .limit(20),
        db
          .select({ id: vendors.id, name: vendors.name })
          .from(vendors)
          .where(eq(vendors.organizationId, organizationId))
          .orderBy(vendors.name),
        db.select({ id: websites.id, name: websites.name }).from(websites).where(eq(websites.organizationId, organizationId)),
        db.select({ id: purposes.id, name: purposes.name }).from(purposes).where(eq(purposes.organizationId, organizationId)),
      ]);
    } catch (lookupError) {
      if (!isSchemaMismatchError(lookupError)) throw lookupError;
    }
  }

  return {
    vendor,
    schemaLimited,
    purposeLinks,
    activities,
    transfers,
    relationships,
    trackerRows,
    orgVendors,
    orgWebsites,
    orgPurposes,
    activityLogs,
  };
}

export async function loadTransfersPage(organizationId: string) {
  try {
    const [transferRows, activityRows, orgVendors, orgWebsites, orgPurposes] = await Promise.all([
      db
        .select()
        .from(crossBorderTransfers)
        .where(eq(crossBorderTransfers.organizationId, organizationId))
        .orderBy(desc(crossBorderTransfers.updatedAt)),
      db
        .select()
        .from(processingActivities)
        .where(eq(processingActivities.organizationId, organizationId))
        .orderBy(desc(processingActivities.updatedAt)),
      db
        .select({ id: vendors.id, name: vendors.name })
        .from(vendors)
        .where(eq(vendors.organizationId, organizationId))
        .orderBy(vendors.name),
      db.select({ id: websites.id, name: websites.name }).from(websites).where(eq(websites.organizationId, organizationId)),
      db.select({ id: purposes.id, name: purposes.name }).from(purposes).where(eq(purposes.organizationId, organizationId)),
    ]);
    return { transferRows, activityRows, orgVendors, orgWebsites, orgPurposes, schemaLimited: false };
  } catch (error) {
    if (!isSchemaMismatchError(error)) throw error;
    const [orgVendors, orgWebsites, orgPurposes] = await Promise.all([
      db
        .select({ id: vendors.id, name: vendors.name })
        .from(vendors)
        .where(eq(vendors.organizationId, organizationId))
        .orderBy(vendors.name),
      db.select({ id: websites.id, name: websites.name }).from(websites).where(eq(websites.organizationId, organizationId)),
      db.select({ id: purposes.id, name: purposes.name }).from(purposes).where(eq(purposes.organizationId, organizationId)),
    ]);
    return {
      transferRows: [],
      activityRows: [],
      orgVendors,
      orgWebsites,
      orgPurposes,
      schemaLimited: true,
    };
  }
}
