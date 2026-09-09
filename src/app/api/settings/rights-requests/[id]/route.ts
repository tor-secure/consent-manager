import { NextResponse } from "next/server";

import { db } from "@/db";
import { dataPrincipalRequests } from "@/db/schema/data-principal-requests";
import { eq } from "drizzle-orm";

import { writeRightsAudit } from "@/lib/privacy-rights/audit";
import { classifyDeadline } from "@/lib/privacy-rights/deadlines";
import {
  authorizeRightsOrganization,
  loadOwnedRightsRequest,
  requireRightsManager,
} from "@/lib/privacy-rights/http";
import { canAdminTransition } from "@/lib/privacy-rights/lifecycle";
import { discoverRightsData, issueRightsTokens } from "@/lib/privacy-rights/service";
import { RIGHTS_AUDIT_ACTIONS, isRightsRequestStatus, isTerminalRightsStatus } from "@/lib/privacy-rights/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeRightsOrganization();
  if (authz.error) return authz.error;
  const { id } = await params;
  const existing = await loadOwnedRightsRequest(authz.organization.id, id);
  if (!existing) {
    return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
  }

  const discovered = await discoverRightsData({
    organizationId: authz.organization.id,
    request: existing,
  });

  return NextResponse.json({
    success: true,
    request: existing,
    deadlineState: classifyDeadline({
      dueAt: existing.dueAt,
      completedAt: existing.completedAt,
      status: existing.status,
    }),
    discovery: {
      recordCount: discovered.records.length,
      decisionCount: discovered.decisions.length,
      eventCount: discovered.events.length,
      evidenceCount: discovered.snapshots.length,
      holds: discovered.holds,
      deletionPlan: discovered.deletionPlan,
      records: discovered.records.map((row) => ({
        id: row.id,
        consentId: row.consentId,
        status: row.status,
        websiteId: row.websiteId,
      })),
    },
  });
}

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

  const body = await request.json();
  const action = String(body.action ?? "").trim();
  const responseNotes = body.responseNotes !== undefined
    ? String(body.responseNotes).trim().slice(0, 10000)
    : undefined;
  const newStatus = body.status ? String(body.status).trim() : undefined;

  if (action === "resend_verification") {
    if (isTerminalRightsStatus(existing.status)) {
      return NextResponse.json({ success: false, message: "Request is closed" }, { status: 400 });
    }
    const tokens = await issueRightsTokens({
      organizationId: authz.organization.id,
      requestId,
    });
    await db
      .update(dataPrincipalRequests)
      .set({
        status: existing.verificationStatus === "verified" ? existing.status : "verification_pending",
        verificationStatus: existing.verificationStatus === "verified" ? existing.verificationStatus : "pending",
        verificationMethod: "email_token",
        verificationExpiresAt: tokens.verificationExpiresAt,
        updatedAt: new Date(),
      })
      .where(eq(dataPrincipalRequests.id, requestId));
    await writeRightsAudit({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: RIGHTS_AUDIT_ACTIONS.verificationSent,
      requestId,
      websiteId: existing.websiteId,
      description: "Verification challenge reissued",
    });
    return NextResponse.json({
      success: true,
      verificationToken: tokens.identityToken,
      statusToken: tokens.statusToken,
      verificationExpiresAt: tokens.verificationExpiresAt,
    });
  }

  if (action === "assign_self") {
    const [updated] = await db
      .update(dataPrincipalRequests)
      .set({ assignedTo: authz.localUser.id, updatedAt: new Date() })
      .where(eq(dataPrincipalRequests.id, requestId))
      .returning({ id: dataPrincipalRequests.id, assignedTo: dataPrincipalRequests.assignedTo });
    await writeRightsAudit({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: RIGHTS_AUDIT_ACTIONS.assigned,
      requestId,
      websiteId: existing.websiteId,
      description: "Rights request assigned",
    });
    return NextResponse.json({ success: true, request: updated });
  }

  if (action === "staff_attest") {
    if (isTerminalRightsStatus(existing.status)) {
      return NextResponse.json({ success: false, message: "Request is closed" }, { status: 400 });
    }
    const note = String(body.attestationNote ?? "").trim().slice(0, 2000);
    if (!note) {
      return NextResponse.json({ success: false, message: "attestationNote is required" }, { status: 400 });
    }
    const now = new Date();
    const [updated] = await db
      .update(dataPrincipalRequests)
      .set({
        status: existing.status === "verification_pending" || existing.status === "received"
          ? "verified"
          : existing.status,
        verificationStatus: "verified",
        verificationMethod: existing.requesterKind === "authorized_agent"
          ? "agent_attested"
          : "staff_attested",
        verifiedAt: now,
        agentAuthorizationNote: existing.requesterKind === "authorized_agent"
          ? `${existing.agentAuthorizationNote ?? ""}\nStaff attestation: ${note}`.trim()
          : existing.agentAuthorizationNote,
        updatedAt: now,
      })
      .where(eq(dataPrincipalRequests.id, requestId))
      .returning();
    await writeRightsAudit({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: RIGHTS_AUDIT_ACTIONS.verified,
      requestId,
      websiteId: existing.websiteId,
      description: "Staff attested identity verification",
      metadata: { method: updated.verificationMethod },
    });
    if (existing.requesterKind === "authorized_agent") {
      await writeRightsAudit({
        organizationId: authz.organization.id,
        userId: authz.localUser.id,
        action: RIGHTS_AUDIT_ACTIONS.agentAuthorized,
        requestId,
        websiteId: existing.websiteId,
        description: "Authorized agent attested by staff",
      });
    }
    return NextResponse.json({ success: true, request: updated });
  }

  if (newStatus && !isRightsRequestStatus(newStatus)) {
    return NextResponse.json({ success: false, message: "Invalid status" }, { status: 400 });
  }

  if (newStatus === undefined && responseNotes === undefined) {
    return NextResponse.json(
      { success: false, message: "At least one of status or responseNotes is required" },
      { status: 400 },
    );
  }

  if (newStatus) {
    const transition = canAdminTransition(existing.status, newStatus, {
      verificationStatus: existing.verificationStatus as "verified" | "pending" | "unverified" | "failed" | "expired" | "rejected",
      requesterKind: existing.requesterKind,
    });
    if (!transition.ok) {
      return NextResponse.json(
        { success: false, message: "Invalid status transition" },
        { status: 400 },
      );
    }
  }

  const now = new Date();
  const patch: Partial<typeof dataPrincipalRequests.$inferInsert> = { updatedAt: now };
  if (newStatus) patch.status = newStatus;
  if (responseNotes !== undefined) patch.responseNotes = responseNotes;
  if (newStatus && ["in_review", "acknowledged", "in_progress"].includes(newStatus) && !existing.acknowledgedAt) {
    patch.acknowledgedAt = now;
  }
  if (newStatus && ["completed", "rejected"].includes(newStatus) && !existing.completedAt) {
    patch.completedAt = now;
  }
  if (newStatus === "cancelled") patch.cancelledAt = now;

  const [updated] = await db
    .update(dataPrincipalRequests)
    .set(patch)
    .where(eq(dataPrincipalRequests.id, requestId))
    .returning();

  const auditAction =
    newStatus === "completed"
      ? RIGHTS_AUDIT_ACTIONS.completed
      : newStatus === "rejected"
        ? RIGHTS_AUDIT_ACTIONS.rejected
        : newStatus === "cancelled"
          ? RIGHTS_AUDIT_ACTIONS.cancelled
          : RIGHTS_AUDIT_ACTIONS.statusChanged;

  await writeRightsAudit({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    action: auditAction,
    requestId,
    websiteId: existing.websiteId,
    description: newStatus
      ? `Rights request status updated to ${newStatus}`
      : "Rights request notes updated",
    metadata: { previousStatus: existing.status, newStatus: updated.status },
  });

  return NextResponse.json({
    success: true,
    request: {
      id: updated.id,
      status: updated.status,
      acknowledgedAt: updated.acknowledgedAt,
      completedAt: updated.completedAt,
      responseNotes: updated.responseNotes,
      updatedAt: updated.updatedAt,
    },
  });
}
