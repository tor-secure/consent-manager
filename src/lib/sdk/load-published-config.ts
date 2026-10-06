import "server-only";

import { and, eq, inArray } from "drizzle-orm";

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
import {
  applyResolvedNotice,
  noticeRootFromConfig,
  overlayEntityText,
  parseBannerConfig,
  resolveTranslation,
  toPublicBannerConfig,
} from "@/lib/banner-config";
import { localizePurposeCopy } from "@/lib/i18n/indian-entity-translations";
import { applyAbOverrides, parseBannerAbTest } from "@/lib/intelligence/ab-test";
import { DEFAULT_BANNER_LOCALES, resolveRequestedLocale } from "@/lib/i18n/locale-registry";
import type { TrackerRule } from "@/lib/sdk/enforcement";
import { hashForPublishedVersion } from "@/lib/policy/lifecycle-core";
import { logger } from "@/lib/logger";
import { resolveWebsiteConsentContext } from "@/lib/regulations/resolve-website-consent";
import { publicRegulationSummary } from "@/lib/regulations/engine";
import { parseConsentIntegrations } from "@/lib/signals/consent-integrations";
import { toPublicGoogleConsentConfig } from "@/lib/signals/google-consent-mode";
import { buildIabSignalSnapshot, getIabRegistration } from "@/lib/signals/iab-adapter";
import { getCurrentGvl } from "@/lib/signals/iab-gvl-sync";
import { negotiationConfigurations } from "@/db/schema/intelligence";
import { publicNegotiationOffers } from "@/lib/intelligence/negotiation-offers";
import { buildPolicyNoticeSnapshot, issuePolicyContext } from "@/lib/policy-context";
import { childProtectionActive, parseChildProtectionConfig } from "@/lib/children/config";
import { publicChildSnapshot } from "@/lib/children/service";
import type { SecGpcHeaderState } from "@/lib/ccpa/types";
import { californiaRuntimeApplies } from "@/lib/ccpa/types";
import { resolveTrackerCcpaClassification } from "@/lib/ccpa/enforcement";
import { parseComplianceDeclarations } from "@/lib/compliance/evaluate";
import {
  isCacheablePublishedConfig,
  type SdkConfigCacheDimensions,
  type SdkConfigLoaderResult,
} from "@/lib/sdk/config-cache";

