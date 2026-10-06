import { after, NextResponse } from "next/server";
import { desc, eq, and, sql, inArray } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentEvidenceSnapshots } from "@/db/schema/consent-evidence-snapshots";
import { consentSessions } from "@/db/schema/consent-sessions";
import { experiments, experimentEvents } from "@/db/schema/experiments";
import { privacyEvents } from "@/db/schema/privacy-events";
import { secureTransferEnvelopes, transferAuthorizations } from "@/db/schema/transfer-security";
import { appendConsentEvent } from "@/lib/consent-engine";
import { buildWithdrawalEvidenceSnapshot } from "@/lib/consent-evidence-write";
import { logger } from "@/lib/logger";
import {
  isValidConsentId,
  isValidWebsiteId,
  publicCorsHeaders,
  publicOptionsResponse,
  readPublicJsonObject,
} from "@/lib/sdk/public-http";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";
import { sdkOriginGuard } from "@/lib/sdk/origin-allowlist";

const CORS_HEADERS = publicCorsHeaders("POST, OPTIONS");

export async function POST(request: Request) {
  try {
    const parsed = await readPublicJsonObject(request);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.message },
        { status: parsed.status, headers: CORS_HEADERS },
      );
    }
    const body = parsed.body;

    const consentId = String(body.consentId ?? "").trim();
    const websiteId = String(body.websiteId ?? "").trim();

    if (!consentId || !websiteId) {
      return NextResponse.json(
        { success: false, message: "consentId and websiteId are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (!isValidConsentId(consentId) || !isValidWebsiteId(websiteId)) {
      return NextResponse.json(
        { success: false, message: "Invalid parameter format" },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    const expectedStateVersion = Number(body.expectedStateVersion);
    if (!Number.isInteger(expectedStateVersion) || expectedStateVersion < 1) {
      return NextResponse.json(
        { success: false, message: "Invalid expectedStateVersion" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const limit = await consumeRateLimit({
      key: `consent-withdraw:${websiteId}:${getClientIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit, CORS_HEADERS);

    const [website] = await db
      .select({
        id: websites.id,
        organizationId: websites.organizationId,
        domain: websites.domain,
        verified: websites.verified,
        siteKey: websites.siteKey,
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!website) {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }
    const siteKey = String(body.siteKey ?? "").trim();
    if (!siteKey || siteKey !== website.siteKey) {
      return NextResponse.json(
        { success: false, message: "siteKey is required" },
        { status: 403, headers: CORS_HEADERS },
      );
    }
    const originError = sdkOriginGuard(request, website, CORS_HEADERS);
    if (originError) return originError;

    const [record] = await db
      .select({
        id: consentRecords.id,
        organizationId: consentRecords.organizationId,
        consentId: consentRecords.consentId,
        status: consentRecords.status,
        stateVersion: consentRecords.stateVersion,
        policyVersionId: consentRecords.policyVersionId,
        metadata: consentRecords.metadata,
      })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.consentId, consentId),
          eq(consentRecords.websiteId, website.id),
        ),
      )
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Consent record not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    if (record.status === "withdrawn") {
      return NextResponse.json(
        { success: false, message: "Consent has already been withdrawn" },
        { status: 409, headers: CORS_HEADERS },
      );
    }
    if (record.stateVersion !== expectedStateVersion) {
      return NextResponse.json(
        {
          success: false,
          code: "CONSENT_STATE_CONFLICT",
          message: "Consent state changed; refresh and retry",
        },
        { status: 409, headers: CORS_HEADERS },
      );
    }

    const now = new Date();
    const [priorEvidence] = await db
      .select()
      .from(consentEvidenceSnapshots)
      .where(
        and(
          eq(consentEvidenceSnapshots.organizationId, website.organizationId),
          eq(consentEvidenceSnapshots.consentId, record.consentId),
        ),
      )
      .orderBy(desc(consentEvidenceSnapshots.consentedAt))
      .limit(1);

    let withdrawn: { stateVersion: number } | undefined;
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(consentRecords)
        .set({
          status: "withdrawn",
          stateVersion: sql`${consentRecords.stateVersion} + 1`,
          withdrawnAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(consentRecords.id, record.id),
            eq(consentRecords.stateVersion, expectedStateVersion),
          ),
        )
        .returning({ stateVersion: consentRecords.stateVersion });
      if (!updated) {
        throw new Error("CONSENT_STATE_CONFLICT");
      }
      withdrawn = updated;

      const [activeSession] = await tx.select({ id: consentSessions.id }).from(consentSessions).where(and(eq(consentSessions.consentRecordId, record.id), eq(consentSessions.status, "active"))).limit(1);
      if (activeSession) await tx.update(consentSessions).set({ status: "revoked", revokedAt: now, updatedAt: now }).where(eq(consentSessions.id, activeSession.id));
      const allTransferAuthorizations = await tx.select({ id: transferAuthorizations.id }).from(transferAuthorizations).where(and(eq(transferAuthorizations.organizationId, record.organizationId), eq(transferAuthorizations.websiteId, websiteId), eq(transferAuthorizations.consentRecordId, record.id)));
      const revokedAuthorizations = await tx.update(transferAuthorizations).set({ state: "revoked", revokedAt: now, updatedAt: now }).where(and(eq(transferAuthorizations.organizationId, record.organizationId), eq(transferAuthorizations.websiteId, websiteId), eq(transferAuthorizations.consentRecordId, record.id), inArray(transferAuthorizations.state, ["active", "consumed"]))).returning({ id: transferAuthorizations.id, transferId: transferAuthorizations.transferId, recipientVendorId: transferAuthorizations.recipientVendorId, purposeId: transferAuthorizations.purposeId, sessionId: transferAuthorizations.sessionId });
      if (allTransferAuthorizations.length) await tx.update(secureTransferEnvelopes).set({ status: "revoked" }).where(and(eq(secureTransferEnvelopes.organizationId, record.organizationId), eq(secureTransferEnvelopes.status, "ready"), inArray(secureTransferEnvelopes.authorizationId, allTransferAuthorizations.map((item) => item.id))));
      if (revokedAuthorizations.length) {
        await tx.insert(privacyEvents).values(revokedAuthorizations.map((item) => ({ organizationId: record.organizationId, websiteId, sessionId: item.sessionId, eventType: "transfer.authorization_revoked", provenance: "observed", payload: { authorizationId: item.id, transferId: item.transferId, recipientVendorId: item.recipientVendorId, purposeId: item.purposeId, reason: "consent_withdrawn" }, occurredAt: now })));
      }
      await tx.insert(privacyEvents).values({ organizationId: record.organizationId, websiteId, sessionId: activeSession?.id ?? null, eventType: "consent.withdrawn", provenance: "observed", payload: { consentId: record.consentId, policyVersionId: record.policyVersionId, stateVersion: updated.stateVersion }, occurredAt: now });
      const abTest = record.metadata && typeof record.metadata === "object" ? (record.metadata as Record<string, unknown>).abTest as Record<string, unknown> | undefined : undefined;
      const experimentId = typeof abTest?.experimentId === "string" ? abTest.experimentId : null;
      const variantId = typeof abTest?.variantId === "string" ? abTest.variantId : null;
      if (experimentId && variantId) {
        const [experiment] = await tx.select({ id: experiments.id }).from(experiments).where(and(eq(experiments.id, experimentId), eq(experiments.organizationId, record.organizationId), eq(experiments.websiteId, website.id))).limit(1);
        if (experiment) {
          await tx.insert(experimentEvents).values({ organizationId: record.organizationId, websiteId: website.id, experimentId, sessionId: activeSession?.id ?? null, eventId: `withdraw-${record.id}-${updated.stateVersion}`, eventType: "withdrawal", variantId, occurredAt: now }).onConflictDoNothing();
          await tx.insert(privacyEvents).values({ organizationId: record.organizationId, websiteId: website.id, sessionId: activeSession?.id ?? null, eventType: "experiment.event", provenance: "observed", payload: { experimentId, variantId, eventType: "withdrawal", consentId }, occurredAt: now });
        }
      }

      if (priorEvidence) {
        const snapshot = buildWithdrawalEvidenceSnapshot({
          prior: priorEvidence,
          stateVersion: updated.stateVersion,
          withdrawnAt: now,
        });
        await tx.insert(consentEvidenceSnapshots).values(snapshot.values);
      }
    });

    if (!withdrawn) {
      return NextResponse.json(
        {
          success: false,
          code: "CONSENT_STATE_CONFLICT",
          message: "Consent state changed; refresh and retry",
        },
        { status: 409, headers: CORS_HEADERS },
      );
    }

    try {
      after(() =>
        appendConsentEvent({
          consentRecordId: record.id,
          policyVersionId: record.policyVersionId,
          eventType: "consent.withdrawn",
          eventData: {
            previousStatus: record.status,
            withdrawnAt: now.toISOString(),
          },
        }).catch((eventError) => {
          logger.error("Append withdrawal consent event failed", {
            operation: "consent.withdraw.event",
            consentRecordId: record.id,
            policyVersionId: record.policyVersionId,
            error: eventError,
          });
        }),
      );
    } catch (eventError) {
      logger.error("Schedule withdrawal consent event failed", {
        operation: "consent.withdraw.event",
        consentRecordId: record.id,
        policyVersionId: record.policyVersionId,
        error: eventError,
      });
    }

    return NextResponse.json(
      { success: true, withdrawnAt: now, stateVersion: withdrawn.stateVersion },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "CONSENT_STATE_CONFLICT") {
      return NextResponse.json(
        {
          success: false,
          code: "CONSENT_STATE_CONFLICT",
          message: "Consent state changed; refresh and retry",
        },
        { status: 409, headers: CORS_HEADERS },
      );
    }
    logger.error("Consent withdrawal failed", {
      operation: "consent.withdraw",
      error,
    });
    return NextResponse.json(
      { success: false, message: "Failed to withdraw consent" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export async function OPTIONS() {
  return publicOptionsResponse("POST, OPTIONS");
}
