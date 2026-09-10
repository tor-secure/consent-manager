export const COMPLIANCE_VALIDATOR_VERSION = "1.3.0";

export type ComplianceSeverity = "error" | "warning";

export type ComplianceIssue = {
  code: string;
  severity: ComplianceSeverity;
  jurisdiction: string;
  field?: string;
  message: string;
  remediation?: string;
};

export type ComplianceValidationResult = {
  valid: boolean;
  validatorVersion: string;
  jurisdictions: string[];
  resultHash: string;
  errors: ComplianceIssue[];
  warnings: ComplianceIssue[];
};

export type ComplianceDeclarations = {
  childDirected: boolean;
  childAgeThreshold: number | null;
  guardianConsentRequired: boolean;
  automatedDecisionMaking: boolean;
  profilingDisclosed: boolean;
  specialCategoryProcessing: boolean;
  specialCategoryCondition: string | null;
  doNotSellEnabled: boolean;
  doNotShareEnabled: boolean;
  gpcHonored: boolean;
  limitSensitivePiEnabled: boolean;
  financialIncentive: boolean;
  financialIncentiveDisclosed: boolean;
  internationalTransfers: boolean;
  transferMechanism: string | null;
  consentManagerMode: boolean;
  consentManagerRegistrationId: string | null;
  serviceProviderDisclosed: boolean;
};

export type PolicyComplianceSnapshot = {
  policy: {
    id: string;
    name: string;
    websiteId: string;
    organizationId: string;
  };
  website: {
    id: string;
    name: string;
    defaultRegulationKey: string | null;
    defaultRegion: string | null;
  };
  childProtection?: {
    enabled: boolean;
    childDirected: boolean;
    ageAssuranceRequired: boolean;
    minimumAge: number | null;
    guardianConsentRequired: boolean;
    restrictedPurposeKeys: string[];
  };
  organization: {
    id: string;
    name: string;
    dpoName: string | null;
    dpoEmail: string | null;
    grievanceOfficerName: string | null;
    grievanceOfficerEmail: string | null;
    grievancePortalUrl: string | null;
    settings: Record<string, unknown>;
  };
  version: {
    id: string;
    version: number;
    isPublished: boolean;
  };
  banner: {
    title: string;
    description: string;
    privacyPolicyUrl: string;
    defaultConsent: "opt-in" | "opt-out" | "none";
    showRejectAll: boolean;
    showCustomize: boolean;
    showPreferenceWidget: boolean;
    showPurposeDescriptions: boolean;
    showVendorList: boolean;
    preferenceCenterDescription: string;
  };
  declarations: ComplianceDeclarations;
  purposes: Array<{
    id: string;
    key: string;
    name: string;
    description: string | null;
    isRequired: boolean;
    legalBasis: string | null;
    dataCategories: string[] | null;
    retentionPeriod: string | null;
  }>;
  vendors: Array<{
    id: string;
    name: string;
    privacyPolicyUrl: string | null;
    country: string | null;
    role?: string | null;
    status?: string | null;
    processingCountries?: string[];
    dpaStatus?: string | null;
    dpaReviewAt?: string | null;
    downstreamDsarMode?: string | null;
    ccpaSale?: string | null;
    ccpaShare?: string | null;
    ccpaSensitivePi?: string | null;
  }>;
  processingInventory?: {
    activities: Array<{
      id: string;
      vendorId: string;
      websiteId: string | null;
      purposeId: string | null;
      purposeKey: string | null;
      description: string | null;
      dataCategories: string[];
      sensitive: boolean;
      processingRole: string;
      processingLocation: string | null;
      transferRequired: boolean;
      legalBasis: string | null;
      status: string;
    }>;
    relationships: Array<{
      id: string;
      parentVendorId: string;
      childVendorId: string;
      relationshipType: string;
      status: string;
    }>;
    transfers: Array<{
      id: string;
      vendorId: string;
      websiteId: string | null;
      processingActivityId: string | null;
      sourceCountry: string | null;
      destinationCountry: string | null;
      destinationRegion: string | null;
      destinationType: string;
      transferPurpose: string | null;
      dataCategories: string[];
      processingLocation: string | null;
      mechanism: string;
      safeguards: string | null;
      documentationRef: string | null;
      effectiveAt: string | null;
      reviewAt: string | null;
      status: string;
    }>;
  };
  trackers: Array<{
    id: string;
    name: string;
    status: string;
    isEssential: boolean;
    purposeId: string | null;
    vendorId: string | null;
    scannerClassification: string;
    ccpaSale?: string | null;
    ccpaShare?: string | null;
    ccpaSensitivePi?: string | null;
  }>;
  consentIntegrations: {
    iabTcfEnabled: boolean;
    iabGppEnabled: boolean;
  };
  assignedRegulationKeys: string[];
  rightsByJurisdiction: Record<string, string[]>;
  gpcRuntimeSupported: boolean;
  optOutPropagationImplemented: boolean;
};

export const GDPR_LAWFUL_BASES = [
  "consent",
  "contract",
  "legal_obligation",
  "vital_interests",
  "public_task",
  "legitimate_interests",
] as const;

const LAWFUL_BASIS_ALIASES: Record<string, (typeof GDPR_LAWFUL_BASES)[number]> = {
  legitimate_interest: "legitimate_interests",
  vital_interest: "vital_interests",
};

export function normalizeLawfulBasis(value: string | null | undefined): string {
  const key = String(value ?? "").trim().toLowerCase();
  return LAWFUL_BASIS_ALIASES[key] ?? key;
}

export const COMPLIANCE_AUDIT_ACTIONS = {
  validated: "POLICY_COMPLIANCE_VALIDATED",
  publishRejected: "POLICY_PUBLISH_REJECTED",
  publishAccepted: "POLICY_PUBLISH_ACCEPTED",
} as const;
