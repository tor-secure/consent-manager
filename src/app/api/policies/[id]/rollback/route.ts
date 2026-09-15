import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { authorizeOwnedPolicy } from "@/lib/compliance/http";
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

  const now = new Date();
  const processingSnapshot = await buildLivePolicyProcessingSnapshot({
    organizationId: authz.organization.id,
    websiteId: authz.policy.websiteId,
    policyVersionId: cloned.id,
    policyVersion: cloned.version,
    vendorIds: [],
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
