import { Suspense } from "react";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { PoliciesWorkspace } from "@/components/policies/policies-workspace";

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ websiteId?: string }>;
}) {
  const { websiteId: initialWebsiteId } = await searchParams;
  const { organization: localOrg } = await requireDashboardContext();

  const orgWebsites = await db
    .select({
      id: websites.id,
      name: websites.name,
      domain: websites.domain,
      iconUrl: websites.iconUrl,
    })
    .from(websites)
    .where(and(eq(websites.organizationId, localOrg.id), isNull(websites.deletedAt)))
    .orderBy(websites.name);

  const websiteIds = orgWebsites.map((w) => w.id);
  const websiteMap = new Map(orgWebsites.map((w) => [w.id, w]));

  const policies =
    websiteIds.length > 0
      ? await db
          .select({
            id: consentPolicies.id,
            websiteId: consentPolicies.websiteId,
            name: consentPolicies.name,
            description: consentPolicies.description,
            status: consentPolicies.status,
            isDefault: consentPolicies.isDefault,
            createdAt: consentPolicies.createdAt,
          })
          .from(consentPolicies)
          .where(
            and(
              inArray(consentPolicies.websiteId, websiteIds),
              isNull(consentPolicies.deletedAt),
            ),
          )
          .orderBy(consentPolicies.createdAt)
      : [];

  const policyIds = policies.map((p) => p.id);
  const versions =
    policyIds.length > 0
      ? await db
          .select({
            policyId: consentPolicyVersions.policyId,
            version: consentPolicyVersions.version,
            isPublished: consentPolicyVersions.isPublished,
          })
          .from(consentPolicyVersions)
          .where(inArray(consentPolicyVersions.policyId, policyIds))
      : [];

  const versionMap = new Map<string, { latestVersion: number; hasPublished: boolean }>();
  for (const v of versions) {
    const existing = versionMap.get(v.policyId);
    versionMap.set(v.policyId, {
      latestVersion: Math.max(v.version, existing?.latestVersion ?? 0),
      hasPublished: (existing?.hasPublished ?? false) || v.isPublished,
    });
  }

  const countByWebsite = new Map<string, number>();
  for (const policy of policies) {
    countByWebsite.set(policy.websiteId, (countByWebsite.get(policy.websiteId) ?? 0) + 1);
  }

  const websiteOptions = orgWebsites.map((site) => ({
    ...site,
    policyCount: countByWebsite.get(site.id) ?? 0,
  }));

  const rows = policies.map((policy) => {
    const ver = versionMap.get(policy.id);
    return {
      id: policy.id,
      name: policy.name,
      description: policy.description,
      status: policy.status,
      isDefault: policy.isDefault,
      createdAt: policy.createdAt,
      website: websiteMap.get(policy.websiteId) ?? null,
      latestVersion: ver?.latestVersion ?? 1,
      hasPublished: ver?.hasPublished ?? false,
    };
  });

  return (
    <div className="page-wrap flex min-h-[70vh] items-center justify-center p-4 md:p-6 xl:p-10">
      <Suspense
        fallback={
          <div className="mx-auto w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-sm text-[var(--muted-foreground)]">
            Loading policies…
          </div>
        }
      >
        <PoliciesWorkspace
          websites={websiteOptions}
          policies={rows}
          initialWebsiteId={initialWebsiteId}
        />
      </Suspense>
    </div>
  );
}
