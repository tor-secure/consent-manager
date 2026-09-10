import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { vendors } from "@/db/schema/vendors";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { purposes } from "@/db/schema/purposes";
import { trackers } from "@/db/schema/trackers";
import {
  crossBorderTransfers,
  processingActivities,
  vendorRelationships,
} from "@/db/schema/processing-inventory";
import {
  authorizeProcessingOrganization,
  loadOwnedVendorRecord,
} from "@/lib/processing/http";
import { parseVendorPatch } from "@/lib/processing/parse";
import { writeProcessingAudit } from "@/lib/processing/service";
import { PROCESSING_AUDIT_ACTIONS } from "@/lib/processing/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const { id } = await params;
  const vendor = await loadOwnedVendorRecord(authz.organization.id, id);
  if (!vendor) {
    return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
  }

  const [purposeLinks, activities, transfers, relationships, trackerRows] = await Promise.all([
    db
      .select({
        id: vendorPurposes.id,
        purposeId: purposes.id,
        purposeName: purposes.name,
        purposeKey: purposes.key,
        processingRole: vendorPurposes.processingRole,
        status: vendorPurposes.status,
      })
      .from(vendorPurposes)
      .innerJoin(purposes, eq(vendorPurposes.purposeId, purposes.id))
      .where(
        and(
          eq(vendorPurposes.vendorId, vendor.id),
          eq(purposes.organizationId, authz.organization.id),
        ),
      ),
    db
      .select()
      .from(processingActivities)
      .where(
        and(
          eq(processingActivities.organizationId, authz.organization.id),
          eq(processingActivities.vendorId, vendor.id),
        ),
      ),
    db
      .select()
      .from(crossBorderTransfers)
      .where(
        and(
          eq(crossBorderTransfers.organizationId, authz.organization.id),
          eq(crossBorderTransfers.vendorId, vendor.id),
        ),
      ),
    db
      .select()
      .from(vendorRelationships)
      .where(
        and(
          eq(vendorRelationships.organizationId, authz.organization.id),
          eq(vendorRelationships.parentVendorId, vendor.id),
        ),
      ),
    db
      .select({ id: trackers.id, name: trackers.name, status: trackers.status, websiteId: trackers.websiteId })
      .from(trackers)
      .where(eq(trackers.vendorId, vendor.id))
      .orderBy(desc(trackers.updatedAt))
      .limit(50),
  ]);

  return NextResponse.json({
    success: true,
    vendor,
    purposes: purposeLinks,
    activities,
    transfers,
    relationships,
    trackers: trackerRows,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const { id } = await params;
  const existing = await loadOwnedVendorRecord(authz.organization.id, id);
  if (!existing) {
    return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const parsed = parseVendorPatch(body);
  const now = new Date();
  const nextStatus = parsed.archive ? "archived" : parsed.status ?? existing.status;

  const [updated] = await db
    .update(vendors)
    .set({
      ...(parsed.name !== undefined ? { name: parsed.name ?? existing.name } : {}),
      ...(parsed.legalName !== undefined ? { legalName: parsed.legalName } : {}),
      ...(parsed.domain !== undefined ? { domain: parsed.domain } : {}),
      ...(parsed.websiteUrl !== undefined ? { websiteUrl: parsed.websiteUrl } : {}),
      ...(parsed.privacyPolicyUrl !== undefined ? { privacyPolicyUrl: parsed.privacyPolicyUrl } : {}),
      ...(parsed.country !== undefined ? { country: parsed.country } : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      ...(parsed.role !== undefined ? { role: parsed.role } : {}),
      ...(parsed.processingCountries !== undefined ? { processingCountries: parsed.processingCountries } : {}),
      ...(parsed.dpaStatus !== undefined ? { dpaStatus: parsed.dpaStatus } : {}),
      ...(parsed.dpaEffectiveAt !== undefined ? { dpaEffectiveAt: parsed.dpaEffectiveAt } : {}),
      ...(parsed.dpaReviewAt !== undefined ? { dpaReviewAt: parsed.dpaReviewAt } : {}),
      ...(parsed.dpaReference !== undefined ? { dpaReference: parsed.dpaReference } : {}),
      ...(parsed.downstreamDsarMode !== undefined ? { downstreamDsarMode: parsed.downstreamDsarMode } : {}),
      ...(parsed.ccpaSale !== undefined ? { ccpaSale: parsed.ccpaSale } : {}),
      ...(parsed.ccpaShare !== undefined ? { ccpaShare: parsed.ccpaShare } : {}),
      ...(parsed.ccpaSensitivePi !== undefined ? { ccpaSensitivePi: parsed.ccpaSensitivePi } : {}),
      status: nextStatus,
      deletedAt: parsed.archive ? now : nextStatus === "active" ? null : existing.deletedAt,
      updatedAt: now,
    })
    .where(and(eq(vendors.id, existing.id), eq(vendors.organizationId, authz.organization.id)))
    .returning();

  if (parsed.archive) {
    await writeProcessingAudit({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: PROCESSING_AUDIT_ACTIONS.vendorArchived,
      resourceType: "vendor",
      resourceId: updated.id,
      description: `Archived vendor ${updated.name}`,
    });
  } else {
    await writeProcessingAudit({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: PROCESSING_AUDIT_ACTIONS.vendorUpdated,
      resourceType: "vendor",
      resourceId: updated.id,
      description: `Updated vendor ${updated.name}`,
    });
  }
  if (parsed.role !== undefined && parsed.role !== existing.role) {
    await writeProcessingAudit({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: PROCESSING_AUDIT_ACTIONS.vendorRoleChanged,
      resourceType: "vendor",
      resourceId: updated.id,
      description: `Vendor role changed from ${existing.role} to ${parsed.role}`,
      metadata: { previous: existing.role, next: parsed.role },
    });
  }
  if (parsed.dpaStatus !== undefined && parsed.dpaStatus !== existing.dpaStatus) {
    await writeProcessingAudit({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: PROCESSING_AUDIT_ACTIONS.dpaChanged,
      resourceType: "vendor",
      resourceId: updated.id,
      description: `DPA status changed from ${existing.dpaStatus} to ${parsed.dpaStatus}`,
      metadata: { previous: existing.dpaStatus, next: parsed.dpaStatus },
    });
  }

  return NextResponse.json({ success: true, vendor: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const { id } = await params;
  const existing = await loadOwnedVendorRecord(authz.organization.id, id);
  if (!existing) {
    return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
  }

  const now = new Date();
  const [updated] = await db
    .update(vendors)
    .set({ status: "archived", deletedAt: now, updatedAt: now })
    .where(and(eq(vendors.id, existing.id), eq(vendors.organizationId, authz.organization.id)))
    .returning();

  await writeProcessingAudit({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    action: PROCESSING_AUDIT_ACTIONS.vendorArchived,
    resourceType: "vendor",
    resourceId: updated.id,
    description: `Archived vendor ${updated.name}`,
  });

  return NextResponse.json({ success: true, vendor: updated, archived: true });
}
