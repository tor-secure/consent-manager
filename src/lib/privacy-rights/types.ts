export const RIGHTS_REQUEST_TYPES = [
  "access",
  "correction",
  "erasure",
  "portability",
  "objection",
  "restriction",
  "withdraw_consent",
  "grievance",
  "nomination",
] as const;

export type RightsRequestType = (typeof RIGHTS_REQUEST_TYPES)[number];

export const RIGHTS_REQUEST_STATUSES = [
  "received",
  "verification_pending",
  "verified",
  "in_review",
  "acknowledged",
  "in_progress",
  "completed",
  "rejected",
  "expired",
  "cancelled",
] as const;

export type RightsRequestStatus = (typeof RIGHTS_REQUEST_STATUSES)[number];

export const VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "failed",
  "expired",
  "rejected",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const VERIFICATION_METHODS = [
  "email_token",
  "staff_attested",
  "agent_attested",
] as const;

export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const REQUESTER_KINDS = ["direct_requester", "authorized_agent"] as const;
export type RequesterKind = (typeof REQUESTER_KINDS)[number];

export const DEADLINE_KINDS = ["configured_target", "legacy_dpdp_default"] as const;
export type DeadlineKind = (typeof DEADLINE_KINDS)[number];

export const VERIFICATION_PURPOSES = ["identity", "status", "agent"] as const;
export type VerificationPurpose = (typeof VERIFICATION_PURPOSES)[number];

export const EXPORT_KINDS = ["access", "portability"] as const;
export type RightsExportKind = (typeof EXPORT_KINDS)[number];

export const RIGHTS_JURISDICTIONS = ["dpdp", "gdpr", "ccpa", "lgpd"] as const;
export type RightsJurisdiction = (typeof RIGHTS_JURISDICTIONS)[number];

export const TERMINAL_RIGHTS_STATUSES = [
  "completed",
  "rejected",
  "expired",
  "cancelled",
] as const;

export const RIGHTS_AUDIT_ACTIONS = {
  created: "RIGHTS_REQUEST_CREATED",
  verificationSent: "RIGHTS_REQUEST_VERIFICATION_SENT",
  verified: "RIGHTS_REQUEST_VERIFIED",
  verificationFailed: "RIGHTS_REQUEST_VERIFICATION_FAILED",
  rejected: "RIGHTS_REQUEST_REJECTED",
  statusChanged: "RIGHTS_REQUEST_STATUS_CHANGED",
  exportCreated: "RIGHTS_REQUEST_EXPORT_CREATED",
  dataDiscovered: "RIGHTS_REQUEST_DATA_DISCOVERED",
  deletionExecuted: "RIGHTS_REQUEST_DELETION_EXECUTED",
  completed: "RIGHTS_REQUEST_COMPLETED",
  cancelled: "RIGHTS_REQUEST_CANCELLED",
  agentAuthorized: "RIGHTS_REQUEST_AGENT_AUTHORIZED",
  correctionApplied: "RIGHTS_REQUEST_CORRECTION_APPLIED",
  withdrawInvoked: "RIGHTS_REQUEST_WITHDRAW_INVOKED",
  assigned: "RIGHTS_REQUEST_ASSIGNED",
  downstreamUpdated: "DOWNSTREAM_REQUEST_UPDATED",
} as const;

export const DOWNSTREAM_ACTION_DISCLAIMER =
  "Downstream vendor action status is operator-recorded orchestration only. This CMP does not claim that it performed, verified, or completed an external vendor's deletion or correction.";

export const MAX_VERIFICATION_ATTEMPTS = 5;
export const IDENTITY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
export const STATUS_TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;
export const EXPORT_TTL_MS = 24 * 60 * 60 * 1000;

export const PUBLIC_STATUS_LABELS = {
  received: "request received",
  verification_pending: "verification required",
  verified: "verified",
  in_review: "under review",
  acknowledged: "under review",
  in_progress: "in progress",
  completed: "completed",
  rejected: "rejected",
  expired: "expired",
  cancelled: "cancelled",
} as const;

export function isRightsRequestType(value: unknown): value is RightsRequestType {
  return typeof value === "string" && (RIGHTS_REQUEST_TYPES as readonly string[]).includes(value);
}

export function isRightsRequestStatus(value: unknown): value is RightsRequestStatus {
  return typeof value === "string" && (RIGHTS_REQUEST_STATUSES as readonly string[]).includes(value);
}

export function isVerificationStatus(value: unknown): value is VerificationStatus {
  return typeof value === "string" && (VERIFICATION_STATUSES as readonly string[]).includes(value);
}

export function isRightsJurisdiction(value: unknown): value is RightsJurisdiction {
  return typeof value === "string" && (RIGHTS_JURISDICTIONS as readonly string[]).includes(value);
}

export function isTerminalRightsStatus(value: string): boolean {
  return (TERMINAL_RIGHTS_STATUSES as readonly string[]).includes(value);
}

export function isRequesterKind(value: unknown): value is RequesterKind {
  return typeof value === "string" && (REQUESTER_KINDS as readonly string[]).includes(value);
}
