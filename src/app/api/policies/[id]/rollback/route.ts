import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { authorizeOwnedPolicy } from "@/lib/compliance/http";
import {
  validateOwnedPolicy,
  writeComplianceAudit,
} from "@/lib/compliance/service";
import { COMPLIANCE_AUDIT_ACTIONS } from "@/lib/compliance/types";
import { requireOperatorRole } from "@/lib/org-roles";
import { cloneVersionForRollback, markVersionPublished } from "@/lib/policy/lifecycle";
import { buildLivePolicyProcessingSnapshot } from "@/lib/processing/service";

const bodySchema = z.object({
  versionId: z.string().uuid(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: policyId } = await params;
  const authz = await authorizeOwnedPolicy(policyId);
  if (authz.error) return authz.error;
  const operatorError = requireOperatorRole(authz.membership.roleName);
  if (operatorError) return operatorError;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "versionId is required" }, { status: 400 });
  }

  const cloned = await cloneVersionForRollback({
    policyId: authz.policy.policyId,
    sourceVersionId: parsed.data.versionId,
  });
  if (!cloned) {
    return NextResponse.json({ success: false, message: "Source version not found" }, { status: 404 });
  }

  // Fail-closed: same compliance gate as interactive publish before going live.
  const validated = await validateOwnedPolicy({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    policyId: authz.policy.policyId,
    websiteId: authz.policy.websiteId,
    policyName: authz.policy.policyName,
    websiteName: authz.policy.websiteName,
    defaultRegulationKey: authz.policy.defaultRegulationKey,
    defaultRegion: authz.policy.defaultRegion,
    consentIntegrations: authz.policy.consentIntegrations,
  });

  if (!validated.ok) {
    return NextResponse.json(
      { success: false, message: "Rolled-back draft could not be validated." },
      { status: 422 },
    );
  }

  if (validated.versionId !== cloned.id) {
    return NextResponse.json(
      { success: false, message: "Rolled-back draft is no longer the current unpublished version." },
      { status: 409 },
    );
  }

  if (validated.result.errors.length > 0) {
    await writeComplianceAudit({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      policyId: authz.policy.policyId,
      websiteId: authz.policy.websiteId,
      versionId: cloned.id,
      action: COMPLIANCE_AUDIT_ACTIONS.publishRejected,
      result: validated.result,
      description: `Rollback publish blocked with ${validated.result.errors.length} compliance error(s)`,
    });
    return NextResponse.json(
      {
        success: false,
        message: `Rollback blocked. ${validated.result.errors.length} compliance error${validated.result.errors.length === 1 ? "" : "s"} must be fixed.`,
        validation: validated.result,
      },
      { status: 422 },
    );
  }

  const now = new Date();
  const processingSnapshot = await buildLivePolicyProcessingSnapshot({
    organizationId: authz.organization.id,
    websiteId: authz.policy.websiteId,
    policyVersionId: cloned.id,
    policyVersion: cloned.version,
    vendorIds: validated.vendorIds,
    frozenAt: now,
  });
  const published = await markVersionPublished({
    policyId: authz.policy.policyId,
    versionId: cloned.id,
    processingSnapshot,
    configuration: cloned.configuration,
    now,
  });

  await db.insert(auditLogs).values({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    action: "policy.rolled_back",
    resourceType: "consent_policy",
    resourceId: authz.policy.policyId,
    description: `Rolled back to a new published version v${cloned.version}`,
    metadata: { sourceVersionId: parsed.data.versionId, newVersionId: cloned.id },
  });

  return NextResponse.json({
    success: true,
    version: {
      id: published?.id ?? cloned.id,
      version: cloned.version,
      sourceVersionId: parsed.data.versionId,
    },
  });
}
