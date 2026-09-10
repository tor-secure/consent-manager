export const CCPA_APPLICABILITY = ["unknown", "applicable", "not_applicable"] as const;
export type CcpaApplicability = (typeof CCPA_APPLICABILITY)[number];

export const CALIFORNIA_OPT_OUT_STATES = [
  "unknown",
  "not_applicable",
  "not_opted_out",
  "gpc_opted_out",
  "manual_opt_out",
  "withdrawn",
] as const;
export type CaliforniaOptOutState = (typeof CALIFORNIA_OPT_OUT_STATES)[number];

export const CALIFORNIA_OPT_OUT_SOURCES = [
  "none",
  "gpc",
  "manual",
  "withdrawal",
  "mixed",
] as const;
export type CaliforniaOptOutSource = (typeof CALIFORNIA_OPT_OUT_SOURCES)[number];

export const SEC_GPC_HEADER_STATES = ["absent", "valid_1", "invalid"] as const;
export type SecGpcHeaderState = (typeof SEC_GPC_HEADER_STATES)[number];

export const CLIENT_GPC_STATES = ["unknown", "true", "false", "invalid"] as const;
export type ClientGpcState = (typeof CLIENT_GPC_STATES)[number];

export const CCPA_RUNTIME_JURISDICTIONS = new Set(["ccpa", "cpra", "ucpa", "vcdpa", "cpa"]);

export const CALIFORNIA_AUDIT_ACTIONS = {
  gpcDetected: "GPC_DETECTED",
  gpcOptOutApplied: "GPC_OPT_OUT_APPLIED",
  manualOptOutCreated: "MANUAL_OPT_OUT_CREATED",
  manualOptOutWithdrawn: "MANUAL_OPT_OUT_WITHDRAWN",
  doNotSellEnabled: "DO_NOT_SELL_ENABLED",
  doNotShareEnabled: "DO_NOT_SHARE_ENABLED",
  sensitivePiLimitEnabled: "SENSITIVE_PI_LIMIT_ENABLED",
  californiaOptOutChanged: "CALIFORNIA_OPT_OUT_CHANGED",
} as const;

export type CaliforniaEnforcement = {
  applicable: boolean;
  state: CaliforniaOptOutState;
  source: CaliforniaOptOutSource;
  saleOptOut: boolean;
  shareOptOut: boolean;
  sensitivePiLimit: boolean;
  gpcActive: boolean;
};

export type CaliforniaOptOutRecord = {
  state: CaliforniaOptOutState;
  source: CaliforniaOptOutSource;
  saleOptOut: boolean;
  shareOptOut: boolean;
  sensitivePiLimit: boolean;
  gpcHeader: SecGpcHeaderState;
  gpcClient: ClientGpcState;
  gpcActive: boolean;
  jurisdiction: string | null;
  policyVersionId: string | null;
};

export function parseCcpaApplicability(value: unknown): CcpaApplicability {
  const next = String(value ?? "").trim().toLowerCase();
  return CCPA_APPLICABILITY.includes(next as CcpaApplicability) ? (next as CcpaApplicability) : "unknown";
}

export function parseCaliforniaOptOutState(value: unknown): CaliforniaOptOutState {
  const next = String(value ?? "").trim().toLowerCase();
  return CALIFORNIA_OPT_OUT_STATES.includes(next as CaliforniaOptOutState)
    ? (next as CaliforniaOptOutState)
    : "unknown";
}

export function californiaRuntimeApplies(input: {
  regulationKey?: string | null;
  region?: string | null;
}): boolean {
  const key = String(input.regulationKey ?? "").trim().toLowerCase();
  if (CCPA_RUNTIME_JURISDICTIONS.has(key)) return true;
  const region = String(input.region ?? "").trim().toUpperCase().replace("_", "-");
  return region === "CA" || region === "US-CA" || region.endsWith("-CA");
}

export function inheritCcpaApplicability(
  primary: unknown,
  fallback: unknown,
): CcpaApplicability {
  const first = parseCcpaApplicability(primary);
  if (first !== "unknown") return first;
  return parseCcpaApplicability(fallback);
}
