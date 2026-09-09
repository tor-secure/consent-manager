import { NextResponse } from "next/server";

import {
  authorizeRightsOrganization,
  loadOwnedRightsRequest,
  requireRightsManager,
} from "@/lib/privacy-rights/http";
import { createRightsExport } from "@/lib/privacy-rights/service";
import { EXPORT_KINDS, type RightsExportKind } from "@/lib/privacy-rights/types";

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
  if (existing.verificationStatus !== "verified") {
    return NextResponse.json({ success: false, message: "Request is not verified" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const kind = String(body.kind ?? "access") as RightsExportKind;
  if (!(EXPORT_KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ success: false, message: "Invalid export kind" }, { status: 400 });
  }
  if (kind === "portability" && existing.requestType !== "portability" && existing.requestType !== "access") {
    return NextResponse.json({ success: false, message: "Portability export is not in scope for this request" }, { status: 400 });
  }

  const exported = await createRightsExport({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    request: existing,
    kind,
  });

  return NextResponse.json({
    success: true,
    export: exported,
    downloadPath: `/api/settings/rights-requests/${id}/export/${exported.id}`,
  });
}
