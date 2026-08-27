import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { trackers } from "@/db/schema/trackers";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import { categoriseTrackers, type TrackerRule } from "@/lib/sdk/enforcement";

// ---------------------------------------------------------------------------
// Badge helpers
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    cookie: "bg-amber-50 text-amber-700",
    pixel: "bg-blue-50 text-blue-700",
    script: "bg-purple-50 text-purple-700",
    beacon: "bg-pink-50 text-pink-700",
    fingerprint: "bg-red-50 text-red-700",
    storage: "bg-teal-50 text-teal-700",
    other: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[type] ?? styles.other}`}>
      {type}
    </span>
  );
}

function EnforcementBadge({ label, color }: { label: string; color: "green" | "amber" | "red" | "neutral" }) {
  const styles = {
    green: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-600/20",
    red: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
    neutral: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[color]}`}>
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TrackerTable — shared table component
// ---------------------------------------------------------------------------

function TrackerTable({
  rules,
  purposeMap,
  vendorMap,
}: {
  rules: TrackerRule[];
  purposeMap: Map<string, string>;
  vendorMap: Map<string, string>;
}) {
  if (rules.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-5 py-6 text-center">
        <p className="text-sm text-neutral-400">None.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full divide-y text-sm">
        <thead>
          <tr className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
            <th className="px-4 py-3">Tracker</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Domain / Identifier</th>
            <th className="px-4 py-3">Required purpose</th>
            <th className="px-4 py-3">Vendor</th>
            <th className="px-4 py-3">Enforcement</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rules.map((rule) => (
            <tr key={rule.id} className="hover:bg-neutral-50">
              <td className="px-4 py-3 font-medium text-neutral-900">{rule.name}</td>
              <td className="px-4 py-3"><TypeBadge type={rule.type} /></td>
              <td className="px-4 py-3 text-neutral-500">
                {rule.domain && <p className="font-mono text-xs">{rule.domain}</p>}
                {rule.identifier && (
                  <p className="mt-0.5 max-w-[200px] truncate font-mono text-xs text-neutral-400">
                    {rule.identifier}
                  </p>
                )}
                {!rule.domain && !rule.identifier && <span className="text-neutral-300">—</span>}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {rule.purposeKey ? (
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">
                    {rule.purposeKey}
                  </code>
                ) : rule.purposeId ? (
                  <span className="text-xs text-neutral-400">
                    {purposeMap.get(rule.purposeId) ?? rule.purposeId.slice(0, 8)}
                  </span>
                ) : (
                  <span className="text-neutral-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-neutral-600">
                {rule.vendorId ? (
                  vendorMap.get(rule.vendorId) ?? <span className="text-neutral-400 text-xs">{rule.vendorId.slice(0, 8)}</span>
                ) : (
                  <span className="text-neutral-300">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                {rule.isEssential ? (
                  <EnforcementBadge label="Always allowed" color="green" />
                ) : rule.purposeId || rule.vendorId ? (
                  <EnforcementBadge label="Blocked until consent" color="amber" />
                ) : (
                  <EnforcementBadge label="Always blocked" color="red" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — server component
// ---------------------------------------------------------------------------

export default async function EnforcementPage({
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

  const [website] = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain, siteKey: websites.siteKey })
    .from(websites)
    .where(and(eq(websites.id, id), eq(websites.organizationId, localOrg.id)))
    .limit(1);

  if (!website) notFound();

  // Fetch all active trackers for this website.
  const trackerRows = await db
    .select({
      id: trackers.id,
      name: trackers.name,
      type: trackers.type,
      domain: trackers.domain,
      identifier: trackers.identifier,
      purposeId: trackers.purposeId,
      vendorId: trackers.vendorId,
      isEssential: trackers.isEssential,
      status: trackers.status,
    })
    .from(trackers)
    .where(and(eq(trackers.websiteId, website.id), eq(trackers.status, "active")))
    .orderBy(trackers.name);

  // Resolve purpose keys and vendor names in bulk.
  const purposeIds = [...new Set(trackerRows.map((t) => t.purposeId).filter(Boolean) as string[])];
  const vendorIds = [...new Set(trackerRows.map((t) => t.vendorId).filter(Boolean) as string[])];

  const [purposeRows, vendorRows] = await Promise.all([
    purposeIds.length > 0
      ? db.select({ id: purposes.id, key: purposes.key, name: purposes.name }).from(purposes).where(inArray(purposes.id, purposeIds))
      : Promise.resolve([]),
    vendorIds.length > 0
      ? db.select({ id: vendors.id, name: vendors.name }).from(vendors).where(inArray(vendors.id, vendorIds))
      : Promise.resolve([]),
  ]);

  const purposeKeyMap = new Map(purposeRows.map((p) => [p.id, p.key]));
  const purposeNameMap = new Map(purposeRows.map((p) => [p.id, p.name]));
  const vendorMap = new Map(vendorRows.map((v) => [v.id, v.name]));

  const rules: TrackerRule[] = trackerRows.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type as TrackerRule["type"],
    domain: t.domain,
    identifier: t.identifier,
    purposeKey: t.purposeId ? (purposeKeyMap.get(t.purposeId) ?? null) : null,
    purposeId: t.purposeId,
    vendorId: t.vendorId,
    isEssential: t.isEssential,
    status: t.status,
  }));

  const { essential, consentRequired, unclassified } = categoriseTrackers(rules);

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/dashboard/websites" className="hover:text-neutral-900">Websites</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/dashboard/websites/${website.id}`} className="hover:text-neutral-900">{website.name}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-900">Enforcement</span>
      </nav>

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Tracker Enforcement</h1>
          <p className="mt-1 text-sm text-neutral-500">
            How the CMP SDK enforces consent for trackers on{" "}
            <span className="font-medium text-neutral-700">{website.domain}</span>.
          </p>
        </div>
        <Link
          href={`/dashboard/websites/${website.id}/installation`}
          className="shrink-0 rounded-md border bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Installation guide
        </Link>
      </div>

      {/* Summary */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-neutral-500">Always allowed</p>
          <p className="mt-1 text-2xl font-semibold text-green-700">{essential.length}</p>
          <p className="mt-0.5 text-xs text-neutral-400">Essential trackers</p>
        </div>
        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-neutral-500">Blocked until consent</p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">{consentRequired.length}</p>
          <p className="mt-0.5 text-xs text-neutral-400">Require a purpose or vendor grant</p>
        </div>
        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-neutral-500">Always blocked</p>
          <p className="mt-1 text-2xl font-semibold text-red-700">{unclassified.length}</p>
          <p className="mt-0.5 text-xs text-neutral-400">No purpose or vendor assigned</p>
        </div>
      </div>

      {rules.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">No trackers configured yet</p>
          <p className="mt-1 text-sm text-neutral-400">
            Add trackers manually or run a scan to detect them.
          </p>
          <Link href="/dashboard/trackers" className="mt-5 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
            Go to Trackers
          </Link>
        </div>
      )}

      {rules.length > 0 && (
        <div className="space-y-8">
          {/* Consent-required */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              Blocked until consent ({consentRequired.length})
            </h2>
            <p className="mb-3 text-sm text-neutral-500">
              These trackers are blocked by the SDK until the visitor grants the
              required purpose or vendor consent.
            </p>
            <TrackerTable rules={consentRequired} purposeMap={purposeNameMap} vendorMap={vendorMap} />
          </section>

          {/* Unclassified — always blocked */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              Always blocked — unclassified ({unclassified.length})
            </h2>
            <p className="mb-3 text-sm text-neutral-500">
              These trackers have no purpose or vendor assigned and are always
              blocked. Assign a purpose to make them consent-controlled.
            </p>
            <TrackerTable rules={unclassified} purposeMap={purposeNameMap} vendorMap={vendorMap} />
          </section>

          {/* Essential */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-neutral-900">
              Always allowed — essential ({essential.length})
            </h2>
            <p className="mb-3 text-sm text-neutral-500">
              Essential trackers are never blocked regardless of consent state.
            </p>
            <TrackerTable rules={essential} purposeMap={purposeNameMap} vendorMap={vendorMap} />
          </section>
        </div>
      )}
    </div>
  );
}
