import { gpcSignalIsActive } from "./gpc";
import {
  californiaRuntimeApplies,
  type CaliforniaOptOutRecord,
  type CaliforniaOptOutSource,
  type CaliforniaOptOutState,
  type ClientGpcState,
  type SecGpcHeaderState,
} from "./types";

export type ResolveCaliforniaInput = {
  regulationKey?: string | null;
  region?: string | null;
  header: SecGpcHeaderState;
  client: ClientGpcState;
  consentWithdrawn?: boolean;
  persisted?: Partial<CaliforniaOptOutRecord> | null;
  manualDoNotSell?: boolean;
  manualDoNotShare?: boolean;
  manualLimitSensitive?: boolean;
  clearManual?: boolean;
  limitSensitiveConfigured?: boolean;
  jurisdiction?: string | null;
  policyVersionId?: string | null;
};

export function resolveCaliforniaOptOut(input: ResolveCaliforniaInput): CaliforniaOptOutRecord {
  const applicable = californiaRuntimeApplies({
    regulationKey: input.regulationKey,
    region: input.region,
  });
  const gpcActive = applicable && gpcSignalIsActive(input.header, input.client);
  const persisted = input.persisted ?? null;
  const clearManual = input.clearManual === true && !gpcActive && input.consentWithdrawn !== true;
  const persistedIsManual = persisted?.source === "manual" || persisted?.source === "mixed" || persisted?.source === "withdrawal";

  const manualSale = clearManual
    ? false
    : input.manualDoNotSell === true
      || (input.manualDoNotSell !== false && persistedIsManual && persisted?.saleOptOut === true);
  const manualShare = clearManual
    ? false
    : input.manualDoNotShare === true
      || (input.manualDoNotShare !== false && persistedIsManual && persisted?.shareOptOut === true);
  const manualSensitive = clearManual
    ? false
    : input.manualLimitSensitive === true
      || (input.manualLimitSensitive !== false && persistedIsManual && persisted?.sensitivePiLimit === true);

  if (!applicable) {
    return {
      state: "not_applicable",
      source: "none",
      saleOptOut: false,
      shareOptOut: false,
      sensitivePiLimit: false,
      gpcHeader: input.header,
      gpcClient: input.client,
      gpcActive: false,
      jurisdiction: input.jurisdiction ?? null,
      policyVersionId: input.policyVersionId ?? persisted?.policyVersionId ?? null,
    };
  }

  const saleOptOut = gpcActive || manualSale || input.consentWithdrawn === true;
  const shareOptOut = gpcActive || manualShare || input.consentWithdrawn === true;
  const sensitivePiLimit =
    (gpcActive && input.limitSensitiveConfigured === true) ||
    manualSensitive ||
    (input.consentWithdrawn === true && input.limitSensitiveConfigured === true);

  let state: CaliforniaOptOutState = "not_opted_out";
  let source: CaliforniaOptOutSource = "none";
  if (input.consentWithdrawn === true) {
    state = "withdrawn";
    source = gpcActive || manualSale || manualShare || manualSensitive ? "mixed" : "withdrawal";
  } else if (gpcActive) {
    state = "gpc_opted_out";
    source = manualSale || manualShare || manualSensitive ? "mixed" : "gpc";
  } else if (manualSale || manualShare || manualSensitive) {
    state = "manual_opt_out";
    source = "manual";
  }

  return {
    state,
    source,
    saleOptOut,
    shareOptOut,
    sensitivePiLimit,
    gpcHeader: input.header,
    gpcClient: input.client,
    gpcActive,
    jurisdiction: input.jurisdiction ?? null,
    policyVersionId: input.policyVersionId ?? persisted?.policyVersionId ?? null,
  };
}

export function californiaEnforcementFromRecord(record: CaliforniaOptOutRecord): {
  applicable: boolean;
  state: CaliforniaOptOutState;
  source: CaliforniaOptOutSource;
  saleOptOut: boolean;
  shareOptOut: boolean;
  sensitivePiLimit: boolean;
  gpcActive: boolean;
} {
  return {
    applicable: record.state !== "not_applicable" && record.state !== "unknown",
    state: record.state,
    source: record.source,
    saleOptOut: record.saleOptOut,
    shareOptOut: record.shareOptOut,
    sensitivePiLimit: record.sensitivePiLimit,
    gpcActive: record.gpcActive,
  };
}

export function publicCaliforniaState(record: CaliforniaOptOutRecord) {
  return {
    applicable: record.state !== "not_applicable" && record.state !== "unknown",
    state: record.state,
    source: record.source,
    gpcRecognized: record.gpcActive,
    gpcHeader: record.gpcHeader,
    saleOptOut: record.saleOptOut,
    shareOptOut: record.shareOptOut,
    sensitivePiLimit: record.sensitivePiLimit,
    ui: publicCaliforniaUi(record),
  };
}

export function publicCaliforniaUi(record: CaliforniaOptOutRecord): {
  gpcDetected: boolean;
  optOutActive: boolean;
  managedByBrowserSignal: boolean;
  manualOptOutActive: boolean;
  label: string;
} {
  const optOutActive = record.saleOptOut || record.shareOptOut || record.sensitivePiLimit;
  const managedByBrowserSignal = record.gpcActive;
  const manualOptOutActive = record.state === "manual_opt_out" || (record.source === "mixed" && !record.gpcActive);
  let label = "Not opted out";
  if (record.state === "not_applicable") label = "California opt-out is not applicable";
  else if (record.state === "withdrawn") label = "Opt-out active";
  else if (managedByBrowserSignal) label = "Opt-out managed by browser privacy signal";
  else if (manualOptOutActive) label = "Manual opt-out active";
  else if (optOutActive) label = "Opt-out active";
  return {
    gpcDetected: managedByBrowserSignal,
    optOutActive,
    managedByBrowserSignal,
    manualOptOutActive,
    label,
  };
}

export function evidenceCaliforniaOptOut(record: CaliforniaOptOutRecord): Record<string, unknown> {
  return {
    state: record.state,
    source: record.source,
    saleOptOut: record.saleOptOut,
    shareOptOut: record.shareOptOut,
    sensitivePiLimit: record.sensitivePiLimit,
    gpcHeader: record.gpcHeader,
    gpcActive: record.gpcActive,
    jurisdiction: record.jurisdiction,
    policyVersionId: record.policyVersionId,
  };
}
