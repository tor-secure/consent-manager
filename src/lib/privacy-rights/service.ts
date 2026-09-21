import "server-only";

import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { organizations } from "@/db/schema/organizations";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentEvents } from "@/db/schema/consent-events";
import { consentEvidenceSnapshots } from "@/db/schema/consent-evidence-snapshots";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentPolicies } from "@/db/schema/consent-policies";
import { legalHolds } from "@/db/schema/legal-holds";
import { dataPrincipalRequests } from "@/db/schema/data-principal-requests";
import { rightsRequestVerifications } from "@/db/schema/rights-request-verifications";
import { rightsRequestExports } from "@/db/schema/rights-request-exports";
import { ageAssuranceSessions } from "@/db/schema/age-assurance";
import {
  processingActivities,
  rightsDownstreamActions,
} from "@/db/schema/processing-inventory";
import { vendors } from "@/db/schema/vendors";
import { californiaOptOutStates } from "@/db/schema/california-opt-out";
import { minimizedAgeRecord } from "@/lib/children/service";
import { appendConsentEvent } from "@/lib/consent-engine";
import { buildWithdrawalEvidenceSnapshot } from "@/lib/consent-evidence-write";
import {
  resourceIsOnLegalHold,
  isLegalHoldActive,
  type LegalHoldRecord,
} from "@/lib/retention/core";
import { snapshotJurisdiction } from "./applicability";
import { writeRightsAudit } from "./audit";
import { computeRightsDeadlines } from "./deadlines";
import { planDsarDeletion } from "./deletion-policy";
import { buildExportMetadata, stripSensitiveKeys } from "./export-sanitize";
import { statusAfterVerification, verificationAllowedForRequest } from "./lifecycle";
import {
  generateRequesterReference,
  generateRightsToken,
  hashRightsToken,
  tokenReusable,
  tokensMatch,
} from "./tokens";
import {
  DOWNSTREAM_ACTION_DISCLAIMER,
  EXPORT_TTL_MS,
  IDENTITY_TOKEN_TTL_MS,
  RIGHTS_AUDIT_ACTIONS,
  STATUS_TOKEN_TTL_MS,
  type RightsExportKind,
  type RightsRequestType,
  type RequesterKind,
} from "./types";
import { domainLookupCandidates, normalizeTicketId } from "./intake-fields";

const ERASED_EVENT_DATA = {
  redacted: true,
  reason: "erasure_request",
  retainedForAudit: true,
} as const;

