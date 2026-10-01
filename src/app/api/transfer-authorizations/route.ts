import { and, desc, eq, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { transferAuthorizations, transferRecipientKeys } from "@/db/schema/transfer-security";
import { crossBorderTransfers, processingActivities } from "@/db/schema/processing-inventory";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentSessions } from "@/db/schema/consent-sessions";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { privacyEvents } from "@/db/schema/privacy-events";
import { auditLogs } from "@/db/schema/audit-logs";
import { authorizeProcessingOrganization } from "@/lib/processing/http";
import { consentSessionIsActive } from "@/lib/consent-session-core";
import { isUuid } from "@/lib/trackers/management";
import { transferAuthorizationIssueFailure } from "@/lib/transfer-security-core";

const createSchema = z.object({ transferId: z.string().uuid(), consentRecordId: z.string().uuid(), purposeId: z.string().uuid(), recipientKeyId: z.string().uuid(), sessionId: z.string().uuid().optional(), expiresAt: z.string().datetime(), singleUse: z.boolean().default(true) }).strict();

export async function GET(request: Request) {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const params = new URL(request.url).searchParams;
  const eligibleTransferId = params.get("eligibleTransferId");
  if (eligibleTransferId) {
    if (!isUuid(eligibleTransferId)) return NextResponse.json({ success: false, message: "Invalid transferId" }, { status: 400 });
    const [transfer] = await db.select({ id: crossBorderTransfers.id, websiteId: crossBorderTransfers.websiteId, vendorId: crossBorderTransfers.vendorId, purposeId: processingActivities.purposeId }).from(crossBorderTransfers).innerJoin(processingActivities, eq(processingActivities.id, crossBorderTransfers.processingActivityId)).where(and(eq(crossBorderTransfers.id, eligibleTransferId), eq(crossBorderTransfers.organizationId, authz.organization.id), eq(crossBorderTransfers.status, "active"), eq(processingActivities.status, "active"))).limit(1);
    if (!transfer?.websiteId || !transfer.purposeId) return NextResponse.json({ success: false, message: "Transfer purpose is not configured" }, { status: 409 });
    const records = await db.select({ id: consentRecords.id, consentId: consentRecords.consentId, consentedAt: consentRecords.consentedAt, expiresAt: consentRecords.expiresAt }).from(consentRecords).innerJoin(consentDecisions, eq(consentDecisions.consentRecordId, consentRecords.id)).where(and(eq(consentRecords.organizationId, authz.organization.id), eq(consentRecords.websiteId, transfer.websiteId), eq(consentRecords.status, "active"), isNull(consentRecords.withdrawnAt), eq(consentDecisions.purposeId, transfer.purposeId), eq(consentDecisions.granted, true), or(isNull(consentDecisions.vendorId), eq(consentDecisions.vendorId, transfer.vendorId)))).orderBy(desc(consentRecords.consentedAt)).limit(100);
    const now = new Date();
    return NextResponse.json({ success: true, eligibleConsents: records.filter((row) => (!row.expiresAt || row.expiresAt > now)).map((row) => ({ ...row, consentId: `${row.consentId.slice(0, 6)}…`, consentedAt: row.consentedAt?.toISOString() ?? null })) });
  }
  const rows = await db.select({ authorization: transferAuthorizations, vendorName: vendors.name, purposeName: purposes.name, keyName: transferRecipientKeys.keyId }).from(transferAuthorizations)
    .innerJoin(vendors, eq(vendors.id, transferAuthorizations.recipientVendorId)).innerJoin(purposes, eq(purposes.id, transferAuthorizations.purposeId)).innerJoin(transferRecipientKeys, eq(transferRecipientKeys.id, transferAuthorizations.recipientKeyId))
    .where(eq(transferAuthorizations.organizationId, authz.organization.id)).orderBy(desc(transferAuthorizations.issuedAt)).limit(200);
  const now = new Date();
  return NextResponse.json({ success: true, authorizations: rows.map((row) => ({ ...row.authorization, state: row.authorization.state === "active" && row.authorization.expiresAt <= now ? "expired" : row.authorization.state, recipientName: row.vendorName, purposeName: row.purposeName, recipientKeyName: row.keyName })) });
}

