import { parseCcpaApplicability, type CcpaApplicability } from "./types";

export type CaliforniaMappingIssue = {
  code: string;
  field: string;
  severity: "error" | "warning";
};

export type CaliforniaValidationInput = {
  doNotSellEnabled: boolean;
  doNotShareEnabled: boolean;
  limitSensitivePiEnabled: boolean;
  specialCategoryProcessing: boolean;
  hasSaleSharePurpose: boolean;
  vendors: Array<{
    id: string;
    status?: string | null;
    ccpaSale?: CcpaApplicability | string | null;
    ccpaShare?: CcpaApplicability | string | null;
    ccpaSensitivePi?: CcpaApplicability | string | null;
  }>;
  trackers: Array<{
    id: string;
    status: string;
    isEssential: boolean;
    ccpaSale?: CcpaApplicability | string | null;
    ccpaShare?: CcpaApplicability | string | null;
    ccpaSensitivePi?: CcpaApplicability | string | null;
  }>;
  activities?: Array<{
    id: string;
    status: string;
    sensitive?: boolean;
    ccpaSensitivePi?: CcpaApplicability | string | null;
  }>;
};

function active<T extends { status?: string | null }>(rows: T[]): T[] {
  return rows.filter((row) => row.status !== "archived" && row.status !== "inactive" && row.status !== "disabled");
}

export function collectCaliforniaMappingIssues(input: CaliforniaValidationInput): CaliforniaMappingIssue[] {
  const issues: CaliforniaMappingIssue[] = [];
  if (!input.doNotSellEnabled && !input.hasSaleSharePurpose) {
    issues.push({
      code: "CCPA_SALE_OPT_OUT_UNCONFIGURED",
      field: "declarations.doNotSellEnabled",
      severity: "error",
    });
  }
  if (!input.doNotShareEnabled && !input.hasSaleSharePurpose) {
    issues.push({
      code: "CCPA_SHARE_OPT_OUT_UNCONFIGURED",
      field: "declarations.doNotShareEnabled",
      severity: "error",
    });
  }

  const sensitiveConfigured =
    input.specialCategoryProcessing ||
    active(input.vendors).some((row) => parseCcpaApplicability(row.ccpaSensitivePi) === "applicable") ||
    active(input.trackers).some((row) => parseCcpaApplicability(row.ccpaSensitivePi) === "applicable") ||
    (input.activities ?? []).some(
      (row) =>
        row.status === "active" &&
        (row.sensitive === true || parseCcpaApplicability(row.ccpaSensitivePi) === "applicable"),
    );
  if (sensitiveConfigured && !input.limitSensitivePiEnabled) {
    issues.push({
      code: "CCPA_SENSITIVE_PI_CONTROL_UNCONFIGURED",
      field: "declarations.limitSensitivePiEnabled",
      severity: "error",
    });
  }

  const optOutConfigured = input.doNotSellEnabled || input.doNotShareEnabled || input.hasSaleSharePurpose;
  if (optOutConfigured) {
    const unmappedVendors = active(input.vendors).filter((row) => {
      const sale = parseCcpaApplicability(row.ccpaSale);
      const share = parseCcpaApplicability(row.ccpaShare);
      return sale === "unknown" && share === "unknown";
    });
    if (unmappedVendors.length > 0) {
      issues.push({
        code: "CCPA_OPT_OUT_VENDOR_MAPPING_MISSING",
        field: `vendors.${unmappedVendors[0].id}.ccpaSale`,
        severity: "error",
      });
    }
    const unmappedTrackers = active(input.trackers).filter((row) => {
      if (row.isEssential) return false;
      const sale = parseCcpaApplicability(row.ccpaSale);
      const share = parseCcpaApplicability(row.ccpaShare);
      return sale === "unknown" && share === "unknown";
    });
    if (unmappedTrackers.length > 0) {
      issues.push({
        code: "CCPA_OPT_OUT_TRACKER_MAPPING_MISSING",
        field: `trackers.${unmappedTrackers[0].id}.ccpaSale`,
        severity: "error",
      });
    }
  }

  return issues;
}
