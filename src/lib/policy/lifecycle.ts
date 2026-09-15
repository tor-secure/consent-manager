import "server-only";

import { and, desc, eq, lte, ne } from "drizzle-orm";

import { db } from "@/db";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { websites } from "@/db/schema/websites";
import { hashForPublishedVersion } from "@/lib/policy/lifecycle-core";

export async function archiveOtherPublishedVersions(policyId: string, keepVersionId: string, now: Date) {
  await db
    .update(consentPolicyVersions)
    .set({
      isPublished: false,
      status: "archived",
      unpublishedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(consentPolicyVersions.policyId, policyId),
        eq(consentPolicyVersions.isPublished, true),
        ne(consentPolicyVersions.id, keepVersionId),
      ),
    );
}

export async function markVersionPublished(input: {
  policyId: string;
  versionId: string;
  processingSnapshot: Record<string, unknown>;
  configuration: Record<string, unknown>;
  now: Date;
}) {
  const configHash = hashForPublishedVersion({
    id: input.versionId,
    configuration: input.configuration,
    processingSnapshot: input.processingSnapshot,
  });
  return db.transaction(async (tx) => {
    await tx
      .update(consentPolicyVersions)
      .set({
        isPublished: false,
        status: "archived",
        unpublishedAt: input.now,
        updatedAt: input.now,
      })
      .where(
        and(
          eq(consentPolicyVersions.policyId, input.policyId),
          eq(consentPolicyVersions.isPublished, true),
          ne(consentPolicyVersions.id, input.versionId),
        ),
      );
    const [updated] = await tx
      .update(consentPolicyVersions)
      .set({
        isPublished: true,
        status: "published",
        publishedAt: input.now,
        effectiveFrom: input.now,
        scheduledPublishAt: null,
        unpublishedAt: null,
        processingSnapshot: input.processingSnapshot,
        configHash,
        updatedAt: input.now,
      })
      .where(eq(consentPolicyVersions.id, input.versionId))
      .returning();
    await tx
      .update(consentPolicies)
      .set({ status: "active", liveVersionId: input.versionId, updatedAt: input.now })
      .where(eq(consentPolicies.id, input.policyId));
    return updated;
  });
}

export async function unpublishPolicy(policyId: string, now = new Date()) {
  await db
    .update(consentPolicyVersions)
    .set({
      isPublished: false,
      status: "archived",
      unpublishedAt: now,
      updatedAt: now,
    })
    .where(and(eq(consentPolicyVersions.policyId, policyId), eq(consentPolicyVersions.isPublished, true)));
  await db
    .update(consentPolicies)
    .set({ status: "draft", liveVersionId: null, updatedAt: now })
    .where(eq(consentPolicies.id, policyId));
}

export async function schedulePolicyVersion(input: {
  versionId: string;
  scheduledPublishAt: Date;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const [updated] = await db
    .update(consentPolicyVersions)
    .set({
      status: "scheduled",
      scheduledPublishAt: input.scheduledPublishAt,
      updatedAt: now,
    })
    .where(
      and(eq(consentPolicyVersions.id, input.versionId), eq(consentPolicyVersions.isPublished, false)),
    )
    .returning();
  return updated ?? null;
}

export async function cloneVersionForRollback(input: {
  policyId: string;
  sourceVersionId: string;
}): Promise<{ id: string; version: number; configuration: Record<string, unknown> } | null> {
  const [source] = await db
    .select()
    .from(consentPolicyVersions)
    .where(
      and(eq(consentPolicyVersions.id, input.sourceVersionId), eq(consentPolicyVersions.policyId, input.policyId)),
    )
    .limit(1);
  if (!source) return null;
  const [latest] = await db
    .select({ version: consentPolicyVersions.version })
    .from(consentPolicyVersions)
    .where(eq(consentPolicyVersions.policyId, input.policyId))
    .orderBy(desc(consentPolicyVersions.version))
    .limit(1);
  const configuration =
    source.configuration && typeof source.configuration === "object" && !Array.isArray(source.configuration)
      ? (source.configuration as Record<string, unknown>)
      : {};
  const [created] = await db
    .insert(consentPolicyVersions)
    .values({
      policyId: input.policyId,
      version: (latest?.version ?? source.version) + 1,
      status: "draft",
      isPublished: false,
      configuration,
      processingSnapshot: {},
    })
    .returning();
  const links = await db
    .select({ purposeId: policyPurposes.purposeId })
    .from(policyPurposes)
    .where(eq(policyPurposes.policyVersionId, source.id));
  if (links.length > 0) {
    await db.insert(policyPurposes).values(
      links.map((link) => ({ policyVersionId: created.id, purposeId: link.purposeId })),
    );
  }
  return { id: created.id, version: created.version, configuration };
}

export async function websiteSiteKeyForPolicy(policyId: string): Promise<string | null> {
  const [row] = await db
    .select({ siteKey: websites.siteKey })
    .from(consentPolicies)
    .innerJoin(websites, eq(consentPolicies.websiteId, websites.id))
    .where(eq(consentPolicies.id, policyId))
    .limit(1);
  return row?.siteKey ?? null;
}

export async function promoteDueScheduledPolicies(now = new Date()) {
  const due = await db
    .select({
      id: consentPolicyVersions.id,
      policyId: consentPolicyVersions.policyId,
      configuration: consentPolicyVersions.configuration,
      processingSnapshot: consentPolicyVersions.processingSnapshot,
    })
    .from(consentPolicyVersions)
    .where(
      and(
        eq(consentPolicyVersions.status, "scheduled"),
        eq(consentPolicyVersions.isPublished, false),
        lte(consentPolicyVersions.scheduledPublishAt, now),
      ),
    );
  const published: string[] = [];
  for (const row of due) {
    const configuration =
      row.configuration && typeof row.configuration === "object" && !Array.isArray(row.configuration)
        ? (row.configuration as Record<string, unknown>)
        : {};
    const processingSnapshot =
      row.processingSnapshot && typeof row.processingSnapshot === "object" && !Array.isArray(row.processingSnapshot)
        ? (row.processingSnapshot as Record<string, unknown>)
        : {};
    await markVersionPublished({
      policyId: row.policyId,
      versionId: row.id,
      configuration,
      processingSnapshot,
      now,
    });
    published.push(row.id);
  }
  return { promoted: published.length, versionIds: published };
}
