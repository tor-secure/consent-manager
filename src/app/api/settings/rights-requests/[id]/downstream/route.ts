import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { rightsDownstreamActions } from "@/db/schema/processing-inventory";
import { loadOwnedVendorRecord } from "@/lib/processing/http";
import { writeProcessingAudit } from "@/lib/processing/service";
import { parseDownstreamActionStatus, PROCESSING_AUDIT_ACTIONS } from "@/lib/processing/types";
import {
  authorizeRightsOrganization,
  loadOwnedRightsRequest,
  requireRightsManager,
} from "@/lib/privacy-rights/http";
import { writeRightsAudit } from "@/lib/privacy-rights/audit";
import { DOWNSTREAM_ACTION_DISCLAIMER, RIGHTS_AUDIT_ACTIONS } from "@/lib/privacy-rights/types";
import { isUuid } from "@/lib/trackers/management";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeRightsOrganization();
  if (authz.error) return authz.error;
  const manageError = requireRightsManager(authz.membership.roleName);
  if (manageError) return manageError;

  const { id: requestId } = await params;
  const existing = await loadOwnedRightsRequest(authz.organization.id, requestId);
  if (!existing) {
    return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
  }

  const body = await request.json() as Record<string, unknown>;
  const vendorId = String(body.vendorId ?? "").trim();
  if (!isUuid(vendorId)) {
    return NextResponse.json({ success: false, message: "vendorId is required" }, { status: 400 });
  }
  const vendor = await loadOwnedVendorRecord(authz.organization.id, vendorId);
  if (!vendor) {
    return NextResponse.json({ success: false, message: "Vendor not found" }, { status: 404 });
  }
  const status = parseDownstreamActionStatus(body.status);
  if (!status) {
    return NextResponse.json({ success: false, message: "Invalid downstream action status" }, { status: 400 });
  }

  const now = new Date();
  const notes = body.notes !== undefined ? String(body.notes).trim().slice(0, 4000) || null : undefined;
  const reference = body.reference !== undefined ? String(body.reference).trim().slice(0, 255) || null : undefined;
  const actionRequired = body.actionRequired === true || status !== "not_required";

  const [current] = await db
    .select()
    .from(rightsDownstreamActions)
    .where(
      and(
        eq(rightsDownstreamActions.organizationId, authz.organization.id),
        eq(rightsDownstreamActions.requestId, existing.id),
        eq(rightsDownstreamActions.vendorId, vendor.id),
      ),
    )
    .limit(1);

  const values = {
    organizationId: authz.organization.id,
    requestId: existing.id,
    vendorId: vendor.id,
    actionRequired,
    status,
    reference: reference === undefined ? current?.reference ?? null : reference,
    notes: notes === undefined ? current?.notes ?? null : notes,
    requestedAt: status === "sent" || status === "pending" ? now : current?.requestedAt ?? null,
    completedAt: status === "completed" || status === "manually_handled" ? now : current?.completedAt ?? null,
    updatedAt: now,
  };

  const [saved] = current
    ? await db
        .update(rightsDownstreamActions)
        .set(values)
        .where(
          and(
            eq(rightsDownstreamActions.id, current.id),
            eq(rightsDownstreamActions.organizationId, authz.organization.id),
          ),
        )
        .returning()
    : await db.insert(rightsDownstreamActions).values(values).returning();

  await writeRightsAudit({
    organizationId: authz.organization.id,
    action: RIGHTS_AUDIT_ACTIONS.downstreamUpdated,
    requestId: existing.id,
    websiteId: existing.websiteId,
    description: `Downstream vendor action recorded as ${status}`,
    metadata: {
      vendorId: vendor.id,
      status,
      disclaimer: DOWNSTREAM_ACTION_DISCLAIMER,
    },
  });
  await writeProcessingAudit({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    action: current ? PROCESSING_AUDIT_ACTIONS.downstreamUpdated : PROCESSING_AUDIT_ACTIONS.downstreamRequested,
    resourceType: "rights_downstream_action",
    resourceId: saved.id,
    description: `Downstream action ${status} for ${vendor.name}`,
    metadata: { requestId: existing.id, vendorId: vendor.id, disclaimer: DOWNSTREAM_ACTION_DISCLAIMER },
  });

  return NextResponse.json({
    success: true,
    action: saved,
    disclaimer: DOWNSTREAM_ACTION_DISCLAIMER,
  });
}
