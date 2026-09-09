import { NextResponse } from "next/server";

import { authorizeOwnedPolicy } from "@/lib/compliance/http";
import { ignoreClientComplianceClaims, validateOwnedPolicy } from "@/lib/compliance/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: policyId } = await params;
  const authz = await authorizeOwnedPolicy(policyId);
  if (authz.error) return authz.error;

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  ignoreClientComplianceClaims(body);

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
      { success: false, message: "This policy has no versions to validate." },
      { status: 422 },
    );
  }

  return NextResponse.json({
    success: true,
    validation: validated.result,
  });
}
