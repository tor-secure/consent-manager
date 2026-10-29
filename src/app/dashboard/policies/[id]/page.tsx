import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and, inArray, desc } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { purposes } from "@/db/schema/purposes";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { vendors } from "@/db/schema/vendors";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { trackers } from "@/db/schema/trackers";
import { scans } from "@/db/schema/scans";
import { parseBannerConfig } from "@/lib/banner-config";
import {
  PolicyEditorWorkspace,
  type CookieCategoryRow,
  type PolicyEditorPurpose,
} from "@/components/policies/policy-editor-workspace";
import type { PurposeSummary } from "@/components/policies/policy-purposes-panel";
import type {
  ManagedVendor,
  AvailableVendor,
} from "@/components/policies/policy-vendor-manager-panel";
import type { SetupCheck } from "@/components/policies/policy-setup-checklist";

const CATEGORY_COPY: Record<string, string> = {
  essential:
    "Required for the website to function. These cannot be disabled in the consent banner.",
  necessary:
    "Required for the website to function. These cannot be disabled in the consent banner.",
  analytics:
    "Help measure traffic and usage so the site experience can be improved.",
  statistics:
    "Help measure traffic and usage so the site experience can be improved.",
  marketing:
    "Used to deliver relevant ads and measure campaign performance.",
  advertising:
    "Used to deliver relevant ads and measure campaign performance.",
  functional:
    "Enable enhanced features and personalisation beyond core site operation.",
  preferences:
    "Remember choices such as language, region, or interface preferences.",
};

