import type { ConsentQualityInput } from "../monitoring/consent-quality";
import { simulateCumulativeImpact, type ImpactScenario } from "./simulator";

export type NegotiationStep = {
  scenario: ImpactScenario;
  estimatedScoreAfter: number;
};

export type NegotiationPlan = {
  baselineScore: number;
  targetScore: number;
  predictedScoreAfter: number;
  steps: NegotiationStep[];
  skipped: ImpactScenario[];
};

export function buildConsentNegotiationPlan(input: {
  baselineScore: number;
  targetScore: number;
  scenarios: ImpactScenario[];
  qualityInput?: ConsentQualityInput;
  maxSteps?: number;
}): NegotiationPlan {
  const maxSteps = input.maxSteps ?? 3;
  const positive = input.scenarios.filter((s) => s.delta > 0);
  const sorted = positive.slice().sort((a, b) => b.delta - a.delta);

  if (input.qualityInput) {
    const cumulative = simulateCumulativeImpact(
      input.qualityInput,
      sorted.slice(0, maxSteps).map((scenario) => scenario.id),
    );
    const steps = cumulative.steps.map((step) => ({
      scenario: step.scenario,
      estimatedScoreAfter: step.estimatedScoreAfter,
    }));
    const cutoff = steps.findIndex((step) => step.estimatedScoreAfter >= input.targetScore);
    const selected = cutoff >= 0 ? steps.slice(0, cutoff + 1) : steps;
    const usedIds = new Set(selected.map((step) => step.scenario.id));
    return {
      baselineScore: input.baselineScore,
      targetScore: input.targetScore,
      predictedScoreAfter: selected.at(-1)?.estimatedScoreAfter ?? input.baselineScore,
      steps: selected,
      skipped: input.scenarios.filter((scenario) => !usedIds.has(scenario.id)),
    };
  }

  let predicted = input.baselineScore;
  const steps: NegotiationStep[] = [];

  for (const s of sorted) {
    if (steps.length >= maxSteps) break;
    if (predicted >= input.targetScore) break;

    predicted = Math.min(100, predicted + s.delta);
    steps.push({ scenario: s, estimatedScoreAfter: predicted });
  }

  const usedIds = new Set(steps.map((s) => s.scenario.id));
  const skipped = input.scenarios.filter((s) => !usedIds.has(s.id));

  return {
    baselineScore: input.baselineScore,
    targetScore: input.targetScore,
    predictedScoreAfter: predicted,
    steps,
    skipped,
  };
}

