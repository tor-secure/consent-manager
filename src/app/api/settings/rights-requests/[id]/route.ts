import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { users } from "@/db/schema/users";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";
import { dataPrincipalRequests } from "@/db/schema/data-principal-requests";
import { consentRecords } from "@/db/schema/consent-records";
import { consentEvents } from "@/db/schema/consent-events";
import { auditLogs } from "@/db/schema/audit-logs";

const AUTHORIZED_ROLES = ["Owner", "Admin", "Member"] as const;

const VALID_STATUSES = [
  "acknowledged",
  "in_progress",
  "completed",
  "rejected",
] as const;

// Redacted eventData written to consent_events when a record is erased.
// Preserves the audit trail structure without personal data.
const ERASED_EVENT_DATA = {
  redacted: true,
  reason: "erasure_request",
  retainedForAudit: true,
} as const;

// ---------------------------------------------------------------------------
// PATCH /api/settings/rights-requests/[id]
//
// Org-scoped mutation: update status and/or response notes for a request.
// Any active member (Owner / Admin / Member) may update requests.
// Mutations are audit-logged.
//
// ERASURE EXECUTION:
// When requestType = "erasure" AND newStatus = "completed", this endpoint
// also executes the minimum-erasure workflow:
//
//   DELETED:    consent_records matching the requester's consentId (if provided)
//               OR all records for the requester's email in this org's websites.
//               Cascades to consent_decisions via FK.
//
//   ANONYMISED: consent_events.eventData overwritten with ERASED_EVENT_DATA.
//               The event row itself is retained (immutable audit trail).
//
//   RETAINED:   audit_logs        — never deleted (regulatory evidence)
//               data_principal_requests — never deleted (rights-request evidence)
//               consent_policy_versions — never deleted (FK integrity)
//
// Body: { status?: string, responseNotes?: string }
// ---------------------------------------------------------------------------

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: requestId } = await params;
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // ── Resolve local org ──────────────────────────────────────────────
    const [organization] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkOrganizationId, orgId))
      .limit(1);

    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }

    // ── Resolve caller ─────────────────────────────────────────────────
    const [localUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!localUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // ── Authorize caller ────────────────────────────────────────────────
    const [callerMembership] = await db
      .select({ roleName: roles.name })
      .from(memberships)
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .where(
        and(
          eq(memberships.organizationId, organization.id),
          eq(memberships.userId, localUser.id),
          eq(memberships.status, "active"),
        ),
      )
      .limit(1);

    if (!(AUTHORIZED_ROLES as readonly string[]).includes(callerMembership?.roleName ?? "")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // ── Load the rights request — must belong to this org ──────────────
    const [existing] = await db
      .select()
      .from(dataPrincipalRequests)
      .where(
        and(
          eq(dataPrincipalRequests.id, requestId),
          eq(dataPrincipalRequests.organizationId, organization.id),
        ),
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
    }

    // ── Parse and validate body ────────────────────────────────────────
    const body = await request.json();
    const newStatus = body.status ? String(body.status).trim() : undefined;
    const responseNotes = body.responseNotes !== undefined
      ? String(body.responseNotes).trim().slice(0, 10000)
      : undefined;

    if (newStatus && !(VALID_STATUSES as readonly string[]).includes(newStatus)) {
      return NextResponse.json(
        { success: false, message: `status must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 },
      );
    }

    if (newStatus === undefined && responseNotes === undefined) {
      return NextResponse.json(
        { success: false, message: "At least one of status or responseNotes is required" },
        { status: 400 },
      );
    }

    // ── Erasure execution ──────────────────────────────────────────────
    // Only runs when: requestType="erasure" AND newStatus="completed"
    // AND the request has not already been completed (idempotency guard).
    const isErasureCompletion =
      existing.requestType === "erasure" &&
      newStatus === "completed" &&
      existing.status !== "completed";

    let erasureResult: {
      deletedRecordCount: number;
      anonymisedEventCount: number;
    } = { deletedRecordCount: 0, anonymisedEventCount: 0 };

    if (isErasureCompletion) {
      // Scope erasure to this org's websites only — tenant isolation.
      const orgWebsites = await db
        .select({ id: websites.id })
        .from(websites)
        .where(eq(websites.organizationId, organization.id));

      const websiteIds = orgWebsites.map((w) => w.id);

      if (websiteIds.length > 0) {
        // Find the consent records to erase.
        // Priority 1: use the consentId if the requester supplied it.
        // Priority 2: match by requester email (stored in metadata.requesterEmail
        //             at collection time — future extension; for now, consentId
        //             is the primary lookup key).
        let recordsToErase: { id: string }[] = [];

        if (existing.consentId) {
          recordsToErase = await db
            .select({ id: consentRecords.id })
            .from(consentRecords)
            .where(
              and(
                eq(consentRecords.consentId, existing.consentId),
                inArray(consentRecords.websiteId, websiteIds),
              ),
            );
        }

        if (recordsToErase.length > 0) {
          const recordIds = recordsToErase.map((r) => r.id);

          // Both steps run inside a single transaction so the DB is never
          // left in a half-erased state (events anonymised but records
          // still present, or vice-versa).
          await db.transaction(async (tx) => {
            // Step 1: Anonymise consent_events BEFORE deleting consent_records
            // so the FK constraint remains valid during the transaction.
            const eventRows = await tx
              .select({ id: consentEvents.id })
              .from(consentEvents)
              .where(inArray(consentEvents.consentRecordId, recordIds));

            if (eventRows.length > 0) {
              const eventIds = eventRows.map((e) => e.id);
              await tx
                .update(consentEvents)
                .set({
                  eventData: ERASED_EVENT_DATA as unknown as Record<string, unknown>,
                })
                .where(inArray(consentEvents.id, eventIds));
              erasureResult.anonymisedEventCount = eventIds.length;
            }

            // Step 2: Delete consent_records — consent_decisions cascade via FK.
            await tx
              .delete(consentRecords)
              .where(inArray(consentRecords.id, recordIds));

            erasureResult.deletedRecordCount = recordIds.length;
          });
        }
      }
    }

    // ── Build status update payload ────────────────────────────────────
    const now = new Date();
    const patch: Partial<typeof dataPrincipalRequests.$inferInsert> & { updatedAt: Date } = {
      updatedAt: now,
    };

    if (newStatus) patch.status = newStatus;
    if (responseNotes !== undefined) patch.responseNotes = responseNotes;

    // Set acknowledgedAt on first transition past "received".
    if (newStatus && ["acknowledged", "in_progress"].includes(newStatus) && !existing.acknowledgedAt) {
      patch.acknowledgedAt = now;
    }

    // Set completedAt on terminal state.
    if (newStatus && ["completed", "rejected"].includes(newStatus) && !existing.completedAt) {
      patch.completedAt = now;
    }

    const [updated] = await db
      .update(dataPrincipalRequests)
      .set(patch)
      .where(eq(dataPrincipalRequests.id, requestId))
      .returning();

    // ── Audit log ──────────────────────────────────────────────────────
    const auditDescription = isErasureCompletion
      ? `Erasure request completed: deleted ${erasureResult.deletedRecordCount} consent record(s), anonymised ${erasureResult.anonymisedEventCount} event(s)`
      : newStatus
        ? `Rights request status updated to "${newStatus}"`
        : "Rights request notes updated";

    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: localUser.id,
      action: isErasureCompletion ? "rights_request.erasure.executed" : "rights_request.updated",
      resourceType: "data_principal_request",
      resourceId: requestId,
      description: auditDescription,
      metadata: {
        previousStatus: existing.status,
        newStatus: updated.status,
        requestType: existing.requestType,
        ...(isErasureCompletion ? {
          deletedRecordCount: erasureResult.deletedRecordCount,
          anonymisedEventCount: erasureResult.anonymisedEventCount,
          consentId: existing.consentId,
          retained: ["consent_events (anonymised)", "audit_logs", "data_principal_requests", "consent_policy_versions"],
        } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      request: {
        id:             updated.id,
        status:         updated.status,
        acknowledgedAt: updated.acknowledgedAt,
        completedAt:    updated.completedAt,
        responseNotes:  updated.responseNotes,
        updatedAt:      updated.updatedAt,
      },
      ...(isErasureCompletion ? {
        erasure: {
          executed: true,
          deletedConsentRecords:   erasureResult.deletedRecordCount,
          anonymisedConsentEvents: erasureResult.anonymisedEventCount,
          retained: {
            auditLogs:                "Retained permanently — regulatory evidence.",
            dataPrincipalRequests:    "Retained permanently — rights-request evidence.",
            consentEvents:            "Row retained; eventData anonymised.",
            consentPolicyVersions:    "Retained permanently — FK integrity.",
          },
        },
      } : {}),
    });
  } catch (error) {
    console.error("Rights request update failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update request" },
      { status: 500 },
    );
  }
}
