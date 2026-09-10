import { createHash } from "node:crypto";

import { isRegulationKey } from "../regulations/catalog";
import { isMappedTracker } from "../trackers/management";
import { availableRightsForJurisdiction } from "../privacy-rights/applicability";

import { childProtectionIsComplete, parseChildProtectionConfig } from "../children/config";
import { collectProcessingIssues, inventoryCoversDeclaredTransfer } from "../processing/validate";
import { collectCaliforniaMappingIssues } from "../ccpa/validate";
import {
  parseDpaStatus,
  parseDownstreamDsarMode,
  parseStringList,
  parseTransferMechanism,
  parseVendorRole,
  parseVendorStatus,
} from "../processing/types";
import { COMPLIANCE_RULES, type ComplianceRuleId } from "./rule-registry";
import type { ComplianceSeverity } from "./types";
import {
  COMPLIANCE_VALIDATOR_VERSION,
  GDPR_LAWFUL_BASES,
  type ComplianceDeclarations,
  type ComplianceIssue,
  type ComplianceValidationResult,
  type PolicyComplianceSnapshot,
} from "./types";

export const GPC_RUNTIME_SUPPORTED = true;
export const OPT_OUT_PROPAGATION_IMPLEMENTED = true;

const GDPR_FAMILY = new Set(["gdpr", "uk_gdpr"]);
const CCPA_FAMILY = new Set(["ccpa", "ucpa", "vcdpa", "cpa"]);
const CORE_GDPR_RIGHTS = [
  "access",
  "correction",
  "erasure",
  "restriction",
  "objection",
  "portability",
  "withdraw_consent",
];
const CORE_LGPD_RIGHTS = [
  "access",
  "correction",
  "erasure",
  "portability",
  "withdraw_consent",
];

const SENSITIVE_CATEGORY_RE =
  /special|sensitive|health|biometric|genetic|racial|religion|sexual|political/i;
const SALE_SHARE_RE = /sale|share|sell|opt.?out/i;
const NECESSARY_RE = /^(necessary|essential|required|strictly_necessary)$/i;
const ADVERTISING_RE = /advertis|marketing|sale|share|target|personaliz/i;

function issue(
  code: ComplianceRuleId,
  jurisdiction: string,
  field?: string,
  messageOverride?: string,
  severity?: ComplianceSeverity,
): ComplianceIssue {
  const rule = COMPLIANCE_RULES[code];
  return {
    code: rule.id,
    severity: severity ?? rule.severity,
    jurisdiction,
    field,
    message: messageOverride ?? rule.description,
    remediation: rule.remediation,
  };
}

