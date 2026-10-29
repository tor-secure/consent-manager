import {
  DPDP_EIGHTEEN_MONTHS,
  DPDP_ONE_YEAR,
  DPDP_PUBLISHED,
  GAP_AREAS,
  GAP_CONTROLS,
  GAP_LEGAL_NOTE,
  GAP_VERSION,
  controlApplies,
  controlReference,
  phaseDate,
  type GapAnswer,
  type GapControl,
  type GapPhase,
  type GapProfile,
  type GapResponse,
  type GapSeverity,
} from "@/config/tools/gap";

export type GapEnforceability = "in_force" | "upcoming";

export type GapFinding = {
  id: string;
  area: string;
  areaLabel: string;
  title: string;
  description: string;
  reference: string;
  severity: GapSeverity;
  kind: GapControl["kind"];
  enforceability: GapEnforceability;
  commences: string;
  explanation: string;
  action: string;
  evidence: string;
  priority: number;
};

export type GapAreaScore = {
  id: string;
  label: string;
  score: number | null;
  applicable: number;
  implemented: number;
  partial: number;
  missing: number;
};

export type GapAnalysis = {
  version: string;
  assessedOn: string;
  disclaimer: string;
  score: number | null;
  coverage: number;
  label: string;
  summary: string;
  applicable: number;
  assessed: number;
  implemented: number;
  partial: number;
  missing: number;
  notApplicable: number;
  unassessed: number;
  criticalGaps: number;
  areas: GapAreaScore[];
  findings: GapFinding[];
  statusCounts: Record<GapAnswer, number>;
  severityCounts: Record<GapSeverity, number>;
  regulatory: Array<{ id: string; title: string; detail: string; state: "in_force" | "upcoming" }>;
};

const SEVERITY_RANK: Record<GapSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const WEIGHT: Record<GapSeverity, number> = { critical: 3, high: 2, medium: 1, low: 1 };

function utcDay(iso: string): number {
  return Date.parse(`${iso}T00:00:00.000Z`);
}

export function enforceability(phase: GapPhase, asOf: Date): GapEnforceability {
  const start = phase === "in_force" ? DPDP_PUBLISHED : phase === "one_year" ? DPDP_ONE_YEAR : DPDP_EIGHTEEN_MONTHS;
  return asOf.getTime() >= utcDay(start) ? "in_force" : "upcoming";
}

function answerOf(responses: Record<string, GapResponse>, id: string): GapAnswer {
  return responses[id]?.status ?? "unassessed";
}

function readinessLabel(score: number | null, coverage: number): string {
  if (score === null || coverage === 0) return "Not enough answers to score";
  if (score >= 80) return "Readiness is strong on the answered controls";
  if (score >= 50) return "Readiness is partial";
  return "Readiness is low on the answered controls";
}

