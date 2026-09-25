import { runNoticeAudit } from "./notice-audit-engine";
import { runPenaltyRisk } from "./penalty-risk-engine";
import { runReadiness } from "./readiness-engine";
import { runSdf } from "./sdf-engine";
import { runTimeline } from "./timeline-engine";
import { type Answers, type ToolId, type ToolRun } from "./types";

export function runTool(tool: ToolId, answers: Answers): ToolRun {
  switch (tool) {
    case "penalty-risk":
      return runPenaltyRisk(answers);
    case "readiness-gap":
      return runReadiness(answers);
    case "notice-auditor":
      return runNoticeAudit(answers);
    case "compliance-timeline":
      return runTimeline(answers);
    case "sdf-checker":
      return runSdf(answers);
    default:
      return { ok: false, missing: [] };
  }
}