function text(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function purposeLooksRequired(purpose: PolicyComplianceSnapshot["purposes"][number]): boolean {
  return purpose.isRequired === true || NECESSARY_RE.test(purpose.key);
}

function purposeLooksOptional(purpose: PolicyComplianceSnapshot["purposes"][number]): boolean {
  return !purposeLooksRequired(purpose);
}

function isSensitivePurpose(purpose: PolicyComplianceSnapshot["purposes"][number]): boolean {
  if (SENSITIVE_CATEGORY_RE.test(purpose.key) || SENSITIVE_CATEGORY_RE.test(purpose.name)) {
    return true;
  }
  return (purpose.dataCategories ?? []).some((item) => SENSITIVE_CATEGORY_RE.test(item));
}

function childControlsComplete(declarations: ComplianceDeclarations): boolean {
  return (
    typeof declarations.childAgeThreshold === "number" &&
    declarations.childAgeThreshold > 0 &&
    declarations.guardianConsentRequired === true
  );
}

function hasWithdrawalPath(snapshot: PolicyComplianceSnapshot): boolean {
  return snapshot.banner.showRejectAll || snapshot.banner.showPreferenceWidget;
}

export function parseComplianceDeclarations(
  banner: Record<string, unknown> | null | undefined,
  settings: Record<string, unknown> | null | undefined,
): ComplianceDeclarations {
  const source = {
    ...(settings ?? {}),
    ...(banner ?? {}),
  };
  const nested =
    source.compliance && typeof source.compliance === "object" && !Array.isArray(source.compliance)
      ? (source.compliance as Record<string, unknown>)
      : {};
  const merged = { ...source, ...nested };
  const age = Number(merged.childAgeThreshold ?? merged.minAge);
  return {
    childDirected: merged.childDirected === true || merged.childProcessing === true,
    childAgeThreshold: Number.isFinite(age) && age > 0 ? age : null,
    guardianConsentRequired: merged.guardianConsentRequired === true,
    automatedDecisionMaking:
      merged.automatedDecisionMaking === true || merged.profiling === true,
    profilingDisclosed: merged.profilingDisclosed === true,
    specialCategoryProcessing: merged.specialCategoryProcessing === true,
    specialCategoryCondition:
      typeof merged.specialCategoryCondition === "string"
        ? merged.specialCategoryCondition.trim() || null
        : null,
    doNotSellEnabled: merged.doNotSellEnabled === true,
    doNotShareEnabled: merged.doNotShareEnabled === true,
    gpcHonored: merged.gpcHonored === true,
    limitSensitivePiEnabled: merged.limitSensitivePiEnabled === true,
    financialIncentive: merged.financialIncentive === true,
    financialIncentiveDisclosed: merged.financialIncentiveDisclosed === true,
    internationalTransfers: merged.internationalTransfers === true,
    transferMechanism:
      typeof merged.transferMechanism === "string"
        ? merged.transferMechanism.trim() || null
        : null,
    consentManagerMode: merged.consentManagerMode === true,
    consentManagerRegistrationId:
      typeof merged.consentManagerRegistrationId === "string"
        ? merged.consentManagerRegistrationId.trim() || null
        : null,
    serviceProviderDisclosed: merged.serviceProviderDisclosed === true,
  };
}

export function resolveApplicableJurisdictions(input: {
  defaultRegulationKey?: string | null;
  assignedRegulationKeys?: string[];
  clientJurisdiction?: unknown;
}): string[] {
  void input.clientJurisdiction;
  const keys = [
    ...(input.assignedRegulationKeys ?? []),
    input.defaultRegulationKey ?? "",
  ]
    .map((key) => String(key).trim().toLowerCase())
    .map((key) => (key === "cpra" ? "ccpa" : key))
    .filter((key) => isRegulationKey(key));
  return [...new Set(keys)];
}

export function hashValidationResult(
  errors: ComplianceIssue[],
  warnings: ComplianceIssue[],
): string {
  const payload = [...errors, ...warnings]
    .map((row) => `${row.severity}:${row.code}:${row.jurisdiction}:${row.field ?? ""}`)
    .sort()
    .join("|");
  return createHash("sha256").update(payload).digest("hex");
}

export function canPublish(result: Pick<ComplianceValidationResult, "errors">): boolean {
  return result.errors.length === 0;
}

function collectCommon(snapshot: PolicyComplianceSnapshot): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  if (!text(snapshot.policy.id) || !text(snapshot.policy.name)) {
    issues.push(issue("POLICY_IDENTITY_MISSING", "common", "policy.name"));
  }
  if (!text(snapshot.policy.websiteId) || !text(snapshot.website.id)) {
    issues.push(issue("POLICY_WEBSITE_MISSING", "common", "policy.websiteId"));
  }
  if (snapshot.purposes.length === 0) {
    issues.push(issue("PURPOSE_REQUIRED_MISSING", "common", "purposes"));
  }
  for (const purpose of snapshot.purposes) {
    if (!text(purpose.description)) {
      issues.push(issue("PURPOSE_WITHOUT_DESCRIPTION", "common", `purposes.${purpose.key}`));
    }
    if (!text(purpose.legalBasis)) {
      issues.push(issue("PURPOSE_WITHOUT_LEGAL_BASIS", "common", `purposes.${purpose.key}`));
    }
  }
  for (const vendor of snapshot.vendors) {
    if (!text(vendor.privacyPolicyUrl)) {
      issues.push(issue("VENDOR_WITHOUT_PRIVACY_URL", "common", `vendors.${vendor.id}`));
    }
  }
  if (!text(snapshot.banner.title)) {
    issues.push(issue("NOTICE_TITLE_MISSING", "common", "banner.title"));
  }
  if (!text(snapshot.banner.description)) {
    issues.push(issue("NOTICE_DESCRIPTION_MISSING", "common", "banner.description"));
  }
  if (!text(snapshot.banner.privacyPolicyUrl)) {
    issues.push(issue("NOTICE_PRIVACY_POLICY_MISSING", "common", "banner.privacyPolicyUrl"));
  }
  return issues;
}

