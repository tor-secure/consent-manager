import {
  matchRegulationFromGeo,
  publicRegulationSummary,
  rankRegulationsFromGeo,
  type ResolvedRegulation,
} from "./engine";
import { resolveJurisdiction, type GeoHint } from "./geo";
import type { PolicySelection } from "./policy-selection";

export type LegalEngineStep = {
  code: string;
  detail: string;
};

export type LegalEngineResult = {
  geo: GeoHint;
  selected: ReturnType<typeof publicRegulationSummary>;
  regulationSource: "configured" | "inferred" | "none";
  policyReason: PolicySelection["reason"];
  confidence: number;
  reasoning: LegalEngineStep[];
  alternatives: ReturnType<typeof rankRegulationsFromGeo>;
  ux: {
    consentModel: "opt_in" | "opt_out" | "notice_only";
    rejectAllRecommended: boolean;
    preferenceCenterRequired: boolean;
    googleConsentMode: boolean;
    iabTcf: boolean;
    iabGpp: boolean;
  };
  disclaimer: string;
};

function consentModel(rules: ResolvedRegulation["rules"] | undefined): LegalEngineResult["ux"]["consentModel"] {
  if (!rules) return "notice_only";
  if (rules.consentRequired) return "opt_in";
  if (rules.optOutRequired) return "opt_out";
  return "notice_only";
}

function confidenceFrom(input: {
  geo: GeoHint;
  source: LegalEngineResult["regulationSource"];
  policyReason: PolicySelection["reason"];
  topScore: number;
}): number {
  let score = 20;
  if (input.geo.source === "hint") score += 25;
  else if (input.geo.source === "website_default") score += 10;
  if (input.source === "configured") score += 35;
  else if (input.source === "inferred") score += 20;
  if (input.policyReason === "state") score += 15;
  else if (input.policyReason === "country") score += 10;
  else if (input.policyReason === "default") score += 5;
  score += Math.round(input.topScore * 0.1);
  return Math.min(100, score);
}

export function runGeoLegalEngine(input: {
  country?: string | null;
  region?: string | null;
  websiteDefaultRegion?: string | null;
  selection: PolicySelection;
  configuredRegulation: ResolvedRegulation | null;
  inferredRegulation: ResolvedRegulation | null;
  regulation: ResolvedRegulation | null;
  regulationSource: LegalEngineResult["regulationSource"];
}): LegalEngineResult {
  const geo = resolveJurisdiction({
    country: input.country,
    region: input.region,
    websiteDefaultRegion: input.websiteDefaultRegion,
  });
  const alternatives = rankRegulationsFromGeo({ country: geo.country, region: geo.region });
  const inferred = input.inferredRegulation ?? matchRegulationFromGeo({
    country: geo.country,
    region: geo.region,
  });
  const selected = input.regulation;
  const reasoning: LegalEngineStep[] = [];

  if (geo.source === "hint") {
    reasoning.push({
      code: "geo_hint",
      detail: `Visitor location used: ${geo.country ?? "—"}${geo.region ? ` / ${geo.region}` : ""}.`,
    });
  } else if (geo.source === "website_default") {
    reasoning.push({
      code: "geo_website_default",
      detail: `No visitor country header or hint; website default region ${input.websiteDefaultRegion} was used.`,
    });
  } else {
    reasoning.push({
      code: "geo_unknown",
      detail: "No country or region was available, so the catalog could not infer a law from location.",
    });
  }

  if (input.selection.reason === "state") {
    reasoning.push({
      code: "policy_state_rule",
      detail: "A website jurisdiction rule matched this country and region, so that policy wins over catalog inference.",
    });
  } else if (input.selection.reason === "country") {
    reasoning.push({
      code: "policy_country_rule",
      detail: "A website jurisdiction rule matched this country, so that policy is used.",
    });
  } else if (input.selection.reason === "default") {
    reasoning.push({
      code: "policy_default",
      detail: "No matching jurisdiction rule; the website default policy is used.",
    });
  } else if (input.selection.reason === "fallback") {
    reasoning.push({
      code: "policy_fallback",
      detail: "No default policy is set; the oldest active policy is used.",
    });
  } else {
    reasoning.push({
      code: "policy_none",
      detail: "No active policy is available for this website.",
    });
  }

  if (input.regulationSource === "configured" && input.configuredRegulation) {
    reasoning.push({
      code: "regulation_configured",
      detail: `Regulation ${input.configuredRegulation.label} ${input.configuredRegulation.version} comes from the website rule or default regulation key.`,
    });
  } else if (input.regulationSource === "inferred" && inferred) {
    reasoning.push({
      code: "regulation_inferred",
      detail: `Catalog match ${inferred.label} ${inferred.version} (score ${alternatives[0]?.score ?? 0}). This is an operational profile, not a legal opinion.`,
    });
  } else {
    reasoning.push({
      code: "regulation_none",
      detail: "No catalog profile matched this location.",
    });
  }

  const rules = selected?.rules;
  const ux: LegalEngineResult["ux"] = {
    consentModel: consentModel(rules),
    rejectAllRecommended: Boolean(rules?.consentRequired),
    preferenceCenterRequired: Boolean(rules?.preferenceCenterRequired),
    googleConsentMode: Boolean(rules?.signalRequirements.googleConsentMode),
    iabTcf: Boolean(rules?.signalRequirements.iabTcf),
    iabGpp: Boolean(rules?.signalRequirements.iabGpp),
  };

  return {
    geo,
    selected: publicRegulationSummary(selected),
    regulationSource: input.regulationSource,
    policyReason: input.selection.reason,
    confidence: confidenceFrom({
      geo,
      source: input.regulationSource,
      policyReason: input.selection.reason,
      topScore: alternatives[0]?.score ?? 0,
    }),
    reasoning,
    alternatives: alternatives.slice(0, 5),
    ux,
    disclaimer:
      "Operational geo-legal engine for this CMP. Rankings come from the product catalog and website rules. It is not legal advice or a compliance certification.",
  };
}