export async function POST(request: Request) {
  const authz = await authorizeProcessingOrganization({ operator: true });
  if ("error" in authz) return authz.error;
  const input = createSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return NextResponse.json({ success: false, message: "Invalid transfer authorization request" }, { status: 400 });
  const expiresAt = new Date(input.data.expiresAt);
  const now = new Date();
  if (expiresAt <= now || expiresAt.getTime() > now.getTime() + 30 * 24 * 60 * 60 * 1000) return NextResponse.json({ success: false, message: "Authorization must expire within the next 30 days" }, { status: 400 });

  const [transfer] = await db.select().from(crossBorderTransfers).where(and(eq(crossBorderTransfers.id, input.data.transferId), eq(crossBorderTransfers.organizationId, authz.organization.id), eq(crossBorderTransfers.status, "active"))).limit(1);
  if (!transfer || !transfer.websiteId || !transfer.processingActivityId) return NextResponse.json({ success: false, message: "An active site-scoped transfer linked to a processing activity is required" }, { status: 404 });
  const [activity] = await db.select().from(processingActivities).where(and(eq(processingActivities.id, transfer.processingActivityId), eq(processingActivities.organizationId, authz.organization.id), eq(processingActivities.vendorId, transfer.vendorId), eq(processingActivities.status, "active"))).limit(1);
  if (!activity || activity.websiteId && activity.websiteId !== transfer.websiteId || !activity.purposeId || activity.purposeId !== input.data.purposeId) return NextResponse.json({ success: false, message: "The transfer must map to an active processing activity and its exact purpose" }, { status: 409 });
  const [recipient] = await db.select({ id: vendors.id }).from(vendors).where(and(eq(vendors.id, transfer.vendorId), eq(vendors.organizationId, authz.organization.id), eq(vendors.status, "active"))).limit(1);
  const [key] = await db.select().from(transferRecipientKeys).where(and(eq(transferRecipientKeys.id, input.data.recipientKeyId), eq(transferRecipientKeys.organizationId, authz.organization.id), eq(transferRecipientKeys.vendorId, transfer.vendorId), eq(transferRecipientKeys.status, "active"))).limit(1);
  if (!recipient || !key) return NextResponse.json({ success: false, message: "Recipient or active recipient key does not match the transfer" }, { status: 409 });

  const [record] = await db.select().from(consentRecords).where(and(eq(consentRecords.id, input.data.consentRecordId), eq(consentRecords.organizationId, authz.organization.id), eq(consentRecords.websiteId, transfer.websiteId), eq(consentRecords.status, "active"))).limit(1);
  if (!record || record.withdrawnAt || record.expiresAt && record.expiresAt <= now) return NextResponse.json({ success: false, message: "An active, unexpired consent record for this site is required" }, { status: 403 });
  const [decision] = await db.select().from(consentDecisions).where(and(eq(consentDecisions.consentRecordId, record.id), eq(consentDecisions.purposeId, activity.purposeId), eq(consentDecisions.granted, true), or(isNull(consentDecisions.vendorId), eq(consentDecisions.vendorId, transfer.vendorId)))).limit(1);
  if (!decision) return NextResponse.json({ success: false, message: "This consent record has no explicit grant for the processing activity purpose" }, { status: 403 });
  let sessionId: string | null = null;
  if (input.data.sessionId) {
    const [session] = await db.select().from(consentSessions).where(and(eq(consentSessions.id, input.data.sessionId), eq(consentSessions.organizationId, authz.organization.id), eq(consentSessions.websiteId, transfer.websiteId), eq(consentSessions.consentRecordId, record.id))).limit(1);
    if (!session || !consentSessionIsActive(session) || session.expiresAt < expiresAt) return NextResponse.json({ success: false, message: "Consent session is not active for this record or expires before the authorization" }, { status: 403 });
    sessionId = session.id;
  } else {
    const [session] = await db.select().from(consentSessions).where(and(eq(consentSessions.organizationId, authz.organization.id), eq(consentSessions.websiteId, transfer.websiteId), eq(consentSessions.consentRecordId, record.id), eq(consentSessions.status, "active"))).orderBy(desc(consentSessions.createdAt)).limit(1);
    if (session && consentSessionIsActive(session) && session.expiresAt >= expiresAt) sessionId = session.id;
  }
  if (record.expiresAt && record.expiresAt < expiresAt) return NextResponse.json({ success: false, message: "Authorization cannot outlive the consent record" }, { status: 400 });

  const issueFailure = transferAuthorizationIssueFailure({
    transferActive: transfer.status === "active", transferIsSiteScoped: !!transfer.websiteId,
    processingActivityActive: activity.status === "active", activityMatchesRecipient: activity.vendorId === transfer.vendorId,
    activityMatchesSite: !activity.websiteId || activity.websiteId === transfer.websiteId, purposeMatchesActivity: activity.purposeId === input.data.purposeId,
    recipientActive: !!recipient, recipientKeyMatches: key.vendorId === recipient.id,
    consentActive: record.status === "active" && !record.withdrawnAt && (!record.expiresAt || record.expiresAt > now), purposeGranted: decision.purposeId === activity.purposeId && decision.granted,
    recipientGranted: !decision.vendorId || decision.vendorId === recipient.id, sessionValid: !input.data.sessionId || !!sessionId,
    expiryValid: expiresAt > now && expiresAt <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) && (!record.expiresAt || expiresAt <= record.expiresAt),
  });
  if (issueFailure) return NextResponse.json({ success: false, message: issueFailure }, { status: 403 });

  const [authorization] = await db.insert(transferAuthorizations).values({ organizationId: authz.organization.id, websiteId: transfer.websiteId, transferId: transfer.id, processingActivityId: activity.id, recipientVendorId: recipient.id, recipientKeyId: key.id, consentRecordId: record.id, consentDecisionId: decision.id, sessionId, purposeId: activity.purposeId, singleUse: input.data.singleUse, expiresAt, createdBy: authz.localUser.id }).returning();
  await db.insert(privacyEvents).values({ organizationId: authz.organization.id, websiteId: transfer.websiteId, sessionId, eventType: "transfer.authorized", provenance: "configured", payload: { authorizationId: authorization.id, transferId: transfer.id, recipientVendorId: recipient.id, purposeId: activity.purposeId, consentRecordId: record.id, consentDecisionId: decision.id, expiresAt: expiresAt.toISOString(), singleUse: input.data.singleUse } });
  await db.insert(auditLogs).values({ organizationId: authz.organization.id, userId: authz.localUser.id, action: "transfer.authorized", resourceType: "transfer_authorization", resourceId: authorization.id, description: "Issued purpose-specific transfer authorization", metadata: { transferId: transfer.id, recipientVendorId: recipient.id, purposeId: activity.purposeId, consentRecordId: record.id, consentDecisionId: decision.id, expiresAt: expiresAt.toISOString(), singleUse: input.data.singleUse } });
  return NextResponse.json({ success: true, authorization }, { status: 201 });
}
