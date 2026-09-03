export type PolicyCandidate = {
  id: string;
  isDefault: boolean;
  status: string;
  createdAt: Date;
};

export type JurisdictionRuleMatch = {
  countryCode: string;
  regionCode: string;
  policyId: string;
  regulationKey: string;
};

export type PolicySelection = {
  policyId: string | null;
  reason: "state" | "country" | "default" | "fallback" | "none";
  regulationKey: string | null;
};

function activePolicies(policies: PolicyCandidate[]): PolicyCandidate[] {
  return policies.filter((policy) => policy.status === "active");
}

export function selectConsentPolicy(input: {
  country: string | null;
  region: string | null;
  rules: JurisdictionRuleMatch[];
  policies: PolicyCandidate[];
  defaultRegulationKey?: string | null;
}): PolicySelection {
  const country = (input.country ?? "").toUpperCase();
  const region = (input.region ?? "").toUpperCase();
  const activeIds = new Set(activePolicies(input.policies).map((policy) => policy.id));

  if (country && region) {
    const stateRule = input.rules.find(
      (rule) =>
        rule.countryCode === country &&
        rule.regionCode === region &&
        activeIds.has(rule.policyId),
    );
    if (stateRule) {
      return {
        policyId: stateRule.policyId,
        reason: "state",
        regulationKey: stateRule.regulationKey,
      };
    }
  }

  if (country) {
    const countryRule = input.rules.find(
      (rule) =>
        rule.countryCode === country &&
        rule.regionCode === "" &&
        activeIds.has(rule.policyId),
    );
    if (countryRule) {
      return {
        policyId: countryRule.policyId,
        reason: "country",
        regulationKey: countryRule.regulationKey,
      };
    }
  }

  const defaultPolicy = activePolicies(input.policies).find((policy) => policy.isDefault);
  if (defaultPolicy) {
    return {
      policyId: defaultPolicy.id,
      reason: "default",
      regulationKey: input.defaultRegulationKey ?? null,
    };
  }

  const fallback = activePolicies(input.policies).sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  )[0];
  if (fallback) {
    return {
      policyId: fallback.id,
      reason: "fallback",
      regulationKey: input.defaultRegulationKey ?? null,
    };
  }

  return { policyId: null, reason: "none", regulationKey: input.defaultRegulationKey ?? null };
}

export function findConflictingJurisdictionRules(
  rules: Array<{ countryCode: string; regionCode: string }>,
): string[] {
  const seen = new Set<string>();
  const conflicts: string[] = [];
  for (const rule of rules) {
    const key = `${rule.countryCode}|${rule.regionCode}`;
    if (seen.has(key)) conflicts.push(key);
    seen.add(key);
  }
  return conflicts;
}
