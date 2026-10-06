import { createHash, randomUUID } from "node:crypto";
import { and, eq, isNull, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { transferAuthorizations, transferRecipientKeys, secureTransferEnvelopes } from "@/db/schema/transfer-security";
import { crossBorderTransfers, processingActivities } from "@/db/schema/processing-inventory";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentSessions } from "@/db/schema/consent-sessions";
import { privacyEvents } from "@/db/schema/privacy-events";
import { auditLogs } from "@/db/schema/audit-logs";
import { authorizeProcessingOrganization } from "@/lib/processing/http";
import { consentSessionIsActive } from "@/lib/consent-session-core";
import { createSecureTransferEnvelope, transferAuthorizationFailure } from "@/lib/transfer-security-core";

const schema = z.object({ authorizationId: z.string().uuid(), idempotencyKey: z.string().uuid(), payload: z.unknown() }).strict();
const MAX_REQUEST_BYTES = 1_100_000;

async function readBoundedBody(request: Request): Promise<string | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_REQUEST_BYTES) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8");
  } catch { return null; }
}

export async function GET() {
  const authz = await authorizeProcessingOrganization();
  if ("error" in authz) return authz.error;
  const rows = await db.select().from(secureTransferEnvelopes).where(eq(secureTransferEnvelopes.organizationId, authz.organization.id)).orderBy(secureTransferEnvelopes.createdAt).limit(200);
  const now = new Date();
  return NextResponse.json({ success: true, transfers: rows.map((row) => {
    const status = row.status === "ready" && row.expiresAt <= now ? "expired" : row.status;
    return { ...row, status, envelope: {} };
  }) });
}

