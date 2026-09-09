import { type ImpactScenario } from "../intelligence/simulator";

export type ConsentRoiScenario = ImpactScenario & {
  roi: number;
  annualBenefit: number | null;
  annualCost: number | null;
  netBenefit: number | null;
  paybackMonths: number | null;
};

export type ConsentRoiReport = {
  baseline: number;
  targetScore: number;
  roiPerQualityPoint: number;
  scenarios: ConsentRoiScenario[];
  bestScenario: ConsentRoiScenario | null;
  currency: string;
  confidence: "low" | "medium" | "high";
  assumptions: string[];
  sensitivity: { conservative: number | null; expected: number | null; optimistic: number | null };
};

export type ConsentRoiBusinessInputs = {
  monthlySessions?: number | null;
  valuePerConversion?: number | null;
  valuePerConsent?: number | null;
  implementationCost?: number | null;
  recurringMonthlyCost?: number | null;
  currency?: string;
  measuredConsentRate?: number | null;
  measuredDecisionCount?: number | null;
};

export function computeConsentRoi(input: {
  baseline: number;
  targetScore?: number;
  scenarios: ImpactScenario[];
  roiPerQualityPoint?: number;
  business?: ConsentRoiBusinessInputs;
}): ConsentRoiReport {
  const roiPerQualityPoint =
    typeof input.roiPerQualityPoint === "number" && Number.isFinite(input.roiPerQualityPoint)
      ? input.roiPerQualityPoint
      : Number(process.env.CONSENT_ROI_PER_QUALITY_POINT ?? 100);

  const targetScore = input.targetScore ?? Math.min(95, input.baseline + 15);

  const b = input.business;
  const complete =
    b?.monthlySessions != null &&
    b.monthlySessions >= 0 &&
    (b.valuePerConsent != null || b.valuePerConversion != null) &&
    b.implementationCost != null &&
    b.recurringMonthlyCost != null;
  const value = (b?.valuePerConsent ?? 0) + (b?.valuePerConversion ?? 0);
  const scenarios: ConsentRoiScenario[] = input.scenarios.map((s) => {
    const monthlyBenefit = complete
      ? b.monthlySessions! * (Math.max(0, s.delta) / 100) * value
      : null;
    const annualBenefit = monthlyBenefit === null ? null : monthlyBenefit * 12;
    const annualCost = complete ? b.implementationCost! + b.recurringMonthlyCost! * 12 : null;
    const netBenefit = annualBenefit === null || annualCost === null ? null : annualBenefit - annualCost;
    const roi =
      annualBenefit !== null && annualCost !== null && annualCost > 0
        ? ((annualBenefit - annualCost) / annualCost) * 100
        : Math.max(0, s.delta) * roiPerQualityPoint;
    return {
      ...s,
      roi: Number(roi.toFixed(2)),
      annualBenefit,
      annualCost,
      netBenefit,
      paybackMonths:
        monthlyBenefit !== null && monthlyBenefit > 0
          ? Number((b!.implementationCost! / Math.max(monthlyBenefit - b!.recurringMonthlyCost!, 0.01)).toFixed(1))
          : null,
    };
  });

  const bestScenario = scenarios.slice().sort((a, b) => b.roi - a.roi)[0] ?? null;

  return {
    baseline: input.baseline,
    targetScore,
    roiPerQualityPoint: roiPerQualityPoint,
    scenarios,
    bestScenario,
    currency: b?.currency ?? "USD",
    confidence:
      complete && (b?.measuredDecisionCount ?? 0) >= 1_000
        ? "high"
        : complete && (b?.measuredDecisionCount ?? 0) > 0
          ? "medium"
          : "low",
    assumptions: [
      "Quality-score change is a planning proxy, not a guaranteed conversion lift.",
      ...(b?.measuredConsentRate == null ? ["No measured consent rate was available."] : []),
      ...(!complete ? ["Business inputs are incomplete; currency ROI is unavailable and relative ranking is shown."] : []),
    ],
    sensitivity: {
      conservative: bestScenario?.annualBenefit == null ? null : bestScenario.annualBenefit * 0.5,
      expected: bestScenario?.annualBenefit ?? null,
      optimistic: bestScenario?.annualBenefit == null ? null : bestScenario.annualBenefit * 1.5,
    },
  };
}

