import "server-only";

import { and, eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { retentionPolicies } from "@/db/schema/retention-policies";
import { legalHolds } from "@/db/schema/legal-holds";
import { consentRecords } from "@/db/schema/consent-records";
import { auditLogs } from "@/db/schema/audit-logs";
import { dataPrincipalRequests } from "@/db/schema/data-principal-requests";
import {
  RETENTION_AUDIT_ACTIONS,
  RETENTION_DELETE_BATCH_SIZE,
  flattenRetentionConfig,
  parseRetentionConfig,
  planRetentionBatch,
  retentionCutoff,
  sanitizeRetentionAuditMetadata,
  type RetentionCandidate,
  type RetentionConfig,
  type RetentionResourceType,
} from "./core";

export async function loadOrganizationRetentionConfig(
  organizationId: string,
): Promise<RetentionConfig> {
  const [org] = await db
    .select({ settings: organizations.settings })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  const rows = await db
    .select({
      resourceType: retentionPolicies.resourceType,
      retentionDays: retentionPolicies.retentionDays,
      enabled: retentionPolicies.enabled,
    })
    .from(retentionPolicies)
    .where(eq(retentionPolicies.organizationId, organizationId));

  return parseRetentionConfig(
    org?.settings ?? {},
    rows.map((row) => ({
      resourceType: row.resourceType as RetentionResourceType,
      retentionDays: row.retentionDays,
      enabled: row.enabled,
    })),
  );
}

export async function persistRetentionConfig(input: {
  organizationId: string;
  settings: Record<string, unknown>;
  config: RetentionConfig;
}) {
  const now = new Date();
  await db
    .update(organizations)
    .set({ settings: input.settings, updatedAt: now })
    .where(eq(organizations.id, input.organizationId));

  for (const category of flattenRetentionConfig(input.config)) {
    const [existing] = await db
      .select({ id: retentionPolicies.id })
      .from(retentionPolicies)
      .where(
        and(
          eq(retentionPolicies.organizationId, input.organizationId),
          eq(retentionPolicies.resourceType, category.resourceType),
          sql`${retentionPolicies.websiteId} is null`,
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(retentionPolicies)
        .set({
          retentionDays: category.retentionDays,
          enabled: category.enabled,
          updatedAt: now,
        })
        .where(eq(retentionPolicies.id, existing.id));
    } else {
      await db.insert(retentionPolicies).values({
        organizationId: input.organizationId,
        websiteId: null,
        resourceType: category.resourceType,
        retentionDays: category.retentionDays,
        enabled: category.enabled,
      });
    }
  }
}

async function loadActiveHolds(organizationId: string) {
  const rows = await db
    .select({
      organizationId: legalHolds.organizationId,
      resourceType: legalHolds.resourceType,
      resourceId: legalHolds.resourceId,
      status: legalHolds.status,
      releasedAt: legalHolds.releasedAt,
    })
    .from(legalHolds)
    .where(and(eq(legalHolds.organizationId, organizationId), eq(legalHolds.status, "active")));
  return rows.map((row) => ({
    ...row,
    status: row.status === "released" ? "released" as const : "active" as const,
    resourceType: row.resourceType as RetentionResourceType,
  }));
}

async function loadCandidates(
  organizationId: string,
  config: RetentionConfig,
  now: Date,
): Promise<RetentionCandidate[]> {
  const candidates: RetentionCandidate[] = [];

  if (config.consentRecord.enabled) {
    const cutoff = retentionCutoff(config.consentRecord.retentionDays, now);
    const rows = await db
      .select({
        id: consentRecords.id,
        organizationId: consentRecords.organizationId,
        websiteId: consentRecords.websiteId,
        consentedAt: consentRecords.consentedAt,
      })
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.organizationId, organizationId),
          lt(consentRecords.consentedAt, cutoff),
        ),
      )
      .limit(RETENTION_DELETE_BATCH_SIZE * 2);
    candidates.push(
      ...rows
        .filter((row) => row.consentedAt)
        .map((row) => ({
          id: row.id,
          organizationId: row.organizationId,
          websiteId: row.websiteId,
          resourceType: "consent_record" as const,
          anchorAt: row.consentedAt as Date,
        })),
    );
  }

  if (config.auditEvent.enabled) {
    const cutoff = retentionCutoff(config.auditEvent.retentionDays, now);
    const rows = await db
      .select({
        id: auditLogs.id,
        organizationId: auditLogs.organizationId,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .where(and(eq(auditLogs.organizationId, organizationId), lt(auditLogs.createdAt, cutoff)))
      .limit(RETENTION_DELETE_BATCH_SIZE * 2);
    candidates.push(
      ...rows.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        resourceType: "audit_event" as const,
        anchorAt: row.createdAt,
      })),
    );
  }

  if (config.rightsRequest.enabled) {
    const cutoff = retentionCutoff(config.rightsRequest.retentionDays, now);
    const rows = await db
      .select({
        id: dataPrincipalRequests.id,
        organizationId: dataPrincipalRequests.organizationId,
        websiteId: dataPrincipalRequests.websiteId,
        receivedAt: dataPrincipalRequests.receivedAt,
      })
      .from(dataPrincipalRequests)
      .where(
        and(
          eq(dataPrincipalRequests.organizationId, organizationId),
          lt(dataPrincipalRequests.receivedAt, cutoff),
        ),
      )
      .limit(RETENTION_DELETE_BATCH_SIZE * 2);
    candidates.push(
      ...rows.map((row) => ({
        id: row.id,
        organizationId: row.organizationId,
        websiteId: row.websiteId,
        resourceType: "rights_request" as const,
        anchorAt: row.receivedAt,
      })),
    );
  }

  return candidates;
}

