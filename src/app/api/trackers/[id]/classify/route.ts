import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { trackers } from "@/db/schema/trackers";
import { auditLogs } from "@/db/schema/audit-logs";
import { logger } from "@/lib/logger";
import {
  authorizeTrackerOrganization,
  loadOwnedTracker,
  trackerMutationLimit,
} from "@/lib/trackers/http";
import { trackerPublishedPolicyImpact } from "@/lib/trackers/policy-impact";
import {
  ESSENTIAL_CONFIRMATION_TEXT,
  auditActionsForChange,
  essentialChangeRequiresConfirmation,
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
    const classification = String(body.classification ?? "").trim().toLowerCase();
    let scannerClassification = owned.tracker.scannerClassification;
    let isEssential = owned.tracker.isEssential;
    let status = owned.tracker.status;

    if (classification === "ignore") {
      scannerClassification = "ignored";
      isEssential = false;
    } else if (classification === "unmapped" || classification === "review") {
      scannerClassification = "unmapped";
    } else if (classification === "essential") {
      if (essentialChangeRequiresConfirmation(true, body.confirmEssential === true)) {
        return NextResponse.json({
          success: false,
          message: "Essential classification requires confirmation.",
          confirmation: ESSENTIAL_CONFIRMATION_TEXT,
        }, { status: 400 });
      }
      isEssential = true;
    } else if (classification === "nonessential" || classification === "optional") {
      isEssential = false;
    } else if (classification === "disable") {
      status = "disabled";
    } else if (classification === "enable") {
      status = "active";
    } else {
      return NextResponse.json({
        success: false,
        message: "Classification must be ignore, unmapped, essential, optional, enable, or disable.",
      }, { status: 400 });
    }

    if (classification === "ignore" && isEssential) {
      return NextResponse.json({
        success: false,
        message: "Ignore only hides the detection from scanner reporting. It does not allow execution.",
      }, { status: 400 });
    }

    const [tracker] = await db
      .update(trackers)
      .set({
        scannerClassification,
        isEssential,
        status,
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
      mappingChanged: previous.isEssential !== next.isEssential,
    });

    for (const action of auditActionsForChange(previous, next)) {
      await db.insert(auditLogs).values({
        organizationId: authz.organization.id,
        userId: authz.localUser.id,
        action,
        resourceType: "tracker",
        resourceId: tracker.id,
        description: `Classified tracker (${classification})`,
        metadata: {
          websiteId: owned.website.id,
          trackerId: tracker.id,
          previous: sanitizeTrackerAuditConfig(owned.tracker),
          next: sanitizeTrackerAuditConfig(tracker),
        },
      });
    }

    return NextResponse.json({
      success: true,
      tracker,
      policyImpact,
      ignoredMeansEssential: false,
    });
  } catch (error) {
    logger.error("Tracker classify failed", { route: "POST /api/trackers/[id]/classify", error });
    return NextResponse.json({ success: false, message: "Unable to classify tracker." }, { status: 500 });
  }
}
