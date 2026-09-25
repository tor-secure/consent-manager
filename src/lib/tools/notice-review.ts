import "server-only";

import { enrichDeterministicOutput } from "@/lib/ai/intelligence";
import { runNoticeAudit } from "./notice-audit-engine";
import type { Answers, ToolRun } from "./types";

/** Score stays on the configured checks. A model may add a note from those findings, never from unsanitised instructions in the notice. */
export async function reviewNotice(answers: Answers): Promise<ToolRun> {
  const run = runNoticeAudit(answers);
  if (!run.ok) return run;
  const ai = await enrichDeterministicOutput({
    engine: "notice-auditor",
    aggregateContext: {
      methodologyVersion: run.result.methodologyVersion,
      score: run.result.score,
    },
    deterministicOutput: {
      findings: run.result.findings.map((finding) => ({
        severity: finding.severity,
        finding: finding.finding,
      })),
    },
  });
  if (!ai.fallback && ai.value.summary) {
    run.result.aiNote = `Review note: ${ai.value.summary}`;
  }
  return run;
}
