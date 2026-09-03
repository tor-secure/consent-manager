import {
  REGULATION_CATALOG,
  isRegulationKey,
  type RegulationKey,
  type RegulationProfile,
  type RegulationVersion,
} from "./catalog";

export type ResolvedRegulation = {
  key: RegulationKey;
  label: string;
  version: string;
  effectiveFrom: string;
  rules: RegulationVersion["rules"];
  jurisdictionScope: RegulationVersion["jurisdictionScope"];
};

function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function getRegulationProfile(key: string): RegulationProfile | null {
  if (!isRegulationKey(key)) return null;
  return REGULATION_CATALOG.find((profile) => profile.key === key) ?? null;
}

export function resolveRegulationVersion(
  profile: RegulationProfile,
  at: Date = new Date(),
): RegulationVersion | null {
  const eligible = profile.versions
    .filter((version) => parseIsoDate(version.effectiveFrom).getTime() <= at.getTime())
    .sort((a, b) => parseIsoDate(b.effectiveFrom).getTime() - parseIsoDate(a.effectiveFrom).getTime());
  return eligible[0] ?? null;
}

export function resolveRegulationProfile(input: {
  key: string | null | undefined;
  at?: Date;
}): ResolvedRegulation | null {
  if (!input.key) return null;
  const profile = getRegulationProfile(input.key);
  if (!profile) return null;
  const version = resolveRegulationVersion(profile, input.at ?? new Date());
  if (!version) return null;
  return {
    key: profile.key,
    label: profile.label,
    version: version.version,
    effectiveFrom: version.effectiveFrom,
    rules: version.rules,
    jurisdictionScope: version.jurisdictionScope,
  };
}

export function matchRegulationFromGeo(input: {
  country: string | null;
  region: string | null;
  at?: Date;
}): ResolvedRegulation | null {
  const country = (input.country ?? "").trim().toUpperCase();
  const region = (input.region ?? "").trim().toUpperCase();
  const at = input.at ?? new Date();

  if (country && region) {
    for (const profile of REGULATION_CATALOG) {
      const version = resolveRegulationVersion(profile, at);
      if (!version) continue;
      if (
        version.jurisdictionScope.countries.includes(country) &&
        version.jurisdictionScope.regions.includes(region)
      ) {
        return resolveRegulationProfile({ key: profile.key, at });
      }
    }
  }

  if (region) {
    for (const profile of REGULATION_CATALOG) {
      const version = resolveRegulationVersion(profile, at);
      if (!version) continue;
      if (version.jurisdictionScope.regions.includes(region)) {
        return resolveRegulationProfile({ key: profile.key, at });
      }
    }
  }

  if (country) {
    for (const profile of REGULATION_CATALOG) {
      const version = resolveRegulationVersion(profile, at);
      if (!version) continue;
      if (
        version.jurisdictionScope.countries.includes(country) &&
        version.jurisdictionScope.regions.length === 0
      ) {
        return resolveRegulationProfile({ key: profile.key, at });
      }
    }
    for (const profile of REGULATION_CATALOG) {
      const version = resolveRegulationVersion(profile, at);
      if (!version) continue;
      if (version.jurisdictionScope.countries.includes(country)) {
        return resolveRegulationProfile({ key: profile.key, at });
      }
    }
  }

  return null;
}

export function publicRegulationSummary(resolved: ResolvedRegulation | null) {
  if (!resolved) return null;
  return {
    key: resolved.key,
    label: resolved.label,
    version: resolved.version,
    capabilities: {
      consentRequired: resolved.rules.consentRequired,
      noticeRequired: resolved.rules.noticeRequired,
      optOutRequired: resolved.rules.optOutRequired,
      preferenceCenterRequired: resolved.rules.preferenceCenterRequired,
      withdrawalSupported: resolved.rules.withdrawalSupported,
    },
    disclaimer:
      "Operational regulation profile for this CMP. It is not a legal compliance conclusion.",
  };
}
