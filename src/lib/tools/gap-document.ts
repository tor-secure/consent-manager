import {
  DATA_TYPE_OPTIONS,
  EMPLOYEE_OPTIONS,
  GAP_CONTROLS,
  GAP_VERSION,
  INDUSTRY_OPTIONS,
  SIZE_OPTIONS,
  emptyProfile,
  type GapAnswer,
  type GapProfile,
  type GapRemediation,
  type GapResponse,
  type RemediationStatus,
  type YesNo,
} from "@/config/tools/gap";

export type GapCmp = {
  consentRecords: number;
  publishedPolicies: number;
  purposes: number;
};

export type GapStoredAnalysis = {
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
  areas: Array<{ id: string; label: string; score: number | null; applicable: number; implemented: number; partial: number; missing: number }>;
  findings: Array<{
    id: string;
    area: string;
    areaLabel: string;
    title: string;
    description: string;
    reference: string;
    severity: string;
    kind: string;
    enforceability: string;
    commences: string;
    explanation: string;
    action: string;
    evidence: string;
    priority: number;
  }>;
  statusCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  regulatory: Array<{ id: string; title: string; detail: string; state: string }>;
};

export type GapDocument = {
  kind: "dpdp-gap";
  version: string;
  profile: GapProfile;
  responses: Record<string, GapResponse>;
  remediation: Record<string, GapRemediation>;
  cmp: GapCmp | null;
  analysis: GapStoredAnalysis | null;
  completedAt: string | null;
  label: string;
  summary: string;
};

const ANSWERS = new Set<GapAnswer>(["implemented", "partial", "missing", "na", "unassessed"]);
const YES = new Set<YesNo>(["yes", "no", "unsure"]);
const ROLES = new Set<GapProfile["role"]>(["fiduciary", "processor", "both"]);
const SDF = new Set<GapProfile["sdf"]>(["designated", "not_designated", "unsure"]);
const REMEDIATION = new Set<RemediationStatus>(["open", "in_progress", "awaiting_evidence", "under_review", "resolved"]);
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\u0000/g, "").trim().slice(0, max);
}

function oneOf<T extends string>(value: unknown, allowed: Set<T>, fallback: T): T {
  return typeof value === "string" && allowed.has(value as T) ? (value as T) : fallback;
}

export function emptyRemediation(): GapRemediation {
  return { owner: "", due: "", status: "open", evidence: "", verified: false };
}

export function blankDocument(companyName = ""): GapDocument {
  return {
    kind: "dpdp-gap",
    version: GAP_VERSION,
    profile: emptyProfile(companyName),
    responses: {},
    remediation: {},
    cmp: null,
    analysis: null,
    completedAt: null,
    label: "Draft",
    summary: "",
  };
}

export function parseProfile(value: unknown, fallbackName = ""): GapProfile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const dataTypes = Array.isArray(record.dataTypes)
    ? record.dataTypes.filter((item): item is string => typeof item === "string" && (DATA_TYPE_OPTIONS as readonly string[]).includes(item)).slice(0, DATA_TYPE_OPTIONS.length)
    : [];
  const industry = text(record.industry, 80);
  const organisationSize = text(record.organisationSize, 40);
  const employeeRange = text(record.employeeRange, 40);
  if (industry && !(INDUSTRY_OPTIONS as readonly string[]).includes(industry)) return null;
  if (organisationSize && !(SIZE_OPTIONS as readonly string[]).includes(organisationSize)) return null;
  if (employeeRange && !(EMPLOYEE_OPTIONS as readonly string[]).includes(employeeRange)) return null;
  return {
    companyName: text(record.companyName, 200) || fallbackName.slice(0, 200),
    industry,
    organisationSize,
    employeeRange,
    location: text(record.location, 160),
    dataTypes,
    purposes: text(record.purposes, 2000),
    childrenData: oneOf(record.childrenData, YES, "unsure"),
    processors: oneOf(record.processors, YES, "unsure"),
    crossBorder: oneOf(record.crossBorder, YES, "unsure"),
    role: oneOf(record.role, ROLES, "fiduciary"),
    sdf: oneOf(record.sdf, SDF, "unsure"),
    governance: text(record.governance, 2000),
  };
}

export function profileReady(profile: GapProfile): boolean {
  return Boolean(
    profile.companyName &&
      profile.industry &&
      profile.organisationSize &&
      profile.employeeRange &&
      profile.location &&
      profile.dataTypes.length > 0 &&
      profile.purposes &&
      profile.governance,
  );
}

export function parseResponses(value: unknown): Record<string, GapResponse> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const known = new Set(GAP_CONTROLS.map((item) => item.id));
  const responses: Record<string, GapResponse> = {};
  for (const [id, raw] of Object.entries(record)) {
    if (!known.has(id) || !raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    if (!ANSWERS.has(item.status as GapAnswer)) return null;
    responses[id] = {
      status: item.status as GapAnswer,
      remarks: text(item.remarks, 2000),
      evidence: text(item.evidence, 2000),
    };
  }
  return responses;
}

export function parseRemediation(value: unknown): Record<string, GapRemediation> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const known = new Set(GAP_CONTROLS.map((item) => item.id));
  const remediation: Record<string, GapRemediation> = {};
  for (const [id, raw] of Object.entries(record)) {
    if (!known.has(id) || !raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const item = raw as Record<string, unknown>;
    const status = oneOf(item.status, REMEDIATION, "open");
    const due = text(item.due, 10);
    if (due && !DAY.test(due)) return null;
    const verified = item.verified === true && (status === "under_review" || status === "resolved");
    remediation[id] = {
      owner: text(item.owner, 120),
      due,
      status,
      evidence: text(item.evidence, 2000),
      verified,
    };
  }
  return remediation;
}

export function isGapDocument(value: unknown): value is GapDocument {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return (value as { kind?: string }).kind === "dpdp-gap";
}

export function readGapDocument(value: unknown): GapDocument | null {
  if (!isGapDocument(value)) return null;
  const record = value as GapDocument;
  const profile = parseProfile(record.profile);
  const responses = parseResponses(record.responses);
  const remediation = parseRemediation(record.remediation);
  if (!profile || !responses || !remediation) return null;
  return {
    kind: "dpdp-gap",
    version: typeof record.version === "string" ? record.version.slice(0, 32) : GAP_VERSION,
    profile,
    responses,
    remediation,
    cmp: record.cmp && typeof record.cmp === "object" ? record.cmp : null,
    analysis: record.analysis && typeof record.analysis === "object" ? record.analysis : null,
    completedAt: typeof record.completedAt === "string" ? record.completedAt : null,
    label: typeof record.label === "string" ? record.label : "Draft",
    summary: typeof record.summary === "string" ? record.summary : "",
  };
}
