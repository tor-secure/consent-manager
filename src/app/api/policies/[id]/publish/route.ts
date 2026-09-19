import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { authorizeOwnedPolicy } from "@/lib/compliance/http";
import { requireOperatorRole } from "@/lib/org-roles";
import {
  ignoreClientComplianceClaims,
  validateOwnedPolicy,
  writeComplianceAudit,
} from "@/lib/compliance/service";
import { COMPLIANCE_AUDIT_ACTIONS } from "@/lib/compliance/types";
import { loadConsentGraph } from "@/lib/intelligence/graph-snapshot";
import { loadQualityScoreInput } from "@/lib/monitoring/privacy-intelligence";
import { calculateConsentQualityScore } from "@/lib/monitoring/consent-quality";
import { captureDigitalTwinSnapshot } from "@/lib/intelligence/service";
import { markVersionPublished } from "@/lib/policy/lifecycle";
import { buildLivePolicyProcessingSnapshot } from "@/lib/processing/service";
import { policyValidationFailureMessage } from "@/lib/schema-mismatch";

// ---------------------------------------------------------------------------
// POST /api/policies/[id]/publish
//
// Publishes the latest draft after server-side compliance validation.
// Client validated/jurisdiction/organizationId claims are ignored.
// ---------------------------------------------------------------------------

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: policyId } = await params;
    const authz = await authorizeOwnedPolicy(policyId);
    if (authz.error) return authz.error;
    const operatorError = requireOperatorRole(authz.membership.roleName);
    if (operatorError) return operatorError;

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
        { success: false, message: "This policy has no versions to publish." },
        { status: 422 },
      );
    }

    if (validated.result.errors.length > 0) {
      await writeComplianceAudit({
        organizationId: authz.organization.id,
        userId: authz.localUser.id,
        policyId: authz.policy.policyId,
        websiteId: authz.policy.websiteId,
        versionId: validated.versionId,
        action: COMPLIANCE_AUDIT_ACTIONS.publishRejected,
        result: validated.result,
        description: `Publishing blocked with ${validated.result.errors.length} compliance error(s)`,
      });
      return NextResponse.json(
        {
          success: false,
          message: `Publishing blocked. ${validated.result.errors.length} compliance error${validated.result.errors.length === 1 ? "" : "s"} must be fixed.`,
          missingPurposes: validated.result.errors.some((row) => row.code === "PURPOSE_REQUIRED_MISSING"),
          validation: validated.result,
        },
        { status: 422 },
      );
    }

    const now = new Date();
    const processingSnapshot = await buildLivePolicyProcessingSnapshot({
      organizationId: authz.organization.id,
      websiteId: authz.policy.websiteId,
      policyVersionId: validated.versionId,
      policyVersion: validated.versionNumber,
      vendorIds: validated.vendorIds,
      frozenAt: now,
    });

    const [existingPublished] = await db
      .select({ id: consentPolicyVersions.id })
      .from(consentPolicyVersions)
      .where(
        and(
          eq(consentPolicyVersions.id, validated.versionId),
          eq(consentPolicyVersions.isPublished, true),
        ),
      )
      .limit(1);
    if (existingPublished) {
      return NextResponse.json(
        { success: false, message: "This policy version is already published." },
        { status: 409 },
      );
    }

    const [versionRow] = await db
      .select({ configuration: consentPolicyVersions.configuration })
      .from(consentPolicyVersions)
      .where(eq(consentPolicyVersions.id, validated.versionId))
      .limit(1);
    const configuration =
      versionRow?.configuration &&
      typeof versionRow.configuration === "object" &&
      !Array.isArray(versionRow.configuration)
        ? (versionRow.configuration as Record<string, unknown>)
        : {};
    const updatedVersion = await markVersionPublished({
      policyId: authz.policy.policyId,
      versionId: validated.versionId,
      processingSnapshot,
      configuration,
      now,
    });

    if (!updatedVersion) {
      return NextResponse.json(
        { success: false, message: "This policy version could not be published." },
        { status: 409 },
      );
    }

    await writeComplianceAudit({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      policyId: authz.policy.policyId,
      websiteId: authz.policy.websiteId,
      versionId: validated.versionId,
      action: COMPLIANCE_AUDIT_ACTIONS.publishAccepted,
      result: validated.result,
      description: "Policy published after server-side compliance validation",
    });

    try {
      const [graph, quality] = await Promise.all([
        loadConsentGraph(authz.organization.id, authz.policy.websiteId),
        loadQualityScoreInput(authz.policy.websiteId),
      ]);
      if (graph && quality) {
        await captureDigitalTwinSnapshot({
          organizationId: authz.organization.id,
          websiteId: authz.policy.websiteId,
          source: "policy",
          sourceId: updatedVersion.id,
          actorUserId: authz.localUser.id,
          graph,
          qualityInput: quality.input,
          qualityScore: calculateConsentQualityScore(quality.input).overall,
        });
      }
    } catch (snapshotError) {
      logger.error("Policy published but digital twin snapshot failed", { error: snapshotError });
    }

    return NextResponse.json(
      {
        success: true,
        version: {
          id: updatedVersion.id,
          version: updatedVersion.version,
          isPublished: updatedVersion.isPublished,
          publishedAt: updatedVersion.publishedAt,
          effectiveFrom: updatedVersion.effectiveFrom,
        },
        validation: validated.result,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error("Publish policy failed", { error });
    return NextResponse.json(
      { success: false, message: policyValidationFailureMessage(error) },
      { status: 503 },
    );
  }
}
