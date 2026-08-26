import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { trackers } from "@/db/schema/trackers";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { consentPolicies } from "@/db/schema/consent-policies";
import { scans } from "@/db/schema/scans";
import { TrackerList, type TrackerRow } from "@/components/trackers/tracker-list";

// ---------------------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
    inactive: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/20",
    suspended: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.inactive}`}
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

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function PlaceholderSection({
  title,
  description,
  comingSoon,
}: {
  title: string;
  description: string;
  comingSoon?: string;
}) {
  return (
    <SectionCard title={title} description={description}>
      <div className="rounded-md border border-dashed px-5 py-8 text-center">
        <p className="text-sm text-neutral-400">
          {comingSoon ?? "Coming soon"}
        </p>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Page — server component
// Auth + bootstrap guaranteed by the dashboard layout.
// Tenant isolation: resolve website through org to prevent cross-org access.
// ---------------------------------------------------------------------------

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await auth();

  if (!orgId) return null;

  // Resolve local org from Clerk org — always derive, never trust URL params.
  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  // Load website — scoped to both the id and the organization for tenant safety.
  const [website] = await db
    .select()
    .from(websites)
    .where(
      and(
        eq(websites.id, id),
        eq(websites.organizationId, localOrg.id),
      ),
    )
    .limit(1);

  if (!website) notFound();

  // Parallel fetches for the summary cards and sections.
  const [trackerRawRows, policyRows, scanRows] = await Promise.all([
    db
      .select({
        id: trackers.id,
        vendorId: trackers.vendorId,
        purposeId: trackers.purposeId,
        name: trackers.name,
        type: trackers.type,
        domain: trackers.domain,
        identifier: trackers.identifier,
        status: trackers.status,
        isEssential: trackers.isEssential,
        detectionMethod: trackers.detectionMethod,
        lastSeenAt: trackers.lastSeenAt,
        firstSeenAt: trackers.firstSeenAt,
      })
      .from(trackers)
      .where(eq(trackers.websiteId, website.id))
      .orderBy(trackers.name),

    db
      .select({ id: consentPolicies.id, name: consentPolicies.name, status: consentPolicies.status })
      .from(consentPolicies)
      .where(eq(consentPolicies.websiteId, website.id)),

    db
      .select({ id: scans.id, status: scans.status })
      .from(scans)
      .where(eq(scans.websiteId, website.id)),
  ]);

  // Resolve vendor and purpose names for the tracker list.
  const vendorIds = [
    ...new Set(trackerRawRows.map((t) => t.vendorId).filter(Boolean) as string[]),
  ];
  const purposeIds = [
    ...new Set(trackerRawRows.map((t) => t.purposeId).filter(Boolean) as string[]),
  ];

  const [vendorRows, purposeRows] = await Promise.all([
    vendorIds.length > 0
      ? db
          .select({ id: vendors.id, name: vendors.name })
          .from(vendors)
          .where(inArray(vendors.id, vendorIds))
      : Promise.resolve([]),
    purposeIds.length > 0
      ? db
          .select({ id: purposes.id, name: purposes.name })
          .from(purposes)
          .where(inArray(purposes.id, purposeIds))
      : Promise.resolve([]),
  ]);

  const vendorMap = new Map(vendorRows.map((v) => [v.id, v.name]));
  const purposeMap = new Map(purposeRows.map((p) => [p.id, p.name]));

  const trackerRows: TrackerRow[] = trackerRawRows.map((t) => ({
    id: t.id,
    name: t.name,
    type: t.type,
    domain: t.domain,
    identifier: t.identifier,
    status: t.status,
    isEssential: t.isEssential,
    detectionMethod: t.detectionMethod,
    lastSeenAt: t.lastSeenAt,
    firstSeenAt: t.firstSeenAt,
    vendorName: t.vendorId ? (vendorMap.get(t.vendorId) ?? null) : null,
    purposeName: t.purposeId ? (purposeMap.get(t.purposeId) ?? null) : null,
  }));

  const trackerCount = trackerRows.length;
  const policyCount = policyRows.length;
  const scanCount = scanRows.length;
  const lastScanStatus =
    scanRows.length > 0 ? scanRows[scanRows.length - 1].status : null;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/dashboard/websites" className="hover:text-neutral-900">
          Websites
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-900">{website.name}</span>
      </nav>

      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-neutral-900">
              {website.name}
            </h1>
            <StatusBadge status={website.status} />
          </div>

          <p className="mt-1 text-sm text-neutral-500">{website.domain}</p>
        </div>

        <Link
          href={`/dashboard/websites/${website.id}/settings`}
          className="shrink-0 rounded-md border bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Settings
        </Link>
      </div>

      {/* Summary stat cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-neutral-500">Consent Policies</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">
            {policyCount}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-neutral-500">Trackers detected</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">
            {trackerCount}
          </p>
        </div>

        <div className="rounded-lg border bg-white p-5">
          <p className="text-sm text-neutral-500">Scanner runs</p>
          <p className="mt-1 text-2xl font-semibold text-neutral-900">
            {scanCount}
          </p>
          {lastScanStatus && (
            <p className="mt-0.5 text-xs capitalize text-neutral-400">
              Last: {lastScanStatus}
            </p>
          )}
        </div>
      </div>

      {/* Detail sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Website overview */}
        <SectionCard
          title="Website details"
          description="Configuration and identity information for this website."
        >
          <dl className="divide-y">
            <InfoRow label="Domain" value={website.domain} />
            <InfoRow
              label="Environment"
              value={
                <span className="capitalize">{website.environment}</span>
              }
            />
            <InfoRow
              label="Default language"
              value={website.defaultLanguage.toUpperCase()}
            />
            <InfoRow
              label="Default region"
              value={website.defaultRegion ?? "—"}
            />
            <InfoRow
              label="Verification"
              value={
                website.verified ? (
                  <span className="text-green-600">Verified</span>
                ) : (
                  <span className="text-neutral-400">Not verified</span>
                )
              }
            />
            <InfoRow
              label="Site key"
              value={
                <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs">
                  {website.siteKey}
                </code>
              }
            />
            <InfoRow
              label="Added"
              value={website.createdAt.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            />
          </dl>
        </SectionCard>

        {/* SDK installation placeholder */}
        <PlaceholderSection
          title="SDK Installation"
          description="Embed the CMP banner on your website using the JavaScript SDK."
          comingSoon="SDK snippet will appear here once your first consent policy is published."
        />

        {/* Consent policies — real list */}
        <SectionCard
          title="Consent Policies"
          description="Consent policies define what visitors are asked to accept."
        >
          {policyRows.length === 0 ? (
            <div className="rounded-md border border-dashed px-5 py-6 text-center">
              <p className="text-sm text-neutral-400">
                No policies yet.
              </p>
              <Link
                href={`/dashboard/policies/new?websiteId=${website.id}`}
                className="mt-3 inline-block text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
              >
                Create first policy
              </Link>
            </div>
          ) : (
            <div>
              <ul role="list" className="divide-y">
                {policyRows.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                    <Link
                      href={`/dashboard/policies/${p.id}`}
                      className="font-medium text-neutral-900 hover:underline"
                    >
                      {p.name}
                    </Link>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === "active"
                        ? "bg-green-50 text-green-700 ring-1 ring-green-600/20"
                        : "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/20"
                    }`}>
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t pt-3">
                <Link
                  href={`/dashboard/policies/new?websiteId=${website.id}`}
                  className="text-sm font-medium text-neutral-900 hover:underline"
                >
                  + Add policy
                </Link>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Trackers — real list */}
        <SectionCard
          title="Trackers"
          description="Cookies and tracking technologies detected on this website."
        >
          <TrackerList trackers={trackerRows} showWebsite={false} />
        </SectionCard>

        {/* Scanner placeholder */}
        <PlaceholderSection
          title="Scanner"
          description="Automatically scan your website for cookies and trackers."
          comingSoon="Scanner is coming soon."
        />

        {/* Integrations placeholder */}
        <PlaceholderSection
          title="Integrations"
          description="Connect third-party tools and tag managers."
          comingSoon="Integrations are coming soon."
        />
      </div>
    </div>
  );
}
