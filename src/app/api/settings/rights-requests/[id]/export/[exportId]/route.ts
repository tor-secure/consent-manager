import { NextResponse } from "next/server";

import { db } from "@/db";
import { rightsRequestExports } from "@/db/schema/rights-request-exports";
import { eq } from "drizzle-orm";

import {
  authorizeRightsOrganization,
  loadOwnedRightsRequest,
} from "@/lib/privacy-rights/http";
import { loadOwnedExport } from "@/lib/privacy-rights/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; exportId: string }> },
) {
  const authz = await authorizeRightsOrganization();
  if (authz.error) return authz.error;

  const { id, exportId } = await params;
  const existing = await loadOwnedRightsRequest(authz.organization.id, id);
  if (!existing) {
    return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
  }

  const exported = await loadOwnedExport({
    organizationId: authz.organization.id,
    requestId: id,
    exportId,
  });
  if (!exported) {
    return NextResponse.json({ success: false, message: "Export not found" }, { status: 404 });
  }
  if (exported.expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ success: false, message: "Export expired" }, { status: 410 });
  }

  await db
    .update(rightsRequestExports)
    .set({ accessedAt: new Date() })
    .where(eq(rightsRequestExports.id, exported.id));

  return NextResponse.json({
    success: true,
    export: {
      id: exported.id,
      exportKind: exported.exportKind,
      expiresAt: exported.expiresAt,
      payload: exported.payload,
    },
  });
}
