import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { secureTransferEnvelopes, transferAuthorizations } from "@/db/schema/transfer-security";
import { privacyEvents } from "@/db/schema/privacy-events";
import { auditLogs } from "@/db/schema/audit-logs";
import { authorizeProcessingOrganization } from "@/lib/processing/http";
import { isUuid } from "@/lib/trackers/management";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, message: "Authorization not found" }, { status: 404 });
  const [row] = await db.select().from(transferAuthorizations).where(and(eq(transferAuthorizations.id, id), eq(transferAuthorizations.organizationId, authz.organization.id))).limit(1);
  if (!row) return NextResponse.json({ success: false, message: "Authorization not found" }, { status: 404 });
  return NextResponse.json({ success: true, authorization: { ...row, state: row.state === "active" && row.expiresAt <= new Date() ? "expired" : row.state } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authz = await authorizeProcessingOrganization({ operator: true });
  if ("error" in authz) return authz.error;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, message: "Authorization not found" }, { status: 404 });
  const [row] = await db.update(transferAuthorizations).set({ state: "revoked", revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(transferAuthorizations.id, id), eq(transferAuthorizations.organizationId, authz.organization.id), inArray(transferAuthorizations.state, ["active", "consumed"]))).returning();
  if (!row) return NextResponse.json({ success: false, message: "Active authorization not found" }, { status: 404 });
  await db.update(secureTransferEnvelopes).set({ status: "revoked" }).where(and(eq(secureTransferEnvelopes.authorizationId, row.id), eq(secureTransferEnvelopes.status, "ready")));
  await db.insert(privacyEvents).values({ organizationId: row.organizationId, websiteId: row.websiteId, sessionId: row.sessionId, eventType: "transfer.authorization_revoked", provenance: "configured", payload: { authorizationId: row.id, transferId: row.transferId, recipientVendorId: row.recipientVendorId, purposeId: row.purposeId } });
  await db.insert(auditLogs).values({ organizationId: authz.organization.id, userId: authz.localUser.id, action: "transfer.authorization_revoked", resourceType: "transfer_authorization", resourceId: row.id, description: "Revoked transfer authorization", metadata: { transferId: row.transferId, recipientVendorId: row.recipientVendorId, purposeId: row.purposeId } });
  return NextResponse.json({ success: true, authorization: row });
}
