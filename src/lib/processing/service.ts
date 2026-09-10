import "server-only";

import { and, eq, inArray, or, isNull } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { purposes } from "@/db/schema/purposes";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { vendors } from "@/db/schema/vendors";
import {
  crossBorderTransfers,
  processingActivities,
  vendorRelationships,
} from "@/db/schema/processing-inventory";
import { isoOrNull, parseDpaStatus, parseDownstreamDsarMode, parseStringList, parseTransferMechanism, parseVendorRole, parseVendorStatus, type FrozenActivity, type FrozenRelationship, type FrozenTransfer, type FrozenVendor, type ProcessingInventoryInput } from "./types";
import { buildProcessingSnapshot } from "./snapshot";

function appliesToWebsite(websiteId: string, rowWebsiteId: string | null): boolean {
  return rowWebsiteId === null || rowWebsiteId === websiteId;
}

export async function loadLiveProcessingInventory(input: {
  organizationId: string;
  websiteId: string;
  vendorIds?: string[];
}): Promise<ProcessingInventoryInput> {
  const scoped = Array.isArray(input.vendorIds);
  const vendorFilter = scoped && input.vendorIds && input.vendorIds.length > 0
    ? and(eq(vendors.organizationId, input.organizationId), inArray(vendors.id, input.vendorIds))
    : scoped
      ? null
      : eq(vendors.organizationId, input.organizationId);

  const vendorRows = vendorFilter
    ? await db
        .select({
          id: vendors.id,
          key: vendors.key,
          name: vendors.name,
          legalName: vendors.legalName,
          role: vendors.role,
          country: vendors.country,
          processingCountries: vendors.processingCountries,
          privacyPolicyUrl: vendors.privacyPolicyUrl,
          dpaStatus: vendors.dpaStatus,
          dpaReference: vendors.dpaReference,
          dpaEffectiveAt: vendors.dpaEffectiveAt,
          downstreamDsarMode: vendors.downstreamDsarMode,
          status: vendors.status,
          deletedAt: vendors.deletedAt,
        })
        .from(vendors)
        .where(vendorFilter)
    : [];

  const ids = vendorRows.map((row) => row.id);
  const purposeLinks = ids.length
    ? await db
        .select({
          vendorId: vendorPurposes.vendorId,
          purposeId: vendorPurposes.purposeId,
          processingRole: vendorPurposes.processingRole,
          purposeKey: purposes.key,
        })
        .from(vendorPurposes)
        .innerJoin(purposes, eq(vendorPurposes.purposeId, purposes.id))
        .where(
          and(
            inArray(vendorPurposes.vendorId, ids),
            eq(purposes.organizationId, input.organizationId),
          ),
        )
    : [];

  const purposesByVendor = new Map<string, FrozenVendor["purposes"]>();
  for (const link of purposeLinks) {
    const list = purposesByVendor.get(link.vendorId) ?? [];
    list.push({
      purposeId: link.purposeId,
      purposeKey: link.purposeKey,
      processingRole: link.processingRole,
    });
    purposesByVendor.set(link.vendorId, list);
  }

  const frozenVendors: FrozenVendor[] = vendorRows.map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    legalName: row.legalName,
    role: parseVendorRole(row.role),
    country: row.country,
    processingCountries: parseStringList(row.processingCountries),
    privacyPolicyUrl: row.privacyPolicyUrl,
    dpaStatus: parseDpaStatus(row.dpaStatus),
    dpaReference: row.dpaReference,
    dpaEffectiveAt: isoOrNull(row.dpaEffectiveAt),
    downstreamDsarMode: parseDownstreamDsarMode(row.downstreamDsarMode),
    status: row.deletedAt ? "archived" : parseVendorStatus(row.status),
    purposes: purposesByVendor.get(row.id) ?? [],
  }));

  const activityRows = await db
    .select({
      activity: processingActivities,
      purposeKey: purposes.key,
    })
    .from(processingActivities)
    .leftJoin(purposes, eq(processingActivities.purposeId, purposes.id))
    .where(
      and(
        eq(processingActivities.organizationId, input.organizationId),
        or(
          isNull(processingActivities.websiteId),
          eq(processingActivities.websiteId, input.websiteId),
        ),
      ),
    );

  const activities: FrozenActivity[] = activityRows
    .filter((row) => appliesToWebsite(input.websiteId, row.activity.websiteId))
    .filter((row) => !scoped || (input.vendorIds ?? []).includes(row.activity.vendorId))
    .map((row) => ({
      id: row.activity.id,
      vendorId: row.activity.vendorId,
      websiteId: row.activity.websiteId,
      purposeId: row.activity.purposeId,
      purposeKey: row.purposeKey,
      description: row.activity.description,
      dataCategories: parseStringList(row.activity.dataCategories),
      sensitive: row.activity.sensitive,
      processingRole: row.activity.processingRole,
      processingLocation: row.activity.processingLocation,
      transferRequired: row.activity.transferRequired,
      legalBasis: row.activity.legalBasis,
      status: row.activity.status,
    }));

  const relationshipRows = await db
    .select()
    .from(vendorRelationships)
    .where(eq(vendorRelationships.organizationId, input.organizationId));

  const relationships: FrozenRelationship[] = relationshipRows
    .filter((row) => !scoped || (input.vendorIds ?? []).includes(row.parentVendorId) || (input.vendorIds ?? []).includes(row.childVendorId))
    .map((row) => ({
      id: row.id,
      parentVendorId: row.parentVendorId,
      childVendorId: row.childVendorId,
      relationshipType: row.relationshipType,
      status: row.status,
    }));

  const transferRows = await db
    .select()
    .from(crossBorderTransfers)
    .where(
      and(
        eq(crossBorderTransfers.organizationId, input.organizationId),
        or(
          isNull(crossBorderTransfers.websiteId),
          eq(crossBorderTransfers.websiteId, input.websiteId),
        ),
      ),
    );

  const transfers: FrozenTransfer[] = transferRows
    .filter((row) => appliesToWebsite(input.websiteId, row.websiteId))
    .filter((row) => !scoped || (input.vendorIds ?? []).includes(row.vendorId))
    .map((row) => ({
      id: row.id,
      vendorId: row.vendorId,
      websiteId: row.websiteId,
      processingActivityId: row.processingActivityId,
      sourceCountry: row.sourceCountry,
      destinationCountry: row.destinationCountry,
      destinationRegion: row.destinationRegion,
      destinationType: row.destinationType,
      transferPurpose: row.transferPurpose,
      dataCategories: parseStringList(row.dataCategories),
      processingLocation: row.processingLocation,
      mechanism: parseTransferMechanism(row.mechanism),
      safeguards: row.safeguards,
      documentationRef: row.documentationRef,
      effectiveAt: isoOrNull(row.effectiveAt),
      reviewAt: isoOrNull(row.reviewAt),
      status: row.status,
    }));

  return {
    vendors: frozenVendors,
    activities,
    relationships,
    transfers,
  };
}

export async function buildLivePolicyProcessingSnapshot(input: {
  organizationId: string;
  websiteId: string;
  policyVersionId: string;
  policyVersion: number;
  vendorIds: string[];
  frozenAt?: Date;
}) {
  const inventory = await loadLiveProcessingInventory({
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    vendorIds: input.vendorIds,
  });
  return buildProcessingSnapshot({
    frozenAt: (input.frozenAt ?? new Date()).toISOString(),
    policyVersionId: input.policyVersionId,
    policyVersion: input.policyVersion,
    inventory,
  });
}

export async function writeProcessingAudit(input: {
  organizationId: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    organizationId: input.organizationId,
    userId: input.userId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    description: input.description,
    metadata: input.metadata ?? {},
  });
}

export function publicVendorFields<T extends { role?: string | null }>(vendor: T) {
  return {
    role: parseVendorRole(vendor.role),
  };
}
