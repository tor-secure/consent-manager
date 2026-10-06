import type { ExperimentVariant } from "@/db/schema/experiments";

export const EXPERIMENT_STATUSES = ["DRAFT", "SCHEDULED", "RUNNING", "PAUSED", "COMPLETED", "ARCHIVED"] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];
export const EXPERIMENT_EVENT_TYPES = ["assignment", "impression", "interaction", "consent_decision", "withdrawal", "completion"] as const;
export type ExperimentEventType = (typeof EXPERIMENT_EVENT_TYPES)[number];

const VARIANT_ID = /^[a-z0-9-]{1,40}$/;
const PRESENTATION_KEYS = new Set(["layout", "position", "primaryColor", "backgroundColor", "textColor", "borderRadius"]);
const TRANSITIONS: Record<ExperimentStatus, readonly ExperimentStatus[]> = {
  DRAFT: ["SCHEDULED", "RUNNING", "ARCHIVED"],
  SCHEDULED: ["RUNNING", "PAUSED", "ARCHIVED"],
  RUNNING: ["PAUSED", "COMPLETED"],
  PAUSED: ["RUNNING", "COMPLETED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function parseExperimentVariants(raw: unknown): { variants: ExperimentVariant[]; allocation: Record<string, number>; controlVariantId: string } | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  if (!Array.isArray(input.variants) || input.variants.length < 2 || input.variants.length > 5) return null;
  const seen = new Set<string>();
  const variants: ExperimentVariant[] = [];
  const allocation: Record<string, number> = {};
  for (const item of input.variants) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || !VARIANT_ID.test(row.id) || seen.has(row.id)) return null;
    seen.add(row.id);
    const weight = Number(row.weight);
    if (!Number.isInteger(weight) || weight < 0 || weight > 100) return null;
    const overrides: Record<string, string | number> = {};
    if (row.overrides !== undefined && (!row.overrides || typeof row.overrides !== "object" || Array.isArray(row.overrides))) return null;
    for (const [key, value] of Object.entries((row.overrides ?? {}) as Record<string, unknown>)) {
      if (!PRESENTATION_KEYS.has(key)) return null;
      if (typeof value !== "string" && typeof value !== "number") return null;
      if (typeof value === "string" && (value.length > 80 || /[<>\u0000-\u001f]/.test(value))) return null;
      if (key === "layout" && !["bar", "dialog"].includes(String(value))) return null;
      if (key === "position" && !["top", "bottom", "center", "bottom-left", "bottom-right"].includes(String(value))) return null;
      if (key === "borderRadius" && (typeof value !== "number" || value < 0 || value > 32)) return null;
      if (["primaryColor", "backgroundColor", "textColor"].includes(key) && (typeof value !== "string" || !/^#[0-9a-f]{3,8}$/i.test(value))) return null;
      overrides[key] = value;
    }
    variants.push({ id: row.id, label: typeof row.label === "string" ? row.label.trim().slice(0, 80) || row.id : row.id, weight, overrides });
    allocation[row.id] = weight;
  }
  if (variants.reduce((sum, row) => sum + row.weight, 0) !== 100) return null;
  const controlVariantId = typeof input.controlVariantId === "string" ? input.controlVariantId : "";
  if (!seen.has(controlVariantId)) return null;
  if (variants.find((row) => row.id === controlVariantId)?.weight === 0) return null;
  return { variants, allocation, controlVariantId };
}

export function canTransitionExperiment(from: string, to: string): to is ExperimentStatus {
  return EXPERIMENT_STATUSES.includes(from as ExperimentStatus) && EXPERIMENT_STATUSES.includes(to as ExperimentStatus)
    && TRANSITIONS[from as ExperimentStatus].includes(to as ExperimentStatus);
}

export function assignExperimentVariant(input: { experimentId: string; visitorKey: string; variants: ExperimentVariant[] }): ExperimentVariant | null {
  if (!input.visitorKey || !input.variants.length) return null;
  const seed = `${input.experimentId}:${input.visitorKey}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) { hash ^= seed.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  const bucket = (hash >>> 0) % 100;
  let cumulative = 0;
  for (const variant of input.variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) return variant;
  }
  return input.variants[input.variants.length - 1] ?? null;
}

export function experimentResults(events: Array<{ variantId: string; eventType: string; choice?: string | null; count?: number }>, variants: ExperimentVariant[]) {
  return variants.map((variant) => {
    const rows = events.filter((event) => event.variantId === variant.id);
    const count = (type: string) => rows.filter((event) => event.eventType === type).reduce((sum, event) => sum + (event.count ?? 1), 0);
    const impressions = count("impression");
    const decisions = count("consent_decision");
    const acceptances = rows.filter((event) => event.eventType === "consent_decision" && event.choice === "accept-all").reduce((sum, event) => sum + (event.count ?? 1), 0);
    const rejections = rows.filter((event) => event.eventType === "consent_decision" && event.choice === "reject-all").reduce((sum, event) => sum + (event.count ?? 1), 0);
    const granularDecisions = rows.filter((event) => event.eventType === "consent_decision" && event.choice === "granular").reduce((sum, event) => sum + (event.count ?? 1), 0);
    return {
      variantId: variant.id,
      label: variant.label,
      allocation: variant.weight,
      assignments: count("assignment"),
      impressions,
      consentDecisions: decisions,
      acceptances,
      rejections,
      granularDecisions,
      withdrawals: count("withdrawal"),
      completionEvents: count("completion"),
      decisionRate: impressions ? Math.round((decisions / impressions) * 1000) / 10 : null,
      acceptanceRate: decisions ? Math.round((acceptances / decisions) * 1000) / 10 : null,
      rejectionRate: decisions ? Math.round((rejections / decisions) * 1000) / 10 : null,
      evidence: "observed" as const,
    };
  });
}
