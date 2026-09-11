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
  PolicyVendorManagerPanel,
  type ManagedVendor,
  type AvailableVendor,
} from "@/components/policies/policy-vendor-manager-panel";
import { PolicyPublishSection } from "@/components/policies/policy-publish-section";
import { PolicySetupChecklist, type SetupCheck } from "@/components/policies/policy-setup-checklist";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trackers } from "@/db/schema/trackers";
import { parseBannerConfig } from "@/lib/banner-config";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <dt className="text-[var(--muted-foreground)]">{label}</dt>
      <dd className="text-right text-[var(--foreground)]">{value}</dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
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

  const orgWebsites = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id));

  const websiteIds = orgWebsites.map((w) => w.id);
  if (websiteIds.length === 0) notFound();

  const [policy] = await db
    .select()
    .from(consentPolicies)
    .where(and(eq(consentPolicies.id, id), inArray(consentPolicies.websiteId, websiteIds)))
    .limit(1);
  if (!policy) notFound();

  const website = orgWebsites.find((w) => w.id === policy.websiteId);

  const versions = await db
    .select({
      id: consentPolicyVersions.id,
      version: consentPolicyVersions.version,
      status: consentPolicyVersions.status,
      isPublished: consentPolicyVersions.isPublished,
      publishedAt: consentPolicyVersions.publishedAt,
      createdAt: consentPolicyVersions.createdAt,
      updatedAt: consentPolicyVersions.updatedAt,
      configuration: consentPolicyVersions.configuration,
    })
    .from(consentPolicyVersions)
    .where(eq(consentPolicyVersions.policyId, policy.id))
    .orderBy(consentPolicyVersions.version);

  const latestVersion = versions[versions.length - 1] ?? null;

  // ── Purposes ──────────────────────────────────────────────────────────────
  const [orgPurposes, attachedLinks] = await Promise.all([
    db
      .select({
        id: purposes.id, key: purposes.key, name: purposes.name,
        description: purposes.description, isRequired: purposes.isRequired,
        status: purposes.status, legalBasis: purposes.legalBasis,
      })
      .from(purposes)
      .where(eq(purposes.organizationId, localOrg.id))
      .orderBy(purposes.name),

    latestVersion
      ? db.select({ purposeId: policyPurposes.purposeId })
          .from(policyPurposes)
          .where(eq(policyPurposes.policyVersionId, latestVersion.id))
      : Promise.resolve([]),
  ]);

  const attachedIds = new Set(attachedLinks.map((l) => l.purposeId));
  const attachedPurposes: PurposeSummary[] = orgPurposes.filter((p) => attachedIds.has(p.id));
  const availablePurposes: PurposeSummary[] = orgPurposes.filter((p) => !attachedIds.has(p.id));

  // ── Vendors ───────────────────────────────────────────────────────────────
  const attachedPurposeIds = [...attachedIds];

  const allOrgVendors = await db
    .select({
      id: vendors.id, name: vendors.name, key: vendors.key,
      domain: vendors.domain, country: vendors.country,
      privacyPolicyUrl: vendors.privacyPolicyUrl,
      source: vendors.source, status: vendors.status, role: vendors.role,
    })
    .from(vendors)
    .where(eq(vendors.organizationId, localOrg.id))
    .orderBy(vendors.name);

  const vpLinks =
    attachedPurposeIds.length > 0
      ? await db
          .select({ vendorId: vendorPurposes.vendorId, purposeId: vendorPurposes.purposeId })
          .from(vendorPurposes)
          .where(inArray(vendorPurposes.purposeId, attachedPurposeIds))
      : [];

  const purposeNameMap = new Map(
    orgPurposes.filter((p) => attachedIds.has(p.id)).map((p) => [p.id, p.name]),
  );
  const vendorPurposeNamesMap = new Map<string, string[]>();
  const orgVendorIdSet = new Set(allOrgVendors.map((v) => v.id));
  for (const link of vpLinks) {
    if (!orgVendorIdSet.has(link.vendorId)) continue;
    const pName = purposeNameMap.get(link.purposeId);
    if (!pName) continue;
    const existing = vendorPurposeNamesMap.get(link.vendorId) ?? [];
    existing.push(pName);
    vendorPurposeNamesMap.set(link.vendorId, existing);
  }

  const attachedVendorIds = new Set(vendorPurposeNamesMap.keys());
  const attachedVendors: ManagedVendor[] = allOrgVendors
    .filter((v) => attachedVendorIds.has(v.id))
    .map((v) => ({ ...v, purposeNames: vendorPurposeNamesMap.get(v.id) ?? [] }));
  const availableVendors: AvailableVendor[] = allOrgVendors.filter((v) => !attachedVendorIds.has(v.id));

  // ── Derived values ────────────────────────────────────────────────────────
  const isPublished  = latestVersion?.isPublished ?? false;
  const hasPurposes  = attachedIds.size > 0;
  const publishedVer = [...versions].reverse().find((v) => v.isPublished);

  const websiteTrackers = await db
    .select({
      id: trackers.id,
      purposeId: trackers.purposeId,
      vendorId: trackers.vendorId,
      status: trackers.status,
      isEssential: trackers.isEssential,
    })
    .from(trackers)
    .where(eq(trackers.websiteId, policy.websiteId));

  const unmappedTrackers = websiteTrackers.filter(
    (row) =>
      row.status === "active" &&
      !row.isEssential &&
      (!row.purposeId || !row.vendorId),
  );
  const purposesMissingCopy = attachedPurposes.filter((p) => !p.description?.trim());
  const unknownRoleVendors = attachedVendors.filter((v) => {
    const role = "role" in v ? String((v as { role?: string }).role ?? "unknown") : "unknown";
    return !role || role === "unknown";
  });
  const banner = latestVersion?.configuration
    ? parseBannerConfig(latestVersion.configuration)
    : null;
  const hasBannerCopy = Boolean(banner?.title?.trim() && banner?.description?.trim() && banner?.privacyPolicyUrl?.trim());

  const setupItems: SetupCheck[] = [
    {
      id: "purposes",
      label: "Attach purposes",
      done: hasPurposes,
      href: `#policy-purposes`,
      hint: hasPurposes ? `${attachedPurposes.length} purpose${attachedPurposes.length === 1 ? "" : "s"} attached.` : "A policy cannot publish without at least one purpose.",
    },
    {
      id: "purpose-copy",
      label: "Purpose descriptions",
      done: hasPurposes && purposesMissingCopy.length === 0,
      href: "/dashboard/purposes",
      hint: purposesMissingCopy.length === 0 ? "Attached purposes have visitor-facing descriptions." : `${purposesMissingCopy.length} purpose${purposesMissingCopy.length === 1 ? "" : "s"} still need a description.`,
    },
    {
      id: "vendor-roles",
      label: "Vendor roles",
      done: unknownRoleVendors.length === 0,
      href: "/dashboard/vendors",
      hint: unknownRoleVendors.length === 0 ? "Linked vendors have a processing role." : `${unknownRoleVendors.length} vendor${unknownRoleVendors.length === 1 ? "" : "s"} still have role unknown.`,
    },
    {
      id: "trackers",
      label: "Map optional trackers",
      done: unmappedTrackers.length === 0,
      href: "/dashboard/trackers",
      hint: unmappedTrackers.length === 0 ? "Active optional trackers have a purpose and vendor." : `${unmappedTrackers.length} tracker${unmappedTrackers.length === 1 ? "" : "s"} are unmapped and will block publish.`,
    },
    {
      id: "studio",
      label: "Banner title, description, and privacy URL",
      done: hasBannerCopy,
      href: `/dashboard/policies/${policy.id}/studio`,
      hint: hasBannerCopy ? "Banner Studio has the required notice fields." : "Open Banner Studio and set title, description, and a privacy policy URL.",
    },
    {
      id: "publish",
      label: "Publish a version",
      done: isPublished,
      href: `#policy-publish`,
      hint: isPublished ? "A published version is live for the SDK." : "Fix remaining compliance errors, then publish.",
    },
  ];

  const policyStatusVariant: Record<string, "success" | "warning" | "neutral"> = {
    active:   "success",
    draft:    "neutral",
    archived: "warning",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page-wrap space-y-6 sm:space-y-8">

      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
        <Link href="/dashboard/policies" className="transition hover:text-[var(--foreground)]">Policies</Link>
        <span className="text-[var(--border)]" aria-hidden="true">/</span>
        <span className="text-[var(--foreground)]">{policy.name}</span>
      </nav>

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {/* Policy icon tile */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl stat-icon-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="page-title">
                {policy.name}
              </h1>
              <Badge variant={policyStatusVariant[policy.status] ?? "neutral"} size="sm" className="capitalize">
                {policy.status}
              </Badge>
              {policy.isDefault && (
                <Badge variant="primary" size="sm">Default</Badge>
              )}
              {isPublished && (
                <Badge variant="success" size="sm">Published</Badge>
              )}
            </div>
            {policy.description && (
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">{policy.description}</p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {!isPublished ? (
            <a href="#policy-publish" className="btn btn-primary">
              Review & publish
            </a>
          ) : website ? (
            <Link href={`/dashboard/websites/${website.id}/installation`} className="btn btn-primary">
              Install SDK
            </Link>
          ) : null}
          <Link
            href={`/dashboard/policies/${policy.id}/studio`}
            className={!isPublished ? "btn btn-outline" : "btn btn-primary"}
          >
            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16"
              stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 13l4-4 2 2 5-5" />
              <circle cx="13" cy="3" r="1.5" fill="currentColor" />
            </svg>
            Banner Studio
          </Link>
          <Link
            href={`/dashboard/policies/${policy.id}/preference-center`}
            className="btn btn-outline"
          >
            Preview
          </Link>
        </div>
      </div>

      <PolicySetupChecklist items={setupItems} />

      {/* ── Top grid: details + versions ────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Policy details */}
        <Card>
          <div className="border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-base font-semibold text-[var(--foreground)]">Policy details</h2>
          </div>
          <div className="px-6">
            <dl className="divide-y divide-[var(--border)]">
              <InfoRow label="Website" value={
                website ? (
                  <Link href={`/dashboard/websites/${website.id}`}
                    className="font-medium text-[var(--foreground)] transition hover:text-[var(--primary)]">
                    {website.name}
                  </Link>
                ) : <span className="text-[var(--muted-foreground)]">—</span>
              } />
              <InfoRow label="Status" value={
                <Badge variant={policyStatusVariant[policy.status] ?? "neutral"} size="sm" className="capitalize">
                  {policy.status}
                </Badge>
              } />
              <InfoRow label="Default policy" value={
                policy.isDefault
                  ? <Badge variant="primary" size="sm">Yes</Badge>
                  : <span className="text-[var(--muted-foreground)]">No</span>
              } />
              <InfoRow label="Current version" value={
                latestVersion
                  ? <Badge variant="neutral" size="sm">v{latestVersion.version}</Badge>
                  : <span className="text-[var(--muted-foreground)]">—</span>
              } />
              <InfoRow label="Published version" value={
                publishedVer
                  ? <Badge variant="success" size="sm">v{publishedVer.version}</Badge>
                  : <span className="text-[var(--muted-foreground)]">Not published</span>
              } />
              <InfoRow label="Created" value={
                <span className="text-[var(--muted-foreground)]">
                  {policy.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              } />
              <InfoRow label="Last updated" value={
                <span className="text-[var(--muted-foreground)]">
                  {policy.updatedAt.toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              } />
            </dl>
          </div>
        </Card>

        {/* Versions + publish */}
        <Card>
          <div className="card-section-header">
            <h2 className="text-base font-semibold leading-snug text-[var(--foreground)]">Versions</h2>
            {versions.length > 0 && (
              <span className="mt-0.5 shrink-0 rounded-full bg-[var(--muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                {versions.length}
              </span>
            )}
          </div>
          <CardContent className="space-y-4">
            {versions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] py-8 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">No versions yet</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                      {["Version", "Status", "Published", "Created"].map((h) => (
                        <th key={h}
                          className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {versions.map((v) => (
                      <tr key={v.id} className="transition-colors hover:bg-[var(--muted)]/80">
                        <td className="px-4 py-2.5">
                          <Badge variant="neutral" size="sm">v{v.version}</Badge>
                        </td>
                        <td className="px-4 py-2.5">
                          {v.isPublished ? (
                            <Badge variant="success" size="sm">Published</Badge>
                          ) : (
                            <Badge variant={v.status === "archived" ? "warning" : "neutral"} size="sm" className="capitalize">
                              {v.status}
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--muted-foreground)] text-xs">
                          {v.publishedAt
                            ? v.publishedAt.toLocaleDateString("en-GB", {
                                day: "numeric", month: "short", year: "numeric",
                              })
                            : <span className="text-[var(--border)]">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-[var(--muted-foreground)] text-xs">
                          {v.createdAt.toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Publish action */}
            <div id="policy-publish">
            <PolicyPublishSection
              policyId={policy.id}
              websiteId={policy.websiteId}
              latestVersionId={latestVersion?.id ?? null}
              latestVersionNumber={latestVersion?.version ?? null}
              isPublished={isPublished}
              publishedAt={latestVersion?.publishedAt ?? null}
              hasPurposes={hasPurposes}
              blockers={setupItems}
            />
            </div>
          </CardContent>
        </Card>

        <div id="policy-purposes">
        <PolicyPurposesPanel
          policyId={policy.id}
          attached={attachedPurposes}
          available={availablePurposes}
          latestVersionId={latestVersion?.id ?? null}
        />
        </div>

        <PolicyVendorManagerPanel
          policyId={policy.id}
          latestVersionId={latestVersion?.id ?? null}
          attached={attachedVendors}
          available={availableVendors}
          hasPurposes={hasPurposes}
        />
      </div>

      {/* ── Banner configuration — open in Studio ───────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            {/* Studio icon tile */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--primary)] shadow-md">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--foreground)]">Banner configuration</h2>
              <p className="mt-0.5 max-w-lg text-sm text-[var(--muted-foreground)]">
                Design your consent banner visually — pick a preset, customise colours,
                layout, text, and behaviour, and see changes live overlaid on your real website.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Presets", "Colors", "Typography", "Layout", "Behavior", "Live preview"].map((f) => (
                  <span key={f}
                    className="inline-flex items-center rounded-full bg-[var(--secondary)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Link
            href={`/dashboard/policies/${policy.id}/studio`}
            className="btn btn-primary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
            Open Banner Studio
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
