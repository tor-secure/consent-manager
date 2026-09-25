import { TIMELINE_INPUTS, TIMELINE_PHASES, TIMELINE_TASKS, TIMELINE_VERSION } from "../../config/tools/timeline";
import { missingIds } from "./scoring-engine";
import { type Answers, type TimelineTask, type ToolRun, emptyResult } from "./types";

const OWNERS: Record<string, string> = {
  privacy: "Privacy lead",
  legal: "Legal",
  engineering: "Engineering",
  leadership: "Leadership sponsor",
};

function flagsFor(answers: Answers): Set<string> {
  const flags = new Set<string>(["always"]);
  if (answers.maturity === "early" || answers.cmp === "none") flags.add("early");
  if (answers.cmp === "none" || answers.cmp === "partial") flags.add("weak-cmp");
  if (answers.children === "yes") flags.add("children");
  if (answers.highRisk === "yes") flags.add("high-risk");
  if (answers.complexity === "complex" || answers.size === "large") flags.add("complex");
  if (answers.industry === "health" || answers.industry === "finance" || answers.industry === "education" || answers.industry === "public") {
    flags.add("regulated");
  }
  return flags;
}

function windows(days: number): Record<string, string> {
  const slice = Math.max(7, Math.round(days / 4));
  const label = (index: number) => {
    const start = index * slice + 1;
    const end = Math.min(days, (index + 1) * slice);
    return `Days ${start}–${end}`;
  };
  return { assess: label(0), design: label(1), implement: label(2), operate: label(3) };
}

export function runTimeline(answers: Answers): ToolRun {
  const missing = missingIds(TIMELINE_INPUTS.map((input) => input.id), answers);
  if (missing.length > 0) return { ok: false, missing };
  for (const input of TIMELINE_INPUTS) {
    if (!input.options.some((option) => option.value === answers[input.id])) {
      return { ok: false, missing: [input.id] };
    }
  }

  const flags = flagsFor(answers);
  const selected = TIMELINE_TASKS.filter((task) => task.when.some((flag) => flags.has(flag)));
  const ids = new Set(selected.map((task) => task.id));
  const days = Number(answers.window) || 90;
  const phaseWindow = windows(days);
  const owner = OWNERS[answers.owner] ?? "Privacy lead";
  const result = emptyResult("compliance-timeline", TIMELINE_VERSION, "Phased roadmap", "");

  result.phases = TIMELINE_PHASES.map((phase) => ({
    id: phase.id,
    title: phase.title,
    summary: phase.summary,
    tasks: selected.filter((task) => task.phase === phase.id).map((task): TimelineTask => ({
      id: task.id,
      title: task.title,
      owner,
      priority: task.priority,
      timeframe: phaseWindow[phase.id] ?? `Within ${days} days`,
      dependsOn: task.dependsOn.filter((id) => ids.has(id)),
      evidence: task.evidence,
      moduleHref: task.moduleHref,
      moduleLabel: task.moduleLabel,
    })),
  })).filter((phase) => phase.tasks.length > 0);

  result.summary = `${result.phases.reduce((sum, phase) => sum + phase.tasks.length, 0)} tasks across ${result.phases.length} phases, paced to about ${days} days. The roadmap changes with maturity, children's data, and processing complexity. It is a plan, not a compliance certificate.`;
  result.recommendations = result.phases.flatMap((phase) =>
    phase.tasks.filter((task) => task.priority === "critical" || task.priority === "high").map((task) => ({
      id: task.id,
      priority: task.priority,
      text: `${phase.title}: ${task.title}`,
    })),
  );
  return { ok: true, result };
}
