import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { crossBorderTransfers } from "@/db/schema/processing-inventory";
import {
  authorizeProcessingOrganization,
  loadOwnedActivity,
  loadOwnedTransfer,
  loadOwnedVendorRecord,
  loadOwnedWebsiteId,
} from "@/lib/processing/http";
import { parseTransferWrite } from "@/lib/processing/parse";
import { writeProcessingAudit } from "@/lib/processing/service";
import { PROCESSING_AUDIT_ACTIONS } from "@/lib/processing/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const { id } = await params;
  const transfer = await loadOwnedTransfer(authz.organization.id, id);
  if (!transfer) {
    return NextResponse.json({ success: false, message: "Transfer not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, transfer });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const { id } = await params;
  const existing = await loadOwnedTransfer(authz.organization.id, id);
  if (!existing) {
    return NextResponse.json({ success: false, message: "Transfer not found" }, { status: 404 });
  }
  const parsed = parseTransferWrite({
    vendorId: existing.vendorId,
    ...(await request.json() as Record<string, unknown>),
  });
  if (parsed.websiteId === "invalid" || parsed.processingActivityId === "invalid") {
    return NextResponse.json({ success: false, message: "Related ids must belong to this organization" }, { status: 400 });
  }
  if (parsed.vendorId && parsed.vendorId !== existing.vendorId) {
    const vendor = await loadOwnedVendorRecord(authz.organization.id, parsed.vendorId);
    if (!vendor) {
      return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
    }
  }
  const website = await loadOwnedWebsiteId(
    authz.organization.id,
    parsed.websiteId === undefined || parsed.websiteId === "invalid" ? existing.websiteId : parsed.websiteId,
  );
  if (!website.ok) {
    return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
  }
  if (parsed.processingActivityId) {
    const activity = await loadOwnedActivity(authz.organization.id, parsed.processingActivityId);
    if (!activity) {
      return NextResponse.json({ success: false, message: "Processing activity not found" }, { status: 404 });
    }
  }

  const archive = parsed.status === "archived";
  const [updated] = await db
    .update(crossBorderTransfers)
    .set({
      vendorId: parsed.vendorId ?? existing.vendorId,
      websiteId: website.websiteId,
      processingActivityId: parsed.processingActivityId === undefined ? existing.processingActivityId : parsed.processingActivityId,
      sourceCountry: parsed.sourceCountry,
      destinationCountry: parsed.destinationCountry,
      destinationRegion: parsed.destinationRegion,
      destinationType: parsed.destinationType,
      transferPurpose: parsed.transferPurpose,
      dataCategories: parsed.dataCategories,
      processingLocation: parsed.processingLocation,
      mechanism: parsed.mechanism,
      safeguards: parsed.safeguards,
      documentationRef: parsed.documentationRef,
      notes: parsed.notes,
      effectiveAt: parsed.effectiveAt,
      reviewAt: parsed.reviewAt,
      status: archive ? "archived" : parsed.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(crossBorderTransfers.id, existing.id),
        eq(crossBorderTransfers.organizationId, authz.organization.id),
      ),
    )
    .returning();

  await writeProcessingAudit({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    action: archive ? PROCESSING_AUDIT_ACTIONS.transferArchived : PROCESSING_AUDIT_ACTIONS.transferUpdated,
    resourceType: "cross_border_transfer",
    resourceId: updated.id,
    description: archive ? "Archived transfer record" : "Updated transfer record",
  });

  return NextResponse.json({ success: true, transfer: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const { id } = await params;
  const existing = await loadOwnedTransfer(authz.organization.id, id);
  if (!existing) {
    return NextResponse.json({ success: false, message: "Transfer not found" }, { status: 404 });
  }
  const [updated] = await db
    .update(crossBorderTransfers)
    .set({ status: "archived", updatedAt: new Date() })
    .where(
      and(
        eq(crossBorderTransfers.id, existing.id),
        eq(crossBorderTransfers.organizationId, authz.organization.id),
      ),
    )
    .returning();
  await writeProcessingAudit({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    action: PROCESSING_AUDIT_ACTIONS.transferArchived,
    resourceType: "cross_border_transfer",
    resourceId: updated.id,
    description: "Archived transfer record",
  });
  return NextResponse.json({ success: true, transfer: updated, archived: true });
}
