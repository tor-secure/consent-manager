import { locationsSuggestTransfer, transferRecordComplete } from "./regions";
import {
  dpaRequiresRecord,
  mechanismNeedsSafeguards,
  parseDpaStatus,
  parseTransferMechanism,
  parseVendorRole,
  vendorIsInactive,
  type FrozenActivity,
  type FrozenRelationship,
  type FrozenTransfer,
  type FrozenVendor,
} from "./types";

export type ProcessingIssue = {
  code: string;
  field: string;
  message?: string;
  severity: "error" | "warning";
};

export type ProcessingValidationInput = {
  websiteRegion: string | null;
  jurisdictions: string[];
  internationalTransfersDeclared: boolean;
  declarationTransferMechanism: string | null;
  dpaRequired: boolean;
  nowIso: string;
  vendors: FrozenVendor[];
  activities: FrozenActivity[];
  relationships: FrozenRelationship[];
  transfers: FrozenTransfer[];
};

function text(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function active<T extends { status: string }>(rows: T[]): T[] {
  return rows.filter((row) => row.status !== "archived");
}

export function inventoryCoversDeclaredTransfer(input: ProcessingValidationInput): boolean {
  return active(input.transfers).some((row) => transferRecordComplete(row));
}

export function collectProcessingIssues(input: ProcessingValidationInput): ProcessingIssue[] {
  const issues: ProcessingIssue[] = [];
  const gdprFamily = input.jurisdictions.some((key) => key === "gdpr" || key === "uk_gdpr");
  const requireDpa = input.dpaRequired || gdprFamily;
  const vendors = new Map(input.vendors.map((row) => [row.id, row]));
  const activeRelationships = active(input.relationships);
  const activeTransfers = active(input.transfers);
  const activeActivities = active(input.activities);

  for (const vendor of input.vendors) {
    const role = parseVendorRole(vendor.role);
    if (role === "unknown") {
      issues.push({
        code: "VENDOR_ROLE_MISSING",
        field: `vendors.${vendor.id}.role`,
        severity: "error",
      });
    }
    if (vendorIsInactive(vendor.status)) {
      issues.push({
        code: "INACTIVE_VENDOR_REFERENCED",
        field: `vendors.${vendor.id}.status`,
        severity: "error",
      });
    }
    if (dpaRequiresRecord(role) && parseDpaStatus(vendor.dpaStatus) === "not_configured" && requireDpa) {
      issues.push({
        code: "VENDOR_DPA_CONFIGURATION_MISSING",
        field: `vendors.${vendor.id}.dpaStatus`,
        severity: "error",
      });
    }
    if (role === "subprocessor") {
      const linked = activeRelationships.some(
        (row) =>
          row.childVendorId === vendor.id &&
          (row.relationshipType === "processor" || row.relationshipType === "subprocessor"),
      );
      if (!linked) {
        issues.push({
          code: "SUBPROCESSOR_RELATIONSHIP_MISSING",
          field: `vendors.${vendor.id}.relationships`,
          severity: "error",
        });
      }
    }
  }

  for (const activity of activeActivities) {
    if (!text(activity.purposeId)) {
      issues.push({
        code: "PROCESSING_ACTIVITY_PURPOSE_MISSING",
        field: `activities.${activity.id}.purposeId`,
        severity: "error",
      });
    }
    if (activity.dataCategories.length === 0) {
      issues.push({
        code: "PROCESSING_ACTIVITY_DATA_CATEGORY_MISSING",
        field: `activities.${activity.id}.dataCategories`,
        severity: "error",
      });
    }
    if (activity.processingRole === "subprocessor") {
      const linked = activeRelationships.some(
        (row) =>
          row.childVendorId === activity.vendorId &&
          (row.relationshipType === "processor" || row.relationshipType === "subprocessor"),
      );
      if (!linked) {
        issues.push({
          code: "SUBPROCESSOR_RELATIONSHIP_MISSING",
          field: `activities.${activity.id}.processingRole`,
          severity: "error",
        });
      }
    }
  }

  for (const transfer of activeTransfers) {
    if (!text(transfer.destinationCountry) && !text(transfer.destinationRegion)) {
      issues.push({
        code: "TRANSFER_DESTINATION_MISSING",
        field: `transfers.${transfer.id}.destinationCountry`,
        severity: "error",
      });
    }
    if (parseTransferMechanism(transfer.mechanism) === "not_configured") {
      issues.push({
        code: "TRANSFER_MECHANISM_MISSING",
        field: `transfers.${transfer.id}.mechanism`,
        severity: "error",
        message: "A recorded transfer is missing a transfer mechanism.",
      });
    }
    if (mechanismNeedsSafeguards(parseTransferMechanism(transfer.mechanism)) && !text(transfer.safeguards)) {
      issues.push({
        code: "TRANSFER_SAFEGUARD_MISSING",
        field: `transfers.${transfer.id}.safeguards`,
        severity: "error",
      });
    }
    if (transfer.reviewAt && transfer.reviewAt < input.nowIso) {
      issues.push({
        code: "TRANSFER_REVIEW_EXPIRED",
        field: `transfers.${transfer.id}.reviewAt`,
        severity: "warning",
      });
    }
  }

  for (const activity of activeActivities) {
    const vendor = vendors.get(activity.vendorId);
    const locations = [
      vendor?.country,
      ...(vendor?.processingCountries ?? []),
      activity.processingLocation,
    ];
    const needed =
      activity.transferRequired ||
      input.internationalTransfersDeclared ||
      locationsSuggestTransfer(input.websiteRegion, locations);
    if (!needed) continue;
    const covered = activeTransfers.some(
      (row) => row.vendorId === activity.vendorId && transferRecordComplete(row),
    );
    if (!covered) {
      issues.push({
        code: "TRANSFER_MECHANISM_MISSING",
        field: `activities.${activity.id}.transfer`,
        severity: "error",
        message: "A processing activity indicates a cross-border transfer without a complete transfer record.",
      });
    }
  }

  for (const vendor of input.vendors) {
    const locations = [vendor.country, ...vendor.processingCountries];
    const needed =
      input.internationalTransfersDeclared ||
      locationsSuggestTransfer(input.websiteRegion, locations);
    if (!needed) continue;
    const hasActivity = activeActivities.some((row) => row.vendorId === vendor.id);
    if (hasActivity) continue;
    const covered = activeTransfers.some(
      (row) => row.vendorId === vendor.id && transferRecordComplete(row),
    );
    if (!covered && !text(input.declarationTransferMechanism)) {
      issues.push({
        code: "TRANSFER_MECHANISM_MISSING",
        field: `vendors.${vendor.id}.transfer`,
        severity: "error",
        message: "Vendor location suggests a cross-border transfer without a complete transfer record.",
      });
    }
  }

  return issues;
}
