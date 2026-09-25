export const TOOL_IDS = [
  "penalty-risk",
  "readiness-gap",
  "notice-auditor",
  "compliance-timeline",
  "sdf-checker",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export type Severity = "critical" | "high" | "medium" | "low";

export type Answers = Record<string, string>;

export type Finding = {
  id: string;
  category: string;
  severity: Severity;
  finding: string;
  explanation: string;
  recommendation: string;
  reference?: string;
};

export type Recommendation = {
  id: string;
  priority: Severity | "info";
  text: string;
};

export type PillarScore = {
  id: string;
  label: string;
  score: number;
};

export type TimelineTask = {
  id: string;
  title: string;
  owner: string;
  priority: Severity | "info";
  timeframe: string;
  dependsOn: string[];
  evidence: string;
  moduleHref: string;
  moduleLabel: string;
};

export type TimelinePhase = {
  id: string;
  title: string;
  summary: string;
  tasks: TimelineTask[];
};

export type SdfIndicator = {
  id: string;
  title: string;
  why: string;
  obligation: string;
};

export type AssessmentResult = {
  tool: ToolId;
  methodologyVersion: string;
  disclaimer: string;
  score: number | null;
  label: string;
  summary: string;
  pillars: PillarScore[];
  findings: Finding[];
  recommendations: Recommendation[];
  phases: TimelinePhase[];
  indicators: SdfIndicator[];
  unknowns: string[];
  aiNote: string | null;
};

export type ToolRun =
  | { ok: true; result: AssessmentResult }
  | { ok: false; missing: string[] };

export const ASSESSMENT_DISCLAIMER =
  "This assessment is for informational and compliance-planning purposes. It is a preliminary indicator, not legal advice, an official determination, a predicted penalty, or a certification of compliance. Significant Data Fiduciary status, if it applies, is decided under the Act and Rules, not by this tool.";

export function isToolId(value: string): value is ToolId {
  return (TOOL_IDS as readonly string[]).includes(value);
}

export function emptyResult(tool: ToolId, version: string, label: string, summary: string): AssessmentResult {
  return {
    tool,
    methodologyVersion: version,
    disclaimer: ASSESSMENT_DISCLAIMER,
    score: null,
    label,
    summary,
    pillars: [],
    findings: [],
    recommendations: [],
    phases: [],
    indicators: [],
    unknowns: [],
    aiNote: null,
  };
}