function collectTrackers(snapshot: PolicyComplianceSnapshot, jurisdictions: string[]): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const purposes = new Map(snapshot.purposes.map((row) => [row.id, row]));
  for (const tracker of snapshot.trackers) {
    if (tracker.status === "disabled" || tracker.status === "archived") continue;
    const mapped = isMappedTracker(tracker);
    if (tracker.scannerClassification === "ignored" && !mapped) {
      issues.push(issue("TRACKER_IGNORED_STILL_ACTIVE", "common", `trackers.${tracker.id}`));
      continue;
    }
    if (!tracker.isEssential && !mapped) {
      issues.push(issue("TRACKER_UNMAPPED", "common", `trackers.${tracker.id}`));
      continue;
    }
    if (tracker.isEssential) {
      const purpose = tracker.purposeId ? purposes.get(tracker.purposeId) : null;
      if (!purpose || !purposeLooksRequired(purpose)) {
        issues.push(issue("TRACKER_ESSENTIAL_NOT_REQUIRED", "common", `trackers.${tracker.id}`));
      }
    }
    const purpose = tracker.purposeId ? purposes.get(tracker.purposeId) : null;
    if (
      purpose &&
      purposeLooksOptional(purpose) &&
      tracker.isEssential &&
      jurisdictions.some((key) => GDPR_FAMILY.has(key))
    ) {
      issues.push(issue("GDPR_TRACKER_ALLOWED_WITHOUT_CONSENT", "gdpr", `trackers.${tracker.id}`));
    }
  }
  return issues;
}

function collectChildrenAndSensitive(
  snapshot: PolicyComplianceSnapshot,
  jurisdictions: string[],
): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const websiteChild = parseChildProtectionConfig(snapshot.childProtection);
  const childDirected =
    snapshot.declarations.childDirected ||
    websiteChild.childDirected ||
    websiteChild.enabled;
  const declarationComplete = childControlsComplete(snapshot.declarations);
  const websiteComplete = childProtectionIsComplete(websiteChild);
  const complete = websiteComplete && (declarationComplete || websiteChild.childDirected || websiteChild.enabled);
  const advertisingControlled = websiteChild.restrictedPurposeKeys.some((key) => ADVERTISING_RE.test(key));
  const targetedAdvertising = snapshot.purposes.some(
    (purpose) => !purposeLooksRequired(purpose) && ADVERTISING_RE.test(purpose.key),
  );

  if (childDirected) {
    if (!complete || (targetedAdvertising && !advertisingControlled)) {
      issues.push(issue("CHILD_DIRECTED_WITHOUT_CONTROLS", "common", "declarations.childDirected"));
    }
    if (!websiteComplete || !complete) {
      issues.push(issue("CHILD_PROTECTION_CONFIG_MISSING", "common", "childProtection"));
    }
    const hasAgeThreshold =
      typeof websiteChild.minimumAge === "number" ||
      typeof snapshot.declarations.childAgeThreshold === "number";
    if (!websiteChild.ageAssuranceRequired || !hasAgeThreshold) {
      issues.push(issue("AGE_ASSURANCE_REQUIRED", "common", "childProtection.ageAssuranceRequired"));
    }
    if (
      (websiteChild.childDirected || snapshot.declarations.childDirected) &&
      !websiteChild.guardianConsentRequired &&
      !snapshot.declarations.guardianConsentRequired
    ) {
      issues.push(issue("GUARDIAN_WORKFLOW_MISSING", "common", "childProtection.guardianConsentRequired"));
    }
    if (targetedAdvertising && !advertisingControlled) {
      issues.push(issue("CHILD_ADVERTISING_CONTROL_MISSING", "common", "childProtection.restrictedPurposeKeys"));
    }
    const uncontrolled = snapshot.purposes.filter(
      (purpose) =>
        purposeLooksOptional(purpose) &&
        (/advertis|marketing|personaliz|sale_share|targeting|social|profil|^ads$/i.test(purpose.key) ||
          purpose.key.trim().toLowerCase() === "ads") &&
        !websiteChild.restrictedPurposeKeys.includes(purpose.key.trim().toLowerCase()),
    );
    if (uncontrolled.length > 0 && (websiteChild.enabled || websiteChild.childDirected || snapshot.declarations.childDirected)) {
      issues.push(issue("CHILD_RESTRICTED_PURPOSE_UNCONTROLLED", "common", `purposes.${uncontrolled[0].key}`));
    }
    if (jurisdictions.some((key) => GDPR_FAMILY.has(key)) && !complete) {
      issues.push(issue("GDPR_CHILD_CONFIG_MISSING", "gdpr", "declarations.childDirected"));
    }
    if (jurisdictions.includes("dpdp") && !complete) {
      issues.push(issue("DPDP_CHILD_CONFIG_MISSING", "dpdp", "declarations.childDirected"));
    }
    if (jurisdictions.some((key) => CCPA_FAMILY.has(key)) && !complete) {
      issues.push(issue("CCPA_MINOR_CONFIG_MISSING", "ccpa", "declarations.childDirected"));
    }
    if (jurisdictions.includes("lgpd") && !complete) {
      issues.push(issue("LGPD_CHILD_CONFIG_MISSING", "lgpd", "declarations.childDirected"));
    }
  }

  const sensitivePurposes = snapshot.purposes.filter(isSensitivePurpose);
  const specialConfigured =
    snapshot.declarations.specialCategoryProcessing || sensitivePurposes.length > 0;
  if (specialConfigured && !text(snapshot.declarations.specialCategoryCondition)) {
    issues.push(issue("SENSITIVE_DATA_UNCONFIGURED", "common", "declarations.specialCategoryCondition"));
    if (jurisdictions.some((key) => GDPR_FAMILY.has(key))) {
      issues.push(issue("GDPR_SPECIAL_CATEGORY_INCOMPLETE", "gdpr", "declarations.specialCategoryCondition"));
    }
    if (jurisdictions.some((key) => CCPA_FAMILY.has(key))) {
      issues.push(issue("CCPA_SENSITIVE_PI_UNCONFIGURED", "ccpa", "declarations.specialCategoryCondition"));
    }
  }
  return issues;
}

