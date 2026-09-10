export const VENDOR_ROLES = [
  "controller",
  "processor",
  "subprocessor",
  "independent_controller",
  "joint_controller",
  "service_provider",
  "third_party",
  "unknown",
] as const;

export type VendorRole = (typeof VENDOR_ROLES)[number];

export const VENDOR_STATUSES = ["active", "inactive", "archived"] as const;
export type VendorStatus = (typeof VENDOR_STATUSES)[number];

export const DPA_STATUSES = [
  "not_configured",
  "recorded",
  "expired",
  "not_applicable",
] as const;
export type DpaStatus = (typeof DPA_STATUSES)[number];

export const DOWNSTREAM_DSAR_MODES = ["not_required", "required"] as const;
export type DownstreamDsarMode = (typeof DOWNSTREAM_DSAR_MODES)[number];

export const RELATIONSHIP_TYPES = ["processor", "subprocessor"] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const TRANSFER_MECHANISMS = [
  "not_configured",
  "adequacy",
  "scc",
  "bcr",
  "derogation",
  "consent",
  "other",
] as const;
export type TransferMechanism = (typeof TRANSFER_MECHANISMS)[number];

export const TRANSFER_DESTINATION_TYPES = ["vendor", "affiliate", "subprocessor"] as const;

export const INVENTORY_STATUSES = ["active", "inactive", "archived"] as const;

export const DOWNSTREAM_ACTION_STATUSES = [
  "not_required",
  "required",
  "pending",
  "sent",
  "acknowledged",
  "completed",
  "failed",
  "manually_handled",
] as const;
export type DownstreamActionStatus = (typeof DOWNSTREAM_ACTION_STATUSES)[number];

export const PROCESSING_SNAPSHOT_SCHEMA_VERSION = 1;

export const PROCESSING_AUDIT_ACTIONS = {
  vendorCreated: "VENDOR_CREATED",
  vendorUpdated: "VENDOR_UPDATED",
  vendorArchived: "VENDOR_ARCHIVED",
  vendorRoleChanged: "VENDOR_ROLE_CHANGED",
  activityCreated: "PROCESSING_ACTIVITY_CREATED",
  activityUpdated: "PROCESSING_ACTIVITY_UPDATED",
  activityArchived: "PROCESSING_ACTIVITY_ARCHIVED",
  transferCreated: "TRANSFER_CREATED",
  transferUpdated: "TRANSFER_UPDATED",
  transferArchived: "TRANSFER_ARCHIVED",
  dpaChanged: "DPA_STATUS_CHANGED",
  relationshipCreated: "VENDOR_RELATIONSHIP_CREATED",
  relationshipUpdated: "VENDOR_RELATIONSHIP_UPDATED",
  downstreamRequested: "DOWNSTREAM_REQUEST_CREATED",
  downstreamUpdated: "DOWNSTREAM_REQUEST_UPDATED",
} as const;

export type FrozenVendorPurpose = {
  purposeId: string;
  purposeKey: string | null;
  processingRole: string | null;
};

export type FrozenVendor = {
  id: string;
  key: string;
  name: string;
  legalName: string | null;
  role: VendorRole;
  country: string | null;
  processingCountries: string[];
  privacyPolicyUrl: string | null;
  dpaStatus: DpaStatus;
  dpaReference: string | null;
  dpaEffectiveAt: string | null;
  downstreamDsarMode: DownstreamDsarMode;
  status: VendorStatus;
  purposes: FrozenVendorPurpose[];
};

export type FrozenActivity = {
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
};

export type FrozenRelationship = {
  id: string;
  parentVendorId: string;
  childVendorId: string;
  relationshipType: string;
  status: string;
};

export type FrozenTransfer = {
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
  mechanism: TransferMechanism;
  safeguards: string | null;
  documentationRef: string | null;
  effectiveAt: string | null;
  reviewAt: string | null;
  status: string;
};

export type FrozenProcessingSnapshot = {
  schemaVersion: typeof PROCESSING_SNAPSHOT_SCHEMA_VERSION;
  frozenAt: string;
  policyVersionId: string;
  policyVersion: number;
  vendors: FrozenVendor[];
  activities: FrozenActivity[];
  relationships: FrozenRelationship[];
  transfers: FrozenTransfer[];
};

export type ProcessingInventoryInput = {
  vendors: FrozenVendor[];
  activities: FrozenActivity[];
  relationships: FrozenRelationship[];
  transfers: FrozenTransfer[];
};

function asMember<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
): T[number] {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;
}

export function parseVendorRole(value: unknown): VendorRole {
  return asMember(value, VENDOR_ROLES, "unknown");
}

export function parseVendorStatus(value: unknown): VendorStatus {
  return asMember(value, VENDOR_STATUSES, "active");
}

export function parseDpaStatus(value: unknown): DpaStatus {
  return asMember(value, DPA_STATUSES, "not_configured");
}

export function parseDownstreamDsarMode(value: unknown): DownstreamDsarMode {
  return asMember(value, DOWNSTREAM_DSAR_MODES, "not_required");
}

export function parseTransferMechanism(value: unknown): TransferMechanism {
  return asMember(value, TRANSFER_MECHANISMS, "not_configured");
}

export function parseRelationshipType(value: unknown): RelationshipType | null {
  return typeof value === "string" && (RELATIONSHIP_TYPES as readonly string[]).includes(value)
    ? (value as RelationshipType)
    : null;
}

export function parseDownstreamActionStatus(value: unknown): DownstreamActionStatus | null {
  return typeof value === "string" && (DOWNSTREAM_ACTION_STATUSES as readonly string[]).includes(value)
    ? (value as DownstreamActionStatus)
    : null;
}

export function parseStringList(value: unknown, max = 40): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item ?? "").trim()).filter((item) => item.length > 0 && item.length <= 120))].slice(0, max);
}

export function isoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function dpaRequiresRecord(role: VendorRole): boolean {
  return role === "processor" || role === "subprocessor";
}

export function mechanismNeedsSafeguards(mechanism: TransferMechanism): boolean {
  return mechanism === "scc" || mechanism === "bcr" || mechanism === "derogation" || mechanism === "other";
}

export function vendorIsInactive(status: string, deletedAt?: Date | string | null): boolean {
  return status === "inactive" || status === "archived" || Boolean(deletedAt);
}
