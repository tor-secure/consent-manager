import { NextResponse } from "next/server";
import { and, desc, eq, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { crossBorderTransfers } from "@/db/schema/processing-inventory";
import {
  authorizeProcessingOrganization,
  loadOwnedActivity,
  loadOwnedVendorRecord,
  loadOwnedWebsiteId,
} from "@/lib/processing/http";
import { parseTransferWrite } from "@/lib/processing/parse";
import { writeProcessingAudit } from "@/lib/processing/service";
import { PROCESSING_AUDIT_ACTIONS } from "@/lib/processing/types";
import { isUuid } from "@/lib/trackers/management";

export async function GET(request: Request) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const url = new URL(request.url);
  const websiteId = url.searchParams.get("websiteId");
  const vendorId = url.searchParams.get("vendorId");
  const filters = [eq(crossBorderTransfers.organizationId, authz.organization.id)];
  if (websiteId) {
    if (!isUuid(websiteId)) {
      return NextResponse.json({ success: false, message: "Invalid websiteId" }, { status: 400 });
    }
    const owned = await loadOwnedWebsiteId(authz.organization.id, websiteId);
    if (!owned.ok) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }
    filters.push(or(eq(crossBorderTransfers.websiteId, websiteId), isNull(crossBorderTransfers.websiteId))!);
  }
  if (vendorId) {
    if (!isUuid(vendorId)) {
      return NextResponse.json({ success: false, message: "Invalid vendorId" }, { status: 400 });
    }
    const vendor = await loadOwnedVendorRecord(authz.organization.id, vendorId);
    if (!vendor) {
      return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
    }
    filters.push(eq(crossBorderTransfers.vendorId, vendorId));
  }
  const rows = await db
    .select()
    .from(crossBorderTransfers)
    .where(and(...filters))
    .orderBy(desc(crossBorderTransfers.updatedAt));
  return NextResponse.json({ success: true, transfers: rows });
}

export async function POST(request: Request) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const parsed = parseTransferWrite(await request.json() as Record<string, unknown>);
  if (!parsed.vendorId) {
    return NextResponse.json({ success: false, message: "vendorId is required" }, { status: 400 });
  }
  if (parsed.websiteId === "invalid" || parsed.processingActivityId === "invalid") {
    return NextResponse.json({ success: false, message: "Related ids must belong to this organization" }, { status: 400 });
  }
  const vendor = await loadOwnedVendorRecord(authz.organization.id, parsed.vendorId);
  if (!vendor) {
    return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
  }
  const website = await loadOwnedWebsiteId(authz.organization.id, parsed.websiteId ?? null);
  if (!website.ok) {
    return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
  }
  if (parsed.processingActivityId) {
    const activity = await loadOwnedActivity(authz.organization.id, parsed.processingActivityId);
    if (!activity) {
      return NextResponse.json({ success: false, message: "Processing activity not found" }, { status: 404 });
    }
  }

  const [created] = await db
    .insert(crossBorderTransfers)
    .values({
      organizationId: authz.organization.id,
      vendorId: parsed.vendorId,
      websiteId: website.websiteId,
      processingActivityId: parsed.processingActivityId,
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
      status: parsed.status === "archived" ? "active" : parsed.status,
    })
    .returning();

  await writeProcessingAudit({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    action: PROCESSING_AUDIT_ACTIONS.transferCreated,
    resourceType: "cross_border_transfer",
    resourceId: created.id,
    description: "Created transfer record",
    metadata: { vendorId: created.vendorId, websiteId: created.websiteId },
  });

  return NextResponse.json({ success: true, transfer: created }, { status: 201 });
}
