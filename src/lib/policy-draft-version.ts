import { eq } from "drizzle-orm";

import { db } from "@/db";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";

export type PolicyVersionRow = typeof consentPolicyVersions.$inferSelect;

async function loadVersions(policyId: string): Promise<PolicyVersionRow[]> {
  return db
    .select()
    .from(consentPolicyVersions)
    .where(eq(consentPolicyVersions.policyId, policyId))
    .orderBy(consentPolicyVersions.version);
}

/**
 * Returns an unpublished version to edit.
 * If the latest version is already live, copies it into a new draft (config +
 * attached purposes) so later purpose/vendor changes can be published again.
 */
export async function ensureDraftPolicyVersion(
  policyId: string,
): Promise<PolicyVersionRow | null> {
  const versions = await loadVersions(policyId);
  const latest = versions[versions.length - 1] ?? null;
  if (!latest) return null;
  if (!latest.isPublished) return latest;

  const configuration =
    latest.configuration &&
    typeof latest.configuration === "object" &&
    !Array.isArray(latest.configuration)
      ? latest.configuration
      : {};

  const [created] = await db
    .insert(consentPolicyVersions)
    .values({
      policyId,
      version: latest.version + 1,
      status: "draft",
      isPublished: false,
      configuration,
    })
    .returning();

  const purposeLinks = await db
    .select({ purposeId: policyPurposes.purposeId })
    .from(policyPurposes)
    .where(eq(policyPurposes.policyVersionId, latest.id));

  if (purposeLinks.length > 0) {
    await db.insert(policyPurposes).values(
      purposeLinks.map((link) => ({
        policyVersionId: created.id,
        purposeId: link.purposeId,
      })),
    );
  }

  return created;
}
