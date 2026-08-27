import { auth } from "@clerk/nextjs/server";
import { eq, desc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentPolicies } from "@/db/schema/consent-policies";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    accepted: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
    rejected: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
    partial: "bg-blue-50 text-blue-700 ring-1 ring-blue-600/20",
    withdrawn: "bg-neutral-100 text-neutral-500 ring-1 ring-neutral-400/20",
    pending: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20",
    active: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[status] ?? styles.pending}`}
    >
      {status}
    </span>
  );
}

function fmt(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Auth + bootstrap guaranteed by the dashboard layout.
export default async function ConsentRecordsPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  // Get org websites to scope records.
  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id));

  const websiteIds = orgWebsites.map((w) => w.id);
  const websiteMap = new Map(orgWebsites.map((w) => [w.id, w]));

  const records =
    websiteIds.length > 0
      ? await db
          .select({
            id: consentRecords.id,
            consentId: consentRecords.consentId,
            websiteId: consentRecords.websiteId,
            policyVersionId: consentRecords.policyVersionId,
            visitorId: consentRecords.visitorId,
            jurisdiction: consentRecords.jurisdiction,
            status: consentRecords.status,
            source: consentRecords.source,
            consentedAt: consentRecords.consentedAt,
            expiresAt: consentRecords.expiresAt,
            withdrawnAt: consentRecords.withdrawnAt,
            createdAt: consentRecords.createdAt,
          })
          .from(consentRecords)
          .where(inArray(consentRecords.websiteId, websiteIds))
          .orderBy(desc(consentRecords.createdAt))
          .limit(200)
      : [];

  // Resolve policy version numbers.
  const versionIds = [...new Set(records.map((r) => r.policyVersionId))];
  const versionRows =
    versionIds.length > 0
      ? await db
          .select({
            id: consentPolicyVersions.id,
            version: consentPolicyVersions.version,
            policyId: consentPolicyVersions.policyId,
          })
          .from(consentPolicyVersions)
          .where(inArray(consentPolicyVersions.id, versionIds))
      : [];

  const policyIds = [...new Set(versionRows.map((v) => v.policyId))];
  const policyRows =
    policyIds.length > 0
      ? await db
          .select({ id: consentPolicies.id, name: consentPolicies.name })
          .from(consentPolicies)
          .where(inArray(consentPolicies.id, policyIds))
      : [];

  const versionMap = new Map(versionRows.map((v) => [v.id, v]));
  const policyMap = new Map(policyRows.map((p) => [p.id, p]));

  // Summary counts.
  const total = records.length;
  const countByStatus = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Consent Records</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Visitor consent records across all your websites.
          {total > 0 && (
            <>
              {" "}
              {total} record{total !== 1 ? "s" : ""}
              {countByStatus.accepted ? ` · ${countByStatus.accepted} accepted` : ""}
              {countByStatus.rejected ? ` · ${countByStatus.rejected} rejected` : ""}
              {countByStatus.withdrawn ? ` · ${countByStatus.withdrawn} withdrawn` : ""}.
            </>
          )}
        </p>
      </div>

      {websiteIds.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">No websites yet</p>
          <p className="mt-1 text-sm text-neutral-400">
            Add a website to start collecting consent records.
          </p>
        </div>
      )}

      {websiteIds.length > 0 && records.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">No consent records yet</p>
          <p className="mt-1 text-sm text-neutral-400">
            Records will appear here as visitors interact with your consent banner.
          </p>
        </div>
      )}

      {records.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full divide-y text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-3">Consent ID</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Policy</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Jurisdiction</th>
                <th className="px-4 py-3">Consented</th>
                <th className="px-4 py-3">Expires</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {records.map((record) => {
                const site = websiteMap.get(record.websiteId);
                const ver = versionMap.get(record.policyVersionId);
                const pol = ver ? policyMap.get(ver.policyId) : null;

                return (
                  <tr key={record.id} className="transition hover:bg-neutral-50">
                    <td className="px-4 py-3">
                      <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-700">
                        {record.consentId.slice(0, 20)}…
                      </code>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      <p>{site?.name ?? "—"}</p>
                      {site?.domain && (
                        <p className="text-xs text-neutral-400">{site.domain}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {pol?.name ?? "—"}
                      {ver && (
                        <span className="ml-1 text-xs text-neutral-400">
                          v{ver.version}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="px-4 py-3 capitalize text-neutral-500">
                      {record.source}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {record.jurisdiction ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {fmt(record.consentedAt)}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      {record.withdrawnAt ? (
                        <span className="text-red-500">
                          Withdrawn {fmt(record.withdrawnAt)}
                        </span>
                      ) : (
                        fmt(record.expiresAt)
                      )}
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
