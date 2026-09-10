import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";
import { organizations } from "@/db/schema/organizations";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { purposes } from "@/db/schema/purposes";
import { trackers } from "@/db/schema/trackers";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { vendors } from "@/db/schema/vendors";
import { websiteJurisdictionRules } from "@/db/schema/website-jurisdiction-rules";
import { websites } from "@/db/schema/websites";
import { parseChildProtectionConfig } from "@/lib/children/config";
import { parseBannerConfig } from "@/lib/banner-config";
import { parseConsentIntegrations } from "@/lib/signals/consent-integrations";
import { ensureDraftPolicyVersion } from "@/lib/policy-draft-version";
import { loadLiveProcessingInventory } from "@/lib/processing/service";

import {
  GPC_RUNTIME_SUPPORTED,
  OPT_OUT_PROPAGATION_IMPLEMENTED,
  defaultRightsByJurisdiction,
  evaluatePolicyCompliance,
  parseComplianceDeclarations,
  resolveApplicableJurisdictions,
} from "./evaluate";
import { COMPLIANCE_AUDIT_ACTIONS } from "./types";
import type { ComplianceValidationResult, PolicyComplianceSnapshot } from "./types";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function loadPolicyComplianceSnapshot(input: {
  organizationId: string;
  policyId: string;
  websiteId: string;
  policyName: string;
  websiteName: string;
  defaultRegulationKey: string | null;
  defaultRegion: string | null;
  consentIntegrations: unknown;
}): Promise<{ snapshot: PolicyComplianceSnapshot; versionId: string } | null> {
  const version = await ensureDraftPolicyVersion(input.policyId);
  if (!version) return null;

  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      dpoName: organizations.dpoName,
      dpoEmail: organizations.dpoEmail,
      grievanceOfficerName: organizations.grievanceOfficerName,
      grievanceOfficerEmail: organizations.grievanceOfficerEmail,
      grievancePortalUrl: organizations.grievancePortalUrl,
      settings: organizations.settings,
    })
    .from(organizations)
    .where(eq(organizations.id, input.organizationId))
    .limit(1);
  if (!org) return null;

  const attached = await db
    .select({
      id: purposes.id,
      key: purposes.key,
      name: purposes.name,
      description: purposes.description,
      isRequired: purposes.isRequired,
      legalBasis: purposes.legalBasis,
      dataCategories: purposes.dataCategories,
      retentionPeriod: purposes.retentionPeriod,
    })
    .from(policyPurposes)
    .innerJoin(purposes, eq(policyPurposes.purposeId, purposes.id))
    .where(eq(policyPurposes.policyVersionId, version.id));

  const purposeIds = attached.map((row) => row.id);
  const vendorRows = purposeIds.length
    ? await db
        .select({
          id: vendors.id,
          name: vendors.name,
          privacyPolicyUrl: vendors.privacyPolicyUrl,
          country: vendors.country,
          role: vendors.role,
          status: vendors.status,
          processingCountries: vendors.processingCountries,
          dpaStatus: vendors.dpaStatus,
          dpaReviewAt: vendors.dpaReviewAt,
          downstreamDsarMode: vendors.downstreamDsarMode,
          ccpaSale: vendors.ccpaSale,
          ccpaShare: vendors.ccpaShare,
          ccpaSensitivePi: vendors.ccpaSensitivePi,
          deletedAt: vendors.deletedAt,
        })
        .from(vendorPurposes)
        .innerJoin(vendors, eq(vendorPurposes.vendorId, vendors.id))
        .where(
          and(
            eq(vendors.organizationId, input.organizationId),
            inArray(vendorPurposes.purposeId, purposeIds),
          ),
        )
    : [];

  const trackerRows = await db
    .select({
      id: trackers.id,
      name: trackers.name,
      status: trackers.status,
      isEssential: trackers.isEssential,
      purposeId: trackers.purposeId,
      vendorId: trackers.vendorId,
      scannerClassification: trackers.scannerClassification,
      ccpaSale: trackers.ccpaSale,
      ccpaShare: trackers.ccpaShare,
      ccpaSensitivePi: trackers.ccpaSensitivePi,
    })
    .from(trackers)
    .where(eq(trackers.websiteId, input.websiteId));

  const uniqueVendorMap = new Map(vendorRows.map((row) => [row.id, row]));
  const trackerVendorIds = [...new Set(trackerRows.map((row) => row.vendorId).filter((id): id is string => Boolean(id)))];
  const missingTrackerVendorIds = trackerVendorIds.filter((id) => !uniqueVendorMap.has(id));
  if (missingTrackerVendorIds.length > 0) {
    const extraVendors = await db
      .select({
        id: vendors.id,
        name: vendors.name,
        privacyPolicyUrl: vendors.privacyPolicyUrl,
        country: vendors.country,
        role: vendors.role,
        status: vendors.status,
        processingCountries: vendors.processingCountries,
        dpaStatus: vendors.dpaStatus,
        dpaReviewAt: vendors.dpaReviewAt,
        downstreamDsarMode: vendors.downstreamDsarMode,
        ccpaSale: vendors.ccpaSale,
        ccpaShare: vendors.ccpaShare,
        ccpaSensitivePi: vendors.ccpaSensitivePi,
        deletedAt: vendors.deletedAt,
      })
      .from(vendors)
      .where(
        and(
          eq(vendors.organizationId, input.organizationId),
          inArray(vendors.id, missingTrackerVendorIds),
        ),
      );
    for (const row of extraVendors) uniqueVendorMap.set(row.id, row);
  }
  const uniqueVendors = [...uniqueVendorMap.values()].map((row) => ({
    id: row.id,
    name: row.name,
    privacyPolicyUrl: row.privacyPolicyUrl,
    country: row.country,
    role: row.role,
    status: row.deletedAt ? "archived" : row.status,
    processingCountries: row.processingCountries ?? [],
    dpaStatus: row.dpaStatus,
    dpaReviewAt: row.dpaReviewAt ? row.dpaReviewAt.toISOString() : null,
    downstreamDsarMode: row.downstreamDsarMode,
    ccpaSale: row.ccpaSale,
    ccpaShare: row.ccpaShare,
    ccpaSensitivePi: row.ccpaSensitivePi,
  }));
  const referencedVendorIds = uniqueVendors.map((row) => row.id);
  const inventory = await loadLiveProcessingInventory({
    organizationId: input.organizationId,
    websiteId: input.websiteId,
    vendorIds: referencedVendorIds,
  });

  const assignedRules = await db
    .select({ regulationKey: websiteJurisdictionRules.regulationKey })
    .from(websiteJurisdictionRules)
    .where(
      and(
        eq(websiteJurisdictionRules.organizationId, input.organizationId),
        eq(websiteJurisdictionRules.websiteId, input.websiteId),
        eq(websiteJurisdictionRules.policyId, input.policyId),
      ),
    );

  const [websiteChild] = await db
    .select({ childProtection: websites.childProtection })
    .from(websites)
    .where(
      and(
        eq(websites.id, input.websiteId),
        eq(websites.organizationId, input.organizationId),
      ),
    )
    .limit(1);

  const bannerRaw = asRecord(version.configuration);
  const banner = parseBannerConfig(bannerRaw);
  const integrations = parseConsentIntegrations(input.consentIntegrations);
  const assignedRegulationKeys = assignedRules.map((row) => row.regulationKey);
  const jurisdictions = resolveApplicableJurisdictions({
    defaultRegulationKey: input.defaultRegulationKey,
    assignedRegulationKeys,
  });

  return {
    versionId: version.id,
    snapshot: {
      policy: {
        id: input.policyId,
        name: input.policyName,
        websiteId: input.websiteId,
        organizationId: input.organizationId,
      },
      website: {
        id: input.websiteId,
        name: input.websiteName,
        defaultRegulationKey: input.defaultRegulationKey,
        defaultRegion: input.defaultRegion,
      },
      childProtection: parseChildProtectionConfig(websiteChild?.childProtection),
      organization: {
        id: org.id,
        name: org.name,
        dpoName: org.dpoName,
        dpoEmail: org.dpoEmail,
        grievanceOfficerName: org.grievanceOfficerName,
        grievanceOfficerEmail: org.grievanceOfficerEmail,
        grievancePortalUrl: org.grievancePortalUrl,
        settings: asRecord(org.settings),
      },
      version: {
        id: version.id,
        version: version.version,
        isPublished: version.isPublished,
      },
      banner: {
        title: banner.title,
        description: banner.description,
        privacyPolicyUrl: banner.privacyPolicyUrl,
        defaultConsent: banner.defaultConsent,
        showRejectAll: banner.showRejectAll,
        showCustomize: banner.showCustomize,
        showPreferenceWidget: banner.showPreferenceWidget,
        showPurposeDescriptions: banner.showPurposeDescriptions,
        showVendorList: banner.showVendorList,
        preferenceCenterDescription: banner.preferenceCenterDescription,
      },
      declarations: parseComplianceDeclarations(bannerRaw, asRecord(org.settings)),
      purposes: attached,
      vendors: uniqueVendors,
      processingInventory: {
        activities: inventory.activities,
        relationships: inventory.relationships,
        transfers: inventory.transfers,
      },
      trackers: trackerRows,
      consentIntegrations: {
        iabTcfEnabled: integrations.iabTcf.enabled,
        iabGppEnabled: integrations.iabGpp.enabled,
      },
      assignedRegulationKeys,
      rightsByJurisdiction: defaultRightsByJurisdiction(jurisdictions),
      gpcRuntimeSupported: GPC_RUNTIME_SUPPORTED,
      optOutPropagationImplemented: OPT_OUT_PROPAGATION_IMPLEMENTED,
    },
  };
}