function titleCaseCategory(raw: string) {
  return raw
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function PolicyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const startedAt = performance.now();
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

  const website = orgWebsites.find((w) => w.id === policy.websiteId) ?? null;

  // Parallel wave 1: version metadata (no JSONB), org catalogs, trackers summary, latest scan.
  const [versions, orgPurposes, allOrgVendors, websiteTrackers, latestScanRows] = await Promise.all([
    db
      .select({
        id: consentPolicyVersions.id,
        version: consentPolicyVersions.version,
        status: consentPolicyVersions.status,
        isPublished: consentPolicyVersions.isPublished,
        publishedAt: consentPolicyVersions.publishedAt,
        createdAt: consentPolicyVersions.createdAt,
        updatedAt: consentPolicyVersions.updatedAt,
      })
      .from(consentPolicyVersions)
      .where(eq(consentPolicyVersions.policyId, policy.id))
      .orderBy(consentPolicyVersions.version),
    db
      .select({
        id: purposes.id,
        key: purposes.key,
        name: purposes.name,
        description: purposes.description,
        isRequired: purposes.isRequired,
        status: purposes.status,
        legalBasis: purposes.legalBasis,
      })
      .from(purposes)
      .where(eq(purposes.organizationId, localOrg.id))
      .orderBy(purposes.name),
    db
      .select({
        id: vendors.id,
        name: vendors.name,
        key: vendors.key,
        domain: vendors.domain,
        country: vendors.country,
        privacyPolicyUrl: vendors.privacyPolicyUrl,
        source: vendors.source,
        status: vendors.status,
        role: vendors.role,
      })
      .from(vendors)
      .where(eq(vendors.organizationId, localOrg.id))
      .orderBy(vendors.name),
    db
      .select({
        id: trackers.id,
        purposeId: trackers.purposeId,
        vendorId: trackers.vendorId,
        status: trackers.status,
        isEssential: trackers.isEssential,
        category: trackers.category,
        description: trackers.description,
      })
      .from(trackers)
      .where(eq(trackers.websiteId, policy.websiteId)),
    db
      .select({
        id: scans.id,
        status: scans.status,
        itemsDetected: scans.itemsDetected,
        completedAt: scans.completedAt,
        createdAt: scans.createdAt,
      })
      .from(scans)
      .where(eq(scans.websiteId, policy.websiteId))
      .orderBy(desc(scans.createdAt))
      .limit(1),
  ]);

  const latestVersion = versions[versions.length - 1] ?? null;
  const publishedVer = [...versions].reverse().find((v) => v.isPublished) ?? null;
  const configVersionIds = [...new Set(
    [latestVersion?.id, publishedVer?.id].filter((value): value is string => Boolean(value)),
  )];

  // Parallel wave 2: banner config for relevant versions + purpose links for latest draft.
  const [configRows, attachedLinks] = await Promise.all([
    configVersionIds.length > 0
      ? db
          .select({
            id: consentPolicyVersions.id,
            configuration: consentPolicyVersions.configuration,
          })
          .from(consentPolicyVersions)
          .where(inArray(consentPolicyVersions.id, configVersionIds))
      : Promise.resolve([] as Array<{ id: string; configuration: unknown }>),
    latestVersion
      ? db
          .select({ purposeId: policyPurposes.purposeId })
          .from(policyPurposes)
          .where(eq(policyPurposes.policyVersionId, latestVersion.id))
      : Promise.resolve([] as Array<{ purposeId: string }>),
  ]);

  const latestConfig =
    configRows.find((row) => row.id === latestVersion?.id)?.configuration ?? null;

  const attachedIds = new Set(attachedLinks.map((l) => l.purposeId));
  const attachedPurposes: PolicyEditorPurpose[] = orgPurposes
    .filter((p) => attachedIds.has(p.id))
    .map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      description: p.description,
      isRequired: p.isRequired,
      status: p.status,
      legalBasis: p.legalBasis,
    }));
  const availablePurposes: PurposeSummary[] = orgPurposes
    .filter((p) => !attachedIds.has(p.id))
    .map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      description: p.description,
      isRequired: p.isRequired,
      status: p.status,
    }));

  const attachedPurposeIds = [...attachedIds];

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
    .map(({ role: _role, ...v }) => ({
      ...v,
      purposeNames: vendorPurposeNamesMap.get(v.id) ?? [],
    }));
  const availableVendors: AvailableVendor[] = allOrgVendors
    .filter((v) => !attachedVendorIds.has(v.id))
    .map(({ role: _role, ...v }) => v);

  const isPublished = Boolean(publishedVer);
  const hasPurposes = attachedIds.size > 0;

  const unmappedTrackers = websiteTrackers.filter(
    (row) =>
      row.status === "active" &&
      !row.isEssential &&
      (!row.purposeId || !row.vendorId),
  );
  const purposesMissingCopy = attachedPurposes.filter((p) => !p.description?.trim());
  const unknownRoleVendors = allOrgVendors.filter((v) => {
    if (!attachedVendorIds.has(v.id)) return false;
    const role = String(v.role ?? "unknown");
    return !role || role === "unknown";
  });
  const bannerConfigRecord =
    latestConfig && typeof latestConfig === "object" && !Array.isArray(latestConfig)
      ? (latestConfig as unknown as Record<string, unknown>)
      : null;
  const banner = bannerConfigRecord ? parseBannerConfig(bannerConfigRecord) : null;
  const hasBannerCopy = Boolean(
    banner?.title?.trim() && banner?.description?.trim() && banner?.privacyPolicyUrl?.trim(),
  );

  const categoryBuckets = new Map<string, { count: number; descriptions: string[] }>();
  for (const tracker of websiteTrackers) {
    const raw =
      tracker.category?.trim() ||
      (tracker.isEssential ? "essential" : "uncategorised");
    const key = raw.toLowerCase();
    const bucket = categoryBuckets.get(key) ?? { count: 0, descriptions: [] };
    bucket.count += 1;
    if (tracker.description?.trim()) bucket.descriptions.push(tracker.description.trim());
    categoryBuckets.set(key, bucket);
  }

  const cookieCategories: CookieCategoryRow[] = [...categoryBuckets.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([key, bucket]) => ({
      key,
      label: titleCaseCategory(key),
      description:
        CATEGORY_COPY[key] ||
        bucket.descriptions[0] ||
        `${bucket.count} tracker${bucket.count === 1 ? "" : "s"} in this category.`,
      count: bucket.count,
    }));

  const latestScan = latestScanRows[0] ?? null;

  const setupItems: SetupCheck[] = [
    {
      id: "purposes",
      label: "Attach purposes",
      done: hasPurposes,
      href: `#policy-purposes`,
      hint: hasPurposes
        ? `${attachedPurposes.length} purpose${attachedPurposes.length === 1 ? "" : "s"} attached.`
        : "A policy cannot publish without at least one purpose.",
    },
    {
      id: "purpose-copy",
      label: "Purpose descriptions",
      done: hasPurposes && purposesMissingCopy.length === 0,
      href: "/dashboard/purposes",
      hint:
        purposesMissingCopy.length === 0
          ? "Attached purposes have visitor-facing descriptions."
          : `${purposesMissingCopy.length} purpose${purposesMissingCopy.length === 1 ? "" : "s"} still need a description.`,
    },
    {
      id: "vendor-roles",
      label: "Vendor roles",
      done: unknownRoleVendors.length === 0,
      href: "/dashboard/vendors",
      hint:
        unknownRoleVendors.length === 0
          ? "Linked vendors have a processing role."
          : `${unknownRoleVendors.length} vendor${unknownRoleVendors.length === 1 ? "" : "s"} still have role unknown.`,
    },
    {
      id: "trackers",
      label: "Map optional trackers",
      done: unmappedTrackers.length === 0,
      href: "/dashboard/trackers",
      hint:
        unmappedTrackers.length === 0
          ? "Active optional trackers have a purpose and vendor."
          : `${unmappedTrackers.length} tracker${unmappedTrackers.length === 1 ? "" : "s"} are unmapped and will block publish.`,
    },
    {
      id: "studio",
      label: "Banner title, description, and privacy URL",
      done: hasBannerCopy,
      href: `/dashboard/policies/${policy.id}/studio`,
      hint: hasBannerCopy
        ? "Banner Studio has the required notice fields."
        : "Open Banner Studio and set title, description, and a privacy policy URL.",
    },
    {
      id: "publish",
      label: "Publish a version",
      done: isPublished,
      href: `#policy-publish`,
      hint: isPublished
        ? "A published version is live for the SDK."
        : "Fix remaining compliance errors, then publish.",
    },
  ];

  const elapsedMs = Math.round(performance.now() - startedAt);
  if (process.env.NODE_ENV === "development") {
    console.info(`[policies/detail] data load ${elapsedMs}ms policy=${policy.id}`);
  }

  return (
    <PolicyEditorWorkspace
      policy={{
        id: policy.id,
        name: policy.name,
        description: policy.description,
        status: policy.status,
        isDefault: policy.isDefault,
        createdAt: policy.createdAt.toISOString(),
        updatedAt: policy.updatedAt.toISOString(),
      }}
      website={website}
      versions={versions.map((v) => ({
        id: v.id,
        version: v.version,
        status: v.status,
        isPublished: v.isPublished,
        publishedAt: v.publishedAt?.toISOString() ?? null,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      }))}
      latestVersionId={latestVersion?.id ?? null}
      latestVersionNumber={latestVersion?.version ?? null}
      isPublished={isPublished}
      publishedAt={publishedVer?.publishedAt?.toISOString() ?? null}
      publishedVersionNumber={publishedVer?.version ?? null}
      hasPurposes={hasPurposes}
      attachedPurposes={attachedPurposes}
      availablePurposes={availablePurposes}
      attachedVendors={attachedVendors}
      availableVendors={availableVendors}
      setupItems={setupItems}
      banner={banner}
      cookieCategories={cookieCategories}
      scan={{
        id: latestScan?.id ?? null,
        status: latestScan?.status ?? null,
        itemsDetected: latestScan?.itemsDetected ?? 0,
        completedAt:
          latestScan?.completedAt?.toISOString() ??
          latestScan?.createdAt?.toISOString() ??
          null,
        href: latestScan ? `/dashboard/scanner/${latestScan.id}` : "/dashboard/scanner",
      }}
    />
  );
}
