import { NextResponse } from "next/server";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { authorizeOwnedPolicy } from "@/lib/compliance/http";
import { requireOperatorRole } from "@/lib/org-roles";
import { unpublishPolicy } from "@/lib/policy/lifecycle";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: policyId } = await params;
  const authz = await authorizeOwnedPolicy(policyId);
  if (authz.error) return authz.error;
  const operatorError = requireOperatorRole(authz.membership.roleName);
  if (operatorError) return operatorError;

  await unpublishPolicy(authz.policy.policyId);
  await db.insert(auditLogs).values({
    organizationId: authz.organization.id,
    userId: authz.localUser.id,
    action: "policy.unpublished",
    resourceType: "consent_policy",
    resourceId: authz.policy.policyId,
    description: "Published policy unpublished; public SDK config will not fall back to a draft",
    metadata: { websiteId: authz.policy.websiteId },
  });

  return NextResponse.json({ success: true, unpublished: true });
}
