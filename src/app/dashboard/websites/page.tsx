import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import {
  WebsiteList,
  type WebsiteRow,
} from "@/components/websites/website-list";
import { CreateWebsiteForm } from "@/components/websites/create-website-form";

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
      iconUrl: websites.iconUrl,
      policyId: sql<string | null>`(
        SELECT p.id
        FROM consent_policies p
        WHERE p.website_id = websites.id
        ORDER BY p.created_at ASC
        LIMIT 1
      )`,
      hasPublished: sql<boolean | string | null>`EXISTS (
        SELECT 1
        FROM consent_policy_versions v
        INNER JOIN consent_policies p ON p.id = v.policy_id
        WHERE p.website_id = websites.id
          AND v.is_published = true
      )`,
    })
    .from(websites)
    .where(and(eq(websites.organizationId, organization.id), isNull(websites.deletedAt)))
    .orderBy(websites.createdAt);

  const websiteList: WebsiteRow[] = rows.map((row) => {
    const { policyId, hasPublished, ...site } = row;
    const hasPolicy = Boolean(policyId);
    const published = hasPublished === true || hasPublished === "t" || hasPublished === "true";
    const setupStatus = !hasPolicy
      ? "needs_policy"
      : !published
        ? "ready_to_publish"
        : !site.verified
          ? "install_sdk"
          : "ready_to_scan";
    const nextAction = !hasPolicy
      ? { label: "Create policy", href: `/dashboard/policies/new?websiteId=${site.id}` }
      : !published
        ? { label: "Publish policy", href: `/dashboard/policies/${policyId}#policy-publish` }
        : !site.verified
          ? { label: "Install SDK", href: `/dashboard/websites/${site.id}/installation` }
          : { label: "Run scan", href: `/dashboard/scanner?websiteId=${site.id}` };
    return { ...site, setupStatus, nextAction };
  });

  if (websiteList.length === 0) {
    return (
      <div className="page-wrap flex min-h-[70vh] items-center justify-center p-4 md:p-6 xl:p-10">
        <CreateWebsiteForm cancelHref="/dashboard" />
      </div>
    );
  }

  return (
    <div className="page-wrap p-4 md:p-6 xl:p-10">
      <WebsiteList websites={websiteList} />
    </div>
  );
}
