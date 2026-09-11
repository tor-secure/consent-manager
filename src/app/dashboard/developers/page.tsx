import Link from "next/link";
import { desc, and, inArray, eq } from "drizzle-orm";

import { db } from "@/db";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { apiKeys } from "@/db/schema/api-keys";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { ApiKeyManager, type ApiKeyRow } from "@/components/api-keys/api-key-manager";
import { SectionEyebrow } from "@/components/dashboard/section-eyebrow";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

export default async function DevelopersPage() {
  const { organization: localOrg } = await requireDashboardContext();

  const [rows, siteRows] = await Promise.all([
    db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        keyPrefix: apiKeys.keyPrefix,
        environment: apiKeys.environment,
        status: apiKeys.status,
        lastUsedAt: apiKeys.lastUsedAt,
        expiresAt: apiKeys.expiresAt,
        revokedAt: apiKeys.revokedAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.organizationId, localOrg.id))
      .orderBy(desc(apiKeys.createdAt)),
    db
      .select({
        id: websites.id,
        name: websites.name,
        domain: websites.domain,
        siteKey: websites.siteKey,
        verified: websites.verified,
        verifiedAt: websites.verifiedAt,
      })
      .from(websites)
      .where(eq(websites.organizationId, localOrg.id))
      .orderBy(websites.name),
  ]);

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
  const keyList: ApiKeyRow[] = rows;
  const activeCount = rows.filter((k) => k.status === "active").length;

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        eyebrow={<SectionEyebrow href="/dashboard/developer">Developer</SectionEyebrow>}
        title="SDK & API keys"
        description="Install the visitor banner on each site, then manage programmatic API keys."
      />

      <Card>
        <CardHeader>
          <CardTitle>Website installation</CardTitle>
          <p className="text-sm text-[var(--muted-foreground)]">
            Publish a policy, then paste the snippet. Verify checks the published config for that site key.
          </p>
        </CardHeader>
        <CardContent>
          {siteRows.length === 0 ? (
            <EmptyState
              title="No websites to install"
              description="Add a website first, then return here for the published status and install snippet."
              actionLabel="Add a website"
              actionHref="/dashboard/websites/new"
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                    {["Website", "Published", "Last verify", "Site key", ""].map((heading) => (
                      <th
                        key={heading || "action"}
                        className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {siteRows.map((site) => (
                    <tr key={site.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--foreground)]">{site.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{site.domain}</p>
                      </td>
                      <td className="px-4 py-3">
                        {publishedSites.has(site.id) ? (
                          <Badge variant="success" size="sm">Published</Badge>
                        ) : (
                          <Badge variant="warning" size="sm">Draft only</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                        {site.verifiedAt
                          ? site.verifiedAt.toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : site.verified
                            ? "Verified"
                            : "Not verified"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                        {site.siteKey.slice(0, 12)}…
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/websites/${site.id}/installation`}
                          className="text-sm font-medium text-[var(--primary)] underline-offset-2 hover:underline"
                        >
                          Install
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PageHeader
        title="API keys"
        description={
          <>
            Manage API keys for programmatic access to the CMP API.{" "}
            {activeCount > 0 && (
              <span className="font-medium text-[var(--foreground)]">
                {activeCount} active key{activeCount !== 1 ? "s" : ""}.
              </span>
            )}
          </>
        }
      />

      <StatusBanner variant="warning">
        <p>
          <strong className="font-semibold">Security reminder:</strong>{" "}
          API keys grant access to your organisation&apos;s data. Keep them secret and never
          commit them to source control. Revoke any key that may have been compromised.
        </p>
      </StatusBanner>

      <ApiKeyManager initialKeys={keyList} />
    </div>
  );
}
