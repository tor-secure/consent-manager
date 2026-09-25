import { NOTICE_CHECKS, NOTICE_MIN_CHARS, NOTICE_VERSION } from "../../config/tools/notice";
import { clampScore } from "./scoring-engine";
import { type Answers, type ToolRun, emptyResult } from "./types";

export function plainNotice(input: string): string {
  return input
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20_000);
}

function matches(text: string, pattern: string): boolean {
  return new RegExp(pattern, "i").test(text);
}

export function runNoticeAudit(answers: Answers): ToolRun {
  const raw = answers.notice ?? "";
  if (raw.trim().length === 0) return { ok: false, missing: ["notice"] };

  const text = plainNotice(raw).toLowerCase();
  const result = emptyResult("notice-auditor", NOTICE_VERSION, "", "");
  let earned = 0;
  let weight = 0;

  if (text.length < NOTICE_MIN_CHARS) {
    result.findings.push({
      id: "too-short",
      category: "Completeness",
      severity: "high",
      finding: "The notice is too short to review",
      explanation: "There is not enough text to look for purpose, withdrawal, rights, or contact details.",
      recommendation: "Paste the notice a person actually sees, not a one-line slogan.",
      reference: "Preliminary text screen only.",
    });
  }

  for (const check of NOTICE_CHECKS) {
    weight += check.weight;
    const passed = (check.passAny ?? []).some((pattern) => matches(text, pattern));
    const failed = (check.failAny ?? []).some((pattern) => matches(text, pattern));
    const ok = check.failAny && !check.passAny ? !failed : passed && !failed;
    if (ok) {
      earned += check.weight;
      continue;
    }
    result.findings.push({
      id: check.id,
      category: check.category,
      severity: check.severity,
      finding: check.finding,
      explanation: check.explanation,
      recommendation: check.recommendation,
      reference: check.reference,
    });
    result.recommendations.push({
      id: check.id,
      priority: check.severity,
      text: check.recommendation,
    });
  }

  const score = text.length < NOTICE_MIN_CHARS ? 0 : clampScore(weight === 0 ? 0 : (earned / weight) * 100);
  result.score = score;
  result.label = score >= 80 ? "Fewer notice gaps detected" : score >= 50 ? "Notice gaps to review" : "Significant notice gaps to review";
  result.summary = `${result.label}. Checks look for phrases. They miss context, layout, and whether the notice is actually shown at the point of choice. They are not a legal review.`;
  const categories = [...new Set(NOTICE_CHECKS.map((check) => check.category))];
  result.pillars = categories.map((category) => {
    const related = NOTICE_CHECKS.filter((check) => check.category === category);
    const open = result.findings.some((finding) => finding.category === category);
    const categoryWeight = related.reduce((sum, check) => sum + check.weight, 0);
    const lost = related.filter((check) => result.findings.some((finding) => finding.id === check.id))
      .reduce((sum, check) => sum + check.weight, 0);
    return {
      id: category.toLowerCase().replace(/\s+/g, "-"),
      label: category,
      score: open ? clampScore(((categoryWeight - lost) / categoryWeight) * 100) : 100,
    };
  });
  return { ok: true, result };
}
