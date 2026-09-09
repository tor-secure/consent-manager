import { NextResponse } from "next/server";

import {
  authorizeRightsOrganization,
  loadOwnedRightsRequest,
  requireRightsManager,
} from "@/lib/privacy-rights/http";
import { invokeExistingWithdrawal } from "@/lib/privacy-rights/service";

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
  if (existing.requestType !== "withdraw_consent" && existing.requestType !== "objection") {
    return NextResponse.json({ success: false, message: "Withdrawal is not in scope for this request" }, { status: 400 });
  }
  if (existing.verificationStatus !== "verified") {
    return NextResponse.json({ success: false, message: "Request is not verified" }, { status: 403 });
  }

  const result = await invokeExistingWithdrawal({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    request: existing,
  });
  if (!result.ok) {
    return NextResponse.json({ success: false, message: "Unable to invoke existing withdrawal flow" }, { status: 409 });
  }

  return NextResponse.json({
    success: true,
    alreadyWithdrawn: result.alreadyWithdrawn,
    stateVersion: result.stateVersion,
  });
}
