import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";

// ---------------------------------------------------------------------------
// Shared badge helpers
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
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.draft}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Page — server component, org-scoped
// ---------------------------------------------------------------------------

export default async function PoliciesPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  // Get all websites for this org — policies are scoped through websiteId.
  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id))
    .orderBy(websites.name);

  const websiteIds = orgWebsites.map((w) => w.id);
  const websiteMap = new Map(orgWebsites.map((w) => [w.id, w]));

  // Fetch all policies for this org's websites.
  const policies =
    websiteIds.length > 0
      ? await db
          .select()
          .from(consentPolicies)
          .where(inArray(consentPolicies.websiteId, websiteIds))
          .orderBy(consentPolicies.createdAt)
      : [];

  // Fetch latest version number for each policy.
  const policyIds = policies.map((p) => p.id);
  const versions =
    policyIds.length > 0
      ? await db
          .select({
            policyId: consentPolicyVersions.policyId,
            version: consentPolicyVersions.version,
            isPublished: consentPolicyVersions.isPublished,
          })
          .from(consentPolicyVersions)
          .where(inArray(consentPolicyVersions.policyId, policyIds))
      : [];

  // Build a map: policyId → { latestVersion, hasPublished }
  const versionMap = new Map<
    string,
    { latestVersion: number; hasPublished: boolean }
  >();
  for (const v of versions) {
    const existing = versionMap.get(v.policyId);
    versionMap.set(v.policyId, {
      latestVersion: Math.max(v.version, existing?.latestVersion ?? 0),
      hasPublished: (existing?.hasPublished ?? false) || v.isPublished,
    });
  }

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Consent Policies
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            All consent policies across your websites.
          </p>
        </div>

        {orgWebsites.length > 0 && (
          <Link
            href="/dashboard/policies/new"
            className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Create policy
          </Link>
        )}
      </div>

      {/* No websites at all */}
      {orgWebsites.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">
            No websites yet
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Add a website before creating consent policies.
          </p>
          <Link
            href="/dashboard/websites/new"
            className="mt-5 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Add a website
          </Link>
        </div>
      )}

      {/* Websites exist but no policies */}
      {orgWebsites.length > 0 && policies.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">
            No policies yet
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Create your first consent policy to start collecting visitor
            consent.
          </p>
          <Link
            href="/dashboard/policies/new"
            className="mt-5 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Create policy
          </Link>
        </div>
      )}

      {/* Policy list */}
      {policies.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="min-w-full divide-y text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-5 py-3">Policy</th>
                <th className="px-5 py-3">Website</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Version</th>
                <th className="px-5 py-3">Default</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {policies.map((policy) => {
                const site = websiteMap.get(policy.websiteId);
                const ver = versionMap.get(policy.id);

                return (
                  <tr
                    key={policy.id}
                    className="transition hover:bg-neutral-50"
                  >
                    <td className="px-5 py-3">
                      <Link
                        href={`/dashboard/policies/${policy.id}`}
                        className="font-medium text-neutral-900 hover:underline"
                      >
                        {policy.name}
                      </Link>
                      {policy.description && (
                        <p className="mt-0.5 truncate max-w-xs text-xs text-neutral-400">
                          {policy.description}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      {site ? (
                        <Link
                          href={`/dashboard/websites/${site.id}`}
                          className="hover:underline"
                        >
                          {site.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <PolicyStatusBadge status={policy.status} />
                    </td>
                    <td className="px-5 py-3 text-neutral-600">
                      v{ver?.latestVersion ?? 1}
                      {ver?.hasPublished && (
                        <span className="ml-1.5 text-xs text-green-600">
                          published
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {policy.isDefault ? (
                        <span className="text-xs font-medium text-neutral-700">
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-neutral-500">
                      {policy.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
