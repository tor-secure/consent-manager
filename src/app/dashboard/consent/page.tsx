import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentPolicies } from "@/db/schema/consent-policies";
import { ConsentRecordsWorkspace } from "@/components/consent/consent-records-workspace";
import { ConsentRecordFade, ConsentRecordMotion } from "@/components/consent/record-fade";
import { parseRecordListQuery } from "@/lib/consent/record-list-params";
import {
  loadConsentRecordFilterOptions,
  loadConsentRecordPage,
  loadConsentRecordPurposes,
  loadConsentRecordsDashboardStats,
} from "@/lib/consent/record-list";
import { EmptyState } from "@/components/ui/empty-state";

export default async function ConsentRecordsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    website?: string;
    policy?: string;
    jurisdiction?: string;
    source?: string;
    from?: string;
    to?: string;
    sort?: string;
    dir?: string;
    page?: string;
    size?: string;
  }>;
}) {
  const listQuery = parseRecordListQuery(await searchParams);
  const { organization: localOrg } = await requireDashboardContext();

  const [orgWebsites, countRows, publishedPolicyRows, recordPage, filterOptions, stats] =
    await Promise.all([
      db
        .select({
          id: websites.id,
          name: websites.name,
          domain: websites.domain,
          deletedAt: websites.deletedAt,
        })
        .from(websites)
        .where(eq(websites.organizationId, localOrg.id)),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(consentRecords)
        .where(eq(consentRecords.organizationId, localOrg.id)),
      db
        .select({ id: consentPolicyVersions.id })
        .from(consentPolicyVersions)
        .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
        .innerJoin(websites, eq(consentPolicies.websiteId, websites.id))
        .where(
          and(
            eq(websites.organizationId, localOrg.id),
            eq(consentPolicyVersions.isPublished, true),
          ),
        )
        .limit(1),
      loadConsentRecordPage(localOrg.id, listQuery),
      loadConsentRecordFilterOptions(localOrg.id),
      loadConsentRecordsDashboardStats(localOrg.id),
    ]);

  const websiteIds = orgWebsites.map((w) => w.id);
  const siteOptions = orgWebsites
    .filter((site) => site.deletedAt == null)
    .sort((a, b) => a.name.localeCompare(b.name) || a.domain.localeCompare(b.domain));

  const purposeMap = await loadConsentRecordPurposes(
    localOrg.id,
    recordPage.rows.map((row) => row.id),
  );
  const records = recordPage.rows.map((row) => ({
    ...row,
    purposes: purposeMap.get(row.id) ?? [],
  }));
  const total = Number(countRows[0]?.total ?? 0);

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      {websiteIds.length === 0 ? (
        <EmptyState
          title="No websites yet"
          description="Add a website to start collecting consent records."
          actionLabel="Add a website"
          actionHref="/dashboard/websites/new"
        />
      ) : null}

      {websiteIds.length > 0 && total === 0 ? (
        <EmptyState
          title="No consent records yet"
          description={
            publishedPolicyRows.length > 0
              ? "A policy is published. Install the SDK so visitors can see the banner and leave a record."
              : "Publish a policy, then install the SDK. Records appear after a visitor makes a choice."
          }
          actionLabel={publishedPolicyRows.length > 0 ? "Install SDK" : "Review and publish"}
          actionHref={
            publishedPolicyRows.length > 0
              ? `/dashboard/websites/${orgWebsites[0].id}/installation`
              : "/dashboard/policies"
          }
        />
      ) : null}

      {total > 0 ? (
        <ConsentRecordMotion>
          <ConsentRecordFade>
            <ConsentRecordsWorkspace
              query={listQuery}
              records={records}
              filteredTotal={recordPage.total}
              stats={stats}
              websites={siteOptions}
              policies={filterOptions.policies}
              jurisdictions={filterOptions.jurisdictions}
            />
          </ConsentRecordFade>
        </ConsentRecordMotion>
      ) : null}
    </div>
  );
}
