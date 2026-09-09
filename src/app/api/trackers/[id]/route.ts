import { NextResponse } from "next/server";

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
} from "@/lib/trackers/http";
import { trackerPublishedPolicyImpact } from "@/lib/trackers/policy-impact";
import {
  auditActionsForChange,
  essentialChangeRequiresConfirmation,
  parseTrackerWriteInput,
  resolveScannerClassification,
  sanitizeTrackerAuditConfig,
  TRACKER_AUDIT_ACTIONS,
} from "@/lib/trackers/management";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await authorizeTrackerOrganization();
    if ("error" in authz) return authz.error;
    const { id } = await context.params;
    const owned = await loadOwnedTracker(authz.organization.id, id);
    if (!owned) {
      return NextResponse.json({ success: false, message: "Tracker not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, tracker: owned.tracker, website: owned.website });
  } catch (error) {
    logger.error("Tracker detail failed", { route: "GET /api/trackers/[id]", error });
    return NextResponse.json({ success: false, message: "Unable to load tracker." }, { status: 500 });
  }
}

export async function PATCH(
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

    const parsed = parseTrackerWriteInput(await request.json());
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
    }
    const input = parsed.value;
    const nextPurposeId = input.purposeId === undefined ? owned.tracker.purposeId : input.purposeId;
    const nextVendorId = input.vendorId === undefined ? owned.tracker.vendorId : input.vendorId;
    const nextEssential = input.isEssential === undefined ? owned.tracker.isEssential : input.isEssential;

    if (input.vendorId !== undefined) {
      const vendor = await loadOwnedVendor(authz.organization.id, input.vendorId);
      if (!vendor.ok) {
        return NextResponse.json({ success: false, message: "Vendor not found in this organization." }, { status: 400 });
      }
    }
    if (input.purposeId !== undefined) {
      const purpose = await loadOwnedPurpose(authz.organization.id, input.purposeId);
      if (!purpose.ok) {
        return NextResponse.json({ success: false, message: "Purpose not found in this organization." }, { status: 400 });
      }
    }
    if (
      nextEssential &&
      !owned.tracker.isEssential &&
      essentialChangeRequiresConfirmation(true, input.confirmEssential === true)
    ) {
      return NextResponse.json({ success: false, message: "Essential classification requires confirmation." }, { status: 400 });
    }

    const nextStatus = input.status ?? owned.tracker.status;
    const scannerClassification = resolveScannerClassification({
      purposeId: nextPurposeId,
      vendorId: nextVendorId,
      scannerClassification: owned.tracker.scannerClassification,
    });

    const [tracker] = await db
      .update(trackers)
      .set({
        name: input.name ?? owned.tracker.name,
        description: input.description === undefined ? owned.tracker.description : input.description,
        type: input.type ?? owned.tracker.type,
        vendorId: nextVendorId,
        purposeId: nextPurposeId,
        category: input.category === undefined ? owned.tracker.category : input.category,
        isEssential: nextEssential,
        status: nextStatus,
        domain: input.domain === undefined ? owned.tracker.domain : input.domain,
        identifier: input.identifier ?? owned.tracker.identifier,
        cookieNames: input.cookieNames ?? owned.tracker.cookieNames,
        storageTypes: input.storageTypes ?? owned.tracker.storageTypes,
        localStorageKeys: input.localStorageKeys ?? owned.tracker.localStorageKeys,
        sessionStorageKeys: input.sessionStorageKeys ?? owned.tracker.sessionStorageKeys,
        indexedDbNames: input.indexedDbNames ?? owned.tracker.indexedDbNames,
        scriptUrlPatterns: input.scriptUrlPatterns ?? owned.tracker.scriptUrlPatterns,
        iframeUrlPatterns: input.iframeUrlPatterns ?? owned.tracker.iframeUrlPatterns,
        pixelUrlPatterns: input.pixelUrlPatterns ?? owned.tracker.pixelUrlPatterns,
        party: input.party ?? owned.tracker.party,
        duration: input.duration === undefined ? owned.tracker.duration : input.duration,
        deletionBehavior: input.deletionBehavior === undefined
          ? owned.tracker.deletionBehavior
          : input.deletionBehavior,
        scannerClassification,
        deletedAt: nextStatus === "archived" ? new Date() : owned.tracker.deletedAt,
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
    const actions = auditActionsForChange(previous, next);
    const mappingChanged =
      previous.purposeId !== next.purposeId ||
      previous.vendorId !== next.vendorId ||
      previous.isEssential !== next.isEssential;
    const policyImpact = await trackerPublishedPolicyImpact({
      websiteId: owned.website.id,
      purposeId: next.purposeId,
      mappingChanged,
    });

    for (const action of actions) {
      await db.insert(auditLogs).values({
        organizationId: authz.organization.id,
        userId: authz.localUser.id,
        action,
        resourceType: "tracker",
        resourceId: tracker.id,
        description: `Updated tracker (${action})`,
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
    logger.error("Tracker update failed", { route: "PATCH /api/trackers/[id]", error });
    return NextResponse.json({ success: false, message: "Unable to update tracker." }, { status: 500 });
  }
}

export async function DELETE(
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

    const [tracker] = await db
      .update(trackers)
      .set({
        status: "archived",
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(trackers.id, owned.tracker.id))
      .returning();

    await db.insert(auditLogs).values({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: TRACKER_AUDIT_ACTIONS.archived,
      resourceType: "tracker",
      resourceId: tracker.id,
      description: "Archived tracker",
      metadata: {
        websiteId: owned.website.id,
        trackerId: tracker.id,
        previous: sanitizeTrackerAuditConfig(owned.tracker),
        next: sanitizeTrackerAuditConfig(tracker),
      },
    });

    return NextResponse.json({ success: true, tracker });
  } catch (error) {
    logger.error("Tracker archive failed", { route: "DELETE /api/trackers/[id]", error });
    return NextResponse.json({ success: false, message: "Unable to archive tracker." }, { status: 500 });
  }
}
