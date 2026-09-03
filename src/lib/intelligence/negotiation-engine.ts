import type { ImpactScenario } from "./simulator";

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
  maxSteps?: number;
}): NegotiationPlan {
  const maxSteps = input.maxSteps ?? 3;
  const positive = input.scenarios.filter((s) => s.delta > 0);
  const sorted = positive.slice().sort((a, b) => b.delta - a.delta);

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

