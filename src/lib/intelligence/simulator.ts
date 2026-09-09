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

export type CumulativeImpactStep = {
  scenario: ImpactScenario;
  estimatedScoreAfter: number;
};

export function applyImpactScenario(
  input: ConsentQualityInput,
  id: ImpactScenarioId,
): ConsentQualityInput {
  const unclassified = Math.max(0, input.nonEssentialTrackers - input.consentControlledTrackers);
  switch (id) {
    case "map_unclassified":
      return {
        ...input,
        trackersWithPurpose: input.trackersWithPurpose + unclassified,
        trackersWithVendor: input.trackersWithVendor + unclassified,
        consentControlledTrackers: input.nonEssentialTrackers,
        enforcibleTrackers: input.nonEssentialTrackers,
      };
    case "resolve_findings":
      return { ...input, openFindings: [] };
    case "publish_policy":
      return { ...input, hasPublishedPolicy: true, consentExpireDays: input.consentExpireDays ?? 365 };
    case "complete_coverage":
      return { ...input, scanItemsWithActiveTracker: input.thirdPartyScanItems };
  }
}

export function simulatePrivacyImpact(input: ConsentQualityInput): ImpactScenario[] {
  const baseline = calculateConsentQualityScore(input).overall;
  const unclassified = Math.max(0, input.nonEssentialTrackers - input.consentControlledTrackers);
  const uncovered = Math.max(0, input.thirdPartyScanItems - input.scanItemsWithActiveTracker);

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
      applyImpactScenario(input, "map_unclassified"),
    ),
    row(
      "resolve_findings",
      "Resolve open findings",
      input.openFindings.length
        ? `Clear ${input.openFindings.length} open drift/shadow finding${input.openFindings.length === 1 ? "" : "s"}.`
        : "No open findings to resolve.",
      applyImpactScenario(input, "resolve_findings"),
    ),
    row(
      "publish_policy",
      "Publish a live policy",
      input.hasPublishedPolicy
        ? "A published policy is already in place."
        : "Publish a policy version so enforcement and expiry apply.",
      applyImpactScenario(input, "publish_policy"),
    ),
    row(
      "complete_coverage",
      "Cover scan items with tracker records",
      uncovered
        ? `Create tracker records for ${uncovered} unmatched scan item${uncovered === 1 ? "" : "s"}.`
        : "Scan items already match tracker records.",
      applyImpactScenario(input, "complete_coverage"),
    ),
  ];
}

export function simulateCumulativeImpact(
  input: ConsentQualityInput,
  requestedIds: ImpactScenarioId[],
): { steps: CumulativeImpactStep[]; finalInput: ConsentQualityInput; conflicts: string[] } {
  let current = input;
  const steps: CumulativeImpactStep[] = [];
  const conflicts: string[] = [];
  const applied = new Set<ImpactScenarioId>();

  for (const id of requestedIds) {
    if (applied.has(id)) {
      conflicts.push(`${id}: duplicate step skipped`);
      continue;
    }
    const scenario = simulatePrivacyImpact(current).find((item) => item.id === id);
    if (!scenario || scenario.delta <= 0) {
      conflicts.push(`${id}: no longer improves the cumulative state`);
      continue;
    }
    current = applyImpactScenario(current, id);
    applied.add(id);
    steps.push({ scenario, estimatedScoreAfter: calculateConsentQualityScore(current).overall });
  }
  return { steps, finalInput: current, conflicts };
}
