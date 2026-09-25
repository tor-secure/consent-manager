import { READINESS_PILLARS, READINESS_QUESTIONS, READINESS_VERSION } from "../../config/tools/readiness";
import { clampScore, missingIds } from "./scoring-engine";
import { type Answers, type ToolRun, emptyResult } from "./types";

const POINTS: Record<string, number> = { yes: 1, partial: 0.5, no: 0 };

export function runReadiness(answers: Answers): ToolRun {
  const missing = missingIds(READINESS_QUESTIONS.map((question) => question.id), answers);
  if (missing.length > 0) return { ok: false, missing };

  const result = emptyResult("readiness-gap", READINESS_VERSION, "", "");
  const pillarTotals = new Map<string, { earned: number; count: number }>();

  for (const question of READINESS_QUESTIONS) {
    const answer = answers[question.id];
    if (!(answer in POINTS)) return { ok: false, missing: [question.id] };
    const bucket = pillarTotals.get(question.pillar) ?? { earned: 0, count: 0 };
    bucket.earned += POINTS[answer] ?? 0;
    bucket.count += 1;
    pillarTotals.set(question.pillar, bucket);

    if (answer === "yes") continue;
    const severity = answer === "no"
      ? question.severity
      : question.severity === "critical"
        ? "high"
        : question.severity === "high"
          ? "medium"
          : "low";
    result.findings.push({
      id: question.id,
      category: question.pillarLabel,
      severity,
      finding: question.prompt,
      explanation: answer === "no"
        ? "Marked as not in place."
        : "Marked as only partly in place.",
      recommendation: question.recommendation,
    });
    result.recommendations.push({
      id: question.id,
      priority: severity,
      text: question.recommendation,
    });
  }

  result.pillars = READINESS_PILLARS.map((pillar) => {
    const bucket = pillarTotals.get(pillar.id) ?? { earned: 0, count: 0 };
    const score = bucket.count === 0 ? 0 : clampScore((bucket.earned / bucket.count) * 100);
    return { id: pillar.id, label: pillar.label, score };
  });
  const score = result.pillars.length === 0
    ? 0
    : clampScore(result.pillars.reduce((sum, pillar) => sum + pillar.score, 0) / result.pillars.length);
  result.score = score;
  result.label = score >= 80 ? "Stronger readiness indicator" : score >= 50 ? "Partial readiness indicator" : "Early readiness indicator";
  result.summary = `${result.label} at ${score} out of 100. Yes counts fully, Partial counts half, and No counts as a gap. This is a self-assessment, not an audit opinion.`;
  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  result.findings.sort((a, b) => rank[a.severity] - rank[b.severity]);
  return { ok: true, result };
}