export async function issueRightsTokens(input: {
  organizationId: string;
  requestId: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const identityToken = generateRightsToken();
  const statusToken = generateRightsToken();

  await db.insert(rightsRequestVerifications).values([
    {
      organizationId: input.organizationId,
      requestId: input.requestId,
      purpose: "identity",
      tokenHash: hashRightsToken(identityToken),
      expiresAt: new Date(now.getTime() + IDENTITY_TOKEN_TTL_MS),
    },
    {
      organizationId: input.organizationId,
      requestId: input.requestId,
      purpose: "status",
      tokenHash: hashRightsToken(statusToken),
      expiresAt: new Date(now.getTime() + STATUS_TOKEN_TTL_MS),
    },
  ]);

  return {
    identityToken,
    statusToken,
    verificationExpiresAt: new Date(now.getTime() + IDENTITY_TOKEN_TTL_MS),
  };
}

export async function createRightsRequest(input: {
  organizationId: string;
  websiteId: string;
  requestType: RightsRequestType;
  jurisdiction: string;
  requesterName: string;
  requesterEmail: string;
  requesterPhone: string | null;
  requesterKind: RequesterKind;
  agentAuthorizationNote: string | null;
  consentId: string | null;
  description: string;
}) {
  const now = new Date();
  const snapshot = snapshotJurisdiction(input.jurisdiction);
  const deadlines = computeRightsDeadlines(now, snapshot.jurisdiction);

  const [inserted] = await db
    .insert(dataPrincipalRequests)
    .values({
      organizationId: input.organizationId,
      websiteId: input.websiteId,
      requestType: input.requestType,
      status: "verification_pending",
      jurisdiction: snapshot.jurisdiction,
      jurisdictionSnapshot: snapshot,
      requesterReference: generateRequesterReference(),
      requesterName: input.requesterName,
      requesterEmail: input.requesterEmail,
      requesterPhone: input.requesterPhone,
      requesterKind: input.requesterKind,
      agentAuthorizationNote: input.agentAuthorizationNote,
      consentId: input.consentId,
      description: input.description,
      verificationStatus: "pending",
      verificationMethod: "email_token",
      verificationExpiresAt: new Date(now.getTime() + IDENTITY_TOKEN_TTL_MS),
      deadlineKind: deadlines.deadlineKind,
      acknowledgeBy: deadlines.acknowledgeBy,
      dueAt: deadlines.dueAt,
      receivedAt: now,
    })
    .returning();

  const tokens = await issueRightsTokens({
    organizationId: input.organizationId,
    requestId: inserted.id,
    now,
  });

  await writeRightsAudit({
    organizationId: input.organizationId,
    action: RIGHTS_AUDIT_ACTIONS.created,
    requestId: inserted.id,
    websiteId: input.websiteId,
    description: "Rights request submitted; verification pending",
    metadata: {
      requestType: input.requestType,
      jurisdiction: snapshot.jurisdiction,
      requesterKind: input.requesterKind,
    },
  });

  await writeRightsAudit({
    organizationId: input.organizationId,
    action: RIGHTS_AUDIT_ACTIONS.verificationSent,
    requestId: inserted.id,
    websiteId: input.websiteId,
    description: "Identity verification challenge issued",
    metadata: { method: "email_token" },
  });

  return { request: inserted, tokens, deadlines };
}

export async function verifyRightsToken(input: {
  token: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const tokenHash = hashRightsToken(input.token);

  const [challenge] = await db
    .select()
    .from(rightsRequestVerifications)
    .where(eq(rightsRequestVerifications.tokenHash, tokenHash))
    .limit(1);

  if (!challenge || challenge.purpose !== "identity") {
    return { ok: false as const, reason: "invalid" };
  }

  const usable = tokenReusable({
    usedAt: challenge.usedAt,
    expiresAt: challenge.expiresAt,
    failedAttempts: challenge.failedAttempts,
    now,
  });

  if (!usable.ok) {
    if (usable.reason === "expired") {
      await db
        .update(dataPrincipalRequests)
        .set({ verificationStatus: "expired", updatedAt: now })
        .where(eq(dataPrincipalRequests.id, challenge.requestId));
    }
    await writeRightsAudit({
      organizationId: challenge.organizationId,
      action: RIGHTS_AUDIT_ACTIONS.verificationFailed,
      requestId: challenge.requestId,
      description: `Verification failed (${usable.reason})`,
      metadata: { reason: usable.reason },
    });
    return { ok: false as const, reason: usable.reason ?? "invalid" };
  }

  if (!tokensMatch(input.token, challenge.tokenHash)) {
    await db
      .update(rightsRequestVerifications)
      .set({ failedAttempts: challenge.failedAttempts + 1 })
      .where(eq(rightsRequestVerifications.id, challenge.id));
    return { ok: false as const, reason: "invalid" };
  }

  const [request] = await db
    .select()
    .from(dataPrincipalRequests)
    .where(
      and(
        eq(dataPrincipalRequests.id, challenge.requestId),
        eq(dataPrincipalRequests.organizationId, challenge.organizationId),
      ),
    )
    .limit(1);

  if (!request || !verificationAllowedForRequest(request.status)) {
    return { ok: false as const, reason: "invalid" };
  }

  const nextStatus = statusAfterVerification(request.status);
  const agentVerified = request.requesterKind === "authorized_agent";

  await db.transaction(async (tx) => {
    await tx
      .update(rightsRequestVerifications)
      .set({ usedAt: now })
      .where(eq(rightsRequestVerifications.id, challenge.id));
    await tx
      .update(dataPrincipalRequests)
      .set({
        status: nextStatus,
        verificationStatus: "verified",
        verificationMethod: agentVerified ? "agent_attested" : "email_token",
        verifiedAt: now,
        updatedAt: now,
      })
      .where(eq(dataPrincipalRequests.id, request.id));
  });

  await writeRightsAudit({
    organizationId: request.organizationId,
    action: RIGHTS_AUDIT_ACTIONS.verified,
    requestId: request.id,
    websiteId: request.websiteId,
    description: "Requester identity verified",
    metadata: { method: agentVerified ? "agent_attested" : "email_token" },
  });

  if (agentVerified) {
    await writeRightsAudit({
      organizationId: request.organizationId,
      action: RIGHTS_AUDIT_ACTIONS.agentAuthorized,
      requestId: request.id,
      websiteId: request.websiteId,
      description: "Authorized-agent verification recorded",
    });
  }

  return { ok: true as const, requestId: request.id, organizationId: request.organizationId };
}

export async function lookupStatusToken(token: string) {
  const tokenHash = hashRightsToken(token);
  const [challenge] = await db
    .select()
    .from(rightsRequestVerifications)
    .where(eq(rightsRequestVerifications.tokenHash, tokenHash))
    .limit(1);
  if (!challenge || challenge.purpose !== "status") return null;
  if (challenge.usedAt) return null;
  if (challenge.expiresAt.getTime() <= Date.now()) return null;

  const [request] = await db
    .select()
    .from(dataPrincipalRequests)
    .where(
      and(
        eq(dataPrincipalRequests.id, challenge.requestId),
        eq(dataPrincipalRequests.organizationId, challenge.organizationId),
      ),
    )
    .limit(1);
  return request ?? null;
}

export async function lookupStatusByTicket(ticket: string, email: string) {
  const reference = normalizeTicketId(ticket);
  const requesterEmail = email.trim().toLowerCase();
  if (!reference || !requesterEmail) return null;

  const [request] = await db
    .select()
    .from(dataPrincipalRequests)
    .where(eq(dataPrincipalRequests.requesterReference, reference))
    .limit(1);
  if (!request) return null;
  if (request.requesterEmail.trim().toLowerCase() !== requesterEmail) return null;
  return request;
}

export async function loadActiveHolds(organizationId: string) {
  const rows = await db
    .select()
    .from(legalHolds)
    .where(eq(legalHolds.organizationId, organizationId));
  return rows
    .map((hold) => ({
      ...hold,
      status: hold.status === "released" ? "released" as const : "active" as const,
    }))
    .filter((hold) => isLegalHoldActive(hold)) as LegalHoldRecord[];
}

export async function discoverRightsData(input: {
  organizationId: string;
  request: typeof dataPrincipalRequests.$inferSelect;
}) {
  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(eq(websites.organizationId, input.organizationId));
  const websiteIds = orgWebsites.map((site) => site.id);

  const records = websiteIds.length === 0
    ? []
    : input.request.consentId
      ? await db
          .select()
          .from(consentRecords)
          .where(
            and(
              eq(consentRecords.organizationId, input.organizationId),
              eq(consentRecords.consentId, input.request.consentId),
              inArray(consentRecords.websiteId, websiteIds),
            ),
          )
      : [];

  const recordIds = records.map((row) => row.id);
  const consentIds = [...new Set(records.map((row) => row.consentId).concat(
    input.request.consentId ? [input.request.consentId] : [],
  ))];

  const decisions = recordIds.length
    ? await db
        .select()
        .from(consentDecisions)
        .where(inArray(consentDecisions.consentRecordId, recordIds))
    : [];

  const events = consentIds.length
    ? await db
        .select()
        .from(consentEvents)
        .where(
          and(
            eq(consentEvents.organizationId, input.organizationId),
            inArray(consentEvents.consentId, consentIds),
          ),
        )
    : [];

  const snapshots = consentIds.length
    ? await db
        .select()
        .from(consentEvidenceSnapshots)
        .where(
          and(
            eq(consentEvidenceSnapshots.organizationId, input.organizationId),
            inArray(consentEvidenceSnapshots.consentId, consentIds),
          ),
        )
        .orderBy(desc(consentEvidenceSnapshots.consentedAt))
    : [];

  const ageSessions = consentIds.length
    ? await db
        .select()
        .from(ageAssuranceSessions)
        .where(
          and(
            eq(ageAssuranceSessions.organizationId, input.organizationId),
            inArray(ageAssuranceSessions.consentId, consentIds),
          ),
        )
    : [];

  const californiaOptOuts = consentIds.length && websiteIds.length
    ? await db
        .select({
          consentId: californiaOptOutStates.consentId,
          websiteId: californiaOptOutStates.websiteId,
          state: californiaOptOutStates.state,
          source: californiaOptOutStates.source,
          saleOptOut: californiaOptOutStates.saleOptOut,
          shareOptOut: californiaOptOutStates.shareOptOut,
          sensitivePiLimit: californiaOptOutStates.sensitivePiLimit,
          gpcHeader: californiaOptOutStates.gpcHeader,
          jurisdiction: californiaOptOutStates.jurisdiction,
          effectiveAt: californiaOptOutStates.effectiveAt,
          updatedAt: californiaOptOutStates.updatedAt,
        })
        .from(californiaOptOutStates)
        .where(
          and(
            eq(californiaOptOutStates.organizationId, input.organizationId),
            inArray(californiaOptOutStates.consentId, consentIds),
            inArray(californiaOptOutStates.websiteId, websiteIds),
          ),
        )
    : [];

  const policyVersionIds = [
    ...new Set([
      ...records.map((row) => row.policyVersionId),
      ...snapshots.map((row) => row.policyVersionId),
    ]),
  ];
  const versions = policyVersionIds.length
    ? await db
        .select({
          id: consentPolicyVersions.id,
          version: consentPolicyVersions.version,
          policyId: consentPolicyVersions.policyId,
          policyName: consentPolicies.name,
        })
        .from(consentPolicyVersions)
        .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
        .where(inArray(consentPolicyVersions.id, policyVersionIds))
    : [];

  const holds = await loadActiveHolds(input.organizationId);
  const holdOnRequest = resourceIsOnLegalHold(holds, {
    organizationId: input.organizationId,
    resourceType: "rights_request",
    resourceId: input.request.id,
  });
  const holdOnRecords = records.filter((row) =>
    resourceIsOnLegalHold(holds, {
      organizationId: input.organizationId,
      resourceType: "consent_record",
      resourceId: row.id,
    }),
  );
  const holdOnEvidence = snapshots.filter((row) =>
    resourceIsOnLegalHold(holds, {
      organizationId: input.organizationId,
      resourceType: "consent_evidence",
      resourceId: row.id,
    }),
  );

  const activityFilter = input.request.websiteId
    ? and(
        eq(processingActivities.organizationId, input.organizationId),
        or(
          eq(processingActivities.websiteId, input.request.websiteId),
          isNull(processingActivities.websiteId),
        ),
      )
    : eq(processingActivities.organizationId, input.organizationId);

  const activityRows = await db
    .select({
      id: processingActivities.id,
      vendorId: processingActivities.vendorId,
      purposeId: processingActivities.purposeId,
      dataCategories: processingActivities.dataCategories,
      processingRole: processingActivities.processingRole,
      status: processingActivities.status,
    })
    .from(processingActivities)
    .where(activityFilter);

  const downstreamVendorIds = [...new Set(activityRows.map((row) => row.vendorId))];
  const downstreamVendors = downstreamVendorIds.length
    ? await db
        .select({
          id: vendors.id,
          name: vendors.name,
          role: vendors.role,
          country: vendors.country,
          downstreamDsarMode: vendors.downstreamDsarMode,
          status: vendors.status,
        })
        .from(vendors)
        .where(
          and(
            eq(vendors.organizationId, input.organizationId),
            inArray(vendors.id, downstreamVendorIds),
          ),
        )
    : [];

  const downstreamActions = await db
    .select()
    .from(rightsDownstreamActions)
    .where(
      and(
        eq(rightsDownstreamActions.organizationId, input.organizationId),
        eq(rightsDownstreamActions.requestId, input.request.id),
      ),
    );

  await writeRightsAudit({
    organizationId: input.organizationId,
    action: RIGHTS_AUDIT_ACTIONS.dataDiscovered,
    requestId: input.request.id,
    websiteId: input.request.websiteId,
    description: "Rights-request data discovery ran",
    metadata: {
      recordCount: records.length,
      evidenceCount: snapshots.length,
      holdOnRequest,
      downstreamVendorCount: downstreamVendors.length,
    },
  });

  return {
    websites: orgWebsites,
    records,
    decisions,
    events,
    snapshots,
    ageSessions,
    californiaOptOuts,
    versions,
    downstream: {
      disclaimer: DOWNSTREAM_ACTION_DISCLAIMER,
      vendors: downstreamVendors.map((vendor) => ({
        ...vendor,
        actionRequired: vendor.downstreamDsarMode === "required",
      })),
      activities: activityRows,
      actions: downstreamActions,
    },
    holds: {
      request: holdOnRequest,
      consentRecords: holdOnRecords.map((row) => row.id),
      evidence: holdOnEvidence.map((row) => row.id),
    },
    deletionPlan: planDsarDeletion({
      hasCurrentRecord: records.length > 0,
      evidenceCount: snapshots.length,
      holdOnRecord: holdOnRecords.length > 0,
      holdOnEvidence: holdOnEvidence.length > 0,
      holdOnRequest,
    }),
  };
}

export async function createRightsExport(input: {
  organizationId: string;
  userId: string;
  request: typeof dataPrincipalRequests.$inferSelect;
  kind: RightsExportKind;
}) {
  const discovered = await discoverRightsData({
    organizationId: input.organizationId,
    request: input.request,
  });

  const currentOperational = {
    consentRecords: discovered.records.map((row) => ({
      id: row.id,
      consentId: row.consentId,
      websiteId: row.websiteId,
      status: row.status,
      jurisdiction: row.jurisdiction,
      consentedAt: row.consentedAt,
      withdrawnAt: row.withdrawnAt,
      expiresAt: row.expiresAt,
      stateVersion: row.stateVersion,
    })),
    decisions: discovered.decisions.map((row) => ({
      consentRecordId: row.consentRecordId,
      purposeId: row.purposeId,
      vendorId: row.vendorId,
      granted: row.granted,
    })),
    ageAssurance: discovered.ageSessions.map(minimizedAgeRecord),
    californiaOptOut: discovered.californiaOptOuts,
    downstreamVendorActions: {
      disclaimer: discovered.downstream.disclaimer,
      vendors: discovered.downstream.vendors,
      actions: discovered.downstream.actions.map((row) => ({
        id: row.id,
        vendorId: row.vendorId,
        status: row.status,
        actionRequired: row.actionRequired,
        reference: row.reference,
        requestedAt: row.requestedAt,
        completedAt: row.completedAt,
        notes: row.notes,
      })),
    },
  };

  const historicalEvidence =
    input.kind === "access"
      ? discovered.snapshots.map((row) => ({
          id: row.id,
          consentId: row.consentId,
          policyVersionId: row.policyVersionId,
          policyVersionNumber: row.policyVersionNumber,
          jurisdiction: row.jurisdiction,
          locale: row.locale,
          choice: row.choice,
          status: row.status,
          consentedAt: row.consentedAt,
          evidenceHash: row.evidenceHash,
        }))
      : [];

  const payload = stripSensitiveKeys({
    metadata: buildExportMetadata({
      requestId: input.request.id,
      exportKind: input.kind,
      organizationId: input.organizationId,
      websiteId: input.request.websiteId,
      jurisdiction: input.request.jurisdiction,
      generatedAt: new Date(),
      categories:
        input.kind === "portability"
          ? ["current_consent_state", "current_decisions", "age_assurance_state"]
          : [
              "current_consent_state",
              "current_decisions",
              "age_assurance_state",
              "consent_events",
              "historical_evidence_references",
              "policy_version_context",
              "rights_request_summary",
              "downstream_vendor_actions",
            ],
    }),
    currentOperationalData: currentOperational,
    historicalConsentEvidence: historicalEvidence,
    events:
      input.kind === "access"
        ? discovered.events.map((row) => ({
            id: row.id,
            eventType: row.eventType,
            occurredAt: row.occurredAt,
            source: row.source,
          }))
        : [],
    policyVersions: discovered.versions,
    rightsRequest: {
      id: input.request.id,
      requesterReference: input.request.requesterReference,
      requestType: input.request.requestType,
      jurisdiction: input.request.jurisdiction,
      status: input.request.status,
      receivedAt: input.request.receivedAt,
    },
  }) as Record<string, unknown>;

  const [exported] = await db
    .insert(rightsRequestExports)
    .values({
      organizationId: input.organizationId,
      requestId: input.request.id,
      exportKind: input.kind,
      payload,
      expiresAt: new Date(Date.now() + EXPORT_TTL_MS),
      createdBy: input.userId,
    })
    .returning({
      id: rightsRequestExports.id,
      exportKind: rightsRequestExports.exportKind,
      expiresAt: rightsRequestExports.expiresAt,
      createdAt: rightsRequestExports.createdAt,
    });

  await writeRightsAudit({
    organizationId: input.organizationId,
    userId: input.userId,
    action: RIGHTS_AUDIT_ACTIONS.exportCreated,
    requestId: input.request.id,
    websiteId: input.request.websiteId,
    description: `${input.kind} export generated`,
    metadata: { exportId: exported.id, exportKind: input.kind },
  });

  return exported;
}

export async function loadOwnedExport(input: {
  organizationId: string;
  requestId: string;
  exportId: string;
}) {
  const [row] = await db
    .select()
    .from(rightsRequestExports)
    .where(
      and(
        eq(rightsRequestExports.id, input.exportId),
        eq(rightsRequestExports.requestId, input.requestId),
        eq(rightsRequestExports.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function executeRightsDeletion(input: {
  organizationId: string;
  userId: string;
  request: typeof dataPrincipalRequests.$inferSelect;
}) {
  const discovered = await discoverRightsData({
    organizationId: input.organizationId,
    request: input.request,
  });
  const plan = discovered.deletionPlan;
  if (!plan.canExecute) {
    return { ok: false as const, reason: "legal_hold", plan, discovered };
  }

  let deletedRecordCount = 0;
  let anonymisedEventCount = 0;

  if (plan.deleteCurrentState && discovered.records.length > 0) {
    const deletable = discovered.records.filter(
      (row) => !discovered.holds.consentRecords.includes(row.id),
    );
    const recordIds = deletable.map((row) => row.id);
    if (recordIds.length > 0) {
      await db.transaction(async (tx) => {
        const eventRows = await tx
          .select({ id: consentEvents.id })
          .from(consentEvents)
          .where(inArray(consentEvents.consentRecordId, recordIds));
        if (eventRows.length > 0) {
          const eventIds = eventRows.map((row) => row.id);
          await tx
            .update(consentEvents)
            .set({ eventData: ERASED_EVENT_DATA as unknown as Record<string, unknown> })
            .where(inArray(consentEvents.id, eventIds));
          anonymisedEventCount = eventIds.length;
        }
        await tx.delete(consentRecords).where(inArray(consentRecords.id, recordIds));
        deletedRecordCount = recordIds.length;
      });
    }
    const deletableConsentIds = deletable.map((row) => row.consentId).filter(Boolean);
    if (deletableConsentIds.length > 0) {
      await db
        .delete(ageAssuranceSessions)
        .where(
          and(
            eq(ageAssuranceSessions.organizationId, input.organizationId),
            inArray(ageAssuranceSessions.consentId, deletableConsentIds),
          ),
        );
    }
  }

  const outcome = {
    deletedRecordCount,
    anonymisedEventCount,
    preservedEvidenceCount: discovered.snapshots.length,
    legalHolds: discovered.holds,
    executedAt: new Date().toISOString(),
  };

  await db
    .update(dataPrincipalRequests)
    .set({
      outcome,
      updatedAt: new Date(),
    })
    .where(eq(dataPrincipalRequests.id, input.request.id));

  await writeRightsAudit({
    organizationId: input.organizationId,
    userId: input.userId,
    action: RIGHTS_AUDIT_ACTIONS.deletionExecuted,
    requestId: input.request.id,
    websiteId: input.request.websiteId,
    description: `DSAR deletion executed; evidence preserved (${discovered.snapshots.length})`,
    metadata: outcome,
  });

  return { ok: true as const, outcome, plan };
}

export async function invokeExistingWithdrawal(input: {
  organizationId: string;
  userId: string;
  request: typeof dataPrincipalRequests.$inferSelect;
}) {
  if (!input.request.consentId || !input.request.websiteId) {
    return { ok: false as const, reason: "missing_consent_link" };
  }

  const [website] = await db
    .select({ id: websites.id, organizationId: websites.organizationId })
    .from(websites)
    .where(
      and(
        eq(websites.id, input.request.websiteId),
        eq(websites.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!website) return { ok: false as const, reason: "website_not_found" };

  const [record] = await db
    .select()
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.consentId, input.request.consentId),
        eq(consentRecords.websiteId, website.id),
        eq(consentRecords.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!record) return { ok: false as const, reason: "consent_not_found" };
  if (record.status === "withdrawn") {
    return { ok: true as const, alreadyWithdrawn: true, stateVersion: record.stateVersion };
  }

  const now = new Date();
  const [priorEvidence] = await db
    .select()
    .from(consentEvidenceSnapshots)
    .where(
      and(
        eq(consentEvidenceSnapshots.organizationId, input.organizationId),
        eq(consentEvidenceSnapshots.consentId, record.consentId),
      ),
    )
    .orderBy(desc(consentEvidenceSnapshots.consentedAt))
    .limit(1);

  let nextVersion = record.stateVersion;
  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(consentRecords)
      .set({
        status: "withdrawn",
        stateVersion: record.stateVersion + 1,
        withdrawnAt: now,
        updatedAt: now,
      })
      .where(eq(consentRecords.id, record.id))
      .returning({ stateVersion: consentRecords.stateVersion });
    if (!updated) throw new Error("CONSENT_STATE_CONFLICT");
    nextVersion = updated.stateVersion;
    if (priorEvidence) {
      const snapshot = buildWithdrawalEvidenceSnapshot({
        prior: priorEvidence,
        stateVersion: updated.stateVersion,
        withdrawnAt: now,
      });
      await tx.insert(consentEvidenceSnapshots).values(snapshot.values);
    }
  });

  await appendConsentEvent({
    consentRecordId: record.id,
    policyVersionId: record.policyVersionId,
    eventType: "consent.withdrawn",
    eventData: {
      previousStatus: record.status,
      withdrawnAt: now.toISOString(),
      rightsRequestId: input.request.id,
    },
  });

  await writeRightsAudit({
    organizationId: input.organizationId,
    userId: input.userId,
    action: RIGHTS_AUDIT_ACTIONS.withdrawInvoked,
    requestId: input.request.id,
    websiteId: website.id,
    description: "DSAR withdrawal invoked existing consent engine",
    metadata: { consentId: record.consentId, stateVersion: nextVersion },
  });

  return { ok: true as const, alreadyWithdrawn: false, stateVersion: nextVersion };
}

const INTAKE_WEBSITE_COLUMNS = {
  id: websites.id,
  organizationId: websites.organizationId,
  status: websites.status,
  defaultRegulationKey: websites.defaultRegulationKey,
} as const;

async function loadActiveIntakeOrg(organizationId: string) {
  const [org] = await db
    .select({ id: organizations.id, status: organizations.status })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!org || org.status !== "active") return null;
  return org;
}

export async function resolveIntakeWebsite(websiteId: string) {
  const [website] = await db
    .select(INTAKE_WEBSITE_COLUMNS)
    .from(websites)
    .where(eq(websites.id, websiteId))
    .limit(1);
  if (!website || website.status !== "active") return null;
  const organization = await loadActiveIntakeOrg(website.organizationId);
  if (!organization) return null;
  return { website, organization };
}

export async function resolveIntakeWebsiteBySiteKey(siteKey: string) {
  const [website] = await db
    .select(INTAKE_WEBSITE_COLUMNS)
    .from(websites)
    .where(and(eq(websites.siteKey, siteKey), eq(websites.status, "active")))
    .limit(1);
  if (!website) return null;
  const organization = await loadActiveIntakeOrg(website.organizationId);
  if (!organization) return null;
  return { website, organization };
}

export async function resolveIntakeWebsiteByHost(host: string) {
  const candidates = domainLookupCandidates(host);
  if (candidates.length === 0) return null;
  const [website] = await db
    .select(INTAKE_WEBSITE_COLUMNS)
    .from(websites)
    .where(and(eq(websites.status, "active"), inArray(websites.domain, candidates)))
    .orderBy(desc(websites.createdAt))
    .limit(1);
  if (!website) return null;
  const organization = await loadActiveIntakeOrg(website.organizationId);
  if (!organization) return null;
  return { website, organization };
}
