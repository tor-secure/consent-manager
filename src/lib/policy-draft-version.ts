import { eq } from "drizzle-orm";

import { db } from "@/db";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { isSchemaMismatchError } from "@/lib/schema-mismatch";

export type PolicyVersionRow = typeof consentPolicyVersions.$inferSelect;

const versionColumnsWithoutSnapshot = {
  id: consentPolicyVersions.id,
  policyId: consentPolicyVersions.policyId,
  version: consentPolicyVersions.version,
  status: consentPolicyVersions.status,
  configuration: consentPolicyVersions.configuration,
  isPublished: consentPolicyVersions.isPublished,
  effectiveFrom: consentPolicyVersions.effectiveFrom,
  publishedAt: consentPolicyVersions.publishedAt,
  createdAt: consentPolicyVersions.createdAt,
  updatedAt: consentPolicyVersions.updatedAt,
};

async function loadVersions(policyId: string): Promise<PolicyVersionRow[]> {
  try {
    return await db
      .select()
      .from(consentPolicyVersions)
      .where(eq(consentPolicyVersions.policyId, policyId))
      .orderBy(consentPolicyVersions.version);
  } catch (error) {
    if (!isSchemaMismatchError(error)) throw error;
    const rows = await db
      .select(versionColumnsWithoutSnapshot)
      .from(consentPolicyVersions)
      .where(eq(consentPolicyVersions.policyId, policyId))
      .orderBy(consentPolicyVersions.version);
    return rows.map((row) => ({
      ...row,
      processingSnapshot: {},
      scheduledPublishAt: null,
      unpublishedAt: null,
      configHash: null,
    }));
  }
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

  let created: PolicyVersionRow;
  try {
    [created] = await db
      .insert(consentPolicyVersions)
      .values({
        policyId,
        version: latest.version + 1,
        status: "draft",
        isPublished: false,
        configuration,
        processingSnapshot: {},
      })
      .returning();
  } catch (error) {
    if (!isSchemaMismatchError(error)) throw error;
    [created] = await db
      .insert(consentPolicyVersions)
      .values({
        policyId,
        version: latest.version + 1,
        status: "draft",
        isPublished: false,
        configuration,
      })
      .returning();
    created = { ...created, processingSnapshot: created.processingSnapshot ?? {} };
  }

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
