import { after, NextResponse } from "next/server";
import { eq, and, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { consentEvidenceSnapshots } from "@/db/schema/consent-evidence-snapshots";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { purposes } from "@/db/schema/purposes";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { vendors } from "@/db/schema/vendors";
import { parseBannerConfig } from "@/lib/banner-config";
import { parseBannerAbTest } from "@/lib/intelligence/ab-test";
import { parseGpcFromRequest } from "@/lib/ccpa/gpc";
import { evidenceCaliforniaOptOut, publicCaliforniaState, resolveCaliforniaOptOut } from "@/lib/ccpa/state";
import { californiaRuntimeApplies } from "@/lib/ccpa/types";
import { resolveJurisdiction } from "@/lib/regulations/geo";
import { loadCaliforniaOptOut, upsertCaliforniaOptOut } from "@/lib/ccpa/service";
import { parseComplianceDeclarations } from "@/lib/compliance/evaluate";
import { logger } from "@/lib/logger";
import {
  generateConsentId,
  computeExpiry,
  buildDecisionRows,
  appendConsentEvent,
  deriveOverallStatus,
  isConsentExpired,
  type ConsentSubmission,
} from "@/lib/consent-engine";
import {
  isValidConsentId,
  isValidSubmissionId,
  isValidWebsiteId,
  MAX_DECISION_ITEMS,
  publicCorsHeaders,
  publicOptionsResponse,
  readPublicJsonObject,
} from "@/lib/sdk/public-http";
import { consumeRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit-store";
import { sdkOriginGuard } from "@/lib/sdk/origin-allowlist";
import {
  buildAnalyticsHints,
  mergeAnalyticsMetadata,
} from "@/lib/analytics/client-hints";
import {
  createConsentCryptoProof,
  createHistoricalConsentEvidenceProof,
} from "@/lib/consent-proof";
import {
  canonicalizePolicyNoticeSnapshot,
  policyContextMatchesScope,
  verifyPolicyContextEnvelope,
} from "@/lib/policy-context";
import { createHash } from "node:crypto";
import { parseConsentIntegrations } from "@/lib/signals/consent-integrations";
import { decodeGppSections, encodeGppString, encodeTcString, getIabRegistration } from "@/lib/signals/iab-adapter";
import { getCurrentGvl } from "@/lib/signals/iab-gvl-sync";
import { resolveRegulationProfile } from "@/lib/regulations/engine";
import { childProtectionActive, parseChildProtectionConfig } from "@/lib/children/config";
import { denyRestrictedDecisions } from "@/lib/children/evaluate";
import { loadLatestSession, rowToState } from "@/lib/children/service";
import { publicAgeView } from "@/lib/children/state";
import { evidenceProcessingInventory, isFrozenProcessingSnapshot } from "@/lib/processing/snapshot";

const CORS_HEADERS = publicCorsHeaders("GET, POST, OPTIONS");

function scheduleConsentSideEffect(
  work: () => Promise<unknown>,
  context: { operation: string } & Record<string, unknown>,
) {
  after(() =>
    work().catch((error) => {
      logger.error("Consent side effect failed", { ...context, error });
    }),
  );
}

// ---------------------------------------------------------------------------
// GET /api/consent/record?consentId=<cid>&websiteId=<id>
// Retrieve an existing consent record + decisions.
// Public — called by the browser SDK from external websites.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const consentId = searchParams.get("consentId")?.trim() ?? "";
    const websiteId = searchParams.get("websiteId")?.trim() ?? "";
    const siteKey = searchParams.get("siteKey")?.trim() ?? "";

    if (!consentId || !websiteId) {
      return NextResponse.json(
        { success: false, message: "consentId and websiteId are required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (!isValidConsentId(consentId) || !isValidWebsiteId(websiteId)) {
      return NextResponse.json(
        { success: false, message: "Invalid parameter format" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const readLimit = await consumeRateLimit({
      key: `consent-record-get:${websiteId}:${getClientIp(request)}`,
      limit: 300,
      windowMs: 60_000,
    });
    if (!readLimit.allowed) return rateLimitResponse(readLimit, CORS_HEADERS);

    const [record] = await db
      .select({
        id: consentRecords.id,
        consentId: consentRecords.consentId,
        organizationId: consentRecords.organizationId,
        websiteId: consentRecords.websiteId,
        status: consentRecords.status,
        stateVersion: consentRecords.stateVersion,
        consentedAt: consentRecords.consentedAt,
        expiresAt: consentRecords.expiresAt,
        withdrawnAt: consentRecords.withdrawnAt,
        policyVersionId: consentRecords.policyVersionId,
        siteKey: websites.siteKey,
        domain: websites.domain,
        verified: websites.verified,
        defaultRegulationKey: websites.defaultRegulationKey,
        defaultRegion: websites.defaultRegion,
      })
      .from(consentRecords)
      .innerJoin(websites, eq(consentRecords.websiteId, websites.id))
      .where(
        and(
          eq(consentRecords.consentId, consentId),
          eq(consentRecords.websiteId, websiteId),
        ),
      )
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Consent record not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }
    if (!siteKey || siteKey !== record.siteKey) {
      return NextResponse.json(
        { success: false, message: "siteKey is required" },
        { status: 403, headers: CORS_HEADERS },
      );
    }
    const originError = sdkOriginGuard(request, record, CORS_HEADERS);
    if (originError) return originError;

    // ── Expiry check ────────────────────────────────────────────────────
    // If the consent has expired, return expired=true / requiresReconsent=true
    // so the SDK re-shows the banner. We do NOT mutate the DB on GET.
    const expired = isConsentExpired(record);

    const recordGeo = resolveJurisdiction({ websiteDefaultRegion: record.defaultRegion });
    const californiaApplies = californiaRuntimeApplies({
      regulationKey: record.defaultRegulationKey,
      country: recordGeo.country,
      region: recordGeo.region,
    });
    const [decisions, californiaRow] = await Promise.all([
      expired
        ? Promise.resolve([])
        : db
            .select({
              purposeId: consentDecisions.purposeId,
              vendorId: consentDecisions.vendorId,
              granted: consentDecisions.granted,
              decision: consentDecisions.decision,
              decidedAt: consentDecisions.decidedAt,
            })
            .from(consentDecisions)
            .where(eq(consentDecisions.consentRecordId, record.id)),
      californiaApplies
        ? loadCaliforniaOptOut({
            organizationId: record.organizationId,
            websiteId: websiteId,
            consentId,
          })
        : Promise.resolve(null),
    ]);
    const gpc = parseGpcFromRequest(request.headers, null);
    const california = publicCaliforniaState(resolveCaliforniaOptOut({
      regulationKey: californiaRow?.jurisdiction ?? record.defaultRegulationKey,
      country: recordGeo.country,
      region: recordGeo.region,
      header: gpc.header,
      client: gpc.client,
      persisted: californiaRow,
      consentWithdrawn: Boolean(record.withdrawnAt),
      jurisdiction: californiaRow?.jurisdiction ?? record.defaultRegulationKey ?? null,
      policyVersionId: californiaRow?.policyVersionId ?? record.policyVersionId,
    }));

    return NextResponse.json(
      {
        success: true,
        expired,
        requiresReconsent: expired,
        record: {
          id: record.id,
          consentId: record.consentId,
          status: expired ? "expired" : record.status,
          stateVersion: record.stateVersion,
          consentedAt: record.consentedAt,
          expiresAt: record.expiresAt,
          withdrawnAt: record.withdrawnAt,
          policyVersionId: record.policyVersionId,
        },
        california,
        decisions: decisions.map((d) => ({
          purposeId: d.purposeId,
          vendorId: d.vendorId,
          granted: d.granted,
          decision: d.decision,
          decidedAt: d.decidedAt,
        })),
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    logger.error("Consent record fetch failed", {
      operation: "consent.record.get",
      error,
    });
    return NextResponse.json(
      { success: false, message: "Failed to fetch consent record" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/consent/record
// Create or update a consent record.
// Public — called from external websites via the browser SDK.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const parsed = await readPublicJsonObject(request);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.message },
        { status: parsed.status, headers: CORS_HEADERS },
      );
    }
    const body = parsed.body;

    const websiteId = String(body.websiteId ?? "").trim();
    if (!websiteId) {
      return NextResponse.json(
        { success: false, message: "websiteId is required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    if (!isValidWebsiteId(websiteId)) {
      return NextResponse.json(
        { success: false, message: "Invalid websiteId" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const verifiedContext = verifyPolicyContextEnvelope(body.policyContext);
    if (!verifiedContext.ok) {
      const expired = verifiedContext.reason === "expired";
      return NextResponse.json(
        {
          success: false,
          code: expired ? "POLICY_CONTEXT_EXPIRED" : "INVALID_POLICY_CONTEXT",
          message: expired
            ? "Policy context expired; reload the consent notice and try again"
            : "A valid, unmodified policy context is required",
        },
        { status: expired ? 409 : 400, headers: CORS_HEADERS },
      );
    }
    const { claims: policyContext, noticeSnapshot } = verifiedContext;
    const submittedVariant =
      typeof body.abVariant === "string" && body.abVariant.trim()
        ? body.abVariant.trim().slice(0, 40)
        : null;
    if (submittedVariant !== policyContext.variantId) {
      return NextResponse.json(
        {
          success: false,
          code: "POLICY_CONTEXT_VARIANT_MISMATCH",
          message: "A/B variant does not match the notice context shown",
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const limit = await consumeRateLimit({
      key: `consent-record:${websiteId}:${getClientIp(request)}`,
      limit: 120,
      windowMs: 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit, CORS_HEADERS);

    const rawConsentId = body.consentId;
    const isNew =
      rawConsentId === undefined ||
      rawConsentId === null ||
      String(rawConsentId).trim() === "";
    if (!isNew && !isValidConsentId(String(rawConsentId).trim())) {
      return NextResponse.json(
        { success: false, message: "Invalid consentId" },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    const expectedStateVersion = Number(body.expectedStateVersion);
    if (
      !Number.isInteger(expectedStateVersion) ||
      (isNew ? expectedStateVersion !== 0 : expectedStateVersion < 1)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid expectedStateVersion" },
        { status: 400, headers: CORS_HEADERS },
      );
    }
    const submissionId = String(body.submissionId ?? "").trim();
    if (!isValidSubmissionId(submissionId)) {
      return NextResponse.json(
        { success: false, message: "A valid submissionId is required" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const submissionRaw = body.submission;
    if (
      !submissionRaw ||
      typeof submissionRaw !== "object" ||
      Array.isArray(submissionRaw)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "submission.choice must be accept-all, reject-all, or granular",
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const submissionObj = submissionRaw as Record<string, unknown>;
    if (
      !submissionObj.choice ||
      !["accept-all", "reject-all", "granular"].includes(String(submissionObj.choice))
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "submission.choice must be accept-all, reject-all, or granular",
        },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const submission: ConsentSubmission = {
      choice: submissionObj.choice as ConsentSubmission["choice"],
      purposeDecisions: Array.isArray(submissionObj.purposeDecisions)
        ? (submissionObj.purposeDecisions as ConsentSubmission["purposeDecisions"])?.slice(
            0,
            MAX_DECISION_ITEMS,
          )
        : undefined,
      vendorDecisions: Array.isArray(submissionObj.vendorDecisions)
        ? (submissionObj.vendorDecisions as ConsentSubmission["vendorDecisions"])?.slice(
            0,
            MAX_DECISION_ITEMS,
          )
        : undefined,
    };
    // Identity is the notice and the choice. The policy-context id is a new
    // token on every config load, so it must not make a repeat of the same
    // choice look like a different submission.
    const requestHash = createHash("sha256")
      .update(
        canonicalizePolicyNoticeSnapshot({
          websiteId,
          consentId: isNew ? null : String(rawConsentId).trim(),
          expectedStateVersion,
          policyVersionId: policyContext.policyVersionId,
          noticeHash: policyContext.noticeHash,
          variantId: submittedVariant,
          submission,
        }),
        "utf8",
      )
      .digest("hex");

    // Verify website exists and is active.
    const [website] = await db
      .select({
        id: websites.id,
        siteKey: websites.siteKey,
        organizationId: websites.organizationId,
        status: websites.status,
        defaultLanguage: websites.defaultLanguage,
        defaultRegulationKey: websites.defaultRegulationKey,
        defaultRegion: websites.defaultRegion,
        consentIntegrations: websites.consentIntegrations,
        iabRegistration: websites.iabRegistration,
        childProtection: websites.childProtection,
        domain: websites.domain,
        verified: websites.verified,
      })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!website || website.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }
    const originError = sdkOriginGuard(request, website, CORS_HEADERS);
    if (originError) return originError;

    if (
      !policyContextMatchesScope(policyContext, {
        organizationId: website.organizationId,
        websiteId: website.id,
        siteKey: website.siteKey,
      })
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "POLICY_CONTEXT_SCOPE_MISMATCH",
          message: "Policy context does not belong to this website and tenant",
        },
        { status: 403, headers: CORS_HEADERS },
      );
    }

    const childConfig = parseChildProtectionConfig(website.childProtection);
    const integrations = parseConsentIntegrations(website.consentIntegrations);
    const registration = getIabRegistration(process.env, website.iabRegistration);
    const regulation =
      resolveRegulationProfile({ key: policyContext.jurisdiction }) ??
      resolveRegulationProfile({ key: website.defaultRegulationKey });
    const websiteGeo = resolveJurisdiction({ websiteDefaultRegion: website.defaultRegion });
    const californiaApplies = californiaRuntimeApplies({
      regulationKey: policyContext.jurisdiction || website.defaultRegulationKey,
      country: websiteGeo.country,
      region: websiteGeo.region,
    });
    const needsTcf =
      integrations.iabTcf.enabled === true &&
      Boolean(regulation?.rules.signalRequirements.iabTcf) &&
      registration.valid;

    // Resolve only the policy/version that the signed context says was shown.
    // Never switch to a newer active/default version during consent recording.
    const [contextRows, ageRow, persistedCalifornia, currentGvl] = await Promise.all([
      db
        .select({
          id: consentPolicyVersions.id,
          version: consentPolicyVersions.version,
          isPublished: consentPolicyVersions.isPublished,
          configuration: consentPolicyVersions.configuration,
          processingSnapshot: consentPolicyVersions.processingSnapshot,
        })
        .from(consentPolicyVersions)
        .innerJoin(
          consentPolicies,
          eq(consentPolicyVersions.policyId, consentPolicies.id),
        )
        .where(
          and(
            eq(consentPolicyVersions.id, policyContext.policyVersionId),
            eq(consentPolicyVersions.policyId, policyContext.policyId),
            eq(consentPolicyVersions.version, policyContext.policyVersionNumber),
            eq(consentPolicies.id, policyContext.policyId),
            eq(consentPolicies.websiteId, website.id),
          ),
        )
        .limit(1),
      childProtectionActive(childConfig) || childConfig.ageAssuranceRequired
        ? loadLatestSession({
            organizationId: website.organizationId,
            websiteId: website.id,
            consentId: isNew ? null : String(rawConsentId).trim(),
          })
        : Promise.resolve(null),
      californiaApplies && !isNew
        ? loadCaliforniaOptOut({
            organizationId: website.organizationId,
            websiteId: website.id,
            consentId: String(rawConsentId).trim(),
          })
        : Promise.resolve(null),
      needsTcf ? getCurrentGvl() : Promise.resolve(null),
    ]);
    const [contextVersion] = contextRows;

    if (!contextVersion) {
      return NextResponse.json(
        {
          success: false,
          code: "POLICY_CONTEXT_POLICY_MISMATCH",
          message: "The policy context does not match a policy version for this website",
        },
        { status: 409, headers: CORS_HEADERS },
      );
    }

    const bannerConfig = parseBannerConfig(
      contextVersion.configuration as Record<string, unknown>,
    );

    // Load purposes and vendors attached to this version.
    const versionPurposes = await db
      .select({
        id: purposes.id,
        key: purposes.key,
        name: purposes.name,
        isRequired: purposes.isRequired,
        iabTcfPurposeId: purposes.iabTcfPurposeId,
      })
      .from(policyPurposes)
      .innerJoin(purposes, eq(policyPurposes.purposeId, purposes.id))
      .where(eq(policyPurposes.policyVersionId, contextVersion.id));

    const purposeIds = versionPurposes.map((p) => p.id);
    const requiredPurposeIds = new Set(
      versionPurposes.filter((p) => p.isRequired).map((p) => p.id),
    );

    const mappedVendorRows =
      purposeIds.length > 0
        ? await db
            .select({ id: vendors.id, iabVendorId: vendors.iabVendorId })
            .from(vendorPurposes)
            .innerJoin(vendors, eq(vendorPurposes.vendorId, vendors.id))
            .where(inArray(vendorPurposes.purposeId, purposeIds))
        : [];
    const mappedVendors = [
      ...new Map(mappedVendorRows.map((vendor) => [vendor.id, vendor])).values(),
    ];
    const vendorIds = mappedVendors.map((vendor) => vendor.id);

    let decisionRows = buildDecisionRows(
      submission,
      purposeIds,
      vendorIds,
      requiredPurposeIds,
    );
    decisionRows = denyRestrictedDecisions(
      decisionRows,
      versionPurposes,
      childConfig,
      ageRow ? rowToState(ageRow) : null,
    );
    const childView = publicAgeView({
      config: childConfig,
      state: ageRow ? rowToState(ageRow) : null,
    });

    const overallStatus = deriveOverallStatus(decisionRows);
    const now = new Date();
    const expiresAt = computeExpiry(bannerConfig.consentExpireDays);
    const consentId = isNew ? generateConsentId() : String(rawConsentId).trim();
    const declarations = parseComplianceDeclarations(
      bannerConfig as unknown as Record<string, unknown>,
      {},
    );
    const gpc = parseGpcFromRequest(request.headers, body.gpc);
    const californiaResolved = resolveCaliforniaOptOut({
      regulationKey: policyContext.jurisdiction || website.defaultRegulationKey,
      country: websiteGeo.country,
      region: websiteGeo.region,
      header: gpc.header,
      client: gpc.client,
      persisted: persistedCalifornia,
      manualDoNotSell: body.doNotSell === true,
      manualDoNotShare: body.doNotShare === true,
      manualLimitSensitive: body.limitSensitive === true,
      clearManual: body.doNotSell === false && body.doNotShare === false && body.limitSensitive === false,
      consentWithdrawn: submission.choice === "reject-all",
      limitSensitiveConfigured: declarations.limitSensitivePiEnabled,
      jurisdiction: policyContext.jurisdiction,
      policyVersionId: contextVersion.id,
    });
    const mappedPurposeIds = versionPurposes.map((purpose) =>
      purpose.iabTcfPurposeId ?? integrations.iabTcf.purposeMappings[purpose.id]).filter((id): id is number => Number.isInteger(id));
    const mappedVendorIds = vendorIds.map((id) =>
      mappedVendors.find((vendor) => vendor.id === id)?.iabVendorId ?? integrations.iabTcf.vendorMappings[id])
      .filter((id): id is number => Number.isInteger(id));
    const grantedPurposeIds = decisionRows.flatMap((row) => {
      if (!row.granted || !row.purposeId) return [];
      const purpose = versionPurposes.find((item) => item.id === row.purposeId);
      const id = purpose?.iabTcfPurposeId ?? integrations.iabTcf.purposeMappings[row.purposeId];
      return Number.isInteger(id) ? [id] : [];
    });
    const grantedVendorIds = decisionRows.flatMap((row) => {
      const id = row.vendorId
        ? mappedVendors.find((vendor) => vendor.id === row.vendorId)?.iabVendorId ?? integrations.iabTcf.vendorMappings[row.vendorId]
        : null;
      return row.granted && Number.isInteger(id) ? [id as number] : [];
    });
    const sectionMap: Record<string, number[]> = {
      gdpr: [2], uk_gdpr: [2], ccpa: [7, 8], vcdpa: [7, 9], cpa: [7, 10], ucpa: [7, 11],
    };
    const applicableSections = regulation?.rules.signalRequirements.iabGpp
      ? (sectionMap[regulation.key] ?? []).filter((id) =>
          integrations.iabGpp.sectionIds.length === 0 || integrations.iabGpp.sectionIds.includes(id))
      : [];
    const mappingComplete = mappedPurposeIds.length === versionPurposes.length && mappedVendorIds.length === vendorIds.length;
    const tcString = integrations.iabTcf.enabled && regulation?.rules.signalRequirements.iabTcf &&
      registration.valid && currentGvl && mappingComplete
      ? encodeTcString({
          cmpId: registration.cmpId!, cmpVersion: registration.cmpVersion!, gvl: currentGvl.payload,
          purposeIds: mappedPurposeIds, vendorIds: mappedVendorIds,
          grantedPurposeIds, grantedVendorIds, language: website.defaultLanguage, now,
        })
      : null;
    const gppString = integrations.iabGpp.enabled && registration.valid && applicableSections.length
      ? encodeGppString({
          sectionIds: applicableSections,
          optedOut: submission.choice === "reject-all" || californiaResolved.saleOptOut || californiaResolved.shareOptOut,
          saleOptOut: californiaResolved.saleOptOut || submission.choice === "reject-all",
          sharingOptOut: californiaResolved.shareOptOut || submission.choice === "reject-all",
          sensitiveLimit: californiaResolved.sensitivePiLimit,
        })
      : null;
    const iabEvidence = {
      tcString,
      gppString,
      parsedSections: gppString ? decodeGppSections(gppString) : {},
      hash: createHash("sha256").update(`${tcString ?? ""}\n${gppString ?? ""}`).digest("hex"),
      gvlVersion: currentGvl?.version ?? null,
      applicableSections,
      generatedByServer: true,
      childProtection: {
        ageStatus: childView.ageStatus,
        guardianStatus: childView.guardianStatus,
        assuranceMethod: childView.assuranceMethod,
        restrictedProcessingAllowed: childView.restrictedProcessingAllowed,
        selfDeclarationIsNotVerified: true,
      },
      ...(isFrozenProcessingSnapshot(contextVersion.processingSnapshot)
        ? { processingInventory: evidenceProcessingInventory(contextVersion.processingSnapshot) }
        : {}),
      californiaOptOut: evidenceCaliforniaOptOut(californiaResolved),
    };

    // ── Consent evidence snapshot ────────────────────────────────────────
    const purposeKeys  = versionPurposes.map((p) => p.key).sort();
    const purposeNames = versionPurposes.map((p) => p.name).sort();

    const presentedBanner = noticeSnapshot.bannerConfig;
    const presentedText = (key: string) =>
      typeof presentedBanner[key] === "string" ? presentedBanner[key] : "";

    const evidenceMetadata: Record<string, unknown> = mergeAnalyticsMetadata(
      {
      policyId:            policyContext.policyId,
      policyVersionId:     contextVersion.id,
      policyVersionNumber: contextVersion.version,
      policyContextId:     policyContext.contextId,
      noticeHash:          policyContext.noticeHash,
      noticeTitle:         presentedText("title"),
      noticeDescription:   presentedText("description"),
      noticeLanguage:      policyContext.locale,
      bannerLayout:        presentedBanner.layout ?? bannerConfig.layout,
      bannerPosition:      presentedBanner.position ?? bannerConfig.position,
      purposeCount:        versionPurposes.length,
      vendorCount:         vendorIds.length,
      purposeKeys,
      purposeNames,
      consentExpireDays:   bannerConfig.consentExpireDays,
      defaultConsent:      bannerConfig.defaultConsent,
      choice:              submission.choice,
      iab:                 iabEvidence,
      capturedAt:          now.toISOString(),
      cryptoProof: createConsentCryptoProof({
        v: 1,
        consentId,
        websiteId: website.id,
        policyVersionId: contextVersion.id,
        status: overallStatus,
        choice: submission.choice,
        jurisdiction: policyContext.jurisdiction,
        decisions: decisionRows.map((row) => ({
          purposeId: row.purposeId,
          vendorId: row.vendorId,
          granted: row.granted,
        })),
        consentedAt: now.toISOString(),
      }, now),
      },
      buildAnalyticsHints({
        headers: request.headers,
        userAgent: request.headers.get("user-agent"),
        jurisdiction: policyContext.jurisdiction,
      }),
    );

    const abConfigured = parseBannerAbTest(
      contextVersion.configuration &&
        typeof contextVersion.configuration === "object" &&
        !Array.isArray(contextVersion.configuration)
        ? (contextVersion.configuration as Record<string, unknown>).abTest
        : null,
    );
    const abVariant = submittedVariant ?? "";
    if (abConfigured && abVariant && abConfigured.variants.some((row) => row.id === abVariant)) {
      evidenceMetadata.abTest = { variantId: abVariant };
    }
    const evidenceDecisions = decisionRows.map((row) => ({
      purposeId: row.purposeId,
      vendorId: row.vendorId,
      granted: row.granted,
      decision: row.decision,
      decidedAt: row.decidedAt.toISOString(),
    }));
    const historicalEvidencePayload = {
      organizationId: website.organizationId,
      websiteId: website.id,
      consentId,
      policyId: policyContext.policyId,
      policyVersionId: contextVersion.id,
      policyVersionNumber: contextVersion.version,
      policyContextId: policyContext.contextId,
      jurisdiction: policyContext.jurisdiction,
      locale: policyContext.locale,
      noticeHash: policyContext.noticeHash,
      noticeSnapshot,
      choice: submission.choice,
      status: overallStatus,
      source: "web",
      decisions: evidenceDecisions,
      consentedAt: now.toISOString(),
    };
    const historicalEvidenceProof = createHistoricalConsentEvidenceProof(
      historicalEvidencePayload,
    );

    // ── Transaction: save record + decisions ─────────────────────────────
    let wasExpiredRecord = false;

    // Initialise with a placeholder — guaranteed to be replaced inside the
    // transaction; the type-assertion below is safe because the transaction
    // throws on any DB error and we never reach the code after it.
    let savedRecord: typeof consentRecords.$inferSelect =
      null as unknown as typeof consentRecords.$inferSelect;
    let evidenceSnapshotId = "";
    let idempotentEvidence:
      | typeof consentEvidenceSnapshots.$inferSelect
      | null = null;

    await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${submissionId}, 0))`,
      );
      const [existingSubmission] = await tx
        .select()
        .from(consentEvidenceSnapshots)
        .where(eq(consentEvidenceSnapshots.submissionId, submissionId))
        .limit(1);
      if (existingSubmission) {
        const sameNoticeChoice =
          existingSubmission.noticeHash === policyContext.noticeHash &&
          existingSubmission.policyVersionId === policyContext.policyVersionId &&
          existingSubmission.choice === submission.choice;
        if (existingSubmission.requestHash !== requestHash && !sameNoticeChoice) {
          throw new Error("Submission id already used for different consent data");
        }
        idempotentEvidence = existingSubmission;
        return;
      }

      if (isNew) {
        const [inserted] = await tx
          .insert(consentRecords)
          .values({
            organizationId: website.organizationId,
            websiteId: website.id,
            policyVersionId: contextVersion.id,
            consentId,
            visitorId: body.visitorId
              ? String(body.visitorId).trim().slice(0, 255)
              : null,
            jurisdiction: policyContext.jurisdiction,
            status: overallStatus,
            source: "web",
            consentedAt: now,
            expiresAt,
            metadata: evidenceMetadata,
          })
          .returning();
        savedRecord = inserted;
      } else {
        // Update — verify the record belongs to this website.
        const [existing] = await tx
          .select()
          .from(consentRecords)
          .where(
            and(
              eq(consentRecords.consentId, String(rawConsentId).trim()),
              eq(consentRecords.websiteId, website.id),
            ),
          )
          .limit(1);

        if (!existing) {
          throw new Error("Consent record not found");
        }
        if (existing.status === "withdrawn") {
          throw new Error("Consent record already withdrawn");
        }
        if (existing.stateVersion !== expectedStateVersion) {
          throw new Error("Consent state changed; refresh and retry");
        }

        wasExpiredRecord = isConsentExpired(existing);

        const [updated] = await tx
          .update(consentRecords)
          .set({
            status: overallStatus,
            policyVersionId: contextVersion.id,
            stateVersion: sql`${consentRecords.stateVersion} + 1`,
            consentedAt: now,
            expiresAt,
            metadata: evidenceMetadata,
            updatedAt: now,
          })
          .where(
            and(
              eq(consentRecords.consentId, String(rawConsentId).trim()),
              eq(consentRecords.websiteId, website.id),
              eq(consentRecords.stateVersion, expectedStateVersion),
            ),
          )
          .returning();
        if (!updated) {
          throw new Error("Consent state changed; refresh and retry");
        }
        savedRecord = updated;

        await tx
          .delete(consentDecisions)
          .where(eq(consentDecisions.consentRecordId, savedRecord.id));
      }

      if (decisionRows.length > 0) {
        await tx.insert(consentDecisions).values(
          decisionRows.map((d) => ({
            consentRecordId: savedRecord.id,
            purposeId: d.purposeId,
            vendorId: d.vendorId,
            decision: d.decision,
            granted: d.granted,
            decidedAt: d.decidedAt,
          })),
        );
      }

      const [insertedEvidence] = await tx
        .insert(consentEvidenceSnapshots)
        .values({
          organizationId: website.organizationId,
          websiteId: website.id,
          policyId: policyContext.policyId,
          policyVersionId: contextVersion.id,
          policyVersionNumber: contextVersion.version,
          consentRecordId: savedRecord.id,
          consentId,
          submissionId,
          requestHash,
          policyContextId: policyContext.contextId,
          jurisdiction: policyContext.jurisdiction,
          locale: policyContext.locale,
          variantId: policyContext.variantId,
          noticeHash: policyContext.noticeHash,
          choice: submission.choice,
          status: overallStatus,
          stateVersion: savedRecord.stateVersion,
          source: "web",
          policyContext,
          noticeSnapshot,
          decisions: evidenceDecisions,
          signals: iabEvidence,
          evidenceHash: historicalEvidenceProof.hash,
          evidenceSignature: historicalEvidenceProof.signature,
          consentedAt: now,
        })
        .returning({ id: consentEvidenceSnapshots.id });
      evidenceSnapshotId = insertedEvidence.id;
    });

    if (idempotentEvidence) {
      const prior = idempotentEvidence as typeof consentEvidenceSnapshots.$inferSelect;
      if (californiaApplies) {
        scheduleConsentSideEffect(
          () =>
            upsertCaliforniaOptOut({
              organizationId: website.organizationId,
              websiteId: website.id,
              consentId: prior.consentId,
              expiresAt,
              resolved: californiaResolved,
            }),
          { operation: "consent.california.upsert", consentId: prior.consentId },
        );
      }
      const [priorRecord] = prior.consentRecordId
        ? await db
            .select({ expiresAt: consentRecords.expiresAt })
            .from(consentRecords)
            .where(
              and(
                eq(consentRecords.id, prior.consentRecordId),
                eq(consentRecords.websiteId, website.id),
              ),
            )
            .limit(1)
        : [];
      return NextResponse.json(
        {
          success: true,
          confirmed: true,
          idempotent: true,
          consentId: prior.consentId,
          status: prior.status,
          stateVersion: prior.stateVersion,
          choice: prior.choice,
          policyId: prior.policyId,
          policyVersionId: prior.policyVersionId,
          policyVersionNumber: prior.policyVersionNumber,
          policyContextId: prior.policyContextId,
          jurisdiction: prior.jurisdiction,
          noticeHash: prior.noticeHash,
          evidenceSnapshotId: prior.id,
          confirmedAt: prior.consentedAt,
          expiresAt: priorRecord?.expiresAt ?? null,
          decisions: prior.decisions,
          signals: prior.signals,
          california: publicCaliforniaState(californiaResolved),
          confirmation: {
            policyContextValidated: true,
            persisted: true,
            evidenceSnapshotCreated: true,
          },
        },
        { status: 200, headers: CORS_HEADERS },
      );
    }

    if (californiaApplies) {
      scheduleConsentSideEffect(
        () =>
          upsertCaliforniaOptOut({
            organizationId: website.organizationId,
            websiteId: website.id,
            consentId: savedRecord.consentId,
            expiresAt: savedRecord.expiresAt,
            resolved: californiaResolved,
          }),
        { operation: "consent.california.upsert", consentId: savedRecord.consentId },
      );
    }

    // Event append is best-effort and must not delay the visitor response.
    // The consent record is already committed at this point.
    const eventType = isNew
      ? "consent.created"
      : wasExpiredRecord
        ? "consent.expired_and_renewed"
        : "consent.updated";

    scheduleConsentSideEffect(
      () =>
        appendConsentEvent({
          consentRecordId: savedRecord.id,
          policyVersionId: contextVersion.id,
          eventType,
          eventData: {
            choice: submission.choice,
            status: overallStatus,
            decisionCount: decisionRows.length,
            policyVersionNumber: contextVersion.version,
            policyContextId: policyContext.contextId,
            noticeHash: policyContext.noticeHash,
            purposeKeys,
            ...(wasExpiredRecord ? { previouslyExpired: true } : {}),
          },
        }),
      {
        operation: "consent.event.append",
        consentRecordId: savedRecord.id,
        policyVersionId: contextVersion.id,
        eventType,
      },
    );

    return NextResponse.json(
      {
        success: true,
        confirmed: true,
        consentId: savedRecord.consentId,
        status: overallStatus,
        stateVersion: savedRecord.stateVersion,
        choice: submission.choice,
        policyVersionId: contextVersion.id,
        policyId: policyContext.policyId,
        policyVersionNumber: contextVersion.version,
        policyContextId: policyContext.contextId,
        jurisdiction: policyContext.jurisdiction,
        noticeHash: policyContext.noticeHash,
        evidenceSnapshotId,
        confirmedAt: now,
        expiresAt: savedRecord.expiresAt,
        decisions: decisionRows.map((d) => ({
          purposeId: d.purposeId,
          vendorId: d.vendorId,
          granted: d.granted,
          decision: d.decision,
          decidedAt: d.decidedAt,
        })),
        proof: (evidenceMetadata.cryptoProof as { hash: string; alg: string; signedAt: string } | undefined)
          ? {
              alg: (evidenceMetadata.cryptoProof as { alg: string }).alg,
              hash: (evidenceMetadata.cryptoProof as { hash: string }).hash,
              signedAt: (evidenceMetadata.cryptoProof as { signedAt: string }).signedAt,
            }
          : null,
        signals: iabEvidence,
        california: publicCaliforniaState(californiaResolved),
        confirmation: {
          policyContextValidated: true,
          persisted: true,
          evidenceSnapshotCreated: true,
        },
      },
      { status: isNew ? 201 : 200, headers: CORS_HEADERS },
    );
  } catch (error) {
    // Distinguish user-facing validation errors from internal failures.
    const msg =
      error instanceof Error &&
      (error.message === "Consent record not found" ||
        error.message === "Consent record already withdrawn" ||
        error.message === "Consent state changed; refresh and retry" ||
        error.message === "Submission id already used for different consent data")
        ? error.message
        : "Failed to submit consent";

    const status =
      error instanceof Error && error.message === "Consent record not found"
        ? 404
        : error instanceof Error &&
            error.message === "Consent record already withdrawn"
          ? 409
          : error instanceof Error &&
              error.message === "Consent state changed; refresh and retry"
            ? 409
          : error instanceof Error &&
              error.message === "Submission id already used for different consent data"
            ? 409
          : 500;

    if (status === 500) {
      logger.error("Consent record submission failed", {
        operation: "consent.record.post",
        error,
      });
    }

    return NextResponse.json(
      { success: false, message: msg },
      { status, headers: CORS_HEADERS },
    );
  }
}

// CORS preflight.
export async function OPTIONS() {
  return publicOptionsResponse("GET, POST, OPTIONS");
}