function collectTransfers(snapshot: PolicyComplianceSnapshot, jurisdictions: string[]): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const inventory = snapshot.processingInventory;
  const transfers = (inventory?.transfers ?? []).map((row) => ({
    ...row,
    mechanism: parseTransferMechanism(row.mechanism),
  }));
  const processingIssues = collectProcessingIssues({
    websiteRegion: snapshot.website.defaultRegion,
    jurisdictions,
    internationalTransfersDeclared: snapshot.declarations.internationalTransfers,
    declarationTransferMechanism: snapshot.declarations.transferMechanism,
    dpaRequired: asRecord(asRecord(snapshot.organization.settings).processingInventory).dpaRequired === true,
    nowIso: new Date().toISOString(),
    vendors: snapshot.vendors.map((vendor) => ({
      id: vendor.id,
      key: vendor.id,
      name: vendor.name,
      legalName: null,
      role: parseVendorRole(vendor.role),
      country: vendor.country,
      processingCountries: parseStringList(vendor.processingCountries),
      privacyPolicyUrl: vendor.privacyPolicyUrl,
      dpaStatus: parseDpaStatus(vendor.dpaStatus),
      dpaReference: null,
      dpaEffectiveAt: null,
      downstreamDsarMode: parseDownstreamDsarMode(vendor.downstreamDsarMode),
      status: parseVendorStatus(vendor.status ?? "active"),
      purposes: [],
    })),
    activities: inventory?.activities ?? [],
    relationships: inventory?.relationships ?? [],
    transfers,
  });
  for (const row of processingIssues) {
    issues.push(issue(
      row.code as ComplianceRuleId,
      "common",
      row.field,
      row.message,
      row.severity,
    ));
  }

  const vendorCountries = snapshot.vendors
    .map((vendor) => text(vendor.country).toUpperCase())
    .filter(Boolean);
  const websiteRegion = text(snapshot.website.defaultRegion).toUpperCase();
  const suggestsTransfer =
    snapshot.declarations.internationalTransfers ||
    (websiteRegion.length === 2 && vendorCountries.some((country) => country && country !== websiteRegion));
  const inventoryCovers = inventoryCoversDeclaredTransfer({
    websiteRegion: snapshot.website.defaultRegion,
    jurisdictions,
    internationalTransfersDeclared: snapshot.declarations.internationalTransfers,
    declarationTransferMechanism: snapshot.declarations.transferMechanism,
    dpaRequired: false,
    nowIso: new Date().toISOString(),
    vendors: [],
    activities: [],
    relationships: [],
    transfers,
  });

  if (suggestsTransfer && !text(snapshot.declarations.transferMechanism) && !inventoryCovers) {
    issues.push(issue("TRANSFER_MECHANISM_MISSING", "common", "declarations.transferMechanism"));
    if (jurisdictions.includes("lgpd") && snapshot.declarations.internationalTransfers) {
      issues.push(issue("LGPD_TRANSFER_MECHANISM_MISSING", "lgpd", "declarations.transferMechanism"));
    }
  }
  return issues;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function collectGdpr(snapshot: PolicyComplianceSnapshot, jurisdiction: string): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  if (snapshot.banner.defaultConsent === "opt-out") {
    issues.push(issue("GDPR_PREGRANTED_OPTIONAL_CONSENT", jurisdiction, "banner.defaultConsent"));
  }
  if (!hasWithdrawalPath(snapshot) || !snapshot.banner.showRejectAll) {
    issues.push(issue("GDPR_MISSING_WITHDRAWAL", jurisdiction, "banner.showRejectAll"));
  }
  const rights = snapshot.rightsByJurisdiction[jurisdiction] ?? snapshot.rightsByJurisdiction.gdpr ?? [];
  if (CORE_GDPR_RIGHTS.some((right) => !rights.includes(right))) {
    issues.push(issue("GDPR_MISSING_RIGHTS", jurisdiction, "rights"));
  }
  if (snapshot.declarations.automatedDecisionMaking && !snapshot.declarations.profilingDisclosed) {
    issues.push(issue("GDPR_AUTOMATED_DECISION_MISSING", jurisdiction, "declarations.automatedDecisionMaking"));
  }
  for (const purpose of snapshot.purposes) {
    if (
      text(purpose.legalBasis) &&
      !GDPR_LAWFUL_BASES.includes(purpose.legalBasis as (typeof GDPR_LAWFUL_BASES)[number]) &&
      purpose.legalBasis !== "special_category"
    ) {
      issues.push(issue(
        "PURPOSE_WITHOUT_LEGAL_BASIS",
        jurisdiction,
        `purposes.${purpose.key}`,
        `Purpose ${purpose.key} uses an unrecognized lawful basis.`,
      ));
    }
  }
  return issues;
}

