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
import { PublishPolicyButton } from "@/components/policies/publish-policy-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-800">{value}</dd>
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
    .select()
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
        status: purposes.status,
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
      source: vendors.source, status: vendors.status,
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
  const publishedVer = versions.find((v) => v.isPublished);

  const policyStatusVariant: Record<string, "success" | "warning" | "neutral"> = {
    active:   "success",
    draft:    "neutral",
    archived: "warning",
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="px-5 py-8 md:px-8 md:py-10 space-y-8">

      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/policies" className="transition hover:text-slate-900">Policies</Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <span className="text-slate-900">{policy.name}</span>
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
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
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
              <p className="mt-1 text-sm text-slate-500">{policy.description}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/policies/${policy.id}/studio`}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
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
            className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Preview
          </Link>
        </div>
      </div>

      {/* ── Top grid: details + versions ────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Policy details */}
        <Card>
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Policy details</h2>
          </div>
          <div className="px-6">
            <dl className="divide-y divide-slate-100">
              <InfoRow label="Website" value={
                website ? (
                  <Link href={`/dashboard/websites/${website.id}`}
                    className="font-medium text-slate-800 transition hover:text-indigo-600">
                    {website.name}
                  </Link>
                ) : <span className="text-slate-400">—</span>
              } />
              <InfoRow label="Status" value={
                <Badge variant={policyStatusVariant[policy.status] ?? "neutral"} size="sm" className="capitalize">
                  {policy.status}
                </Badge>
              } />
              <InfoRow label="Default policy" value={
                policy.isDefault
                  ? <Badge variant="primary" size="sm">Yes</Badge>
                  : <span className="text-slate-400">No</span>
              } />
              <InfoRow label="Current version" value={
                latestVersion
                  ? <Badge variant="neutral" size="sm">v{latestVersion.version}</Badge>
                  : <span className="text-slate-400">—</span>
              } />
              <InfoRow label="Published version" value={
                publishedVer
                  ? <Badge variant="success" size="sm">v{publishedVer.version}</Badge>
                  : <span className="text-slate-400">Not published</span>
              } />
              <InfoRow label="Created" value={
                <span className="text-slate-500">
                  {policy.createdAt.toLocaleDateString("en-GB", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
              } />
              <InfoRow label="Last updated" value={
                <span className="text-slate-500">
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
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Versions</h2>
            {versions.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                {versions.length}
              </span>
            )}
          </div>
          <CardContent className="space-y-4">
            {versions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
                <p className="text-sm text-slate-400">No versions yet</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      {["Version", "Status", "Published", "Created"].map((h) => (
                        <th key={h}
                          className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {versions.map((v) => (
                      <tr key={v.id} className="transition-colors hover:bg-slate-50/80">
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
                        <td className="px-4 py-2.5 text-slate-500 text-xs">
                          {v.publishedAt
                            ? v.publishedAt.toLocaleDateString("en-GB", {
                                day: "numeric", month: "short", year: "numeric",
                              })
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">
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
            <PublishPolicyButton
              policyId={policy.id}
              latestVersionId={latestVersion?.id ?? null}
              latestVersionNumber={latestVersion?.version ?? null}
              isPublished={isPublished}
              publishedAt={latestVersion?.publishedAt ?? null}
              hasPurposes={hasPurposes}
            />
          </CardContent>
        </Card>

        {/* Purposes panel */}
        <PolicyPurposesPanel
          policyId={policy.id}
          attached={attachedPurposes}
          available={availablePurposes}
          latestVersionId={latestVersion?.id ?? null}
        />

        {/* Vendors panel */}
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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Banner configuration</h2>
              <p className="mt-0.5 max-w-lg text-sm text-slate-500">
                Design your consent banner visually — pick a preset, customise colours,
                layout, text, and behaviour, and see changes live overlaid on your real website.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {["Presets", "Colors", "Typography", "Layout", "Behavior", "Live preview"].map((f) => (
                  <span key={f}
                    className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <Link
            href={`/dashboard/policies/${policy.id}/studio`}
            className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
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
