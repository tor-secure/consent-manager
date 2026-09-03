import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { purposes } from "@/db/schema/purposes";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { vendors } from "@/db/schema/vendors";
import { trackers } from "@/db/schema/trackers";
import { parseBannerConfig, resolveTranslation, toPublicBannerConfig, applyResolvedNotice, overlayEntityText } from "@/lib/banner-config";
import { resolveRequestedLocale } from "@/lib/i18n/locale-registry";
import type { TrackerRule } from "@/lib/sdk/enforcement";
import {
  isValidSiteKey,
  publicCorsHeaders,
  publicOptionsResponse,
} from "@/lib/sdk/public-http";
import { logger } from "@/lib/logger";
import { resolveWebsiteConsentContext } from "@/lib/regulations/resolve-website-consent";
import { publicRegulationSummary } from "@/lib/regulations/engine";
import { parseConsentIntegrations } from "@/lib/signals/consent-integrations";
import { toPublicGoogleConsentConfig } from "@/lib/signals/google-consent-mode";
import { buildIabSignalSnapshot } from "@/lib/signals/iab-adapter";

// GET /api/sdk/[siteKey]/config
// Public, CORS-enabled endpoint.
// Optional query param: ?lang=<locale>
// Precedence is implemented in resolveRequestedLocale. Resolved notice text is
// merged into bannerConfig so the SDK displays visitor-facing copy in that language.
// English root fields remain the fallback. Locale is independent of jurisdiction.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ siteKey: string }> },
) {
  try {
    const { siteKey } = await params;

    const corsHeaders = {
      ...publicCorsHeaders("GET, OPTIONS"),
      "Cache-Control": "private, no-store",
      Vary: "Accept-Language",
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

    const url = new URL(request.url);
    const countryHint = url.searchParams.get("country");
    const regionHint = url.searchParams.get("region");

    // Resolve website by siteKey — siteKey is globally unique.
    const [website] = await db
      .select({
        id: websites.id,
        organizationId: websites.organizationId,
        domain: websites.domain,
        defaultLanguage: websites.defaultLanguage,
        defaultRegion: websites.defaultRegion,
        defaultRegulationKey: websites.defaultRegulationKey,
        consentIntegrations: websites.consentIntegrations,
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

    const resolved = await resolveWebsiteConsentContext({
      websiteId: website.id,
      organizationId: website.organizationId,
      websiteDefaultRegion: website.defaultRegion,
      defaultRegulationKey: website.defaultRegulationKey,
      country: countryHint,
      region: regionHint,
    });

    if (!resolved.selectedPolicy) {
      return NextResponse.json(
        { success: false, message: "No active consent policy found for this website" },
        { status: 404, headers: corsHeaders },
      );
    }

    const policy = {
      id: resolved.selectedPolicy.id,
      name: resolved.selectedPolicy.name,
    };

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

    const requestedLang = resolveRequestedLocale({
      queryLang: url.searchParams.get("lang"),
      acceptLanguage: request.headers.get("accept-language"),
      websiteDefault: website.defaultLanguage,
      bannerDefault: bannerConfig.language,
      supportedLocales: bannerConfig.supportedLocales,
    });

    const resolvedNotice = resolveTranslation(bannerConfig, requestedLang);
    const localizedConfig = applyResolvedNotice(bannerConfig, resolvedNotice);

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

    const integrations = parseConsentIntegrations(website.consentIntegrations);
    const iab = buildIabSignalSnapshot({ tcf: integrations.iabTcf, gpp: integrations.iabGpp });

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
          selection: resolved.selection.reason,
        },
        bannerConfig: localizedConfig,
        resolvedLanguage: resolvedNotice.resolvedLocale,
        purposes: versionPurposes.map((purpose) => {
          const overlay = overlayEntityText(
            { key: purpose.key, name: purpose.name, description: purpose.description },
            resolvedNotice.purposes,
          );
          return { ...purpose, name: overlay.name, description: overlay.description };
        }),
        vendors: resolvedVendors.map((vendor) => {
          const overlay = overlayEntityText(
            {
              key: vendor.domain || vendor.id,
              name: vendor.name,
              description: null,
            },
            resolvedNotice.vendors,
          );
          return { ...vendor, name: overlay.name };
        }),
        trackerRules,
        locale: {
          resolved: resolvedNotice.resolvedLocale,
          direction: resolvedNotice.direction,
          default: bannerConfig.language || "en",
          supported: bannerConfig.supportedLocales ?? [],
          language: website.defaultLanguage,
          region: website.defaultRegion ?? "",
        },
        jurisdiction: {
          country: resolved.geo.country,
          region: resolved.geo.region,
          source: resolved.geo.source,
        },
        regulation: publicRegulationSummary(resolved.regulation),
        signals: {
          googleConsentMode: toPublicGoogleConsentConfig(integrations.googleConsentMode),
          iabTcf: iab.tcf,
          iabGpp: iab.gpp,
        },
        grievance,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    logger.error("SDK config load failed", {
      route: "GET /api/sdk/[siteKey]/config",
      operation: "sdk.config.load",
      error,
    });
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
