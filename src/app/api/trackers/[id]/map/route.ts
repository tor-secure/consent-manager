import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { trackers } from "@/db/schema/trackers";
import { auditLogs } from "@/db/schema/audit-logs";
import { logger } from "@/lib/logger";
import {
  authorizeTrackerOrganization,
  loadOwnedPurpose,
  loadOwnedTracker,
  loadOwnedVendor,
  trackerMutationLimit,
  vendorMappingError,
} from "@/lib/trackers/http";
import { trackerPublishedPolicyImpact } from "@/lib/trackers/policy-impact";
import {
  auditActionsForChange,
  isUuid,
  resolveScannerClassification,
  sanitizeTrackerAuditConfig,
} from "@/lib/trackers/management";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await authorizeTrackerOrganization();
    if ("error" in authz) return authz.error;
    const limited = trackerMutationLimit(request, authz.orgId, authz.userId);
    if (limited) return limited;
    const { id } = await context.params;
    const owned = await loadOwnedTracker(authz.organization.id, id);
    if (!owned) {
      return NextResponse.json({ success: false, message: "Tracker not found" }, { status: 404 });
    }

    const body = await request.json();
    const purposeId = body.purposeId === null || body.purposeId === ""
      ? null
      : isUuid(body.purposeId)
        ? body.purposeId
        : undefined;
    const vendorId = body.vendorId === null || body.vendorId === ""
      ? null
      : isUuid(body.vendorId)
        ? body.vendorId
        : undefined;
    if (purposeId === undefined && body.purposeId !== undefined) {
      return NextResponse.json({ success: false, message: "Purpose must come from the purpose registry." }, { status: 400 });
    }
    if (vendorId === undefined && body.vendorId !== undefined) {
      return NextResponse.json({ success: false, message: "Vendor must come from the vendor registry." }, { status: 400 });
    }

    const nextPurposeId = purposeId === undefined ? owned.tracker.purposeId : purposeId;
    const nextVendorId = vendorId === undefined ? owned.tracker.vendorId : vendorId;
    const purpose = await loadOwnedPurpose(authz.organization.id, nextPurposeId);
    if (!purpose.ok) {
      return NextResponse.json({ success: false, message: "Purpose not found in this organization." }, { status: 400 });
    }
    const vendor = await loadOwnedVendor(authz.organization.id, nextVendorId);
    const vendorError = vendorMappingError(vendor);
    if (vendorError) return vendorError;

    const scannerClassification = resolveScannerClassification({
      purposeId: nextPurposeId,
      vendorId: nextVendorId,
      scannerClassification: owned.tracker.scannerClassification,
    });

    const [tracker] = await db
      .update(trackers)
      .set({
        purposeId: nextPurposeId,
        vendorId: nextVendorId,
        scannerClassification,
        updatedAt: new Date(),
      })
      .where(eq(trackers.id, owned.tracker.id))
      .returning();

    const previous = {
      purposeId: owned.tracker.purposeId,
      vendorId: owned.tracker.vendorId,
      isEssential: owned.tracker.isEssential,
      status: owned.tracker.status,
      scannerClassification: owned.tracker.scannerClassification,
    };
    const next = {
      purposeId: tracker.purposeId,
      vendorId: tracker.vendorId,
      isEssential: tracker.isEssential,
      status: tracker.status,
      scannerClassification: tracker.scannerClassification,
    };
    const policyImpact = await trackerPublishedPolicyImpact({
      websiteId: owned.website.id,
      purposeId: tracker.purposeId,
      mappingChanged: previous.purposeId !== next.purposeId || previous.vendorId !== next.vendorId,
    });

    for (const action of auditActionsForChange(previous, next)) {
      await db.insert(auditLogs).values({
        organizationId: authz.organization.id,
        userId: authz.localUser.id,
        action,
        resourceType: "tracker",
        resourceId: tracker.id,
        description: `Mapped tracker (${action})`,
        metadata: {
          websiteId: owned.website.id,
          trackerId: tracker.id,
          previous: sanitizeTrackerAuditConfig(owned.tracker),
          next: sanitizeTrackerAuditConfig(tracker),
        },
      });
    }

    return NextResponse.json({ success: true, tracker, policyImpact });
  } catch (error) {
    logger.error("Tracker map failed", { route: "POST /api/trackers/[id]/map", error });
    return NextResponse.json({ success: false, message: "Unable to map tracker." }, { status: 500 });
  }
}
