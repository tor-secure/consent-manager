import { headers } from "next/headers";
import { and, eq, inArray, isNull } from "drizzle-orm";

import { db } from "@/db";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { DevelopersShell } from "@/components/developers/developers-shell";
import {
  SnippetInstallationPanel,
  type SnippetInstallWebsite,
} from "@/components/sdk/snippet-installation-panel";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { buildInstallStackSnippets } from "@/lib/sdk/install-snippets";
import { publicOriginFromRequestHeaders } from "@/lib/sdk/public-origin";

export default async function DevelopersInstallSdkPage({
  searchParams,
}: {
  searchParams: Promise<{ websiteId?: string }>;
}) {
  const { organization: localOrg } = await requireDashboardContext();
  const { websiteId: requestedWebsiteId } = await searchParams;
  const h = await headers();
  const appOrigin = publicOriginFromRequestHeaders(h);

  const siteRows = await db
    .select({
      id: websites.id,
      name: websites.name,
      domain: websites.domain,
      siteKey: websites.siteKey,
      verified: websites.verified,
    })
    .from(websites)
    .where(and(eq(websites.organizationId, localOrg.id), isNull(websites.deletedAt)))
    .orderBy(websites.name);

  const selected =
    siteRows.find((site) => site.id === requestedWebsiteId) ?? siteRows[0] ?? null;

  const siteIds = siteRows.map((site) => site.id);
  const publishedRows =
    siteIds.length === 0
      ? []
      : await db
          .select({ websiteId: consentPolicies.websiteId })
          .from(consentPolicies)
          .innerJoin(
            consentPolicyVersions,
            and(
              eq(consentPolicyVersions.policyId, consentPolicies.id),
              eq(consentPolicyVersions.isPublished, true),
            ),
          )
          .where(inArray(consentPolicies.websiteId, siteIds));

  const publishedSites = new Set(publishedRows.map((row) => row.websiteId));

  const websitesForPanel: SnippetInstallWebsite[] = siteRows.map((site) => ({
    id: site.id,
    name: site.name,
    domain: site.domain,
    siteKey: site.siteKey,
    verified: Boolean(site.verified),
    hasPublishedPolicy: publishedSites.has(site.id),
  }));

  const snippets = selected
    ? buildInstallStackSnippets({
        siteKey: selected.siteKey,
        cdnUrl: `${appOrigin}/api/sdk/script`,
      })
    : { html: "", react: "", nextjs: "", php: "", dotnet: "" };

  return (
    <DevelopersShell
      pathname="/dashboard/developers/install"
      title="Install SDK"
      description="Connect a website with the Consent Guru snippet, then verify the published config."
    >
      {websitesForPanel.length === 0 || !selected ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              title="No websites yet"
              description="Add a website first, publish a policy, then copy the SDK snippet."
              actionLabel="Add a website"
              actionHref="/dashboard/websites/new"
            />
          </CardContent>
        </Card>
      ) : (
        <SnippetInstallationPanel
          websites={websitesForPanel}
          selectedWebsiteId={selected.id}
          snippets={snippets}
        />
      )}
    </DevelopersShell>
  );
}
