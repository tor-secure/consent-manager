import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { PageHeader } from "@/components/ui/page-header";

import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { db } from "@/db";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentRecords } from "@/db/schema/consent-records";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteFilter } from "@/components/intelligence/website-filter";
import { AbTestControls } from "@/components/intelligence/ab-test-controls";
import { loadOrgWebsites, pickWebsiteId } from "@/lib/intelligence/org-websites";
import { parseBannerAbTest } from "@/lib/intelligence/ab-test";
import { summarizeAbChoices } from "@/lib/intelligence/ab-stats";

export default async function ExperimentsPage({
  searchParams,
}: {
  searchParams: Promise<{ website?: string }>;
}) {
  const context = await requireDashboardContext();
  const params = await searchParams;
  const sites = await loadOrgWebsites(context.organization.id);
  const websiteId = pickWebsiteId(sites, params.website);

  const policies = websiteId
    ? await db
        .select({
          id: consentPolicies.id,
          name: consentPolicies.name,
          status: consentPolicies.status,
          isDefault: consentPolicies.isDefault,
        })
        .from(consentPolicies)
        .where(and(eq(consentPolicies.websiteId, websiteId), isNull(consentPolicies.deletedAt)))
        .orderBy(consentPolicies.name)
    : [];

  const versions =
    policies.length > 0
      ? await db
          .select({
            id: consentPolicyVersions.id,
            policyId: consentPolicyVersions.policyId,
            version: consentPolicyVersions.version,
            isPublished: consentPolicyVersions.isPublished,
            configuration: consentPolicyVersions.configuration,
          })
          .from(consentPolicyVersions)
          .where(inArray(consentPolicyVersions.policyId, policies.map((row) => row.id)))
          .orderBy(consentPolicyVersions.version)
      : [];

  const latestByPolicy = new Map<string, (typeof versions)[number]>();
  for (const version of versions) {
    const current = latestByPolicy.get(version.policyId);
    if (!current || version.version >= current.version) {
      latestByPolicy.set(version.policyId, version);
    }
  }

  const versionIds = [...latestByPolicy.values()].map((row) => row.id);
  let choiceRows: Array<{ variantId: string | null; choice: string | null; count: number; policyVersionId: string }> =
    [];
  if (versionIds.length > 0) {
    try {
      choiceRows = await db
        .select({
          policyVersionId: consentRecords.policyVersionId,
          variantId: sql<string | null>`${consentRecords.metadata} #>> '{abTest,variantId}'`,
          choice: sql<string | null>`${consentRecords.metadata}->>'choice'`,
          count: sql<number>`count(*)::int`,
        })
        .from(consentRecords)
        .where(
          and(
            eq(consentRecords.organizationId, context.organization.id),
            eq(consentRecords.websiteId, websiteId!),
            inArray(consentRecords.policyVersionId, versionIds),
          ),
        )
        .groupBy(
          consentRecords.policyVersionId,
          sql`${consentRecords.metadata} #>> '{abTest,variantId}'`,
          sql`${consentRecords.metadata}->>'choice'`,
        );
    } catch {
      choiceRows = [];
    }
  }

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow="Intelligence"
        title="Consent experiments"
        description="A/B test banner layout on the live SDK. Visitors are assigned a sticky variant; accept/reject rates come from recorded consent, not estimates."
      />

      {sites.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">No websites yet.</CardContent>
        </Card>
      ) : (
        <>
          <WebsiteFilter action="/dashboard/experiments" websites={sites} selected={websiteId} />
          {policies.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-sm text-[var(--muted-foreground)]">
                No policies on this website. Create and publish a policy before running an experiment.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {policies.map((policy) => {
                const version = latestByPolicy.get(policy.id);
                const config =
                  version?.configuration &&
                  typeof version.configuration === "object" &&
                  !Array.isArray(version.configuration)
                    ? (version.configuration as Record<string, unknown>)
                    : {};
                const abTest = parseBannerAbTest(config.abTest);
                const stats = summarizeAbChoices(
                  choiceRows
                    .filter((row) => row.policyVersionId === version?.id)
                    .map((row) => ({ variantId: row.variantId, choice: row.choice, count: Number(row.count) })),
                );
                return (
                  <Card key={policy.id}>
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="text-base font-semibold">{policy.name}</h2>
                          <p className="text-sm text-[var(--muted-foreground)]">
                            {policy.status}
                            {policy.isDefault ? " · default" : ""}
                            {version ? ` · v${version.version}` : ""}
                            {version?.isPublished ? " · published" : " · draft"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={abTest?.enabled ? "success" : "neutral"}>
                            {abTest?.enabled ? "Running" : "Off"}
                          </Badge>
                          {version ? (
                            <AbTestControls policyId={policy.id} enabled={Boolean(abTest?.enabled)} />
                          ) : null}
                        </div>
                      </div>
                      {abTest ? (
                        <ul className="mt-4 space-y-2 text-sm">
                          {abTest.variants.map((variant) => (
                            <li key={variant.id}>
                              <span className="font-medium">{variant.label}</span>
                              <span className="text-[var(--muted-foreground)]">
                                {" "}
                                · {variant.id} · weight {variant.weight}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-4 text-sm text-[var(--muted-foreground)]">
                          No experiment configured. Start the default control vs dialog+reject test.
                        </p>
                      )}
                      {stats.length > 0 ? (
                        <table className="mt-4 min-w-full text-left text-sm">
                          <thead className="text-xs uppercase text-[var(--muted-foreground)]">
                            <tr>
                              <th className="pb-2 pr-4">Variant</th>
                              <th className="pb-2 pr-4">Records</th>
                              <th className="pb-2 pr-4">Accept all</th>
                              <th className="pb-2">Accept rate</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stats.map((row) => (
                              <tr key={row.variantId} className="border-t border-slate-100">
                                <td className="py-2 pr-4">{row.variantId}</td>
                                <td className="py-2 pr-4">{row.total}</td>
                                <td className="py-2 pr-4">{row.acceptAll}</td>
                                <td className="py-2">{row.acceptRate}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                          No consent records with a variant yet. New choices from the SDK include the assigned variant.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