export async function runRetentionCleanup(input: {
  organizationId: string;
  actorUserId?: string | null;
  dryRun?: boolean;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const config = await loadOrganizationRetentionConfig(input.organizationId);
  const holds = await loadActiveHolds(input.organizationId);
  const candidates = await loadCandidates(input.organizationId, config, now);
  const plan = planRetentionBatch({
    candidates,
    config,
    holds,
    actorOrganizationId: input.organizationId,
    now,
  });

  const deleted = {
    consent_record: 0,
    audit_event: 0,
    rights_request: 0,
    consent_evidence: 0,
  };

  if (input.dryRun || plan.eligible.length === 0) {
    return {
      dryRun: Boolean(input.dryRun) || plan.eligible.length === 0,
      config,
      considered: candidates.length,
      eligible: plan.eligible.length,
      skipped: plan.skipped,
      deleted,
    };
  }

  const byType = {
    consent_record: plan.eligible.filter((row) => row.resourceType === "consent_record").map((row) => row.id),
    audit_event: plan.eligible.filter((row) => row.resourceType === "audit_event").map((row) => row.id),
    rights_request: plan.eligible.filter((row) => row.resourceType === "rights_request").map((row) => row.id),
  };

  await db.transaction(async (tx) => {
    if (byType.consent_record.length > 0) {
      await tx.delete(consentRecords).where(
        and(
          eq(consentRecords.organizationId, input.organizationId),
          inArray(consentRecords.id, byType.consent_record),
        ),
      );
      deleted.consent_record = byType.consent_record.length;
    }
    if (byType.audit_event.length > 0) {
      await tx.delete(auditLogs).where(
        and(
          eq(auditLogs.organizationId, input.organizationId),
          inArray(auditLogs.id, byType.audit_event),
        ),
      );
      deleted.audit_event = byType.audit_event.length;
    }
    if (byType.rights_request.length > 0) {
      await tx.delete(dataPrincipalRequests).where(
        and(
          eq(dataPrincipalRequests.organizationId, input.organizationId),
          inArray(dataPrincipalRequests.id, byType.rights_request),
        ),
      );
      deleted.rights_request = byType.rights_request.length;
    }

    await tx.insert(auditLogs).values({
      organizationId: input.organizationId,
      userId: input.actorUserId ?? null,
      action: RETENTION_AUDIT_ACTIONS.deleteExecuted,
      resourceType: "retention_policy",
      description: `Retention cleanup deleted ${deleted.consent_record} current consent record(s), ${deleted.audit_event} audit event(s), and ${deleted.rights_request} rights request(s). Historical consent evidence was not deleted.`,
      metadata: sanitizeRetentionAuditMetadata({
        actor: input.actorUserId ? "administrator" : "system",
        deleted,
        eligibleCount: plan.eligible.length,
        considered: candidates.length,
        skippedReasons: plan.skipped.reduce<Record<string, number>>((acc, row) => {
          acc[row.reason] = (acc[row.reason] ?? 0) + 1;
          return acc;
        }, {}),
        retention: flattenRetentionConfig(config),
        reason: "configured_retention",
      }),
    });
  });

  return {
    dryRun: false,
    config,
    considered: candidates.length,
    eligible: plan.eligible.length,
    skipped: plan.skipped,
    deleted,
  };
}
