export const COMPLIANCE_VALIDATOR_VERSION = "1.1.0";

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
  }>;
  trackers: Array<{
    id: string;
    name: string;
    status: string;
    isEssential: boolean;
    purposeId: string | null;
    vendorId: string | null;
    scannerClassification: string;
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

export const COMPLIANCE_AUDIT_ACTIONS = {
  validated: "POLICY_COMPLIANCE_VALIDATED",
  publishRejected: "POLICY_PUBLISH_REJECTED",
  publishAccepted: "POLICY_PUBLISH_ACCEPTED",
} as const;
