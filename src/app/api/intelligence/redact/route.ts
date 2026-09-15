import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { evaluateConsentForTenant, logConsentEvaluation } from "@/lib/consent-evaluation";
import { redactValue, validateRedactionPolicy } from "@/lib/redaction-core";
import { isValidConsentId, isValidWebsiteId } from "@/lib/sdk/public-http";
import { requireOperatorRole } from "@/lib/org-roles";

const bodySchema = z.object({
  websiteId: z.string(),
  consentId: z.string(),
  dryRun: z.boolean().optional(),
  data: z.unknown(),
  policy: z.unknown(),
});

export async function POST(request: Request) {
  const requestId = randomUUID();
  const session = await auth();
  if (!session.isAuthenticated || !session.userId || !session.orgId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const [user, organization] = await Promise.all([
    resolveLocalUser(session.userId),
    resolveLocalOrganization(session.orgId),
  ]);
  const membership = user && organization ? await resolveActiveMembership(organization.id, user.id) : null;
  if (!user || !organization || !membership) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  const operatorError = requireOperatorRole(membership.roleName);
  if (operatorError) return operatorError;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid redaction request" }, { status: 400 });
  }
  if (!isValidWebsiteId(parsed.data.websiteId) || !isValidConsentId(parsed.data.consentId)) {
    return NextResponse.json({ success: false, message: "Invalid websiteId or consentId" }, { status: 400 });
  }
  const policy = validateRedactionPolicy(parsed.data.policy);
  if (!policy.ok) {
    return NextResponse.json({ success: false, message: policy.message }, { status: 400 });
  }
  const purposeKeys = [...new Set(policy.policy.fields.flatMap((rule) => rule.purposeKeys ?? []))];
  const dataCategories = [...new Set(policy.policy.fields.flatMap((rule) => rule.dataCategories ?? []))];
  const evaluation = await evaluateConsentForTenant(
    { organizationId: organization.id, websiteId: parsed.data.websiteId, consentId: parsed.data.consentId },
    { purposeKeys, dataCategories, vendorDomains: [], trackerIds: [] },
  );
  if (!evaluation) {
    return NextResponse.json({ success: false, message: "Consent record not found" }, { status: 404 });
  }
  const result = redactValue(parsed.data.data, policy.policy, {
    allowedPurposeKeys: new Set(
      evaluation.result.results.purposes.filter((item) => item.allowed).map((item) => item.requested.toLowerCase()),
    ),
    allowedDataCategories: new Set(
      evaluation.result.results.dataCategories.filter((item) => item.allowed).map((item) => item.requested.toLowerCase()),
    ),
  });
  if (!parsed.data.dryRun) {
    await Promise.all([
      logConsentEvaluation({
        organizationId: organization.id,
        userId: user.id,
        requestId,
        source: "dashboard",
        evaluation,
        request: { purposeKeys, dataCategories, vendorDomains: [], trackerIds: [] },
      }),
      db.insert(auditLogs).values({
        organizationId: organization.id,
        userId: user.id,
        action: "data.redacted",
        resourceType: "consent_record",
        resourceId: evaluation.recordId,
        description: "Dashboard redaction used the same engine as /api/v1/redact",
        metadata: { requestId, removedFieldCount: result.removedPaths.length },
      }),
    ]);
  }
  return NextResponse.json({
    success: true,
    requestId,
    dryRun: parsed.data.dryRun === true,
    consentState: evaluation.result.consentState,
    data: result.value,
    redaction: { removedPaths: result.removedPaths },
  });
}
