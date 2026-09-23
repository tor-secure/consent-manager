import {
  isRightsJurisdiction,
  type RightsJurisdiction,
  type RightsRequestType,
} from "./types";

export type RightsApplicability = {
  jurisdiction: RightsJurisdiction;
  availableTypes: RightsRequestType[];
  notes: string;
};

const JURISDICTION_RIGHTS: Record<RightsJurisdiction, RightsRequestType[]> = {
  dpdp: [
    "access",
    "correction",
    "erasure",
    "portability",
    "objection",
    "restriction",
    "withdraw_consent",
    "grievance",
    "nomination",
  ],
  gdpr: [
    "access",
    "correction",
    "erasure",
    "portability",
    "objection",
    "restriction",
    "withdraw_consent",
  ],
  ccpa: [
    "access",
    "correction",
    "erasure",
    "portability",
    "objection",
    "withdraw_consent",
  ],
  lgpd: [
    "access",
    "correction",
    "erasure",
    "portability",
    "objection",
    "restriction",
    "withdraw_consent",
  ],
};

export function normalizeRightsJurisdiction(value: unknown): RightsJurisdiction {
  if (typeof value !== "string") return "dpdp";
  const key = value.trim().toLowerCase();
  if (key === "uk_gdpr") return "gdpr";
  if (key === "cpra") return "ccpa";
  return isRightsJurisdiction(key) ? key : "dpdp";
}

export function availableRightsForJurisdiction(
  jurisdiction: unknown,
): RightsApplicability {
  const key = normalizeRightsJurisdiction(jurisdiction);
  return {
    jurisdiction: key,
    availableTypes: [...JURISDICTION_RIGHTS[key]],
    notes:
      "Configured applicability only. Whether a right must be honoured for a specific request depends on the customer's applicable law and exemptions.",
  };
}

export function isRightAvailable(
  jurisdiction: unknown,
  requestType: RightsRequestType,
): boolean {
  return availableRightsForJurisdiction(jurisdiction).availableTypes.includes(
    requestType,
  );
}

export function snapshotJurisdiction(jurisdiction: unknown) {
  const applicability = availableRightsForJurisdiction(jurisdiction);
  return {
    jurisdiction: applicability.jurisdiction,
    availableTypes: applicability.availableTypes,
    capturedAt: new Date().toISOString(),
    deadlineKind: "configured_target" as const,
    legalMandateClaimed: false,
    notes: applicability.notes,
  };
}
