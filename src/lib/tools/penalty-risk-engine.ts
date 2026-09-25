import { PENALTY_BANDS, PENALTY_FACTORS, PENALTY_VERSION } from "../../config/tools/penalty";
import { bandFor, missingIds, weightedAverage } from "./scoring-engine";
import { type Answers, type ToolRun, emptyResult } from "./types";

export function runPenaltyRisk(answers: Answers): ToolRun {
  const missing = missingIds(PENALTY_FACTORS.map((factor) => factor.id), answers);
  if (missing.length > 0) return { ok: false, missing };

  const parts: Array<{ weight: number; value: number }> = [];
  const result = emptyResult(
    "penalty-risk",
    PENALTY_VERSION,
    "",
    "",
  );

  for (const factor of PENALTY_FACTORS) {
    const option = factor.options.find((item) => item.value === answers[factor.id]);
    if (!option) return { ok: false, missing: [factor.id] };
    const value = option.exposure / 3;
    parts.push({ weight: factor.weight, value });
    if (option.exposure >= 2) {
      result.findings.push({
        id: factor.id,
        category: factor.step,
        severity: option.exposure === 3 ? "high" : "medium",
        finding: factor.prompt,
        explanation: `${option.label}. ${factor.help}`,
        recommendation: factor.recommendation,
        reference: "Indicative factor only. Statutory penalty ceilings are set in the Act and applied by the Board after inquiry.",
      });
      result.recommendations.push({
        id: factor.id,
        priority: option.exposure === 3 ? "high" : "medium",
        text: factor.recommendation,
      });
    }
  }

  const score = weightedAverage(parts) ?? 0;
  result.score = score;
  result.label = bandFor(score, PENALTY_BANDS.map((band) => ({ max: band.max, label: band.label })));
  result.summary = `${result.label}. The score weights the answers you gave. It is not a forecast of a monetary penalty, and it does not decide whether a safeguard is reasonable.`;
  result.findings.sort((a, b) => (a.severity === "high" ? -1 : 1) - (b.severity === "high" ? -1 : 1));
  return { ok: true, result };
}

export function penaltyFactorIds(): string[] {
  return PENALTY_FACTORS.map((factor) => factor.id);
}
