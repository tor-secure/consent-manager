import { and, eq, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { secureTransferEnvelopes, transferAuthorizations, transferRecipientKeys } from "@/db/schema/transfer-security";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentSessions } from "@/db/schema/consent-sessions";
import { crossBorderTransfers, processingActivities } from "@/db/schema/processing-inventory";
import { consentSessionIsActive } from "@/lib/consent-session-core";
import { privacyEvents } from "@/db/schema/privacy-events";
import { auditLogs } from "@/db/schema/audit-logs";
import { authorizeProcessingOrganization } from "@/lib/processing/http";
import { isUuid } from "@/lib/trackers/management";

const schema = z.object({ status: z.enum(["delivered", "revoked"]) }).strict();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  // Envelope retrieval is a sensitive data-export operation, so require the
  // same operator capability as envelope creation and status mutations.
  const authz = await authorizeProcessingOrganization({ operator: true });
  if ("error" in authz) return authz.error;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, message: "Transfer not found" }, { status: 404 });
  const [row] = await db.select().from(secureTransferEnvelopes).where(and(eq(secureTransferEnvelopes.id, id), eq(secureTransferEnvelopes.organizationId, authz.organization.id))).limit(1);
  if (!row) return NextResponse.json({ success: false, message: "Transfer not found" }, { status: 404 });
  const now = new Date();
  const [authorization] = await db.select().from(transferAuthorizations).where(and(eq(transferAuthorizations.id, row.authorizationId), eq(transferAuthorizations.organizationId, authz.organization.id))).limit(1);
  const [consent] = authorization ? await db.select().from(consentRecords).where(and(eq(consentRecords.id, authorization.consentRecordId), eq(consentRecords.organizationId, authz.organization.id), eq(consentRecords.websiteId, row.websiteId), eq(consentRecords.status, "active"), isNull(consentRecords.withdrawnAt))).limit(1) : [];
  const [decision] = authorization ? await db.select({ id: consentDecisions.id }).from(consentDecisions).where(and(eq(consentDecisions.id, authorization.consentDecisionId), eq(consentDecisions.consentRecordId, authorization.consentRecordId), eq(consentDecisions.purposeId, authorization.purposeId), eq(consentDecisions.granted, true), or(isNull(consentDecisions.vendorId), eq(consentDecisions.vendorId, authorization.recipientVendorId)))).limit(1) : [];
  const [transfer] = await db.select().from(crossBorderTransfers).where(and(eq(crossBorderTransfers.id, row.transferId), eq(crossBorderTransfers.organizationId, authz.organization.id), eq(crossBorderTransfers.websiteId, row.websiteId), eq(crossBorderTransfers.vendorId, row.recipientVendorId), eq(crossBorderTransfers.status, "active"))).limit(1);
  const [activity] = authorization ? await db.select().from(processingActivities).where(and(eq(processingActivities.id, authorization.processingActivityId), eq(processingActivities.organizationId, authz.organization.id), eq(processingActivities.vendorId, authorization.recipientVendorId), eq(processingActivities.purposeId, authorization.purposeId), eq(processingActivities.status, "active"))).limit(1) : [];
  const [key] = authorization ? await db.select({ id: transferRecipientKeys.id }).from(transferRecipientKeys).where(and(eq(transferRecipientKeys.id, row.recipientKeyId), eq(transferRecipientKeys.organizationId, authz.organization.id), eq(transferRecipientKeys.vendorId, authorization.recipientVendorId), eq(transferRecipientKeys.status, "active"))).limit(1) : [];
  let sessionValid = true;
  if (authorization?.sessionId) {
    const [session] = await db.select().from(consentSessions).where(and(eq(consentSessions.id, authorization.sessionId), eq(consentSessions.organizationId, authz.organization.id), eq(consentSessions.websiteId, row.websiteId))).limit(1);
    sessionValid = !!session && consentSessionIsActive(session, now);
  }
  const valid = row.status === "ready" && row.expiresAt > now && !!authorization && ["active", "consumed"].includes(authorization.state) && !authorization.revokedAt && authorization.expiresAt > now && !!consent && (!consent.expiresAt || consent.expiresAt > now) && !!decision && !!transfer && !!activity && transfer.processingActivityId === activity.id && (!activity.websiteId || activity.websiteId === row.websiteId) && !!key && sessionValid;
  if (!valid) return NextResponse.json({ success: false, message: "Transfer envelope is no longer available under its authorization" }, { status: 403 });
  return NextResponse.json({ success: true, transfer: row });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authz = await authorizeProcessingOrganization({ operator: true });
  if ("error" in authz) return authz.error;
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ success: false, message: "Transfer not found" }, { status: 404 });
  const input = schema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ success: false, message: "Invalid transfer status" }, { status: 400 });
  const [current] = await db.select().from(secureTransferEnvelopes).where(and(eq(secureTransferEnvelopes.id, id), eq(secureTransferEnvelopes.organizationId, authz.organization.id))).limit(1);
  if (!current) return NextResponse.json({ success: false, message: "Transfer not found" }, { status: 404 });
  if (current.status !== "ready") return NextResponse.json({ success: false, message: "Only ready transfers can change status" }, { status: 409 });
  if (input.data.status === "delivered") {
    if (current.expiresAt <= new Date()) return NextResponse.json({ success: false, message: "Expired transfer cannot be marked delivered" }, { status: 409 });
    const now = new Date();
    const [authorization] = await db.select().from(transferAuthorizations).where(and(eq(transferAuthorizations.id, current.authorizationId), eq(transferAuthorizations.organizationId, authz.organization.id))).limit(1);
    const [consent] = authorization ? await db.select().from(consentRecords).where(and(eq(consentRecords.id, authorization.consentRecordId), eq(consentRecords.organizationId, authz.organization.id), eq(consentRecords.websiteId, current.websiteId), eq(consentRecords.status, "active"), isNull(consentRecords.withdrawnAt))).limit(1) : [];
    const [decision] = authorization ? await db.select({ id: consentDecisions.id }).from(consentDecisions).where(and(eq(consentDecisions.id, authorization.consentDecisionId), eq(consentDecisions.consentRecordId, authorization.consentRecordId), eq(consentDecisions.purposeId, authorization.purposeId), eq(consentDecisions.granted, true), or(isNull(consentDecisions.vendorId), eq(consentDecisions.vendorId, authorization.recipientVendorId)))).limit(1) : [];
    const [transfer] = await db.select().from(crossBorderTransfers).where(and(eq(crossBorderTransfers.id, current.transferId), eq(crossBorderTransfers.organizationId, authz.organization.id), eq(crossBorderTransfers.websiteId, current.websiteId), eq(crossBorderTransfers.vendorId, current.recipientVendorId), eq(crossBorderTransfers.status, "active"))).limit(1);
    const [activity] = authorization ? await db.select().from(processingActivities).where(and(eq(processingActivities.id, authorization.processingActivityId), eq(processingActivities.organizationId, authz.organization.id), eq(processingActivities.vendorId, authorization.recipientVendorId), eq(processingActivities.purposeId, authorization.purposeId), eq(processingActivities.status, "active"))).limit(1) : [];
    const [key] = authorization ? await db.select({ id: transferRecipientKeys.id }).from(transferRecipientKeys).where(and(eq(transferRecipientKeys.id, current.recipientKeyId), eq(transferRecipientKeys.organizationId, authz.organization.id), eq(transferRecipientKeys.vendorId, authorization.recipientVendorId), eq(transferRecipientKeys.status, "active"))).limit(1) : [];
    let sessionValid = true;
    if (authorization?.sessionId) {
      const [session] = await db.select().from(consentSessions).where(and(eq(consentSessions.id, authorization.sessionId), eq(consentSessions.organizationId, authz.organization.id), eq(consentSessions.websiteId, current.websiteId))).limit(1);
      sessionValid = !!session && consentSessionIsActive(session, now);
    }
    if (!authorization || !["active", "consumed"].includes(authorization.state) || authorization.revokedAt || authorization.expiresAt <= now || !consent || consent.expiresAt && consent.expiresAt <= now || !decision || !transfer || !activity || transfer.processingActivityId !== activity.id || activity.websiteId && activity.websiteId !== current.websiteId || !key || !sessionValid) return NextResponse.json({ success: false, message: "Authorization, consent, recipient, or transfer is no longer valid" }, { status: 403 });
  }
  const [updated] = await db.update(secureTransferEnvelopes).set({ status: input.data.status }).where(and(eq(secureTransferEnvelopes.id, id), eq(secureTransferEnvelopes.organizationId, authz.organization.id), eq(secureTransferEnvelopes.status, "ready"))).returning();
  if (!updated) return NextResponse.json({ success: false, message: "Transfer status changed concurrently" }, { status: 409 });
  await db.insert(privacyEvents).values({ organizationId: updated.organizationId, websiteId: updated.websiteId, eventType: `secure_transfer.${updated.status}`, provenance: "configured", payload: { envelopeId: updated.id, authorizationId: updated.authorizationId, transferId: updated.transferId, recipientVendorId: updated.recipientVendorId } });
  await db.insert(auditLogs).values({ organizationId: authz.organization.id, userId: authz.localUser.id, action: `secure_transfer.${updated.status}`, resourceType: "secure_transfer_envelope", resourceId: updated.id, description: updated.status === "delivered" ? "Operator marked encrypted transfer as delivered" : "Revoked encrypted transfer envelope", metadata: { authorizationId: updated.authorizationId, transferId: updated.transferId, recipientVendorId: updated.recipientVendorId } });
  return NextResponse.json({ success: true, transfer: updated });
}
