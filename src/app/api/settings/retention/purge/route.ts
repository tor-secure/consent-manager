import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, lt, inArray, not } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";
import { auditLogs } from "@/db/schema/audit-logs";
import {
  parseRetentionConfig,
  retentionCutoff,
  RETENTION_RULES,
} from "@/lib/retention-policy";
import {
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";

const OWNER_ADMIN = ["Owner", "Admin"] as const;

// Statuses that indicate a record should never be purged by a scheduled run
// because they may be needed for an active legal matter.
// Withdrawn records ARE purgeable — the visitor already exercised their right
// and the consent is no longer active.
const NON_PURGEABLE_STATUSES: string[] = [];
// (empty — all expired records are purgeable regardless of status)

// ---------------------------------------------------------------------------
// POST /api/settings/retention/purge
//
// Finds and deletes consent_records (+ cascade consent_decisions) that have
// passed the organisation's configured retention period.
//
// consent_events are NOT deleted — they are the immutable audit trail.
// audit_logs are NOT deleted.
// data_principal_requests are NOT deleted.
//
// Body:
// {
//   dryRun?: boolean   // if true, returns the count but does not delete
// }
//
// Returns:
// {
//   success: true,
//   dryRun: boolean,
//   eligibleCount: number,   // records that matched the retention cutoff
//   deletedCount: number,    // 0 when dryRun=true
//   cutoffDate: string,      // ISO-8601 of the retention boundary
//   retentionDays: number,
// }
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();
    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const localUser = await resolveLocalUser(userId);
    if (!localUser) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    const organization = await resolveLocalOrganization(orgId);
    if (!organization) return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });

    // Owner/Admin only.
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

    if (!(OWNER_ADMIN as readonly string[]).includes(callerMembership?.roleName ?? "")) {
      return NextResponse.json({ success: false, message: "Only Owner or Admin can trigger retention purge" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const dryRun = body.dryRun === true;

    // Load org-level retention config from settings JSONB.
    const [orgRow] = await db
      .select({ settings: organizations.settings })
      .from(organizations)
      .where(eq(organizations.id, organization.id))
      .limit(1);

    const { consentRecordRetentionDays } = parseRetentionConfig(orgRow?.settings ?? {});
    const cutoff = retentionCutoff(consentRecordRetentionDays);

    // ── Scope through org websites (consent_records has no direct orgId) ──
    const orgWebsites = await db
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.organizationId, organization.id));

    const websiteIds = orgWebsites.map((w) => w.id);

    if (websiteIds.length === 0) {
      return NextResponse.json({
        success: true, dryRun,
        eligibleCount: 0, deletedCount: 0,
        cutoffDate: cutoff.toISOString(),
        retentionDays: consentRecordRetentionDays,
        message: "No websites found for this organisation.",
      });
    }

    // Find consent records past their retention period.
    // Use consentedAt as the retention anchor — the date the visitor gave
    // consent, not the record creation date.
    const eligible = await db
      .select({ id: consentRecords.id, consentId: consentRecords.consentId })
      .from(consentRecords)
      .where(
        and(
          inArray(consentRecords.websiteId, websiteIds),
          lt(consentRecords.consentedAt, cutoff),
        ),
      );

    const eligibleCount = eligible.length;

    if (dryRun || eligibleCount === 0) {
      return NextResponse.json({
        success: true, dryRun: true,
        eligibleCount,
        deletedCount: 0,
        cutoffDate: cutoff.toISOString(),
        retentionDays: consentRecordRetentionDays,
        message: dryRun
          ? `Dry run: ${eligibleCount} record(s) would be deleted.`
          : "No records past retention period.",
        retentionRules: RETENTION_RULES,
      });
    }

    // ── Execute deletion ──────────────────────────────────────────────────
    // consent_decisions are cascade-deleted by the DB FK.
    // consent_events are NOT deleted (immutable audit trail).
    const eligibleIds = eligible.map((r) => r.id);

    await db
      .delete(consentRecords)
      .where(inArray(consentRecords.id, eligibleIds));

    // ── Audit log ─────────────────────────────────────────────────────────
    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: localUser.id,
      action: "retention.purge.executed",
      resourceType: "consent_records",
      description: `Retention purge: deleted ${eligibleCount} consent record(s) past ${consentRecordRetentionDays}-day retention period (cutoff: ${cutoff.toISOString()})`,
      metadata: {
        deletedCount: eligibleCount,
        cutoffDate: cutoff.toISOString(),
        retentionDays: consentRecordRetentionDays,
        // Do not log the individual consentIds — they are PII-adjacent.
      },
    });

    return NextResponse.json({
      success: true,
      dryRun: false,
      eligibleCount,
      deletedCount: eligibleCount,
      cutoffDate: cutoff.toISOString(),
      retentionDays: consentRecordRetentionDays,
      message: `Deleted ${eligibleCount} consent record(s) past the ${consentRecordRetentionDays}-day retention period.`,
      retained: {
        consentEvents: "Retained — immutable audit trail.",
        auditLogs: "Retained — regulatory evidence.",
        dataPrincipalRequests: "Retained — rights-request evidence.",
      },
    });
  } catch (error) {
    console.error("Retention purge failed:", error);
    return NextResponse.json({ success: false, message: "Failed to execute retention purge" }, { status: 500 });
  }
}
