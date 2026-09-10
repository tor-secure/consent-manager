import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { processingActivities } from "@/db/schema/processing-inventory";
import { purposes } from "@/db/schema/purposes";
import {
  authorizeProcessingOrganization,
  loadOwnedActivity,
  loadOwnedVendorRecord,
  loadOwnedWebsiteId,
} from "@/lib/processing/http";
import { parseActivityWrite } from "@/lib/processing/parse";
import { writeProcessingAudit } from "@/lib/processing/service";
import { PROCESSING_AUDIT_ACTIONS } from "@/lib/processing/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const { id } = await params;
  const activity = await loadOwnedActivity(authz.organization.id, id);
  if (!activity) {
    return NextResponse.json({ success: false, message: "Processing activity not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true, activity });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const { id } = await params;
  const existing = await loadOwnedActivity(authz.organization.id, id);
  if (!existing) {
    return NextResponse.json({ success: false, message: "Processing activity not found" }, { status: 404 });
  }
  const parsed = parseActivityWrite({
    vendorId: existing.vendorId,
    ...(await request.json() as Record<string, unknown>),
  });
  if (parsed.websiteId === "invalid" || parsed.purposeId === "invalid") {
    return NextResponse.json({ success: false, message: "websiteId and purposeId must be owned registry ids" }, { status: 400 });
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
  if (parsed.purposeId) {
    const [purpose] = await db
      .select({ id: purposes.id })
      .from(purposes)
      .where(and(eq(purposes.id, parsed.purposeId), eq(purposes.organizationId, authz.organization.id)))
      .limit(1);
    if (!purpose) {
      return NextResponse.json({ success: false, message: "Purpose not found" }, { status: 404 });
    }
  }

  const archive = parsed.status === "archived";
  const [updated] = await db
    .update(processingActivities)
    .set({
      vendorId: parsed.vendorId ?? existing.vendorId,
      websiteId: website.websiteId,
      purposeId: parsed.purposeId === undefined ? existing.purposeId : parsed.purposeId,
      description: parsed.description,
      dataCategories: parsed.dataCategories,
      sensitive: parsed.sensitive,
      sourceOfData: parsed.sourceOfData,
      recipients: parsed.recipients,
      retentionPeriod: parsed.retentionPeriod,
      processingRole: parsed.processingRole,
      processingLocation: parsed.processingLocation,
      transferRequired: parsed.transferRequired,
      legalBasis: parsed.legalBasis,
      ccpaSale: parsed.ccpaSale ?? existing.ccpaSale,
      ccpaShare: parsed.ccpaShare ?? existing.ccpaShare,
      ccpaSensitivePi: parsed.ccpaSensitivePi ?? existing.ccpaSensitivePi,
      status: archive ? "archived" : parsed.status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(processingActivities.id, existing.id),
        eq(processingActivities.organizationId, authz.organization.id),
      ),
    )
    .returning();

  await writeProcessingAudit({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    action: archive ? PROCESSING_AUDIT_ACTIONS.activityArchived : PROCESSING_AUDIT_ACTIONS.activityUpdated,
    resourceType: "processing_activity",
    resourceId: updated.id,
    description: archive ? "Archived processing activity" : "Updated processing activity",
  });

  return NextResponse.json({ success: true, activity: updated });
}
