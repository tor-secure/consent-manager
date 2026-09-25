import { NOTICE_VERSION } from "./notice";
import { PENALTY_FACTORS, PENALTY_STEPS, PENALTY_VERSION } from "./penalty";
import { READINESS_PILLARS, READINESS_QUESTIONS, READINESS_VERSION } from "./readiness";
import { SDF_QUESTIONS, SDF_VERSION } from "./sdf";
import { TIMELINE_INPUTS, TIMELINE_STEPS, TIMELINE_VERSION } from "./timeline";
import { TOOL_IDS, type ToolId } from "../../lib/tools/types";

export type ToolCard = {
  id: ToolId;
  href: string;
  name: string;
  description: string;
  purpose: string;
  minutes: string;
  version: string;
};

export const TOOL_CARDS: ToolCard[] = [
  {
    id: "penalty-risk",
    href: "/tools/penalty-risk",
    name: "Penalty risk calculator",
    description: "Weight notice, consent, security, and children's-data answers into an indicative exposure band.",
    purpose: "See which control gaps contribute most. This does not predict a Board penalty.",
    minutes: "6–8 min",
    version: PENALTY_VERSION,
  },
  {
    id: "readiness-gap",
    href: "/tools/readiness-gap",
    name: "Readiness gap analyser",
    description: "Score consent, notices, rights, breach, governance, and processors.",
    purpose: "Turn a yes / partial / no review into pillar scores and a gap list.",
    minutes: "10–12 min",
    version: READINESS_VERSION,
  },
  {
    id: "notice-auditor",
    href: "/tools/notice-auditor",
    name: "Consent notice auditor",
    description: "Paste a notice and screen it for purpose, withdrawal, rights, contact, and implied consent.",
    purpose: "Flag phrases to review. This is not a legal reading of the notice.",
    minutes: "4–6 min",
    version: NOTICE_VERSION,
  },
  {
    id: "compliance-timeline",
    href: "/tools/compliance-timeline",
    name: "Compliance timeline planner",
    description: "Build an assess, design, implement, and operate plan from your maturity and window.",
    purpose: "Get a task list with owners, dependencies, and the ConsentGuru module that fits each task.",
    minutes: "4–5 min",
    version: TIMELINE_VERSION,
  },
  {
    id: "sdf-checker",
    href: "/tools/sdf-checker",
    name: "SDF classification checker",
    description: "Screen for factors associated with Significant Data Fiduciary consideration.",
    purpose: "List indicators for counsel. The tool does not designate an organisation.",
    minutes: "5–7 min",
    version: SDF_VERSION,
  },
];

export function toolCard(id: string): ToolCard | undefined {
  return TOOL_CARDS.find((tool) => tool.id === id);
}

export type WizardStep = {
  title: string;
  questionIds: string[];
};

export function wizardSteps(tool: ToolId): WizardStep[] {
  if (tool === "penalty-risk") {
    return PENALTY_STEPS.map((title) => ({
      title,
      questionIds: PENALTY_FACTORS.filter((factor) => factor.step === title).map((factor) => factor.id),
    }));
  }
  if (tool === "readiness-gap") {
    return READINESS_PILLARS.map((pillar) => ({
      title: pillar.label,
      questionIds: READINESS_QUESTIONS.filter((question) => question.pillar === pillar.id).map((question) => question.id),
    }));
  }
  if (tool === "compliance-timeline") {
    return TIMELINE_STEPS.map((title) => ({
      title,
      questionIds: TIMELINE_INPUTS.filter((input) => input.step === title).map((input) => input.id),
    }));
  }
  if (tool === "sdf-checker") {
    const mid = Math.ceil(SDF_QUESTIONS.length / 2);
    return [
      { title: "Scale and sensitivity", questionIds: SDF_QUESTIONS.slice(0, mid).map((question) => question.id) },
      { title: "Impact and sector", questionIds: SDF_QUESTIONS.slice(mid).map((question) => question.id) },
    ];
  }
  return [
    { title: "Context", questionIds: ["language", "context", "organisation", "channel"] },
    { title: "Notice text", questionIds: ["notice"] },
  ];
}

export function toolIds(): readonly ToolId[] {
  return TOOL_IDS;
}
