import { NextResponse } from "next/server";

import {
  authorizeRightsOrganization,
  loadOwnedRightsRequest,
  requireRightsManager,
} from "@/lib/privacy-rights/http";
import { discoverRightsData, executeRightsDeletion } from "@/lib/privacy-rights/service";

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
    plan: discovered.deletionPlan,
    holds: discovered.holds,
    candidates: discovered.records.map((row) => ({
      id: row.id,
      consentId: row.consentId,
      status: row.status,
    })),
    evidencePreserved: discovered.snapshots.length,
  });
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await authorizeRightsOrganization();
  if (authz.error) return authz.error;
  const manageError = requireRightsManager(authz.membership.roleName);
  if (manageError) return manageError;

  const { id } = await params;
  const existing = await loadOwnedRightsRequest(authz.organization.id, id);
  if (!existing) {
    return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
  }
  if (existing.requestType !== "erasure") {
    return NextResponse.json({ success: false, message: "Not a deletion request" }, { status: 400 });
  }
  if (existing.verificationStatus !== "verified") {
    return NextResponse.json({ success: false, message: "Request is not verified" }, { status: 403 });
  }
  if (!["in_review", "in_progress", "verified"].includes(existing.status)) {
    return NextResponse.json({ success: false, message: "Request is not in an executable state" }, { status: 400 });
  }

  const result = await executeRightsDeletion({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    request: existing,
  });
  if (!result.ok) {
    return NextResponse.json({
      success: false,
      message: "Deletion blocked by an active legal hold",
      plan: result.plan,
      holds: result.discovered.holds,
    }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    outcome: result.outcome,
    plan: result.plan,
  });
}
