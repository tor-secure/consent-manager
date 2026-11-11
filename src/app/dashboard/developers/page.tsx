import Link from "next/link";
import { headers } from "next/headers";
import { desc, and, inArray, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { apiKeys } from "@/db/schema/api-keys";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { webhookEndpoints } from "@/db/schema/webhook-endpoints";
import {
  DevelopersQuickLink,
  DevelopersShell,
  DevelopersStat,
} from "@/components/developers/developers-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeaderLink } from "@/components/ui/page-header";
import { publicOriginFromRequestHeaders } from "@/lib/sdk/public-origin";

export default async function DevelopersPage() {
  const { organization: localOrg } = await requireDashboardContext();
  const h = await headers();
  const appOrigin = publicOriginFromRequestHeaders(h);

  const [rows, siteRows, webhookRows] = await Promise.all([
    db
      .select({
        id: apiKeys.id,
        status: apiKeys.status,
        environment: apiKeys.environment,
        lastUsedAt: apiKeys.lastUsedAt,
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
      .where(and(eq(websites.organizationId, localOrg.id), isNull(websites.deletedAt)))
      .orderBy(websites.name),
    db
      .select({ id: webhookEndpoints.id, status: webhookEndpoints.status })
      .from(webhookEndpoints)
      .where(eq(webhookEndpoints.organizationId, localOrg.id)),
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
  const activeKeys = rows.filter((k) => k.status === "active").length;
  const liveKeys = rows.filter((k) => k.status === "active" && k.environment === "live").length;
  const activeWebhooks = webhookRows.filter((w) => w.status === "active").length;
  const publishedCount = siteRows.filter((s) => publishedSites.has(s.id)).length;

  return (
    <DevelopersShell
      pathname="/dashboard/developers"
      title="Developer hub"
      description="Install the CMP, create API keys, sync signed-in preferences, and deliver webhooks — without putting secrets in the browser."
      action={<PageHeaderLink href="/dashboard/developers/api-keys">Create API key</PageHeaderLink>}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DevelopersStat label="Active API keys" value={activeKeys} hint={`${liveKeys} live`} />
        <DevelopersStat
          label="Websites"
          value={siteRows.length}
          hint={`${publishedCount} with published policy`}
        />
        <DevelopersStat label="Active webhooks" value={activeWebhooks} />
        <DevelopersStat
          label="API base"
          value="v1"
          hint={appOrigin.replace(/^https?:\/\//, "")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DevelopersQuickLink
          href="/dashboard/developers/install"
          title="Install SDK"
          description="Step-by-step embed snippet, signed-in bridge, and preference sync receiver guide."
          meta="Guest banner · subject bridge · preference sync"
        />
        <DevelopersQuickLink
          href="/dashboard/developers/api-keys"
          title="API keys"
          description="Generate live or test secrets for server-side Consent Guru calls."
          meta="Scopes: consent:subject · consent:evaluate · data:redact"
        />
        <DevelopersQuickLink
          href="/dashboard/developers/api"
          title="API reference"
          description="Subject sessions, logout, evaluate, and redaction endpoints with copyable examples."
          meta="Bearer authentication"
        />
        <DevelopersQuickLink
          href="/dashboard/developers/webhooks"
          title="Webhooks"
          description="Push consent and rights events to your own HTTPS endpoints with signed payloads."
          meta="X-CMP-Signature verification"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle>Website installation</CardTitle>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Publish a policy, then open the install guide for snippets and optional signed-in sync.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link href="/dashboard/developers/install" className="btn btn-outline btn-sm">
              Install guide
            </Link>
            <Link href="/dashboard/websites/new" className="btn btn-outline btn-sm">
              Add website
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {siteRows.length === 0 ? (
            <EmptyState
              title="No websites yet"
              description="Add a website first, publish a policy, then copy the SDK snippet."
              actionLabel="Add a website"
              actionHref="/dashboard/websites/new"
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                    {["Website", "Policy", "Verification", "Site key", ""].map((heading) => (
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
                    <tr key={site.id} className="hover:bg-[var(--muted)]/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--foreground)]">{site.name}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{site.domain}</p>
                      </td>
                      <td className="px-4 py-3">
                        {publishedSites.has(site.id) ? (
                          <Badge variant="success" size="sm">
                            Published
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm">
                            Draft only
                          </Badge>
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
                        {site.siteKey.slice(0, 14)}…
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/developers/install?websiteId=${site.id}`}
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recommended path</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3 text-sm text-[var(--muted-foreground)]">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-semibold text-[var(--foreground)]">
                  1
                </span>
                <span>
                  Install the guest SDK from a website&apos;s{" "}
                  <strong className="font-medium text-[var(--foreground)]">Installation</strong> page.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-semibold text-[var(--foreground)]">
                  2
                </span>
                <span>
                  Create an API key and store it as{" "}
                  <code className="rounded bg-[var(--muted)] px-1 font-mono text-xs text-[var(--foreground)]">
                    CONSENT_GURU_API_KEY
                  </code>{" "}
                  on your server.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-semibold text-[var(--foreground)]">
                  3
                </span>
                <span>
                  For logged-in apps, add the signed-in bridge route + script from Installation Step 4.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--muted)] text-xs font-semibold text-[var(--foreground)]">
                  4
                </span>
                <span>Optionally connect webhooks for consent and rights events.</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security defaults</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
            <p>
              API keys never belong in the browser. Customer sites call your own{" "}
              <code className="rounded bg-[var(--muted)] px-1 font-mono text-xs text-[var(--foreground)]">
                /api/cmp/subject
              </code>{" "}
              route; that route calls Consent Guru with the secret.
            </p>
            <p>
              Subject ownership is{" "}
              <code className="rounded bg-[var(--muted)] px-1 font-mono text-xs text-[var(--foreground)]">
                (websiteId, subjectKey)
              </code>
              . Email is notification metadata only.
            </p>
            <p>
              Revoke compromised keys immediately from{" "}
              <Link
                href="/dashboard/developers/api-keys"
                className="font-medium text-[var(--foreground)] underline underline-offset-2"
              >
                API keys
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </DevelopersShell>
  );
}
