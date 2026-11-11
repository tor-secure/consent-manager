import Link from "next/link";
import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { requireTenantWebsite } from "@/lib/tenant-website";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { SdkInstallationGuide } from "@/components/sdk/sdk-installation-guide";
import { publicOriginFromRequestHeaders } from "@/lib/sdk/public-origin";
import { PageHeader } from "@/components/ui/page-header";

export default async function InstallationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const website = await requireTenantWebsite(id);

  const [activePolicy] = await db
    .select({ id: consentPolicies.id, name: consentPolicies.name })
    .from(consentPolicies)
    .where(
      and(eq(consentPolicies.websiteId, website.id), eq(consentPolicies.status, "active")),
    )
    .limit(1);

  const [publishedPolicy] = await db
    .select({
      id: consentPolicies.id,
      name: consentPolicies.name,
      version: consentPolicyVersions.version,
    })
    .from(consentPolicyVersions)
    .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
    .where(
      and(
        eq(consentPolicies.websiteId, website.id),
        eq(consentPolicyVersions.isPublished, true),
      ),
    )
    .limit(1);

  const h = await headers();
  const appOrigin = publicOriginFromRequestHeaders(h);

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/dashboard/websites" className="transition hover:text-[var(--foreground)]">
          Websites
        </Link>
        <span className="text-[var(--border)]" aria-hidden="true">
          /
        </span>
        <Link
          href={`/dashboard/websites/${website.id}`}
          className="transition hover:text-[var(--foreground)]"
        >
          {website.name}
        </Link>
        <span className="text-[var(--border)]" aria-hidden="true">
          /
        </span>
        <span className="text-[var(--foreground)]">Installation</span>
      </nav>

      <PageHeader
        title="SDK Installation"
        description={
          <>
            Add the CMP banner to{" "}
            <span className="font-medium text-[var(--foreground)]">{website.domain}</span> using the
            snippet below. Same guide also lives under{" "}
            <Link
              href={`/dashboard/developers/install?websiteId=${website.id}`}
              className="font-medium text-[var(--primary)] underline underline-offset-2"
            >
              Developers → Install SDK
            </Link>
            .
          </>
        }
      />

      <SdkInstallationGuide
        website={{
          id: website.id,
          name: website.name,
          domain: website.domain,
          siteKey: website.siteKey,
        }}
        appOrigin={appOrigin}
        activePolicy={activePolicy ?? null}
        publishedPolicy={publishedPolicy ?? null}
      />
    </div>
  );
}