export async function validateOwnedPolicy(input: {
  organizationId: string;
  userId?: string | null;
  policyId: string;
  websiteId: string;
  policyName: string;
  websiteName: string;
  defaultRegulationKey: string | null;
  defaultRegion: string | null;
  consentIntegrations: unknown;
  auditAction?: string;
}): Promise<
  | { ok: true; result: ComplianceValidationResult; versionId: string; versionNumber: number; vendorIds: string[] }
  | { ok: false; reason: "no_version" }
> {
  const loaded = await loadPolicyComplianceSnapshot(input);
  if (!loaded) return { ok: false, reason: "no_version" };
  const result = evaluatePolicyCompliance(loaded.snapshot);
  await db.insert(auditLogs).values({
    organizationId: input.organizationId,
    userId: input.userId ?? null,
    action: input.auditAction ?? COMPLIANCE_AUDIT_ACTIONS.validated,
    resourceType: "consent_policy",
    resourceId: input.policyId,
    description: result.valid
      ? "Policy compliance validation passed"
      : `Policy compliance validation found ${result.errors.length} error(s)`,
    metadata: {
      websiteId: input.websiteId,
      policyVersionId: loaded.versionId,
      validatorVersion: result.validatorVersion,
      jurisdictions: result.jurisdictions,
      resultHash: result.resultHash,
      errorCodes: result.errors.map((row) => row.code),
      warningCodes: result.warnings.map((row) => row.code),
    },
  });
  return { ok: true, result, versionId: loaded.versionId, versionNumber: loaded.snapshot.version.version, vendorIds: loaded.snapshot.vendors.map((row) => row.id) };
}

export async function writeComplianceAudit(input: {
  organizationId: string;
  userId?: string | null;
  policyId: string;
  websiteId: string;
  versionId: string;
  action: string;
  result: ComplianceValidationResult;
  description: string;
}) {
  await db.insert(auditLogs).values({
    organizationId: input.organizationId,
    userId: input.userId ?? null,
    action: input.action,
    resourceType: "consent_policy",
    resourceId: input.policyId,
    description: input.description,
    metadata: {
      websiteId: input.websiteId,
      policyVersionId: input.versionId,
      validatorVersion: input.result.validatorVersion,
      jurisdictions: input.result.jurisdictions,
      resultHash: input.result.resultHash,
      errorCodes: input.result.errors.map((row) => row.code),
      warningCodes: input.result.warnings.map((row) => row.code),
    },
  });
}

export function ignoreClientComplianceClaims(body: unknown): void {
  void body;
}
