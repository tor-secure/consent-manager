import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { purposes } from "@/db/schema/purposes";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { vendors } from "@/db/schema/vendors";
import { trackers } from "@/db/schema/trackers";
import { parseBannerConfig, resolveTranslation, toPublicBannerConfig } from "@/lib/banner-config";
import type { TrackerRule } from "@/lib/sdk/enforcement";
import {
  isValidSiteKey,
  publicCorsHeaders,
  publicOptionsResponse,
  sanitizeRequestedLang,
} from "@/lib/sdk/public-http";

// ---------------------------------------------------------------------------
// GET /api/sdk/[siteKey]/config
// Public, CORS-enabled endpoint.
//
// Optional query param: ?lang=<language-code>
// If supplied (or inferred from Accept-Language header), the response merges
// the matching translation over the English root fields so the SDK always
// receives already-resolved text for the requested language.
// English root fields remain in the payload as the authoritative fallback.
// ---------------------------------------------------------------------------

/** Parse the best matching language from Accept-Language header. */
function parseBestLang(acceptLang: string | null): string {
  if (!acceptLang) return "en";
  // e.g. "hi-IN,hi;q=0.9,en;q=0.8" → "hi"
  const first = acceptLang.slice(0, 128).split(",")[0]?.trim();
  if (!first) return "en";
  return sanitizeRequestedLang(first.split(";")[0]);
}

// ---------------------------------------------------------------------------
// GET /api/sdk/[siteKey]/config
// Public, CORS-enabled endpoint.
// Returns the active banner configuration + purposes + vendors for a website
// identified by its siteKey. Called by the browser SDK at page load.
// ---------------------------------------------------------------------------

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteKey: string }> },
) {
  try {
    const { siteKey } = await params;

    const corsHeaders = {
      ...publicCorsHeaders("GET, OPTIONS"),
      "Cache-Control": "public, max-age=300",
    };

    const trimmedKey = siteKey?.trim() ?? "";
    if (!trimmedKey) {
      return NextResponse.json(
        { success: false, message: "siteKey is required" },
        { status: 400, headers: corsHeaders },
      );
    }
    if (!isValidSiteKey(trimmedKey)) {
      return NextResponse.json(
        { success: false, message: "Invalid siteKey" },
        { status: 400, headers: corsHeaders },
      );
    }

    // Resolve requested language: ?lang= takes precedence, then Accept-Language.
    const url = new URL(request.url);
    const langRaw = url.searchParams.get("lang")?.trim();
    const acceptLang = request.headers.get("accept-language");
    const requestedLang = langRaw
      ? sanitizeRequestedLang(langRaw)
      : parseBestLang(acceptLang);

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
        and(eq(websites.siteKey, trimmedKey), eq(websites.status, "active")),
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
      .select({
        id: consentPolicyVersions.id,
        version: consentPolicyVersions.version,
        isPublished: consentPolicyVersions.isPublished,
        configuration: consentPolicyVersions.configuration,
      })
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

    // Resolve the organization's grievance contact for inclusion in the
    // public notice (DPDP Rules 2025 Rule 3(1)(d)).
    const [orgRow] = await db
      .select({
        grievanceOfficerName:  organizations.grievanceOfficerName,
        grievanceOfficerEmail: organizations.grievanceOfficerEmail,
        grievancePortalUrl:    organizations.grievancePortalUrl,
        dpoName:               organizations.dpoName,
        dpoEmail:              organizations.dpoEmail,
      })
      .from(organizations)
      .where(eq(organizations.id, website.organizationId))
      .limit(1);

    const grievance = {
      grievanceOfficerName:  orgRow?.grievanceOfficerName  ?? null,
      grievanceOfficerEmail: orgRow?.grievanceOfficerEmail ?? null,
      grievancePortalUrl:    orgRow?.grievancePortalUrl    ?? null,
      dpoName:               orgRow?.dpoName               ?? null,
      dpoEmail:              orgRow?.dpoEmail              ?? null,
    };

    const bannerConfig = toPublicBannerConfig(
      parseBannerConfig(latestVersion.configuration as Record<string, unknown>),
    );
    // The resolved fields are merged into bannerConfig so the SDK receives
    // ready-to-display text without needing to implement its own fallback.
    const resolvedText = resolveTranslation(bannerConfig, requestedLang);
    const localizedConfig = {
      ...bannerConfig,
      title:                resolvedText.title,
      description:          resolvedText.description,
      acceptAllLabel:       resolvedText.acceptAllLabel,
      rejectAllLabel:       resolvedText.rejectAllLabel,
      customizeLabel:       resolvedText.customizeLabel,
      savePreferencesLabel: resolvedText.savePreferencesLabel,
      privacyPolicyText:    resolvedText.privacyPolicyText,
      // Keep the full translations map so clients can implement their own
      // language switching without re-fetching the config endpoint.
    };

    // Purposes attached to this version.
    const versionPurposes = await db
      .select({
        id: purposes.id,
        key: purposes.key,
        name: purposes.name,
        description: purposes.description,
        isRequired: purposes.isRequired,
        // DPDP Rule 3 enrichment — included in the SDK payload so the
        // Preference Center can display retention period and data categories.
        dataCategories:  purposes.dataCategories,
        retentionPeriod: purposes.retentionPeriod,
        legalBasis:      purposes.legalBasis,
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
        bannerConfig: localizedConfig,
        resolvedLanguage: requestedLang,
        purposes: versionPurposes,
        vendors: resolvedVendors,
        trackerRules,
        locale: {
          language: website.defaultLanguage,
          region: website.defaultRegion ?? "",
        },
        // DPDP Rule 3(1)(d) — grievance contact for the consent notice
        grievance,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("SDK config load failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load SDK configuration" },
      { status: 500, headers: publicCorsHeaders("GET, OPTIONS") },
    );
  }
}

// Handle CORS preflight from browser SDK.
export async function OPTIONS() {
  return publicOptionsResponse("GET, OPTIONS");
}
