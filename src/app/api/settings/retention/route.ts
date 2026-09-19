import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { organizations } from "@/db/schema/organizations";
import { eq } from "drizzle-orm";
import {
  MAX_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  RETENTION_AUDIT_ACTIONS,
  RETENTION_RULES,
  mergeRetentionConfig,
  parseRetentionConfig,
  parseRetentionWriteInput,
  sanitizeRetentionAuditMetadata,
} from "@/lib/retention/core";
import { loadOrganizationRetentionConfig, persistRetentionConfig } from "@/lib/retention/cleanup";
import { authorizeRetentionOrganization, requireRetentionAdmin } from "@/lib/retention/http";

export async function GET() {
  try {
    const authz = await authorizeRetentionOrganization();
    if ("error" in authz) return authz.error;

    const config = await loadOrganizationRetentionConfig(authz.organization.id);
    return NextResponse.json({
      success: true,
      retention: {
        consentEvidenceRetentionDays: config.consentEvidence.retentionDays,
        consentEvidenceRetentionEnabled: config.consentEvidence.enabled,
        consentRecordRetentionDays: config.consentRecord.retentionDays,
        consentRecordRetentionEnabled: config.consentRecord.enabled,
        auditLogRetentionDays: config.auditEvent.retentionDays,
        auditLogRetentionEnabled: config.auditEvent.enabled,
        rightsRequestRetentionDays: config.rightsRequest.retentionDays,
        rightsRequestRetentionEnabled: config.rightsRequest.enabled,
      },
      layers: {
        historicalEvidence: config.consentEvidence,
        currentOperationalData: {
          consentRecord: config.consentRecord,
          auditEvent: config.auditEvent,
          rightsRequest: config.rightsRequest,
        },
      },
      rules: RETENTION_RULES,
      limits: { min: MIN_RETENTION_DAYS, max: MAX_RETENTION_DAYS },
      warning:
        "Changing retention configuration does not rewrite existing historical consent evidence. Deleting current consent state does not delete historical consent evidence.",
    });
  } catch (error) {
    logger.error("Retention GET failed", { error });
    return NextResponse.json({ success: false, message: "Failed to load retention settings" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const authz = await authorizeRetentionOrganization();
    if ("error" in authz) return authz.error;
    const forbidden = requireRetentionAdmin(authz.membership.roleName);
    if (forbidden) return forbidden;

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const parsed = parseRetentionWriteInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
    }

    const [orgRow] = await db
      .select({ settings: organizations.settings })
      .from(organizations)
      .where(eq(organizations.id, authz.organization.id))
      .limit(1);

    const existingSettings = orgRow?.settings ?? {};
    const hadRows = Boolean(
      existingSettings.consentRecordRetentionDays ||
        existingSettings.consentEvidenceRetentionDays ||
        existingSettings.auditLogRetentionDays ||
        existingSettings.rightsRequestRetentionDays,
    );
    const newSettings = mergeRetentionConfig(existingSettings, parsed.value);
    const config = parseRetentionConfig(newSettings);
    await persistRetentionConfig({
      organizationId: authz.organization.id,
      settings: newSettings,
      config,
    });

    await db.insert(auditLogs).values({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: hadRows ? RETENTION_AUDIT_ACTIONS.policyUpdated : RETENTION_AUDIT_ACTIONS.policyCreated,
      resourceType: "retention_policy",
      description: "Retention configuration updated. Existing historical evidence was not rewritten.",
      metadata: sanitizeRetentionAuditMetadata({ changes: parsed.value }),
    });

    return NextResponse.json({
      success: true,
      retention: {
        consentEvidenceRetentionDays: config.consentEvidence.retentionDays,
        consentEvidenceRetentionEnabled: config.consentEvidence.enabled,
        consentRecordRetentionDays: config.consentRecord.retentionDays,
        consentRecordRetentionEnabled: config.consentRecord.enabled,
        auditLogRetentionDays: config.auditEvent.retentionDays,
        auditLogRetentionEnabled: config.auditEvent.enabled,
        rightsRequestRetentionDays: config.rightsRequest.retentionDays,
        rightsRequestRetentionEnabled: config.rightsRequest.enabled,
      },
      warning:
        "Changing retention configuration does not rewrite existing historical consent evidence.",
    });
  } catch (error) {
    logger.error("Retention PATCH failed", { error });
    return NextResponse.json({ success: false, message: "Failed to update retention settings" }, { status: 500 });
  }
}
