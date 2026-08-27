import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { purposes } from "@/db/schema/purposes";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { vendors } from "@/db/schema/vendors";
import { trackers } from "@/db/schema/trackers";
import { parseBannerConfig } from "@/lib/banner-config";
import type { TrackerRule } from "@/lib/sdk/enforcement";

// ---------------------------------------------------------------------------
// GET /api/sdk/[siteKey]/config
// Public, CORS-enabled endpoint.
// Returns the active banner configuration + purposes + vendors for a website
// identified by its siteKey. Called by the browser SDK at page load.
// ---------------------------------------------------------------------------

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ siteKey: string }> },
) {
  try {
    const { siteKey } = await params;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Cache-Control": "public, max-age=300",
    };

    if (!siteKey?.trim()) {
      return NextResponse.json(
        { success: false, message: "siteKey is required" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Resolve website by siteKey — siteKey is globally unique.
    const [website] = await db
      .select({
        id: websites.id,
        organizationId: websites.organizationId,
        domain: websites.domain,
        defaultLanguage: websites.defaultLanguage,
        defaultRegion: websites.defaultRegion,
        status: websites.status,
      })
      .from(websites)
      .where(
        and(eq(websites.siteKey, siteKey), eq(websites.status, "active")),
      )
      .limit(1);

    if (!website) {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404, headers: corsHeaders },
      );
    }

    // Find the active default policy.
    const [policy] = await db
      .select({ id: consentPolicies.id, name: consentPolicies.name })
      .from(consentPolicies)
      .where(
        and(
          eq(consentPolicies.websiteId, website.id),
          eq(consentPolicies.status, "active"),
        ),
      )
      .orderBy(consentPolicies.isDefault)
      .limit(1);

    if (!policy) {
      return NextResponse.json(
        { success: false, message: "No active consent policy found for this website" },
        { status: 404, headers: corsHeaders },
      );
    }

    // Get latest published version (fallback: latest draft).
    const allVersions = await db
      .select()
      .from(consentPolicyVersions)
      .where(eq(consentPolicyVersions.policyId, policy.id))
      .orderBy(consentPolicyVersions.version);

    const latestVersion =
      allVersions.findLast((v) => v.isPublished) ??
      allVersions[allVersions.length - 1] ??
      null;

    if (!latestVersion) {
      return NextResponse.json(
        { success: false, message: "No policy version found" },
        { status: 404, headers: corsHeaders },
      );
    }

    const bannerConfig = parseBannerConfig(
      latestVersion.configuration as Record<string, unknown>,
    );

    // Purposes attached to this version.
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

    // Vendors linked through attached purposes.
    const purposeIds = versionPurposes.map((p) => p.id);

    const vpLinks =
      purposeIds.length > 0
        ? await db
            .select({ vendorId: vendorPurposes.vendorId })
            .from(vendorPurposes)
            .where(inArray(vendorPurposes.purposeId, purposeIds))
        : [];

    const vendorIds = [...new Set(vpLinks.map((v) => v.vendorId))];

    const resolvedVendors =
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

    // Tracker rules for client-side enforcement.
    // Includes domain, identifier, purposeId, vendorId, isEssential.
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
      .where(
        and(
          eq(trackers.websiteId, website.id),
          eq(trackers.status, "active"),
        ),
      )
      .orderBy(trackers.name);

    // Build purposeKey map: purposeId → key (for human-readable enforcement logs).
    const trackerPurposeIds = [
      ...new Set(trackerRows.map((t) => t.purposeId).filter(Boolean) as string[]),
    ];
    const purposeKeyRows =
      trackerPurposeIds.length > 0
        ? await db
            .select({ id: purposes.id, key: purposes.key })
            .from(purposes)
            .where(inArray(purposes.id, trackerPurposeIds))
        : [];
    const purposeKeyMap = new Map(purposeKeyRows.map((p) => [p.id, p.key]));

    const trackerRules: TrackerRule[] = trackerRows.map((t) => ({
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

    return NextResponse.json(
      {
        success: true,
        websiteId: website.id,
        policy: {
          id: policy.id,
          name: policy.name,
          versionId: latestVersion.id,
          version: latestVersion.version,
          isPublished: latestVersion.isPublished,
        },
        bannerConfig,
        purposes: versionPurposes,
        vendors: resolvedVendors,
        trackerRules,
        locale: {
          language: website.defaultLanguage,
          region: website.defaultRegion ?? "",
        },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("SDK config load failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load SDK configuration" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }
}

// Handle CORS preflight from browser SDK.
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
