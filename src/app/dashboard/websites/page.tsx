import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
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

  const websiteList: WebsiteRow[] = rows;

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