export async function POST(request: Request) {
  const authz = await authorizeProcessingOrganization({ operator: true });
  if ("error" in authz) return authz.error;
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_REQUEST_BYTES) return NextResponse.json({ success: false, message: "Encrypted transfer payload exceeds the 1 MB limit" }, { status: 413 });
  const bodyText = await readBoundedBody(request);
  if (bodyText === null) return NextResponse.json({ success: false, message: "Encrypted transfer payload exceeds the 1 MB limit or could not be read" }, { status: 413 });
  let raw: unknown = null;
  try { raw = JSON.parse(bodyText); } catch { /* schema reports invalid JSON */ }
  const input = schema.safeParse(raw);
  if (!input.success) return NextResponse.json({ success: false, message: "Invalid secure transfer request" }, { status: 400 });
  let serialized: string;
  try { serialized = typeof input.data.payload === "string" ? input.data.payload : JSON.stringify(input.data.payload); } catch { return NextResponse.json({ success: false, message: "Payload must be valid JSON or text" }, { status: 400 }); }
  if (!serialized || Buffer.byteLength(serialized, "utf8") > 1_000_000) return NextResponse.json({ success: false, message: "Payload must be between 1 byte and 1 MB" }, { status: 413 });
  const now = new Date();

  // Idempotent retries never return ciphertext. Retrieval uses the dedicated
  // endpoint, which revalidates current consent, authorization, transfer and key.
  const [existing] = await db.select().from(secureTransferEnvelopes).where(and(eq(secureTransferEnvelopes.organizationId, authz.organization.id), eq(secureTransferEnvelopes.idempotencyKey, input.data.idempotencyKey))).limit(1);
  if (existing) {
    if (existing.authorizationId !== input.data.authorizationId) return NextResponse.json({ success: false, message: "Idempotency key already belongs to another authorization" }, { status: 409 });
    return NextResponse.json({ success: true, duplicate: true, transfer: { ...existing, envelope: {} } });
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [authorization] = await tx.select().from(transferAuthorizations).where(and(eq(transferAuthorizations.id, input.data.authorizationId), eq(transferAuthorizations.organizationId, authz.organization.id))).for("update").limit(1);
      if (!authorization) throw new TransferDenied("Authorization is expired, revoked, consumed, or unavailable");
      const [transfer] = await tx.select().from(crossBorderTransfers).where(and(eq(crossBorderTransfers.id, authorization.transferId), eq(crossBorderTransfers.organizationId, authz.organization.id), eq(crossBorderTransfers.websiteId, authorization.websiteId), eq(crossBorderTransfers.vendorId, authorization.recipientVendorId), eq(crossBorderTransfers.status, "active"))).limit(1);
      const [activity] = await tx.select().from(processingActivities).where(and(eq(processingActivities.id, authorization.processingActivityId), eq(processingActivities.organizationId, authz.organization.id), eq(processingActivities.status, "active"), eq(processingActivities.vendorId, authorization.recipientVendorId), eq(processingActivities.purposeId, authorization.purposeId))).limit(1);
      const [consent] = await tx.select().from(consentRecords).where(and(eq(consentRecords.id, authorization.consentRecordId), eq(consentRecords.organizationId, authz.organization.id), eq(consentRecords.websiteId, authorization.websiteId), eq(consentRecords.status, "active"))).limit(1);
      const [decision] = await tx.select({ id: consentDecisions.id }).from(consentDecisions).where(and(eq(consentDecisions.id, authorization.consentDecisionId), eq(consentDecisions.consentRecordId, consent?.id ?? authorization.consentRecordId), eq(consentDecisions.purposeId, authorization.purposeId), eq(consentDecisions.granted, true), or(isNull(consentDecisions.vendorId), eq(consentDecisions.vendorId, authorization.recipientVendorId)))).limit(1);
      let sessionActive = true;
      if (authorization.sessionId) {
        const [session] = await tx.select().from(consentSessions).where(and(eq(consentSessions.id, authorization.sessionId), eq(consentSessions.organizationId, authz.organization.id), eq(consentSessions.websiteId, authorization.websiteId), eq(consentSessions.consentRecordId, consent?.id ?? authorization.consentRecordId))).limit(1);
        sessionActive = !!session && consentSessionIsActive(session) && session.expiresAt > now;
      }
      const [recipientKey] = await tx.select().from(transferRecipientKeys).where(and(eq(transferRecipientKeys.id, authorization.recipientKeyId), eq(transferRecipientKeys.organizationId, authz.organization.id), eq(transferRecipientKeys.vendorId, authorization.recipientVendorId), eq(transferRecipientKeys.status, "active"))).limit(1);
      const failure = transferAuthorizationFailure({ state: authorization.state, expiresAt: authorization.expiresAt, revokedAt: authorization.revokedAt, consumedAt: authorization.consumedAt, singleUse: authorization.singleUse, transferActive: !!transfer && !!activity && transfer.processingActivityId === activity.id && (!activity.websiteId || activity.websiteId === authorization.websiteId), recipientMatches: !!transfer && !!activity && transfer.websiteId === authorization.websiteId && transfer.vendorId === authorization.recipientVendorId && activity.vendorId === authorization.recipientVendorId && activity.purposeId === authorization.purposeId, consentActive: !!consent && !consent.withdrawnAt && (!consent.expiresAt || consent.expiresAt > now), exactPurposeGrant: !!decision, sessionActive, recipientKeyActive: !!recipientKey }, now);
      if (failure) throw new TransferDenied(failure);

      const envelopeId = randomUUID();
      const expiresAt = new Date(Math.min(authorization.expiresAt.getTime(), now.getTime() + 24 * 60 * 60 * 1000));
      const envelope = createSecureTransferEnvelope({ plaintext: serialized, recipientPublicKey: recipientKey.publicKeySpki, binding: { id: envelopeId, transferId: transfer.id, authorizationId: authorization.id, recipientVendorId: authorization.recipientVendorId, recipientKeyId: recipientKey.keyId, createdAt: now.toISOString(), expiresAt: expiresAt.toISOString() } });
      const [row] = await tx.insert(secureTransferEnvelopes).values({ id: envelopeId, organizationId: authz.organization.id, websiteId: authorization.websiteId, transferId: transfer.id, authorizationId: authorization.id, recipientVendorId: authorization.recipientVendorId, recipientKeyId: recipientKey.id, idempotencyKey: input.data.idempotencyKey, status: "ready", envelope: envelope as unknown as Record<string, unknown>, expiresAt }).returning();
      if (authorization.singleUse) await tx.update(transferAuthorizations).set({ state: "consumed", consumedAt: now, updatedAt: now }).where(and(eq(transferAuthorizations.id, authorization.id), eq(transferAuthorizations.state, "active")));
      await tx.insert(privacyEvents).values({ organizationId: authz.organization.id, websiteId: authorization.websiteId, sessionId: authorization.sessionId, eventType: "secure_transfer.created", provenance: "enforced", payload: { envelopeId, authorizationId: authorization.id, transferId: transfer.id, recipientVendorId: authorization.recipientVendorId, recipientKeyId: recipientKey.id, ciphertextSha256: createHash("sha256").update(envelope.ciphertext).digest("hex"), expiresAt: expiresAt.toISOString() } });
      await tx.insert(auditLogs).values({ organizationId: authz.organization.id, userId: authz.localUser.id, action: "secure_transfer.created", resourceType: "secure_transfer_envelope", resourceId: envelopeId, description: "Created an encrypted secure transfer envelope", metadata: { authorizationId: authorization.id, transferId: transfer.id, recipientVendorId: authorization.recipientVendorId, recipientKeyId: recipientKey.id, ciphertextSha256: createHash("sha256").update(envelope.ciphertext).digest("hex") } });
      return row;
    });
    return NextResponse.json({ success: true, duplicate: false, transfer: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof TransferDenied ? error.message : "Unable to create secure transfer";
    return NextResponse.json({ success: false, message }, { status: error instanceof TransferDenied ? 403 : 409 });
  }
}

class TransferDenied extends Error {}
