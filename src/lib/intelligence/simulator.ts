import { calculateConsentQualityScore, type ConsentQualityInput } from "../monitoring/consent-quality";

export type ImpactScenarioId =
  | "map_unclassified"
  | "resolve_findings"
  | "publish_policy"
  | "complete_coverage";

export type ImpactScenario = {
  id: ImpactScenarioId;
  title: string;
  description: string;
  before: number;
  after: number;
  delta: number;
};

export function simulatePrivacyImpact(input: ConsentQualityInput): ImpactScenario[] {
  const baseline = calculateConsentQualityScore(input).overall;
  const unclassified = Math.max(0, input.nonEssentialTrackers - input.consentControlledTrackers);
  const uncovered = Math.max(0, input.thirdPartyScanItems - input.scanItemsWithActiveTracker);

  const mapped: ConsentQualityInput = {
    ...input,
    trackersWithPurpose: input.trackersWithPurpose + unclassified,
    trackersWithVendor: input.trackersWithVendor + unclassified,
    consentControlledTrackers: input.nonEssentialTrackers,
    enforcibleTrackers: input.nonEssentialTrackers,
  };

  const findingsCleared: ConsentQualityInput = {
    ...input,
    openFindings: [],
  };

  const published: ConsentQualityInput = {
    ...input,
    hasPublishedPolicy: true,
    consentExpireDays: input.consentExpireDays ?? 365,
  };

  const coverage: ConsentQualityInput = {
    ...input,
    scanItemsWithActiveTracker: input.thirdPartyScanItems,
  };

  function row(
    id: ImpactScenarioId,
    title: string,
    description: string,
    next: ConsentQualityInput,
  ): ImpactScenario {
    const after = calculateConsentQualityScore(next).overall;
    return { id, title, description, before: baseline, after, delta: after - baseline };
  }

  return [
    row(
      "map_unclassified",
      "Map unclassified trackers",
      unclassified
        ? `Attach a purpose and vendor to ${unclassified} unclassified tracker${unclassified === 1 ? "" : "s"}.`
        : "All non-essential trackers already have a purpose or vendor.",
      mapped,
    ),
    row(
      "resolve_findings",
      "Resolve open findings",
      input.openFindings.length
        ? `Clear ${input.openFindings.length} open drift/shadow finding${input.openFindings.length === 1 ? "" : "s"}.`
        : "No open findings to resolve.",
      findingsCleared,
    ),
    row(
      "publish_policy",
      "Publish a live policy",
      input.hasPublishedPolicy
        ? "A published policy is already in place."
        : "Publish a policy version so enforcement and expiry apply.",
      published,
    ),
    row(
      "complete_coverage",
      "Cover scan items with tracker records",
      uncovered
        ? `Create tracker records for ${uncovered} unmatched scan item${uncovered === 1 ? "" : "s"}.`
        : "Scan items already match tracker records.",
      coverage,
    ),
  ];
}