export async function loadPublishedSdkConfig(input: {
  dimensions: SdkConfigCacheDimensions;
  gpcHeader: SecGpcHeaderState;
  gpcActive: boolean;
  queryLang: string | null;
  acceptLanguage: string | null;
}): Promise<SdkConfigLoaderResult> {
  const { dimensions } = input;
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
    .where(and(eq(websites.siteKey, dimensions.siteKey), eq(websites.status, "active")))
    .limit(1);

  if (!website) {
    return { ok: false, failure: { status: 404, message: "Website not found" } };
  }

  const childConfig = parseChildProtectionConfig(website.childProtection);
  const needsChildSnapshot = childProtectionActive(childConfig) || childConfig.ageAssuranceRequired;

  const [resolved, orgRow, trackerRows, negotiation, childSnapshot, publishedVersions] = await Promise.all([
    resolveWebsiteConsentContext({
      websiteId: website.id,
      organizationId: website.organizationId,
      websiteDefaultRegion: website.defaultRegion,
      defaultRegulationKey: website.defaultRegulationKey,
      country: dimensions.country || null,
      region: dimensions.region || null,
    }),
    db
      .select({
        grievanceOfficerName: organizations.grievanceOfficerName,
        grievanceOfficerEmail: organizations.grievanceOfficerEmail,
        grievancePortalUrl: organizations.grievancePortalUrl,
        dpoName: organizations.dpoName,
        dpoEmail: organizations.dpoEmail,
      })
      .from(organizations)
      .where(eq(organizations.id, website.organizationId))
      .limit(1)
      .then((rows) => rows[0]),
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
      .where(and(eq(trackers.websiteId, website.id), eq(trackers.status, "active")))
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
    db
      .select({
        policyId: consentPolicyVersions.policyId,
        id: consentPolicyVersions.id,
        version: consentPolicyVersions.version,
        isPublished: consentPolicyVersions.isPublished,
        configuration: consentPolicyVersions.configuration,
        processingSnapshot: consentPolicyVersions.processingSnapshot,
        configHash: consentPolicyVersions.configHash,
      })
      .from(consentPolicyVersions)
      .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
      .where(and(eq(consentPolicies.websiteId, website.id), eq(consentPolicyVersions.isPublished, true))),
  ]);

  if (!resolved.selectedPolicy) {
    return { ok: false, failure: { status: 404, message: "No active consent policy found for this website" } };
  }

  const policy = {
    id: resolved.selectedPolicy.id,
    name: resolved.selectedPolicy.name,
  };
  const latestVersion = publishedVersions
    .filter((row) => row.policyId === policy.id && row.isPublished)
    .reduce<(typeof publishedVersions)[number] | undefined>((latest, row) => {
      if (!latest || row.version > latest.version) return row;
      return latest;
    }, undefined);

  if (!latestVersion) {
    return { ok: false, failure: { status: 404, message: "No published policy version found" } };
  }

  const configHash =
    latestVersion.configHash ||
    hashForPublishedVersion({
      id: latestVersion.id,
      configuration: latestVersion.configuration,
      processingSnapshot: latestVersion.processingSnapshot,
    });

  const grievance = {
    grievanceOfficerName: orgRow?.grievanceOfficerName ?? null,
    grievanceOfficerEmail: orgRow?.grievanceOfficerEmail ?? null,
    grievancePortalUrl: orgRow?.grievancePortalUrl ?? null,
    dpoName: orgRow?.dpoName ?? null,
    dpoEmail: orgRow?.dpoEmail ?? null,
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
    queryLang: input.queryLang,
    acceptLanguage: input.acceptLanguage,
    websiteDefault: website.defaultLanguage,
    bannerDefault: bannerConfig.language,
    supportedLocales: bannerConfig.supportedLocales,
  });
  const resolvedNotice = resolveTranslation(bannerConfig, requestedLang);
  const localizedConfig = applyResolvedNotice(bannerConfig, resolvedNotice);
  const noticeRoot = noticeRootFromConfig(bannerConfig);
  const supportedLocales = bannerConfig.supportedLocales?.length
    ? bannerConfig.supportedLocales
    : DEFAULT_BANNER_LOCALES;
  const integrations = parseConsentIntegrations(website.consentIntegrations);

  const [versionPurposes, vendorRows, currentGvl] = await Promise.all([
    db
      .select({
        id: purposes.id,
        key: purposes.key,
        name: purposes.name,
        description: purposes.description,
        isRequired: purposes.isRequired,
        dataCategories: purposes.dataCategories,
        retentionPeriod: purposes.retentionPeriod,
        legalBasis: purposes.legalBasis,
        iabTcfPurposeId: purposes.iabTcfPurposeId,
        iabGppPurposeId: purposes.iabGppPurposeId,
      })
      .from(policyPurposes)
      .innerJoin(purposes, eq(policyPurposes.purposeId, purposes.id))
      .where(eq(policyPurposes.policyVersionId, latestVersion.id))
      .orderBy(purposes.name),
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

  const resolvedVendors = [...new Map(vendorRows.map((vendor) => [vendor.id, vendor])).values()];
  const purposeKeyMap = new Map(versionPurposes.map((purpose) => [purpose.id, purpose.key]));
  const missingPurposeIds = [
    ...new Set(
      trackerRows
        .map((tracker) => tracker.purposeId)
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
  const trackerRules: TrackerRule[] = trackerRows.map((tracker) => {
    const vendor = tracker.vendorId ? vendorById.get(tracker.vendorId) : null;
    const ccpa = resolveTrackerCcpaClassification({
      trackerSale: tracker.ccpaSale,
      trackerShare: tracker.ccpaShare,
      trackerSensitive: tracker.ccpaSensitivePi,
      vendorSale: vendor?.ccpaSale,
      vendorShare: vendor?.ccpaShare,
      vendorSensitive: vendor?.ccpaSensitivePi,
    });
    return {
      id: tracker.id,
      name: tracker.name,
      type: tracker.type as TrackerRule["type"],
      domain: tracker.domain,
      identifier: tracker.identifier,
      purposeKey: tracker.purposeId ? (purposeKeyMap.get(tracker.purposeId) ?? null) : null,
      purposeId: tracker.purposeId,
      vendorId: tracker.vendorId,
      isEssential: tracker.isEssential,
      status: tracker.status,
      category: tracker.category,
      cookieNames: tracker.cookieNames,
      storageTypes: tracker.storageTypes,
      localStorageKeys: tracker.localStorageKeys,
      sessionStorageKeys: tracker.sessionStorageKeys,
      indexedDbNames: tracker.indexedDbNames,
      scriptUrlPatterns: tracker.scriptUrlPatterns,
      iframeUrlPatterns: tracker.iframeUrlPatterns,
      pixelUrlPatterns: tracker.pixelUrlPatterns,
      party: tracker.party as TrackerRule["party"],
      duration: tracker.duration,
      deletionBehavior: tracker.deletionBehavior,
      ccpaSale: ccpa.ccpaSale,
      ccpaShare: ccpa.ccpaShare,
      ccpaSensitivePi: ccpa.ccpaSensitivePi,
    };
  });

  const purposeMappings = versionPurposes
    .map((purpose) => purpose.iabTcfPurposeId ?? integrations.iabTcf.purposeMappings[purpose.id])
    .filter(Number.isInteger);
  const vendorMappings = resolvedVendors
    .map((vendor) => vendor.iabVendorId ?? integrations.iabTcf.vendorMappings[vendor.id])
    .filter(Number.isInteger);
  const mappingComplete =
    purposeMappings.length === versionPurposes.length && vendorMappings.length === resolvedVendors.length;
  const legalSections: Record<string, number[]> = {
    gdpr: [2],
    uk_gdpr: [2],
    ccpa: [7, 8],
    vcdpa: [7, 9],
    cpa: [7, 10],
    ucpa: [7, 11],
  };
  const applicableSections = resolved.legalEngine.ux.iabGpp
    ? (legalSections[resolved.regulation?.key ?? ""] ?? []).filter(
        (id) => integrations.iabGpp.sectionIds.length === 0 || integrations.iabGpp.sectionIds.includes(id),
      )
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
  const purposeRoot = versionPurposes.map((purpose) => ({
    id: purpose.id,
    key: purpose.key,
    name: purpose.name,
    description: purpose.description,
    legalBasis: purpose.legalBasis,
  }));
  const publicPurposes = versionPurposes.map((purpose) => {
    const localized = localizePurposeCopy(
      { key: purpose.key, name: purpose.name, description: purpose.description },
      resolvedNotice.resolvedLocale,
      resolvedNotice.purposes[purpose.key],
    );
    return {
      ...purpose,
      iabTcfPurposeId: purpose.iabTcfPurposeId ?? integrations.iabTcf.purposeMappings[purpose.id] ?? null,
      name: localized.name,
      description: localized.description,
    };
  });
  const publicVendors = resolvedVendors.map((vendor) => {
    const overlay = overlayEntityText(
      { key: vendor.domain || vendor.id, name: vendor.name, description: null },
      resolvedNotice.vendors,
    );
    return {
      ...vendor,
      iabVendorId: vendor.iabVendorId ?? integrations.iabTcf.vendorMappings[vendor.id] ?? null,
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
    siteKey: dimensions.siteKey,
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
              siteKey: dimensions.siteKey,
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

  const body: Record<string, unknown> = {
    success: true,
    websiteId: website.id,
    policy: {
      id: policy.id,
      name: policy.name,
      versionId: latestVersion.id,
      version: latestVersion.version,
      isPublished: true,
      configHash,
      selection: resolved.selection.reason,
    },
    bannerConfig: legalBannerConfig,
    abTest,
    resolvedLanguage: resolvedNotice.resolvedLocale,
    policyContext,
    policyContexts,
    purposes: publicPurposes,
    purposeRoot,
    vendors: publicVendors,
    trackerRules,
    trackerEnforcement: integrations.trackerEnforcement,
    noticeRoot,
    locale: {
      resolved: resolvedNotice.resolvedLocale,
      direction: resolvedNotice.direction,
      default: bannerConfig.language || "en",
      supported: supportedLocales,
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
        gpcHeader: input.gpcHeader,
        gpcRecognized: input.gpcActive && enabled,
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
  };

  const entry = {
    organizationId: website.organizationId,
    websiteId: website.id,
    siteKey: dimensions.siteKey,
    domain: website.domain,
    verified: website.verified === true,
    policyId: policy.id,
    policyVersionId: latestVersion.id,
    policyVersion: latestVersion.version,
    published: true as const,
    configHash,
    locale: dimensions.locale,
    country: dimensions.country,
    region: dimensions.region,
    gpc: dimensions.gpc,
    body: JSON.parse(JSON.stringify(body)) as Record<string, unknown>,
  };
  if (!isCacheablePublishedConfig(entry)) {
    return { ok: false, failure: { status: 500, message: "Failed to load SDK configuration" } };
  }
  return { ok: true, entry };
}
