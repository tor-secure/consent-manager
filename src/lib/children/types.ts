export const AGE_STATUSES = [
  "unknown",
  "asserted",
  "assured",
  "minor",
  "child",
  "age_restricted",
  "guardian_required",
  "guardian_verified",
  "expired",
  "failed",
] as const;

export type AgeStatus = (typeof AGE_STATUSES)[number];

export const AGE_BANDS = ["unknown", "child", "minor", "adult"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export const ASSURANCE_METHODS = [
  "self_declaration",
  "account_age",
  "third_party_assurance",
  "staff_verification",
  "guardian_verification",
] as const;

export type AssuranceMethod = (typeof ASSURANCE_METHODS)[number];

export const GUARDIAN_STATUSES = [
  "none",
  "contact_supplied",
  "pending",
  "contact_verified",
  "authority_unverified",
  "verified",
  "failed",
  "expired",
] as const;

export type GuardianStatus = (typeof GUARDIAN_STATUSES)[number];

export const MINIMUM_ASSURANCE_LEVELS = [
  "self_declaration",
  "assured",
  "guardian",
] as const;

export type MinimumAssuranceLevel = (typeof MINIMUM_ASSURANCE_LEVELS)[number];

export type ChildProtectionConfig = {
  enabled: boolean;
  childDirected: boolean;
  ageAssuranceRequired: boolean;
  minimumAge: number | null;
  childMaxAge: number | null;
  guardianConsentRequired: boolean;
  restrictedPurposeKeys: string[];
  minimumAssurance: MinimumAssuranceLevel;
  sessionTtlHours: number;
};

export const DEFAULT_RESTRICTED_PURPOSE_KEYS = [
  "advertising",
  "ads",
  "marketing",
  "personalization",
  "sale_share",
  "targeting",
  "social",
  "profiling",
];

export const CHILD_AUDIT_ACTIONS = {
  started: "AGE_ASSURANCE_STARTED",
  completed: "AGE_ASSURANCE_COMPLETED",
  failed: "AGE_ASSURANCE_FAILED",
  minorIdentified: "MINOR_IDENTIFIED",
  guardianCreated: "GUARDIAN_REQUEST_CREATED",
  guardianSent: "GUARDIAN_VERIFICATION_SENT",
  guardianVerified: "GUARDIAN_VERIFIED",
  guardianFailed: "GUARDIAN_VERIFICATION_FAILED",
  guardianExpired: "GUARDIAN_VERIFICATION_EXPIRED",
  restrictionApplied: "CHILD_RESTRICTION_APPLIED",
  restrictionRemoved: "CHILD_RESTRICTION_REMOVED",
} as const;

export const MAX_GUARDIAN_ATTEMPTS = 5;
export const GUARDIAN_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_SESSION_TTL_HOURS = 24 * 90;
