import { auth } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentRecords } from "@/db/schema/consent-records";
import { consentPolicies } from "@/db/schema/consent-policies";
import { trackers } from "@/db/schema/trackers";

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <p className="text-sm font-medium text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-neutral-900">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-xs text-neutral-400">{description}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — server component
// Auth + bootstrap guaranteed by dashboard layout.
// ---------------------------------------------------------------------------

export default async function DashboardPage() {
  const { orgId } = await auth();

  // orgId is guaranteed by the layout — narrow type for TypeScript.
  if (!orgId) return null;

  // Resolve the local organization from the active Clerk org.
  const [localOrg] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  // ------------------------------------------------------------------
  // Counts scoped to this organization.
  // websites and consent_records have a direct organizationId column.
  // trackers and consent_policies are scoped through websiteId.
  // ------------------------------------------------------------------

  // 1. Website IDs for this org — used as the scope for tracker/policy counts.
  const orgWebsites = await db
    .select({ id: websites.id })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id));

  const websiteCount = orgWebsites.length;
  const websiteIds = orgWebsites.map((w) => w.id);

  // 2–4. Remaining counts run in parallel.
  const [consentRecordRows, trackerRows, policyRows] = await Promise.all([
    // Consent records — direct organizationId column.
    db
      .select({ id: consentRecords.id })
      .from(consentRecords)
      .where(eq(consentRecords.organizationId, localOrg.id)),

    // Trackers — scoped via websiteId.
    websiteIds.length > 0
      ? db
          .select({ id: trackers.id })
          .from(trackers)
          .where(inArray(trackers.websiteId, websiteIds))
      : Promise.resolve([]),

    // Consent policies — scoped via websiteId.
    websiteIds.length > 0
      ? db
          .select({ id: consentPolicies.id })
          .from(consentPolicies)
          .where(inArray(consentPolicies.websiteId, websiteIds))
      : Promise.resolve([]),
  ]);

  const consentRecordCount = consentRecordRows.length;
  const trackerCount = trackerRows.length;
  const policyCount = policyRows.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">Overview</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {localOrg.name} — organization summary
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Websites"
          value={websiteCount}
          description="Registered websites"
        />
        <StatCard
          label="Consent Policies"
          value={policyCount}
          description="Across all websites"
        />
        <StatCard
          label="Consent Records"
          value={consentRecordCount}
          description="Total visitor consent records"
        />
        <StatCard
          label="Trackers"
          value={trackerCount}
          description="Detected across all websites"
        />
      </div>

      {/* Empty state guidance */}
      {websiteCount === 0 && (
        <div className="mt-10 rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium text-neutral-600">
            No websites yet
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Add your first website to start collecting consent data.
          </p>
          <a
            href="/dashboard/websites/new"
            className="mt-4 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Add a website
          </a>
        </div>
      )}
    </div>
  );
}
