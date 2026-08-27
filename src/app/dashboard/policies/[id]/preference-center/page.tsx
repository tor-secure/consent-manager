import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { purposes } from "@/db/schema/purposes";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { vendors } from "@/db/schema/vendors";
import { parseBannerConfig } from "@/lib/banner-config";
import {
  PreferenceCenter,
  type PCPurpose,
  type PCVendor,
} from "@/components/consent/preference-center";

// Auth + bootstrap guaranteed by the dashboard layout.
// This page lets org users preview the preference center for a policy.
export default async function PreferenceCenterPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: policyId } = await params;
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  // Verify policy belongs to this org (through websites).
  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id));

  const websiteIds = orgWebsites.map((w) => w.id);
  if (websiteIds.length === 0) notFound();

  const [policy] = await db
    .select({ id: consentPolicies.id, name: consentPolicies.name, websiteId: consentPolicies.websiteId })
    .from(consentPolicies)
    .where(
      and(
        eq(consentPolicies.id, policyId),
        inArray(consentPolicies.websiteId, websiteIds),
      ),
    )
    .limit(1);

  if (!policy) notFound();

  // Get latest version.
  const allVersions = await db
    .select()
    .from(consentPolicyVersions)
    .where(eq(consentPolicyVersions.policyId, policy.id))
    .orderBy(consentPolicyVersions.version);

  const latestVersion = allVersions[allVersions.length - 1] ?? null;
  if (!latestVersion) notFound();

  const bannerConfig = parseBannerConfig(
    latestVersion.configuration as Record<string, unknown>,
  );

  // Purposes for this version.
  const versionPurposes = await db
    .select({
      id: purposes.id,
      key: purposes.key,
      name: purposes.name,
      description: purposes.description,
      isRequired: purposes.isRequired,
    })
    .from(policyPurposes)
    .innerJoin(purposes, eq(policyPurposes.purposeId, purposes.id))
    .where(eq(policyPurposes.policyVersionId, latestVersion.id))
    .orderBy(purposes.name);

  // Vendors linked to attached purposes.
  const purposeIds = versionPurposes.map((p) => p.id);
  const vpLinks =
    purposeIds.length > 0
      ? await db
          .select({ vendorId: vendorPurposes.vendorId })
          .from(vendorPurposes)
          .where(inArray(vendorPurposes.purposeId, purposeIds))
      : [];

  const vendorIds = [...new Set(vpLinks.map((v) => v.vendorId))];
  const versionVendors =
    vendorIds.length > 0
      ? await db
          .select({
            id: vendors.id,
            name: vendors.name,
            domain: vendors.domain,
            privacyPolicyUrl: vendors.privacyPolicyUrl,
          })
          .from(vendors)
          .where(inArray(vendors.id, vendorIds))
          .orderBy(vendors.name)
      : [];

  const pcPurposes: PCPurpose[] = versionPurposes;
  const pcVendors: PCVendor[] = versionVendors;

  const website = orgWebsites.find((w) => w.id === policy.websiteId);

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-2 text-sm text-neutral-500"
      >
        <Link href="/dashboard/policies" className="hover:text-neutral-900">
          Policies
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/dashboard/policies/${policy.id}`}
          className="hover:text-neutral-900"
        >
          {policy.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-900">Preference Center</span>
      </nav>

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Preference Center Preview
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          This is how the preference center will appear to visitors of{" "}
          <span className="font-medium text-neutral-700">
            {website?.name ?? "this website"}
          </span>
          {" "}using policy version v{latestVersion.version}
          {latestVersion.isPublished ? " (published)" : " (draft)"}.
        </p>
      </div>

      {/* Preview notice */}
      <div className="mb-6 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <strong>Preview mode:</strong> Submitting here will create a real consent
        record scoped to this website. Use this to test the flow end-to-end.
      </div>

      {/* Preference Center */}
      <PreferenceCenter
        websiteId={policy.websiteId}
        policyVersionId={latestVersion.id}
        bannerConfig={bannerConfig}
        purposes={pcPurposes}
        vendors={pcVendors}
      />
    </div>
  );
}
