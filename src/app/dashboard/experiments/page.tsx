import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { PageHeader } from "@/components/ui/page-header";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { loadOrgWebsites } from "@/lib/intelligence/org-websites";
import { db } from "@/db";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { ExperimentsConsole } from "@/components/intelligence/experiments-console";
import { AbTestControls } from "@/components/intelligence/ab-test-controls";
import { parseBannerAbTest } from "@/lib/intelligence/ab-test";
import { summarizeAbChoices } from "@/lib/intelligence/ab-stats";
import { consentRecords } from "@/db/schema/consent-records";
import { experiments } from "@/db/schema/experiments";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function ExperimentsPage() {
  const context = await requireDashboardContext();
  const sites = await loadOrgWebsites(context.organization.id);
  const siteIds = sites.map((site) => site.id);
  const policies = siteIds.length ? await db.select({
    websiteId: consentPolicies.websiteId,
    policyId: consentPolicies.id,
    policyName: consentPolicies.name,
    policyVersionId: consentPolicyVersions.id,
    version: consentPolicyVersions.version,
    isPublished: consentPolicyVersions.isPublished,
    configuration: consentPolicyVersions.configuration,
  }).from(consentPolicies).innerJoin(consentPolicyVersions, eq(consentPolicyVersions.policyId, consentPolicies.id))
    .where(and(inArray(consentPolicies.websiteId, siteIds), isNull(consentPolicies.deletedAt))) : [];
  const published = policies.filter((policy) => policy.isPublished);
  const latestByPolicy = new Map<string, (typeof published)[number]>();
  for (const version of published) {
    const current = latestByPolicy.get(version.policyId);
    if (!current || version.version > current.version) latestByPolicy.set(version.policyId, version);
  }
  const currentVersions = [...latestByPolicy.values()];
  const currentVersionIds = currentVersions.map((row) => row.policyVersionId);
  const [legacyChoiceRows, nativeRows] = currentVersionIds.length ? await Promise.all([
    db.select({ policyVersionId: consentRecords.policyVersionId, variantId: sql<string | null>`${consentRecords.metadata} #>> '{abTest,variantId}'`, choice: sql<string | null>`${consentRecords.metadata}->>'choice'`, count: sql<number>`count(*)::int` })
      .from(consentRecords).where(and(eq(consentRecords.organizationId, context.organization.id), inArray(consentRecords.policyVersionId, currentVersionIds)))
      .groupBy(consentRecords.policyVersionId, sql`${consentRecords.metadata} #>> '{abTest,variantId}'`, sql`${consentRecords.metadata}->>'choice'`),
    db.select({ policyVersionId: experiments.policyVersionId }).from(experiments).where(and(eq(experiments.organizationId, context.organization.id), inArray(experiments.policyVersionId, currentVersionIds))),
  ]) : [[], []];

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PageHeader
        eyebrow={<SectionEyebrow href="/dashboard/intelligence">Intelligence</SectionEyebrow>}
        title="Consent experiments"
        description="Run controlled banner presentation tests while keeping published policy, purposes, consent choices, and enforcement rules fixed."
      />
      <ExperimentsConsole sites={sites.map(({ id, name }) => ({ id, name }))} policies={published} />
      <section className="space-y-4" aria-labelledby="legacy-ab-tests-title">
        <div><h2 id="legacy-ab-tests-title" className="text-lg font-semibold">Existing policy A/B tests</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Config-backed tests remain available with their existing assignment and consent-record analytics. New experiments above use presentation-only variants.</p></div>
        {currentVersions.filter((policy) => !nativeRows.some((row) => row.policyVersionId === policy.policyVersionId)).length === 0 ? <p className="rounded-lg border border-[var(--border)] p-4 text-sm text-[var(--muted-foreground)]">No legacy policy A/B tests need management. Published policy versions with native experiments are managed above.</p> : currentVersions.filter((policy) => !nativeRows.some((row) => row.policyVersionId === policy.policyVersionId)).map((policy) => {
          const config = policy.configuration && typeof policy.configuration === "object" && !Array.isArray(policy.configuration) ? policy.configuration as Record<string, unknown> : {};
          const abTest = parseBannerAbTest(config.abTest);
          const stats = summarizeAbChoices(legacyChoiceRows.filter((row) => row.policyVersionId === policy.policyVersionId).map((row) => ({ variantId: row.variantId, choice: row.choice, count: Number(row.count) })));
          const siteName = sites.find((site) => site.id === policy.websiteId)?.name ?? "Website";
          return <Card key={policy.policyId}><CardContent className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">{siteName} · {policy.policyName}</h3><p className="text-sm text-[var(--muted-foreground)]">Published policy v{policy.version}</p></div><div className="flex items-center gap-2"><Badge variant={abTest?.enabled ? "success" : "neutral"}>{abTest?.enabled ? "Running" : "Off"}</Badge><AbTestControls policyId={policy.policyId} enabled={Boolean(abTest?.enabled)} /></div></div>
            {abTest ? <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">{abTest.variants.map((variant) => <li key={variant.id}>{variant.label} · {variant.weight}%</li>)}</ul> : <p className="mt-3 text-sm text-[var(--muted-foreground)]">No legacy variants configured. Use the control to enable the backward-compatible default test.</p>}
            {stats.length ? <div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="text-xs text-[var(--muted-foreground)]"><th className="pb-2 pr-4">Variant</th><th className="pb-2 pr-4">Records</th><th className="pb-2 pr-4">Accept all</th><th className="pb-2">Accept rate</th></tr></thead><tbody>{stats.map((row) => <tr key={row.variantId} className="border-t border-[var(--border)]"><td className="py-2 pr-4">{row.variantId}</td><td className="py-2 pr-4">{row.total}</td><td className="py-2 pr-4">{row.acceptAll}</td><td className="py-2">{row.acceptRate}%</td></tr>)}</tbody></table></div> : null}
          </CardContent></Card>;
        })}
      </section>
    </div>
  );
}
