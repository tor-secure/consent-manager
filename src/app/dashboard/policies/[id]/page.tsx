import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { purposes } from "@/db/schema/purposes";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { vendors } from "@/db/schema/vendors";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import {
  PolicyPurposesPanel,
  type PurposeSummary,
} from "@/components/policies/policy-purposes-panel";
import {
  PolicyVendorsPanel,
  type PolicyVendor,
} from "@/components/policies/policy-vendors-panel";
import { BannerConfigForm } from "@/components/policies/banner-config-form";
import { parseBannerConfig } from "@/lib/banner-config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function PolicyStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/20",
    active: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
    archived: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20",
  };
  const labels: Record<string, string> = {
    draft: "Draft",
    active: "Active",
    archived: "Archived",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.draft}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function VersionStatusBadge({ status, isPublished }: { status: string; isPublished: boolean }) {
  if (isPublished) {
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-green-600/20">
        Published
      </span>
    );
  }
  const styles: Record<string, string> = {
    draft: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/20",
    archived: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.draft}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-neutral-900">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — server component
// Tenant isolation: policy is accessed through website → org.
// ---------------------------------------------------------------------------

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  // Fetch all org website IDs to scope the policy lookup.
  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id));

  const websiteIds = orgWebsites.map((w) => w.id);

  if (websiteIds.length === 0) notFound();

  // Fetch policy — must belong to one of this org's websites.
  const [policy] = await db
    .select()
    .from(consentPolicies)
    .where(
      and(
        eq(consentPolicies.id, id),
        inArray(consentPolicies.websiteId, websiteIds),
      ),
    )
    .limit(1);

  if (!policy) notFound();

  const website = orgWebsites.find((w) => w.id === policy.websiteId);

  // Fetch all versions for this policy, ordered ascending.
  const versions = await db
    .select()
    .from(consentPolicyVersions)
    .where(eq(consentPolicyVersions.policyId, policy.id))
    .orderBy(consentPolicyVersions.version);

  const latestVersion = versions[versions.length - 1] ?? null;

  // ---------------------------------------------------------------------------
  // Purposes: fetch all org purposes + which are attached to the latest version
  // ---------------------------------------------------------------------------

  const [orgPurposes, attachedLinks] = await Promise.all([
    db
      .select({
        id: purposes.id,
        key: purposes.key,
        name: purposes.name,
        description: purposes.description,
        isRequired: purposes.isRequired,
        status: purposes.status,
      })
      .from(purposes)
      .where(eq(purposes.organizationId, localOrg.id))
      .orderBy(purposes.name),

    latestVersion
      ? db
          .select({ purposeId: policyPurposes.purposeId })
          .from(policyPurposes)
          .where(eq(policyPurposes.policyVersionId, latestVersion.id))
      : Promise.resolve([]),
  ]);

  const attachedIds = new Set(attachedLinks.map((l) => l.purposeId));

  const attachedPurposes: PurposeSummary[] = orgPurposes.filter((p) =>
    attachedIds.has(p.id),
  );
  const availablePurposes: PurposeSummary[] = orgPurposes.filter(
    (p) => !attachedIds.has(p.id),
  );

  // ---------------------------------------------------------------------------
  // Vendors: find vendors linked to the policy's attached purposes
  // vendor_purposes joins vendorId ↔ purposeId — vendors relevant to this
  // policy are those whose purposes intersect with the policy version's purposes.
  // ---------------------------------------------------------------------------

  const attachedPurposeIds = [...attachedIds];

  const policyVendors: PolicyVendor[] = [];

  if (attachedPurposeIds.length > 0) {
    // Fetch vendor_purposes links for the attached purposes.
    const vpLinks = await db
      .select({
        vendorId: vendorPurposes.vendorId,
        purposeId: vendorPurposes.purposeId,
      })
      .from(vendorPurposes)
      .where(inArray(vendorPurposes.purposeId, attachedPurposeIds));

    if (vpLinks.length > 0) {
      const vendorIds = [...new Set(vpLinks.map((l) => l.vendorId))];

      // Fetch vendor details — filter to this org's vendors only.
      const vendorRows = await db
        .select({
          id: vendors.id,
          name: vendors.name,
          key: vendors.key,
          domain: vendors.domain,
          country: vendors.country,
          privacyPolicyUrl: vendors.privacyPolicyUrl,
          source: vendors.source,
          status: vendors.status,
          organizationId: vendors.organizationId,
        })
        .from(vendors)
        .where(
          and(
            inArray(vendors.id, vendorIds),
            eq(vendors.organizationId, localOrg.id),
          ),
        )
        .orderBy(vendors.name);

      // Build purposeId → purposeName map for the attached purposes.
      const purposeNameMap = new Map(
        orgPurposes
          .filter((p) => attachedIds.has(p.id))
          .map((p) => [p.id, p.name]),
      );

      // Build vendorId → [purposeName] map from vpLinks.
      const vendorPurposeNames = new Map<string, string[]>();
      for (const link of vpLinks) {
        const pName = purposeNameMap.get(link.purposeId);
        if (!pName) continue;
        const existing = vendorPurposeNames.get(link.vendorId) ?? [];
        existing.push(pName);
        vendorPurposeNames.set(link.vendorId, existing);
      }

      for (const v of vendorRows) {
        policyVendors.push({
          id: v.id,
          name: v.name,
          key: v.key,
          domain: v.domain,
          country: v.country,
          privacyPolicyUrl: v.privacyPolicyUrl,
          source: v.source,
          status: v.status,
          purposeNames: vendorPurposeNames.get(v.id) ?? [],
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

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
        <span className="text-neutral-900">{policy.name}</span>
      </nav>

      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-neutral-900">
              {policy.name}
            </h1>
            <PolicyStatusBadge status={policy.status} />
            {policy.isDefault && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20">
                Default
              </span>
            )}
          </div>

          {policy.description && (
            <p className="mt-1 text-sm text-neutral-500">
              {policy.description}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Policy overview */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-neutral-900">
            Policy details
          </h2>
          <dl className="divide-y">
            <InfoRow
              label="Website"
              value={
                website ? (
                  <Link
                    href={`/dashboard/websites/${website.id}`}
                    className="text-neutral-900 hover:underline"
                  >
                    {website.name}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <InfoRow label="Status" value={<PolicyStatusBadge status={policy.status} />} />
            <InfoRow
              label="Default policy"
              value={
                policy.isDefault ? (
                  <span className="text-neutral-700">Yes</span>
                ) : (
                  <span className="text-neutral-400">No</span>
                )
              }
            />
            <InfoRow
              label="Current version"
              value={
                latestVersion
                  ? `v${latestVersion.version}`
                  : "—"
              }
            />
            <InfoRow
              label="Created"
              value={policy.createdAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
            <InfoRow
              label="Last updated"
              value={policy.updatedAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
          </dl>
        </div>

        {/* Versions table */}
        <div className="rounded-lg border bg-white p-6">
          <h2 className="mb-4 text-base font-semibold text-neutral-900">
            Versions
          </h2>

          {versions.length === 0 ? (
            <div className="rounded-md border border-dashed px-5 py-8 text-center">
              <p className="text-sm text-neutral-400">No versions yet</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border">
              <table className="min-w-full divide-y text-sm">
                <thead className="bg-neutral-50 text-xs font-medium uppercase tracking-wider text-neutral-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Version</th>
                    <th className="px-4 py-2.5 text-left">Status</th>
                    <th className="px-4 py-2.5 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {versions.map((v) => (
                    <tr key={v.id} className="hover:bg-neutral-50">
                      <td className="px-4 py-2.5 font-medium text-neutral-900">
                        v{v.version}
                      </td>
                      <td className="px-4 py-2.5">
                        <VersionStatusBadge
                          status={v.status}
                          isPublished={v.isPublished}
                        />
                      </td>
                      <td className="px-4 py-2.5 text-neutral-500">
                        {v.createdAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Future: publishing */}
          <div className="mt-4 rounded-md border border-dashed px-4 py-5 text-center">
            <p className="text-xs text-neutral-400">
              Publishing coming soon.
            </p>
          </div>
        </div>

        {/* Purposes — real attach/detach panel */}
        <PolicyPurposesPanel
          policyId={policy.id}
          attached={attachedPurposes}
          available={availablePurposes}
          latestVersionId={latestVersion?.id ?? null}
        />

        {/* Vendors — derived from attached purposes */}
        <PolicyVendorsPanel
          vendors={policyVendors}
          policyId={policy.id}
          latestVersionId={latestVersion?.id ?? null}
        />

        {/* Banner configuration — full-width, spans both columns */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border bg-white p-6">
            <div className="mb-6">
              <h2 className="text-base font-semibold text-neutral-900">
                Banner configuration
              </h2>
              <p className="mt-0.5 text-sm text-neutral-500">
                Configure the consent banner title, text, controls, appearance,
                and behavior. Changes are saved as a draft to version{" "}
                {latestVersion ? `v${latestVersion.version}` : "—"}.
              </p>
            </div>
            <BannerConfigForm
              policyId={policy.id}
              initialConfig={parseBannerConfig(
                (latestVersion?.configuration ?? {}) as Record<string, unknown>,
              )}
              latestVersionId={latestVersion?.id ?? null}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
