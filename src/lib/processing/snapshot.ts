import {
  PROCESSING_SNAPSHOT_SCHEMA_VERSION,
  parseDpaStatus,
  parseDownstreamDsarMode,
  parseStringList,
  parseTransferMechanism,
  parseVendorRole,
  parseVendorStatus,
  type FrozenActivity,
  type FrozenProcessingSnapshot,
  type FrozenRelationship,
  type FrozenTransfer,
  type FrozenVendor,
  type ProcessingInventoryInput,
} from "./types";

function sortById<T extends { id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.id.localeCompare(b.id));
}

function text(value: string | null | undefined): string | null {
  const next = String(value ?? "").trim();
  return next.length > 0 ? next : null;
}

export function minimizeVendor(input: FrozenVendor): FrozenVendor {
  return {
    id: input.id,
    key: input.key,
    name: input.name,
    legalName: text(input.legalName),
    role: parseVendorRole(input.role),
    country: text(input.country),
    processingCountries: parseStringList(input.processingCountries),
    privacyPolicyUrl: text(input.privacyPolicyUrl),
    dpaStatus: parseDpaStatus(input.dpaStatus),
    dpaReference: text(input.dpaReference),
    dpaEffectiveAt: input.dpaEffectiveAt,
    downstreamDsarMode: parseDownstreamDsarMode(input.downstreamDsarMode),
    status: parseVendorStatus(input.status),
    purposes: [...input.purposes]
      .map((row) => ({
        purposeId: row.purposeId,
        purposeKey: text(row.purposeKey),
        processingRole: text(row.processingRole),
      }))
      .sort((a, b) => a.purposeId.localeCompare(b.purposeId)),
  };
}

export function minimizeActivity(input: FrozenActivity): FrozenActivity {
  return {
    id: input.id,
    vendorId: input.vendorId,
    websiteId: text(input.websiteId),
    purposeId: text(input.purposeId),
    purposeKey: text(input.purposeKey),
    description: text(input.description),
    dataCategories: parseStringList(input.dataCategories),
    sensitive: input.sensitive === true,
    processingRole: String(input.processingRole ?? "unknown"),
    processingLocation: text(input.processingLocation),
    transferRequired: input.transferRequired === true,
    legalBasis: text(input.legalBasis),
    status: String(input.status ?? "active"),
  };
}

export function minimizeRelationship(input: FrozenRelationship): FrozenRelationship {
  return {
    id: input.id,
    parentVendorId: input.parentVendorId,
    childVendorId: input.childVendorId,
    relationshipType: String(input.relationshipType),
    status: String(input.status ?? "active"),
  };
}

export function minimizeTransfer(input: FrozenTransfer): FrozenTransfer {
  return {
    id: input.id,
    vendorId: input.vendorId,
    websiteId: text(input.websiteId),
    processingActivityId: text(input.processingActivityId),
    sourceCountry: text(input.sourceCountry),
    destinationCountry: text(input.destinationCountry),
    destinationRegion: text(input.destinationRegion),
    destinationType: String(input.destinationType ?? "vendor"),
    transferPurpose: text(input.transferPurpose),
    dataCategories: parseStringList(input.dataCategories),
    processingLocation: text(input.processingLocation),
    mechanism: parseTransferMechanism(input.mechanism),
    safeguards: text(input.safeguards),
    documentationRef: text(input.documentationRef),
    effectiveAt: input.effectiveAt,
    reviewAt: input.reviewAt,
    status: String(input.status ?? "active"),
  };
}

export function buildProcessingSnapshot(input: {
  frozenAt?: string;
  policyVersionId: string;
  policyVersion: number;
  inventory: ProcessingInventoryInput;
}): FrozenProcessingSnapshot {
  return {
    schemaVersion: PROCESSING_SNAPSHOT_SCHEMA_VERSION,
    frozenAt: input.frozenAt ?? new Date().toISOString(),
    policyVersionId: input.policyVersionId,
    policyVersion: input.policyVersion,
    vendors: sortById(input.inventory.vendors.map(minimizeVendor)),
    activities: sortById(input.inventory.activities.map(minimizeActivity)),
    relationships: sortById(input.inventory.relationships.map(minimizeRelationship)),
    transfers: sortById(input.inventory.transfers.map(minimizeTransfer)),
  };
}

export function isFrozenProcessingSnapshot(value: unknown): value is FrozenProcessingSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return (
    row.schemaVersion === PROCESSING_SNAPSHOT_SCHEMA_VERSION &&
    typeof row.frozenAt === "string" &&
    typeof row.policyVersionId === "string" &&
    typeof row.policyVersion === "number" &&
    Array.isArray(row.vendors) &&
    Array.isArray(row.activities) &&
    Array.isArray(row.relationships) &&
    Array.isArray(row.transfers)
  );
}

export function evidenceProcessingInventory(
  snapshot: FrozenProcessingSnapshot,
): Record<string, unknown> {
  return {
    schemaVersion: snapshot.schemaVersion,
    frozenAt: snapshot.frozenAt,
    policyVersionId: snapshot.policyVersionId,
    policyVersion: snapshot.policyVersion,
    vendors: snapshot.vendors.map((vendor) => ({
      id: vendor.id,
      key: vendor.key,
      name: vendor.name,
      role: vendor.role,
      country: vendor.country,
      processingCountries: vendor.processingCountries,
      dpaStatus: vendor.dpaStatus,
      downstreamDsarMode: vendor.downstreamDsarMode,
      purposes: vendor.purposes,
    })),
    activities: snapshot.activities.map((activity) => ({
      id: activity.id,
      vendorId: activity.vendorId,
      purposeId: activity.purposeId,
      purposeKey: activity.purposeKey,
      dataCategories: activity.dataCategories,
      processingRole: activity.processingRole,
      processingLocation: activity.processingLocation,
      transferRequired: activity.transferRequired,
    })),
    relationships: snapshot.relationships.map((row) => ({
      id: row.id,
      parentVendorId: row.parentVendorId,
      childVendorId: row.childVendorId,
      relationshipType: row.relationshipType,
    })),
    transfers: snapshot.transfers.map((row) => ({
      id: row.id,
      vendorId: row.vendorId,
      destinationCountry: row.destinationCountry,
      destinationRegion: row.destinationRegion,
      mechanism: row.mechanism,
      safeguards: row.safeguards,
    })),
  };
}

export function cloneFrozenSnapshot(snapshot: FrozenProcessingSnapshot): FrozenProcessingSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as FrozenProcessingSnapshot;
}
