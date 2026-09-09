import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { publishedPolicyImpact } from "./management";

export async function trackerPublishedPolicyImpact(input: {
  websiteId: string;
  purposeId: string | null;
  mappingChanged: boolean;
}) {
  const [published] = await db
    .select({
      policyId: consentPolicies.id,
      versionId: consentPolicyVersions.id,
    })
    .from(consentPolicies)
    .innerJoin(
      consentPolicyVersions,
      eq(consentPolicyVersions.policyId, consentPolicies.id),
    )
    .where(
      and(
        eq(consentPolicies.websiteId, input.websiteId),
        eq(consentPolicyVersions.isPublished, true),
      ),
    )
    .limit(1);

  let purposeAttachedToPublishedPolicy = false;
  if (published && input.purposeId) {
    const [attached] = await db
      .select({ id: policyPurposes.id })
      .from(policyPurposes)
      .where(
        and(
          eq(policyPurposes.policyVersionId, published.versionId),
          eq(policyPurposes.purposeId, input.purposeId),
        ),
      )
      .limit(1);
    purposeAttachedToPublishedPolicy = Boolean(attached);
  }

  return publishedPolicyImpact({
    hasPublishedPolicy: Boolean(published),
    purposeAttachedToPublishedPolicy,
    mappingChanged: input.mappingChanged,
  });
}
