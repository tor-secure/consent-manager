import { calculateConsentQualityScore, type ConsentQualityInput } from "../monitoring/consent-quality";
import {
  simulateCumulativeImpact,
  simulatePrivacyImpact,
  type ImpactScenarioId,
} from "./simulator";

export type AutopilotStep = {
  id: ImpactScenarioId;
  title: string;
  description: string;
  before: number;
  after: number;
  delta: number;
  applyMode: "operator_navigation" | "operator_approval";
  reversible: boolean;
  legalPublication: boolean;
};

export type AutopilotPlan = {
  baselineScore: number;
  predictedScoreAfter: number;
  steps: AutopilotStep[];
  conflicts: string[];
};

const SAFE_REVERSIBLE = new Set<ImpactScenarioId>(["map_unclassified", "complete_coverage"]);

export function buildAutopilotPlan(input: ConsentQualityInput, maxSteps = 3): AutopilotPlan {
  const ranked = simulatePrivacyImpact(input)
    .filter((scenario) => scenario.delta > 0)
    .sort((a, b) => b.delta - a.delta)
    .map((scenario) => scenario.id);
  const cumulative = simulateCumulativeImpact(input, ranked.slice(0, maxSteps));

  return {
    baselineScore: calculateConsentQualityScore(input).overall,
    predictedScoreAfter:
      cumulative.steps.at(-1)?.estimatedScoreAfter ?? calculateConsentQualityScore(input).overall,
    conflicts: cumulative.conflicts,
    steps: cumulative.steps.map(({ scenario, estimatedScoreAfter }) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      before: scenario.before,
      after: estimatedScoreAfter,
      delta: estimatedScoreAfter - scenario.before,
      applyMode: SAFE_REVERSIBLE.has(scenario.id) ? "operator_approval" : "operator_navigation",
      reversible: SAFE_REVERSIBLE.has(scenario.id),
      legalPublication: scenario.id === "publish_policy",
    })),
  };
}

export function mayApplyAutopilotStep(step: AutopilotStep, confirmed: boolean): boolean {
  return confirmed && step.applyMode === "operator_approval" && step.reversible && !step.legalPublication;
}
