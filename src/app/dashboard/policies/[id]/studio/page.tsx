import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { parseBannerConfig } from "@/lib/banner-config";
import { BannerStudio } from "@/components/policies/banner-studio";

// ---------------------------------------------------------------------------
// The studio page uses the full viewport — suppress the dashboard layout's
// default padding by letting the component manage its own sizing.
// The dashboard layout wraps all /dashboard routes so we can't opt out of it,
// but the BannerStudio component uses `h-screen` and `overflow-hidden` so it
// fills the available space without conflicting.
// ---------------------------------------------------------------------------

export default async function BannerStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: policyId } = await params;
  const { orgId } = await auth();
  if (!orgId) return null;

  // ── Resolve local org ────────────────────────────────────────────────────
  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!organization) return null;

  // ── Scope policy through org websites (tenant isolation) ─────────────────
  const orgWebsites = await db
    .select({ id: websites.id, domain: websites.domain })
    .from(websites)
    .where(eq(websites.organizationId, organization.id));

  const websiteIds = orgWebsites.map((w) => w.id);
  if (websiteIds.length === 0) notFound();

  const [policy] = await db
    .select({
      id: consentPolicies.id,
      name: consentPolicies.name,
      websiteId: consentPolicies.websiteId,
    })
    .from(consentPolicies)
    .where(
      and(
        eq(consentPolicies.id, policyId),
        inArray(consentPolicies.websiteId, websiteIds),
      ),
    )
    .limit(1);

  if (!policy) notFound();

  // ── Resolve website domain for the preview URL ───────────────────────────
  const website = orgWebsites.find((w) => w.id === policy.websiteId);

  // ── Fetch latest policy version + its configuration ───────────────────────
  const allVersions = await db
    .select({
      id: consentPolicyVersions.id,
      version: consentPolicyVersions.version,
      configuration: consentPolicyVersions.configuration,
    })
    .from(consentPolicyVersions)
    .where(eq(consentPolicyVersions.policyId, policy.id))
    .orderBy(consentPolicyVersions.version);

  const latestVersion = allVersions[allVersions.length - 1] ?? null;

  const initialConfig = parseBannerConfig(
    (latestVersion?.configuration ?? {}) as Record<string, unknown>,
  );

  return (
    // The BannerStudio component manages its own full-viewport layout.
    // We render it without extra wrapper padding so it fills the content area.
    <BannerStudio
      policyId={policy.id}
      policyName={policy.name}
      latestVersionId={latestVersion?.id ?? null}
      initialConfig={initialConfig}
      websiteDomain={website?.domain ?? null}
    />
  );
}
