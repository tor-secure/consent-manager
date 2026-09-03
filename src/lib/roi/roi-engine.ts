import { type ImpactScenario } from "../intelligence/simulator";

export type ConsentRoiScenario = ImpactScenario & {
  // ROI here is a relative score (not a currency). It converts expected quality
  // delta into a numeric "business impact" measure.
  roi: number;
};

export type ConsentRoiReport = {
  baseline: number;
  targetScore: number;
  roiPerQualityPoint: number;
  scenarios: ConsentRoiScenario[];
  bestScenario: ConsentRoiScenario | null;
};

export function computeConsentRoi(input: {
  baseline: number;
  targetScore?: number;
  scenarios: ImpactScenario[];
  roiPerQualityPoint?: number;
}): ConsentRoiReport {
  const roiPerQualityPoint =
    typeof input.roiPerQualityPoint === "number" && Number.isFinite(input.roiPerQualityPoint)
      ? input.roiPerQualityPoint
      : Number(process.env.CONSENT_ROI_PER_QUALITY_POINT ?? 100);

  const targetScore = input.targetScore ?? Math.min(95, input.baseline + 15);

  const scenarios: ConsentRoiScenario[] = input.scenarios.map((s) => ({
    ...s,
    roi: Math.max(0, s.delta) * roiPerQualityPoint,
  }));

  const bestScenario = scenarios.slice().sort((a, b) => b.roi - a.roi)[0] ?? null;

  return {
    baseline: input.baseline,
    targetScore,
    roiPerQualityPoint: roiPerQualityPoint,
    scenarios,
    bestScenario,
  };
}

