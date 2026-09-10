import type { ConsentGrants, TrackerRule } from "../sdk/enforcement";
import {
  inheritCcpaApplicability,
  parseCcpaApplicability,
  type CaliforniaEnforcement,
  type CcpaApplicability,
} from "./types";

export type CaliforniaTrackerRule = TrackerRule & {
  ccpaSale?: CcpaApplicability | null;
  ccpaShare?: CcpaApplicability | null;
  ccpaSensitivePi?: CcpaApplicability | null;
};

export function californiaBlocksTracker(
  rule: CaliforniaTrackerRule,
  california: CaliforniaEnforcement | null | undefined,
): boolean {
  if (!california?.applicable) return false;
  const sale = parseCcpaApplicability(rule.ccpaSale);
  const share = parseCcpaApplicability(rule.ccpaShare);
  const sensitive = parseCcpaApplicability(rule.ccpaSensitivePi);
  if (california.saleOptOut && sale === "applicable") return true;
  if (california.shareOptOut && share === "applicable") return true;
  if (california.sensitivePiLimit && sensitive === "applicable") return true;
  return false;
}

export function resolveTrackerCcpaClassification(input: {
  trackerSale?: unknown;
  trackerShare?: unknown;
  trackerSensitive?: unknown;
  vendorSale?: unknown;
  vendorShare?: unknown;
  vendorSensitive?: unknown;
}): { ccpaSale: CcpaApplicability; ccpaShare: CcpaApplicability; ccpaSensitivePi: CcpaApplicability } {
  return {
    ccpaSale: inheritCcpaApplicability(input.trackerSale, input.vendorSale),
    ccpaShare: inheritCcpaApplicability(input.trackerShare, input.vendorShare),
    ccpaSensitivePi: inheritCcpaApplicability(input.trackerSensitive, input.vendorSensitive),
  };
}

export function applyCaliforniaToGrants(
  grants: ConsentGrants,
  california: CaliforniaEnforcement | null | undefined,
): ConsentGrants {
  return {
    ...grants,
    california: california
      ? {
          applicable: california.applicable,
          saleOptOut: california.saleOptOut,
          shareOptOut: california.shareOptOut,
          sensitivePiLimit: california.sensitivePiLimit,
          state: california.state,
          source: california.source,
          gpcActive: california.gpcActive,
        }
      : grants.california,
  };
}
