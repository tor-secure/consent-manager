import { NextResponse } from "next/server";
import { and, desc, eq, or, isNull } from "drizzle-orm";

import { db } from "@/db";
import { processingActivities } from "@/db/schema/processing-inventory";
import { purposes } from "@/db/schema/purposes";
import {
  authorizeProcessingOrganization,
  loadOwnedVendorRecord,
  loadOwnedWebsiteId,
} from "@/lib/processing/http";
import { parseActivityWrite } from "@/lib/processing/parse";
import { writeProcessingAudit } from "@/lib/processing/service";
import { PROCESSING_AUDIT_ACTIONS } from "@/lib/processing/types";
import { isUuid } from "@/lib/trackers/management";

export async function GET(request: Request) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const url = new URL(request.url);
  const websiteId = url.searchParams.get("websiteId");
  const vendorId = url.searchParams.get("vendorId");

  const filters = [eq(processingActivities.organizationId, authz.organization.id)];
  if (websiteId) {
    if (!isUuid(websiteId)) {
      return NextResponse.json({ success: false, message: "Invalid websiteId" }, { status: 400 });
    }
    const owned = await loadOwnedWebsiteId(authz.organization.id, websiteId);
    if (!owned.ok) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }
    filters.push(or(eq(processingActivities.websiteId, websiteId), isNull(processingActivities.websiteId))!);
  }
  if (vendorId) {
    if (!isUuid(vendorId)) {
      return NextResponse.json({ success: false, message: "Invalid vendorId" }, { status: 400 });
    }
    const vendor = await loadOwnedVendorRecord(authz.organization.id, vendorId);
    if (!vendor) {
      return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
    }
    filters.push(eq(processingActivities.vendorId, vendorId));
  }

  const rows = await db
    .select({
      activity: processingActivities,
      purposeKey: purposes.key,
      purposeName: purposes.name,
    })
    .from(processingActivities)
    .leftJoin(purposes, eq(processingActivities.purposeId, purposes.id))
    .where(and(...filters))
    .orderBy(desc(processingActivities.updatedAt));

  return NextResponse.json({
    success: true,
    activities: rows.map((row) => ({ ...row.activity, purposeKey: row.purposeKey, purposeName: row.purposeName })),
  });
}

export async function POST(request: Request) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const parsed = parseActivityWrite(await request.json() as Record<string, unknown>);
  if (!parsed.vendorId) {
    return NextResponse.json({ success: false, message: "vendorId is required" }, { status: 400 });
  }
  if (parsed.websiteId === "invalid" || parsed.purposeId === "invalid") {
    return NextResponse.json({ success: false, message: "websiteId and purposeId must be owned registry ids" }, { status: 400 });
  }
  const vendor = await loadOwnedVendorRecord(authz.organization.id, parsed.vendorId);
  if (!vendor) {
    return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
  }
  const website = await loadOwnedWebsiteId(authz.organization.id, parsed.websiteId ?? null);
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

  const [created] = await db
    .insert(processingActivities)
    .values({
      organizationId: authz.organization.id,
      vendorId: parsed.vendorId,
      websiteId: website.websiteId,
      purposeId: parsed.purposeId ?? null,
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
      ccpaSale: parsed.ccpaSale ?? "unknown",
      ccpaShare: parsed.ccpaShare ?? "unknown",
      ccpaSensitivePi: parsed.ccpaSensitivePi ?? "unknown",
      status: parsed.status === "archived" ? "active" : parsed.status,
    })
    .returning();

  await writeProcessingAudit({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    action: PROCESSING_AUDIT_ACTIONS.activityCreated,
    resourceType: "processing_activity",
    resourceId: created.id,
    description: "Created processing activity",
    metadata: { vendorId: created.vendorId, websiteId: created.websiteId },
  });

  return NextResponse.json({ success: true, activity: created }, { status: 201 });
}
