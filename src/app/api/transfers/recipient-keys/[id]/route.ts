import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { secureTransferEnvelopes, transferAuthorizations, transferRecipientKeys } from "@/db/schema/transfer-security";
import { authorizeProcessingOrganization } from "@/lib/processing/http";
import { isUuid } from "@/lib/trackers/management";
import { auditLogs } from "@/db/schema/audit-logs";
import { privacyEvents } from "@/db/schema/privacy-events";

export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authz = await authorizeProcessingOrganization({ operator: true });
  if ("error" in authz) return authz.error;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, message: "Recipient key not found" }, { status: 404 });
  const [key] = await db.update(transferRecipientKeys).set({ status: "revoked", retiredAt: new Date(), updatedAt: new Date() }).where(and(eq(transferRecipientKeys.id, id), eq(transferRecipientKeys.organizationId, authz.organization.id), eq(transferRecipientKeys.status, "active"))).returning({ id: transferRecipientKeys.id, vendorId: transferRecipientKeys.vendorId, keyId: transferRecipientKeys.keyId });
  if (!key) return NextResponse.json({ success: false, message: "Active recipient key not found" }, { status: 404 });
  const revokedAuthorizations = await db.update(transferAuthorizations).set({ state: "revoked", revokedAt: new Date(), updatedAt: new Date() }).where(and(eq(transferAuthorizations.recipientKeyId, key.id), eq(transferAuthorizations.organizationId, authz.organization.id), inArray(transferAuthorizations.state, ["active", "consumed"]))).returning({ id: transferAuthorizations.id, websiteId: transferAuthorizations.websiteId, sessionId: transferAuthorizations.sessionId, transferId: transferAuthorizations.transferId, purposeId: transferAuthorizations.purposeId, recipientVendorId: transferAuthorizations.recipientVendorId });
  await db.update(secureTransferEnvelopes).set({ status: "revoked" }).where(and(eq(secureTransferEnvelopes.recipientKeyId, key.id), eq(secureTransferEnvelopes.organizationId, authz.organization.id), eq(secureTransferEnvelopes.status, "ready")));
  if (revokedAuthorizations.length) await db.insert(privacyEvents).values(revokedAuthorizations.map((row) => ({ organizationId: authz.organization.id, websiteId: row.websiteId, sessionId: row.sessionId, eventType: "transfer.authorization_revoked", provenance: "configured", payload: { authorizationId: row.id, transferId: row.transferId, recipientVendorId: row.recipientVendorId, purposeId: row.purposeId, reason: "recipient_key_revoked" } })));
  await db.insert(auditLogs).values({ organizationId: authz.organization.id, userId: authz.localUser.id, action: "transfer.recipient_key_revoked", resourceType: "transfer_recipient_key", resourceId: key.id, description: "Revoked recipient encryption public key", metadata: { vendorId: key.vendorId, keyId: key.keyId } });
  return NextResponse.json({ success: true, key });
}