export function analyseGap(profile: GapProfile, responses: Record<string, GapResponse>, asOf = new Date()): GapAnalysis {
  const statusCounts: Record<GapAnswer, number> = { implemented: 0, partial: 0, missing: 0, na: 0, unassessed: 0 };
  const severityCounts: Record<GapSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const findings: GapFinding[] = [];
  let points = 0;
  let maxPoints = 0;
  let applicable = 0;
  let assessed = 0;

  const areaBuckets = new Map<string, { points: number; max: number; applicable: number; implemented: number; partial: number; missing: number }>();
  for (const area of GAP_AREAS) {
    areaBuckets.set(area.id, { points: 0, max: 0, applicable: 0, implemented: 0, partial: 0, missing: 0 });
  }

  for (const item of GAP_CONTROLS) {
    if (!controlApplies(item, profile)) continue;
    applicable += 1;
    const status = answerOf(responses, item.id);
    statusCounts[status] += 1;
    const bucket = areaBuckets.get(item.area);
    if (bucket) bucket.applicable += 1;
    if (status === "na" || status === "unassessed") continue;
    assessed += 1;
    const weight = WEIGHT[item.severity];
    maxPoints += weight;
    const earned = status === "implemented" ? weight : status === "partial" ? weight / 2 : 0;
    points += earned;
    if (bucket) {
      bucket.max += weight;
      bucket.points += earned;
      if (status === "implemented") bucket.implemented += 1;
      if (status === "partial") bucket.partial += 1;
      if (status === "missing") bucket.missing += 1;
    }
    if (status === "implemented") continue;

    const live = enforceability(item.phase, asOf);
    const area = GAP_AREAS.find((entry) => entry.id === item.area);
    const upcoming = live === "upcoming";
    const explanation = upcoming
      ? "This requirement has not commenced on the assessment date. The gap is a readiness finding. It is not, by itself, a present breach of the Act or the Rules."
      : item.kind === "recommended"
        ? "This is a management practice that supports the statutory duties. It is not itself a separate offence or a deemed violation."
        : "On the assessment date this requirement is in force for an organisation to which it applies. The answer says the control is missing or only partial. That is an internal finding, not a Board determination.";
    findings.push({
      id: item.id,
      area: item.area,
      areaLabel: area?.label ?? item.area,
      title: item.title,
      description: item.description,
      reference: controlReference(item),
      severity: item.severity,
      kind: item.kind,
      enforceability: live,
      commences: phaseDate(item.phase),
      explanation,
      action: item.action,
      evidence: item.evidence,
      priority: (upcoming ? 2 : 0) + (item.kind === "recommended" ? 1 : 0),
    });
    severityCounts[item.severity] += 1;
  }

  findings.sort((a, b) => a.priority - b.priority || SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || a.title.localeCompare(b.title));

  const score = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : null;
  const coverage = applicable > 0 ? Math.round((assessed / applicable) * 100) : 0;
  const areas: GapAreaScore[] = GAP_AREAS.map((area) => {
    const bucket = areaBuckets.get(area.id)!;
    return {
      id: area.id,
      label: area.label,
      score: bucket.max > 0 ? Math.round((bucket.points / bucket.max) * 100) : null,
      applicable: bucket.applicable,
      implemented: bucket.implemented,
      partial: bucket.partial,
      missing: bucket.missing,
    };
  });

  const inForceGaps = findings.filter((finding) => finding.enforceability === "in_force" && finding.kind !== "recommended").length;
  const summary = score === null
    ? "Answer the applicable controls to produce a readiness score. Unanswered controls are left out of the score."
    : `${score} of 100 on controls that were answered. ${findings.length} gap${findings.length === 1 ? "" : "s"} recorded, of which ${inForceGaps} relate to a duty that is already in force and is not only a recommended practice. Most operational duties of the Act and Rules commence on ${DPDP_EIGHTEEN_MONTHS}.`;

  return {
    version: GAP_VERSION,
    assessedOn: asOf.toISOString().slice(0, 10),
    disclaimer: GAP_LEGAL_NOTE,
    score,
    coverage,
    label: readinessLabel(score, coverage),
    summary,
    applicable,
    assessed,
    implemented: statusCounts.implemented,
    partial: statusCounts.partial,
    missing: statusCounts.missing,
    notApplicable: statusCounts.na,
    unassessed: statusCounts.unassessed,
    criticalGaps: findings.filter((finding) => finding.severity === "critical").length,
    areas,
    findings,
    statusCounts,
    severityCounts,
    regulatory: [
      {
        id: "now",
        title: "In force since 13 November 2025",
        detail: "Board and institutional provisions: Act sections 1(2), 2, 18 to 26, 35, 38 to 43, and 44(1) and 44(3), and Rules 1, 2, and 17 to 21. These are not scored as company processing controls.",
        state: enforceability("in_force", asOf) === "in_force" ? "in_force" : "upcoming",
      },
      {
        id: "year",
        title: "From 13 November 2026",
        detail: "Section 6(9) and section 27(1)(d) of the Act, and Rule 4 on registration and obligations of a Consent Manager. Rule 4 matters if you use a Consent Manager.",
        state: enforceability("one_year", asOf),
      },
      {
        id: "eighteen",
        title: "From 13 May 2027",
        detail: "Sections 3 to 5, 6(1) to 6(8) and 6(10), 7 to 17, and the rest of the notified operational provisions, together with Rules 3, 5 to 16, 22, and 23. Notice, consent, rights, security, breach, erasure, children, processors, and cross-border duties sit in this phase.",
        state: enforceability("eighteen_months", asOf),
      },
    ],
  };
}

