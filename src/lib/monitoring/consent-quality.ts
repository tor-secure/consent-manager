import type { FindingSeverity } from "./drift-engine";

export const QUALITY_WEIGHTS = {
  trackerCoverage: 20,
  vendorMapping: 15,
  purposeMapping: 15,
  enforcement: 15,
  privacyDrift: 15,
  evidence: 10,
  scannerFreshness: 10,
} as const;

export type QualityCategory = "excellent" | "good" | "needs_attention" | "poor";

export type QualityDimension = {
  key: keyof typeof QUALITY_WEIGHTS;
  label: string;
  score: number;
  weight: number;
  lost: string[];
};

export type ConsentQualityScore = {
  overall: number;
  category: QualityCategory;
  dimensions: QualityDimension[];
  lostPoints: string[];
  disclaimer: string;
};

export type ConsentQualityInput = {
  thirdPartyScanItems: number;
  scanItemsWithActiveTracker: number;
  nonEssentialTrackers: number;
  trackersWithVendor: number;
  trackersWithPurpose: number;
  consentControlledTrackers: number;
  enforcibleTrackers: number;
  openFindings: { severity: FindingSeverity; findingType: string }[];
  hasPublishedPolicy: boolean;
  consentExpireDays: number | null;
  consentRecordCount: number;
  lastCompletedScanAt: Date | null;
  now?: Date;
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function ratioScore(numerator: number, denominator: number): number {
  if (denominator <= 0) return 100;
  return clamp((numerator / denominator) * 100);
}

export function qualityCategory(overall: number): QualityCategory {
  if (overall >= 90) return "excellent";
  if (overall >= 75) return "good";
  if (overall >= 50) return "needs_attention";
  return "poor";
}

export function qualityCategoryLabel(category: QualityCategory): string {
  if (category === "excellent") return "Excellent";
  if (category === "good") return "Good";
  if (category === "needs_attention") return "Needs attention";
  return "Poor";
}

function daysBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / 86_400_000;
}

export function calculateConsentQualityScore(input: ConsentQualityInput): ConsentQualityScore {
  const now = input.now ?? new Date();
  const lostPoints: string[] = [];

  const trackerCoverage = ratioScore(
    input.scanItemsWithActiveTracker,
    input.thirdPartyScanItems,
  );
  const trackerLost: string[] = [];
  if (input.thirdPartyScanItems > 0 && trackerCoverage < 100) {
    trackerLost.push(
      `${input.thirdPartyScanItems - input.scanItemsWithActiveTracker} scanned third-party item(s) have no active tracker rule`,
    );
  }

  const vendorMapping = ratioScore(input.trackersWithVendor, input.nonEssentialTrackers);
  const vendorLost: string[] = [];
  if (input.nonEssentialTrackers > 0 && vendorMapping < 100) {
    vendorLost.push(
      `${input.nonEssentialTrackers - input.trackersWithVendor} non-essential tracker(s) have no vendor`,
    );
  }

  const purposeMapping = ratioScore(input.trackersWithPurpose, input.nonEssentialTrackers);
  const purposeLost: string[] = [];
  if (input.nonEssentialTrackers > 0 && purposeMapping < 100) {
    purposeLost.push(
      `${input.nonEssentialTrackers - input.trackersWithPurpose} non-essential tracker(s) have no purpose`,
    );
  }

  const enforcement = ratioScore(input.enforcibleTrackers, input.consentControlledTrackers);
  const enforcementLost: string[] = [];
  if (input.consentControlledTrackers > 0 && enforcement < 100) {
    enforcementLost.push(
      `${input.consentControlledTrackers - input.enforcibleTrackers} consent-controlled tracker(s) lack a domain or identifier for SDK matching`,
    );
  }

  const open = input.openFindings;
  const critical = open.filter((row) => row.severity === "critical").length;
  const high = open.filter((row) => row.severity === "high").length;
  const medium = open.filter((row) => row.severity === "medium").length;
  const low = open.filter((row) => row.severity === "low").length;
  const shadowOpen = open.filter((row) => row.findingType.startsWith("shadow_")).length;
  const driftPenalty = Math.min(100, critical * 12 + high * 7 + medium * 3 + low * 1);
  const privacyDrift = clamp(100 - driftPenalty);
  const driftLost: string[] = [];
  if (driftPenalty > 0) {
    driftLost.push(
      `Open findings penalty: ${critical} critical, ${high} high, ${medium} medium, ${low} low (${shadowOpen} shadow)`,
    );
  }

  let evidence = 0;
  const evidenceLost: string[] = [];
  if (input.hasPublishedPolicy) evidence += 40;
  else evidenceLost.push("No published consent policy (−40)");
  if ((input.consentExpireDays ?? 0) >= 1) evidence += 30;
  else evidenceLost.push("Consent expiry days are not configured on the published banner (−30)");
  if (input.consentRecordCount > 0) evidence += 30;
  else if (input.hasPublishedPolicy) {
    evidence += 15;
    evidenceLost.push("No stored consent records yet (−15 vs a site with records)");
  } else {
    evidenceLost.push("No consent records (−30)");
  }
  evidence = clamp(evidence);

  let scannerFreshness = 0;
  const freshnessLost: string[] = [];
  if (!input.lastCompletedScanAt) {
    freshnessLost.push("No completed scan (−100 on this dimension)");
  } else {
    const age = daysBetween(now, input.lastCompletedScanAt);
    if (age <= 7) scannerFreshness = 100;
    else if (age <= 30) {
      scannerFreshness = 60;
      freshnessLost.push("Last completed scan is older than 7 days (−40 on this dimension)");
    } else {
      scannerFreshness = 20;
      freshnessLost.push("Last completed scan is older than 30 days (−80 on this dimension)");
    }
  }

  const dimensions: QualityDimension[] = [
    { key: "trackerCoverage", label: "Tracker coverage", score: trackerCoverage, weight: QUALITY_WEIGHTS.trackerCoverage, lost: trackerLost },
    { key: "vendorMapping", label: "Vendor mapping", score: vendorMapping, weight: QUALITY_WEIGHTS.vendorMapping, lost: vendorLost },
    { key: "purposeMapping", label: "Purpose mapping", score: purposeMapping, weight: QUALITY_WEIGHTS.purposeMapping, lost: purposeLost },
    { key: "enforcement", label: "Enforcement", score: enforcement, weight: QUALITY_WEIGHTS.enforcement, lost: enforcementLost },
    { key: "privacyDrift", label: "Privacy drift / shadow", score: privacyDrift, weight: QUALITY_WEIGHTS.privacyDrift, lost: driftLost },
    { key: "evidence", label: "Evidence & expiry config", score: evidence, weight: QUALITY_WEIGHTS.evidence, lost: evidenceLost },
    { key: "scannerFreshness", label: "Scanner freshness", score: scannerFreshness, weight: QUALITY_WEIGHTS.scannerFreshness, lost: freshnessLost },
  ];

  let weighted = 0;
  for (const dimension of dimensions) {
    weighted += (dimension.score * dimension.weight) / 100;
    lostPoints.push(...dimension.lost);
  }
  const overall = clamp(weighted);

  return {
    overall,
    category: qualityCategory(overall),
    dimensions,
    lostPoints,
    disclaimer:
      "This is an operational product score from CMP configuration and scan inventory. It is not a legal compliance percentage.",
  };
}
