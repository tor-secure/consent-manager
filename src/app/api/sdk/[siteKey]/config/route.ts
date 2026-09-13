import { NextResponse } from "next/server";
import { eq, and, inArray, desc } from "drizzle-orm";

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
import { applyAbOverrides, parseBannerAbTest } from "@/lib/intelligence/ab-test";
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
import { countryFromRequestHeaders } from "@/lib/analytics/client-hints";
import { regionFromRequestHeaders } from "@/lib/regulations/geo";
import { parseConsentIntegrations } from "@/lib/signals/consent-integrations";
import { toPublicGoogleConsentConfig } from "@/lib/signals/google-consent-mode";
import { buildIabSignalSnapshot, getIabRegistration } from "@/lib/signals/iab-adapter";
import { getCurrentGvl } from "@/lib/signals/iab-gvl-sync";
import { negotiationConfigurations } from "@/db/schema/intelligence";
import { publicNegotiationOffers } from "@/lib/intelligence/negotiation-offers";
import {
  buildPolicyNoticeSnapshot,
  issuePolicyContext,
} from "@/lib/policy-context";
import { childProtectionActive, parseChildProtectionConfig } from "@/lib/children/config";
import { sdkOriginGuard } from "@/lib/sdk/origin-allowlist";
import { publicChildSnapshot } from "@/lib/children/service";
import { parseGpcFromRequest } from "@/lib/ccpa/gpc";
import { californiaRuntimeApplies } from "@/lib/ccpa/types";
import { resolveTrackerCcpaClassification } from "@/lib/ccpa/enforcement";
import { parseComplianceDeclarations } from "@/lib/compliance/evaluate";

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
      "Cache-Control": "private, max-age=15, stale-while-revalidate=60",
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
    const countryHint = url.searchParams.get("country") || countryFromRequestHeaders(request.headers);
    const regionHint = url.searchParams.get("region") || regionFromRequestHeaders(request.headers);

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
        iabRegistration: websites.iabRegistration,
        childProtection: websites.childProtection,
        status: websites.status,
        verified: websites.verified,
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

    const originError = sdkOriginGuard(request, website, corsHeaders);
    if (originError) return originError;

    const childConfig = parseChildProtectionConfig(website.childProtection);
    const needsChildSnapshot =
      childProtectionActive(childConfig) || childConfig.ageAssuranceRequired;

    // Everything below only depends on the website row, so fetch it in one
    // round-trip batch. The banner paints from a local visual cache first.
    const [resolved, orgRow, trackerRows, negotiation, childSnapshot] = await Promise.all([
      resolveWebsiteConsentContext({
        websiteId: website.id,
        organizationId: website.organizationId,
        websiteDefaultRegion: website.defaultRegion,
        defaultRegulationKey: website.defaultRegulationKey,
        country: countryHint,
        region: regionHint,
      }),
      // Organization grievance contact for the public notice
      // (DPDP Rules 2025 Rule 3(1)(d)).
      db
        .select({
          grievanceOfficerName:  organizations.grievanceOfficerName,
          grievanceOfficerEmail: organizations.grievanceOfficerEmail,
          grievancePortalUrl:    organizations.grievancePortalUrl,
          dpoName:               organizations.dpoName,
          dpoEmail:              organizations.dpoEmail,
        })
        .from(organizations)
        .where(eq(organizations.id, website.organizationId))
        .limit(1)
        .then((rows) => rows[0]),
      // Tracker rules for client-side enforcement.
      db
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
          category: trackers.category,
          cookieNames: trackers.cookieNames,
          storageTypes: trackers.storageTypes,
          localStorageKeys: trackers.localStorageKeys,
          sessionStorageKeys: trackers.sessionStorageKeys,
          indexedDbNames: trackers.indexedDbNames,
          scriptUrlPatterns: trackers.scriptUrlPatterns,
          iframeUrlPatterns: trackers.iframeUrlPatterns,
          pixelUrlPatterns: trackers.pixelUrlPatterns,
          party: trackers.party,
          duration: trackers.duration,
          deletionBehavior: trackers.deletionBehavior,
          ccpaSale: trackers.ccpaSale,
          ccpaShare: trackers.ccpaShare,
          ccpaSensitivePi: trackers.ccpaSensitivePi,
        })
        .from(trackers)
        .where(
          and(
            eq(trackers.websiteId, website.id),
            eq(trackers.status, "active"),
          ),
        )
        .orderBy(trackers.name),
      db
        .select({
          enabled: negotiationConfigurations.enabled,
          offers: negotiationConfigurations.offers,
        })
        .from(negotiationConfigurations)
        .where(eq(negotiationConfigurations.websiteId, website.id))
        .limit(1)
        .then(
          (rows): { enabled: boolean; offers: unknown } | undefined => rows[0],
          (error) => {
            logger.warn("SDK config skipped negotiation offers", {
              route: "GET /api/sdk/[siteKey]/config",
              operation: "sdk.config.negotiation",
              error,
            });
            return undefined;
          },
        ),
      needsChildSnapshot
        ? publicChildSnapshot({
            organizationId: website.organizationId,
            websiteId: website.id,
          }).catch((error): null => {
            logger.warn("SDK config skipped child-protection snapshot", {
              route: "GET /api/sdk/[siteKey]/config",
              operation: "sdk.config.child",
              error,
            });
            return null;
          })
        : Promise.resolve(null),
    ]);

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

    // Only the latest published version may be shown to external visitors.
    const [latestVersion] = await db
      .select({
        id: consentPolicyVersions.id,
        version: consentPolicyVersions.version,
        isPublished: consentPolicyVersions.isPublished,
        configuration: consentPolicyVersions.configuration,
      })
      .from(consentPolicyVersions)
      .where(
        and(
          eq(consentPolicyVersions.policyId, policy.id),
          eq(consentPolicyVersions.isPublished, true),
        ),
      )
      .orderBy(desc(consentPolicyVersions.version))
      .limit(1);

    if (!latestVersion) {
      return NextResponse.json(
        { success: false, message: "No published policy version found" },
        { status: 404, headers: corsHeaders },
      );
    }

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
    const abTest = parseBannerAbTest(
      latestVersion.configuration &&
        typeof latestVersion.configuration === "object" &&
        !Array.isArray(latestVersion.configuration)
        ? (latestVersion.configuration as Record<string, unknown>).abTest
        : null,
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

    const integrations = parseConsentIntegrations(website.consentIntegrations);

    // Purposes and vendors attached to this version, plus the GVL when TCF is
    // on. All three depend only on the version id, so run them together.
    const [versionPurposes, vendorRows, currentGvl] = await Promise.all([
      db
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
          iabTcfPurposeId: purposes.iabTcfPurposeId,
          iabGppPurposeId: purposes.iabGppPurposeId,
        })
        .from(policyPurposes)
        .innerJoin(purposes, eq(policyPurposes.purposeId, purposes.id))
        .where(eq(policyPurposes.policyVersionId, latestVersion.id))
        .orderBy(purposes.name),
      // Vendors linked through the purposes attached to this version.
      db
        .select({
          id: vendors.id,
          name: vendors.name,
          domain: vendors.domain,
          privacyPolicyUrl: vendors.privacyPolicyUrl,
          iabVendorId: vendors.iabVendorId,
          role: vendors.role,
          ccpaSale: vendors.ccpaSale,
          ccpaShare: vendors.ccpaShare,
          ccpaSensitivePi: vendors.ccpaSensitivePi,
        })
        .from(policyPurposes)
        .innerJoin(vendorPurposes, eq(vendorPurposes.purposeId, policyPurposes.purposeId))
        .innerJoin(vendors, eq(vendorPurposes.vendorId, vendors.id))
        .where(eq(policyPurposes.policyVersionId, latestVersion.id))
        .orderBy(vendors.name),
      integrations.iabTcf.enabled
        ? getCurrentGvl().catch((error): null => {
            logger.warn("SDK config skipped IAB GVL cache", {
              route: "GET /api/sdk/[siteKey]/config",
              operation: "sdk.config.gvl",
              error,
            });
            return null;
          })
        : Promise.resolve(null),
    ]);

    const resolvedVendors = [
      ...new Map(vendorRows.map((vendor) => [vendor.id, vendor])).values(),
    ];

    // Build purposeKey map: purposeId → key (for human-readable enforcement logs).
    // Version purposes already carry their keys; only look up trackers that
    // point at purposes outside this version.
    const purposeKeyMap = new Map(versionPurposes.map((p) => [p.id, p.key]));
    const missingPurposeIds = [
      ...new Set(
        trackerRows
          .map((t) => t.purposeId)
          .filter((id): id is string => Boolean(id) && !purposeKeyMap.has(id as string)),
      ),
    ];
    if (missingPurposeIds.length > 0) {
      const purposeKeyRows = await db
        .select({ id: purposes.id, key: purposes.key })
        .from(purposes)
        .where(inArray(purposes.id, missingPurposeIds));
      for (const row of purposeKeyRows) purposeKeyMap.set(row.id, row.key);
    }

    const vendorById = new Map(resolvedVendors.map((vendor) => [vendor.id, vendor]));
    const trackerRules: TrackerRule[] = trackerRows.map((t) => {
      const vendor = t.vendorId ? vendorById.get(t.vendorId) : null;
      const ccpa = resolveTrackerCcpaClassification({
        trackerSale: t.ccpaSale,
        trackerShare: t.ccpaShare,
        trackerSensitive: t.ccpaSensitivePi,
        vendorSale: vendor?.ccpaSale,
        vendorShare: vendor?.ccpaShare,
        vendorSensitive: vendor?.ccpaSensitivePi,
      });
      return {
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
        category: t.category,
        cookieNames: t.cookieNames,
        storageTypes: t.storageTypes,
        localStorageKeys: t.localStorageKeys,
        sessionStorageKeys: t.sessionStorageKeys,
        indexedDbNames: t.indexedDbNames,
        scriptUrlPatterns: t.scriptUrlPatterns,
        iframeUrlPatterns: t.iframeUrlPatterns,
        pixelUrlPatterns: t.pixelUrlPatterns,
        party: t.party as TrackerRule["party"],
        duration: t.duration,
        deletionBehavior: t.deletionBehavior,
        ccpaSale: ccpa.ccpaSale,
        ccpaShare: ccpa.ccpaShare,
        ccpaSensitivePi: ccpa.ccpaSensitivePi,
      };
    });

    const purposeMappings = versionPurposes.map((purpose) =>
      purpose.iabTcfPurposeId ?? integrations.iabTcf.purposeMappings[purpose.id]).filter(Number.isInteger);
    const vendorMappings = resolvedVendors.map((vendor) =>
      vendor.iabVendorId ?? integrations.iabTcf.vendorMappings[vendor.id]).filter(Number.isInteger);
    const mappingComplete =
      purposeMappings.length === versionPurposes.length &&
      vendorMappings.length === resolvedVendors.length;
    const legalSections: Record<string, number[]> = {
      gdpr: [2], uk_gdpr: [2], ccpa: [7, 8], vcdpa: [7, 9], cpa: [7, 10], ucpa: [7, 11],
    };
    const applicableSections = resolved.legalEngine.ux.iabGpp
      ? (legalSections[resolved.regulation?.key ?? ""] ?? []).filter((id) =>
          integrations.iabGpp.sectionIds.length === 0 || integrations.iabGpp.sectionIds.includes(id))
      : [];
    const iab = buildIabSignalSnapshot({
      tcf: integrations.iabTcf,
      gpp: integrations.iabGpp,
      gvlVersion: currentGvl?.version ?? null,
      mappingComplete,
      applicableSections,
      registration: getIabRegistration(process.env, website.iabRegistration),
    });
    const legalBannerConfig = {
      ...localizedConfig,
      showRejectAll: resolved.legalEngine.ux.rejectAllRecommended || localizedConfig.showRejectAll,
      showCustomize: resolved.legalEngine.ux.preferenceCenterRequired && localizedConfig.showCustomize,
      consentModel: resolved.legalEngine.ux.consentModel,
    };
    const negotiationOffers = publicNegotiationOffers({
      enabled: negotiation?.enabled ?? false,
      offers: negotiation?.offers ?? [],
      requiredPurposeKeys: versionPurposes.filter((purpose) => purpose.isRequired).map((purpose) => purpose.key),
    });
    const publicPurposes = versionPurposes.map((purpose) => {
      const overlay = overlayEntityText(
        { key: purpose.key, name: purpose.name, description: purpose.description },
        resolvedNotice.purposes,
      );
      return {
        ...purpose,
        iabTcfPurposeId:
          purpose.iabTcfPurposeId ??
          integrations.iabTcf.purposeMappings[purpose.id] ??
          null,
        name: overlay.name,
        description: overlay.description,
      };
    });
    const publicVendors = resolvedVendors.map((vendor) => {
      const overlay = overlayEntityText(
        {
          key: vendor.domain || vendor.id,
          name: vendor.name,
          description: null,
        },
        resolvedNotice.vendors,
      );
      return {
        ...vendor,
        iabVendorId:
          vendor.iabVendorId ??
          integrations.iabTcf.vendorMappings[vendor.id] ??
          null,
        name: overlay.name,
      };
    });
    const jurisdiction = resolved.regulation?.key ?? "unknown";
    const noticeSnapshot = buildPolicyNoticeSnapshot({
      policy: {
        id: policy.id,
        name: policy.name,
        versionId: latestVersion.id,
        version: latestVersion.version,
      },
      jurisdiction,
      locale: resolvedNotice.resolvedLocale,
      variantId: null,
      bannerConfig: legalBannerConfig as unknown as Record<string, unknown>,
      purposes: publicPurposes,
      vendors: publicVendors,
      grievance,
    });
    const policyContext = issuePolicyContext({
      organizationId: website.organizationId,
      websiteId: website.id,
      siteKey: trimmedKey,
      policyId: policy.id,
      policyVersionId: latestVersion.id,
      policyVersionNumber: latestVersion.version,
      jurisdiction,
      locale: resolvedNotice.resolvedLocale,
      variantId: null,
      noticeSnapshot,
    });
    const policyContexts = Object.fromEntries(
      abTest?.enabled
        ? abTest.variants.map((variant) => {
            const variantSnapshot = buildPolicyNoticeSnapshot({
              ...noticeSnapshot,
              variantId: variant.id,
              bannerConfig: applyAbOverrides(
                legalBannerConfig as unknown as Record<string, unknown>,
                variant.overrides,
              ),
            });
            return [
              variant.id,
              issuePolicyContext({
                organizationId: website.organizationId,
                websiteId: website.id,
                siteKey: trimmedKey,
                policyId: policy.id,
                policyVersionId: latestVersion.id,
                policyVersionNumber: latestVersion.version,
                jurisdiction,
                locale: resolvedNotice.resolvedLocale,
                variantId: variant.id,
                noticeSnapshot: variantSnapshot,
              }),
            ];
          })
        : [],
    );

    const childView = childSnapshot?.view;
    const childNotice = !childView?.enabled
      ? null
      : childView.ageStatus === "unknown" || childView.ageStatus === "expired"
        ? "Some optional features require age verification."
        : childView.guardianRequired && childView.guardianStatus !== "verified"
          ? "A parent or guardian must approve these optional features."
          : childView.restrictedProcessingAllowed
            ? "Age was recorded. A self-declaration is not verified assurance."
            : "Some optional features remain restricted.";

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
        bannerConfig: legalBannerConfig,
        abTest,
        resolvedLanguage: resolvedNotice.resolvedLocale,
        policyContext,
        policyContexts,
        purposes: publicPurposes,
        vendors: publicVendors,
        trackerRules,
        trackerEnforcement: integrations.trackerEnforcement,
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
        legalEngine: {
          confidence: resolved.legalEngine.confidence,
          source: resolved.legalEngine.regulationSource,
          policyReason: resolved.legalEngine.policyReason,
          ux: resolved.legalEngine.ux,
          reasoning: resolved.legalEngine.reasoning,
          alternatives: resolved.legalEngine.alternatives.map((row) => ({
            key: row.key,
            label: row.label,
            score: row.score,
          })),
          disclaimer: resolved.legalEngine.disclaimer,
        },
        signals: {
          googleConsentMode: toPublicGoogleConsentConfig(integrations.googleConsentMode),
          iabTcf: iab.tcf,
          iabGpp: iab.gpp,
        },
        negotiation: {
          enabled: negotiationOffers.length > 0,
          offers: negotiationOffers,
          disclosure: "Optional alternatives. Declining keeps the standard preference choices available.",
        },
        grievance,
        california: (() => {
          const gpc = parseGpcFromRequest(request.headers, null);
          const declarations = parseComplianceDeclarations(
            legalBannerConfig as unknown as Record<string, unknown>,
            {},
          );
          const enabled = californiaRuntimeApplies({
            regulationKey: resolved.regulation?.key ?? website.defaultRegulationKey,
            country: resolved.geo.country,
            region: resolved.geo.region,
          });
          return {
            enabled,
            gpcRuntime: true,
            gpcHeader: gpc.header,
            gpcRecognized: gpc.active && enabled,
            doNotSellEnabled: declarations.doNotSellEnabled,
            doNotShareEnabled: declarations.doNotShareEnabled,
            limitSensitivePiEnabled: declarations.limitSensitivePiEnabled,
          };
        })(),
        childProtection: {
          enabled: childConfig.enabled || childConfig.childDirected || childConfig.ageAssuranceRequired,
          childDirected: childConfig.childDirected,
          ageAssuranceRequired: childConfig.ageAssuranceRequired,
          minimumAge: childConfig.minimumAge,
          guardianConsentRequired: childConfig.guardianConsentRequired,
          restrictedPurposeKeys: childConfig.restrictedPurposeKeys,
          minimumAssurance: childConfig.minimumAssurance,
          ageStatus: childView?.ageStatus ?? "unknown",
          guardianStatus: childView?.guardianStatus ?? "none",
          guardianRequired: childView?.guardianRequired ?? childConfig.guardianConsentRequired,
          restrictedProcessingAllowed: childView?.restrictedProcessingAllowed ?? false,
          selfDeclarationIsNotVerified: true,
          notice: childNotice,
        },
        ageContext: childSnapshot?.ageContext ?? null,
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