export function missingAnswers(profile: GapProfile, responses: Record<string, GapResponse>): string[] {
  return GAP_CONTROLS.filter((item) => controlApplies(item, profile) && answerOf(responses, item.id) === "unassessed").map((item) => item.id);
}

const ROLE_LABEL: Record<GapProfile["role"], string> = {
  fiduciary: "Data Fiduciary",
  processor: "Data Processor",
  both: "Data Fiduciary and Data Processor",
};

export function answerLabel(status: GapAnswer): string {
  if (status === "implemented") return "Fully implemented";
  if (status === "partial") return "Partially implemented";
  if (status === "missing") return "Not implemented";
  if (status === "na") return "Not applicable";
  return "Not yet assessed";
}

export function gapReportNarrative(profile: GapProfile, responses: Record<string, GapResponse>, analysis: GapAnalysis): string[] {
  const name = profile.companyName || "The organisation";
  const scoreText = analysis.score === null ? "no readiness score, because too few controls were answered" : `an internal readiness score of ${analysis.score} out of 100`;
  const paragraphs = [
    `${name} was assessed on ${analysis.assessedOn} as a ${profile.organisationSize || "unspecified-size"} ${profile.industry || "organisation"} in ${profile.location || "an unstated location"}, with ${profile.employeeRange || "an unstated"} employees. The stated role is ${ROLE_LABEL[profile.role]}. Personal data named in the profile: ${profile.dataTypes.join(", ") || "none listed"}. Purposes: ${profile.purposes || "not stated"}. The result is ${scoreText}, with ${analysis.coverage}% of the ${analysis.applicable} applicable controls answered. ${analysis.implemented} are fully implemented, ${analysis.partial} are partial, and ${analysis.missing} are not implemented. ${analysis.criticalGaps} findings are marked critical. This score is a planning indicator. It is not a certificate and it is not a finding by the Data Protection Board.`,
    `Children's data: ${profile.childrenData}. Third-party processors: ${profile.processors}. Cross-border processing: ${profile.crossBorder}. Significant Data Fiduciary notification: ${profile.sdf}. Controls that depend on those facts were included only where the answer was yes or not sure. Governance arrangements recorded with the profile: ${profile.governance || "none stated"}.`,
  ];

  const scored = analysis.areas.filter((area) => area.score !== null);
  if (scored.length > 0) {
    const ordered = [...scored].sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
    const weakest = ordered.slice(0, 3).map((area) => `${area.label} (${area.score})`).join(", ");
    const strongest = ordered.slice(-3).reverse().map((area) => `${area.label} (${area.score})`).join(", ");
    paragraphs.push(`Category scores run from 0 to 100 on the controls that were answered in that category. Stronger areas include ${strongest}. Weaker areas include ${weakest}. A blank category means every control in it was outside the company profile or was left unanswered.`);
  }

  const upcoming = analysis.findings.filter((finding) => finding.enforceability === "upcoming");
  const live = analysis.findings.filter((finding) => finding.enforceability === "in_force");
  paragraphs.push(
    live.length === 0
      ? `None of the recorded gaps are duties already in force for this profile. Operational notice, consent, rights, security, breach, retention, children, processor, and transfer duties commence on ${DPDP_EIGHTEEN_MONTHS}. Consent Manager registration under Rule 4 commences on ${DPDP_ONE_YEAR}. A gap against a duty that has not commenced is a readiness item, not a present breach.`
      : `${live.length} recorded gap${live.length === 1 ? "" : "s"} relate to a duty that is already in force. ${upcoming.length} others are readiness items for duties that commence later. Do not treat an upcoming gap as a current violation.`,
  );

  const priorities = analysis.findings.slice(0, 5);
  if (priorities.length > 0) {
    paragraphs.push(`The first actions, in the order the assessment ranks them, are: ${priorities.map((finding) => finding.title).join("; ")}.`);
  } else {
    paragraphs.push("No gap was recorded from the answers. That means every applicable control was marked fully implemented. It does not mean the organisation has been certified.");
  }

  const partials = GAP_CONTROLS.filter((item) => controlApplies(item, profile) && answerOf(responses, item.id) === "partial").map((item) => item.title);
  if (partials.length > 0) {
    paragraphs.push(`Partially implemented controls still need an owner and a finish line: ${partials.join("; ")}.`);
  }

  paragraphs.push(analysis.disclaimer);
  return paragraphs;
}
