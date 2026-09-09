import { NextResponse } from "next/server";

import { runRetentionCleanup } from "@/lib/retention/cleanup";
import { RETENTION_RULES } from "@/lib/retention/core";
import { authorizeRetentionOrganization, requireRetentionAdmin } from "@/lib/retention/http";

export async function POST(request: Request) {
  try {
    const authz = await authorizeRetentionOrganization();
    if ("error" in authz) return authz.error;
    const forbidden = requireRetentionAdmin(authz.membership.roleName);
    if (forbidden) return forbidden;

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const result = await runRetentionCleanup({
      organizationId: authz.organization.id,
      actorUserId: authz.localUser.id,
      dryRun: body.dryRun === true,
    });

    return NextResponse.json({
      success: true,
      dryRun: result.dryRun,
      considered: result.considered,
      eligibleCount: result.eligible,
      deleted: result.deleted,
      skipped: result.skipped,
      retention: {
        consentEvidenceRetentionDays: result.config.consentEvidence.retentionDays,
        consentRecordRetentionDays: result.config.consentRecord.retentionDays,
        auditLogRetentionDays: result.config.auditEvent.retentionDays,
        rightsRequestRetentionDays: result.config.rightsRequest.retentionDays,
      },
      retained: {
        consentEvidence: "Historical evidence is never cascade-deleted with current consent state.",
        consentEvents: "Consent events remain after current-state deletion.",
      },
      rules: RETENTION_RULES,
    });
  } catch (error) {
    console.error("Retention purge failed:", error);
    return NextResponse.json({ success: false, message: "Failed to execute retention purge" }, { status: 500 });
  }
}
