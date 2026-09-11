import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import {
  WebsiteList,
  type WebsiteRow,
} from "@/components/websites/website-list";
import { PageHeader, PageHeaderLink } from "@/components/ui/page-header";

export default async function WebsitesPage() {
  const { organization } = await requireDashboardContext();

  const rows = await db
    .select({
      id: websites.id,
      name: websites.name,
      domain: websites.domain,
      environment: websites.environment,
      status: websites.status,
      defaultLanguage: websites.defaultLanguage,
      defaultRegion: websites.defaultRegion,
      verified: websites.verified,
      createdAt: websites.createdAt,
    })
    .from(websites)
    .where(eq(websites.organizationId, organization.id))
    .orderBy(websites.createdAt);

  const siteIds = rows.map((row) => row.id);
  const policyRows =
    siteIds.length === 0
      ? []
      : await db
          .select({
            id: consentPolicies.id,
            websiteId: consentPolicies.websiteId,
            isPublished: consentPolicyVersions.isPublished,
          })
          .from(consentPolicies)
          .leftJoin(
            consentPolicyVersions,
            and(
              eq(consentPolicyVersions.policyId, consentPolicies.id),
              eq(consentPolicyVersions.isPublished, true),
            ),
          )
          .where(inArray(consentPolicies.websiteId, siteIds));

  const websiteList: WebsiteRow[] = rows.map((row) => {
    const sitePolicies = policyRows.filter((policy) => policy.websiteId === row.id);
    const published = sitePolicies.find((policy) => policy.isPublished);
    const draft = sitePolicies[0];
    const nextAction = !draft
      ? { label: "Create policy", href: `/dashboard/policies/new?websiteId=${row.id}` }
      : !published
        ? { label: "Publish policy", href: `/dashboard/policies/${draft.id}#policy-publish` }
        : !row.verified
          ? { label: "Install SDK", href: `/dashboard/websites/${row.id}/installation` }
          : { label: "Run scan", href: `/dashboard/scanner?websiteId=${row.id}` };
    return { ...row, nextAction };
  });

  return (
    <div className="page-wrap">
      <PageHeader
        title="Websites"
        description="Manage the websites connected to your Consent Management Platform."
        action={
          <PageHeaderLink href="/dashboard/websites/new">
            Add website
          </PageHeaderLink>
        }
      />
      <WebsiteList websites={websiteList} />
    </div>
  );
}