function collectDpdp(snapshot: PolicyComplianceSnapshot): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  if (snapshot.banner.defaultConsent === "opt-out") {
    issues.push(issue("DPDP_PREGRANTED_CONSENT", "dpdp", "banner.defaultConsent"));
  }
  if (!snapshot.banner.showCustomize && snapshot.purposes.some(purposeLooksOptional)) {
    issues.push(issue("DPDP_PREGRANTED_CONSENT", "dpdp", "banner.showCustomize"));
  }
  if (!hasWithdrawalPath(snapshot)) {
    issues.push(issue("DPDP_MISSING_WITHDRAWAL", "dpdp", "banner.showPreferenceWidget"));
  }
  for (const purpose of snapshot.purposes) {
    if (purposeLooksOptional(purpose) && (!purpose.dataCategories || purpose.dataCategories.length === 0)) {
      issues.push(issue("DPDP_NOTICE_MISSING_CATEGORY", "dpdp", `purposes.${purpose.key}`));
    }
  }
  const fiduciaryContact =
    text(snapshot.organization.dpoEmail) ||
    text(snapshot.organization.grievanceOfficerEmail) ||
    text(snapshot.organization.grievancePortalUrl);
  if (!text(snapshot.organization.name) || !fiduciaryContact) {
    issues.push(issue("DPDP_NOTICE_MISSING_FIDUCIARY", "dpdp", "organization.grievanceOfficerEmail"));
  }
  if (snapshot.declarations.consentManagerMode && !text(snapshot.declarations.consentManagerRegistrationId)) {
    issues.push(issue("DPDP_CONSENT_MANAGER_CONFIG_MISSING", "dpdp", "declarations.consentManagerRegistrationId"));
  }
  return issues;
}

