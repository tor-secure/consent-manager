import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { dataPrincipalRequests } from "@/db/schema/data-principal-requests";
import { writeRightsAudit } from "@/lib/privacy-rights/audit";
import { filterCorrectionPatch } from "@/lib/privacy-rights/correction-policy";
import {
  authorizeRightsOrganization,
  loadOwnedRightsRequest,
  requireRightsManager,
} from "@/lib/privacy-rights/http";
import { RIGHTS_AUDIT_ACTIONS } from "@/lib/privacy-rights/types";

export async function POST(
  request: Request,
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
  if (existing.requestType !== "correction") {
    return NextResponse.json({ success: false, message: "Not a correction request" }, { status: 400 });
  }
  if (existing.verificationStatus !== "verified") {
    return NextResponse.json({ success: false, message: "Request is not verified" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const filtered = filterCorrectionPatch(body);
  if (!filtered.ok) {
    return NextResponse.json({ success: false, message: "Unsupported or empty correction" }, { status: 400 });
  }

  const patch: Partial<typeof dataPrincipalRequests.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (typeof filtered.patch.requesterName === "string") patch.requesterName = filtered.patch.requesterName;
  if (filtered.patch.requesterPhone !== undefined) patch.requesterPhone = filtered.patch.requesterPhone;
  if (typeof filtered.patch.description === "string") patch.description = filtered.patch.description;
  if (filtered.patch.consentId !== undefined) patch.consentId = filtered.patch.consentId;

  const [updated] = await db
    .update(dataPrincipalRequests)
    .set(patch)
    .where(eq(dataPrincipalRequests.id, id))
    .returning({
      id: dataPrincipalRequests.id,
      requesterName: dataPrincipalRequests.requesterName,
      requesterPhone: dataPrincipalRequests.requesterPhone,
      description: dataPrincipalRequests.description,
      consentId: dataPrincipalRequests.consentId,
    });

  await writeRightsAudit({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    action: RIGHTS_AUDIT_ACTIONS.correctionApplied,
    requestId: id,
    websiteId: existing.websiteId,
    description: "Approved correction applied",
    metadata: { fields: Object.keys(filtered.patch) },
  });

  return NextResponse.json({ success: true, request: updated });
}
