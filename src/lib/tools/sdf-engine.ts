import { SDF_POTENTIAL_MIN, SDF_QUESTIONS, SDF_VERSION } from "../../config/tools/sdf";
import { missingIds } from "./scoring-engine";
import { type Answers, type ToolRun, emptyResult } from "./types";

export function runSdf(answers: Answers): ToolRun {
  const missing = missingIds(SDF_QUESTIONS.map((question) => question.id), answers);
  if (missing.length > 0) return { ok: false, missing };

  const result = emptyResult("sdf-checker", SDF_VERSION, "", "");
  for (const question of SDF_QUESTIONS) {
    const answer = answers[question.id];
    if (answer !== "yes" && answer !== "no" && answer !== "unsure") {
      return { ok: false, missing: [question.id] };
    }
    if (answer === "unsure") {
      result.unknowns.push(question.prompt);
      continue;
    }
    if (answer === "yes") {
      result.indicators.push({
        id: question.id,
        title: question.prompt,
        why: question.why,
        obligation: question.obligation,
      });
      result.findings.push({
        id: question.id,
        category: "SDF screen",
        severity: "medium",
        finding: "Potential indicator for counsel to review",
        explanation: question.why,
        recommendation: question.obligation,
        reference: "Significant Data Fiduciary designation is a government determination.",
      });
    }
  }

  const potential = result.indicators.length >= SDF_POTENTIAL_MIN;
  result.score = result.indicators.length;
  result.label = potential ? "Potential SDF indicators identified" : "Limited SDF indicators identified";
  result.summary = potential
    ? `${result.indicators.length} answers match screening factors the government may consider. This is not a determination that the organisation is a Significant Data Fiduciary.`
    : `${result.indicators.length} screening factor${result.indicators.length === 1 ? "" : "s"} matched. Limited indicators are not a finding that designation is impossible. Counsel should still read the Act, the Rules, and any notification.`;
  if (result.unknowns.length > 0) {
    result.summary += ` ${result.unknowns.length} question${result.unknowns.length === 1 ? " was" : "s were"} marked not sure, so the screen is incomplete.`;
  }
  result.recommendations = [
    {
      id: "counsel",
      priority: "info",
      text: "Ask counsel to compare these indicators with the Act, the Rules, and any government notification. Do not describe the organisation as a Significant Data Fiduciary based on this screen.",
    },
    ...result.indicators.map((indicator) => ({
      id: indicator.id,
      priority: "medium" as const,
      text: indicator.obligation,
    })),
  ];
  return { ok: true, result };
}