function collectCcpa(snapshot: PolicyComplianceSnapshot, jurisdiction: string): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const hasSaleSharePurpose = snapshot.purposes.some(
    (purpose) => SALE_SHARE_RE.test(purpose.key) || SALE_SHARE_RE.test(purpose.name),
  );
  if (
    !snapshot.declarations.doNotSellEnabled &&
    !snapshot.declarations.doNotShareEnabled &&
    !hasSaleSharePurpose
  ) {
    issues.push(issue("CCPA_MISSING_DO_NOT_SELL_SHARE", jurisdiction, "declarations.doNotSellEnabled"));
  }
  if (!hasWithdrawalPath(snapshot)) {
    issues.push(issue("CCPA_MISSING_OPT_OUT", jurisdiction, "banner.showRejectAll"));
  }
  if (snapshot.declarations.gpcHonored && !snapshot.gpcRuntimeSupported) {
    issues.push(issue("CCPA_GPC_CLAIMED_WITHOUT_RUNTIME", jurisdiction, "declarations.gpcHonored"));
  }
  if (!snapshot.gpcRuntimeSupported) {
    issues.push(issue("CCPA_GPC_RUNTIME_UNSUPPORTED", jurisdiction, "runtime.gpc"));
  }
  if (!snapshot.optOutPropagationImplemented) {
    issues.push(issue("CCPA_OPT_OUT_PROPAGATION_UNSUPPORTED", jurisdiction, "runtime.optOutPropagation"));
  }
  for (const mapping of collectCaliforniaMappingIssues({
    doNotSellEnabled: snapshot.declarations.doNotSellEnabled,
    doNotShareEnabled: snapshot.declarations.doNotShareEnabled,
    limitSensitivePiEnabled: snapshot.declarations.limitSensitivePiEnabled,
    specialCategoryProcessing: snapshot.declarations.specialCategoryProcessing,
    hasSaleSharePurpose,
    vendors: snapshot.vendors,
    trackers: snapshot.trackers,
    activities: snapshot.processingInventory?.activities,
  })) {
    issues.push(issue(mapping.code as ComplianceRuleId, jurisdiction, mapping.field));
  }
  if (snapshot.declarations.financialIncentive && !snapshot.declarations.financialIncentiveDisclosed) {
    issues.push(issue(
      "NOTICE_DESCRIPTION_MISSING",
      jurisdiction,
      "declarations.financialIncentive",
      "A financial incentive is configured without notice disclosure.",
    ));
  }
  return issues;
}

function collectLgpd(snapshot: PolicyComplianceSnapshot): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  if (snapshot.banner.defaultConsent === "opt-out") {
    issues.push(issue("GDPR_PREGRANTED_OPTIONAL_CONSENT", "lgpd", "banner.defaultConsent"));
  }
  if (!hasWithdrawalPath(snapshot)) {
    issues.push(issue("LGPD_MISSING_WITHDRAWAL", "lgpd", "banner.showRejectAll"));
  }
  const rights = snapshot.rightsByJurisdiction.lgpd ?? [];
  if (CORE_LGPD_RIGHTS.some((right) => !rights.includes(right))) {
    issues.push(issue("LGPD_MISSING_RIGHT", "lgpd", "rights"));
  }
  if (snapshot.declarations.automatedDecisionMaking && !snapshot.declarations.profilingDisclosed) {
    issues.push(issue("LGPD_AUTOMATED_DECISION_MISSING", "lgpd", "declarations.automatedDecisionMaking"));
  }
  return issues;
}

export function defaultRightsByJurisdiction(keys: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of keys) {
    const mapped = key === "uk_gdpr" ? "gdpr" : key === "cpra" ? "ccpa" : key;
    out[key] = availableRightsForJurisdiction(mapped).availableTypes;
  }
  return out;
}

export function evaluatePolicyCompliance(
  snapshot: PolicyComplianceSnapshot,
): ComplianceValidationResult {
  void snapshot.version.isPublished;
  const jurisdictions = resolveApplicableJurisdictions({
    defaultRegulationKey: snapshot.website.defaultRegulationKey,
    assignedRegulationKeys: snapshot.assignedRegulationKeys,
  });
  const collected = [
    ...collectCommon(snapshot),
    ...collectTrackers(snapshot, jurisdictions),
    ...collectChildrenAndSensitive(snapshot, jurisdictions),
    ...collectTransfers(snapshot, jurisdictions),
  ];
  for (const key of jurisdictions) {
    if (GDPR_FAMILY.has(key)) collected.push(...collectGdpr(snapshot, key));
    if (key === "dpdp") collected.push(...collectDpdp(snapshot));
    if (CCPA_FAMILY.has(key)) collected.push(...collectCcpa(snapshot, key));
    if (key === "lgpd") collected.push(...collectLgpd(snapshot));
  }

  const seen = new Set<string>();
  const unique = collected.filter((row) => {
    const id = `${row.code}:${row.jurisdiction}:${row.field ?? ""}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const errors = unique.filter((row) => row.severity === "error");
  const warnings = unique.filter((row) => row.severity === "warning");
  return {
    valid: errors.length === 0,
    validatorVersion: COMPLIANCE_VALIDATOR_VERSION,
    jurisdictions,
    resultHash: hashValidationResult(errors, warnings),
    errors,
    warnings,
  };
}
