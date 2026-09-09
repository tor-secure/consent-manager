import {
  DEFAULT_RESTRICTED_PURPOSE_KEYS,
  DEFAULT_SESSION_TTL_HOURS,
  MINIMUM_ASSURANCE_LEVELS,
  type ChildProtectionConfig,
  type MinimumAssuranceLevel,
} from "./types";

export type { ChildProtectionConfig };

export function defaultChildProtectionConfig(): ChildProtectionConfig {
  return {
    enabled: false,
    childDirected: false,
    ageAssuranceRequired: false,
    minimumAge: null,
    childMaxAge: null,
    guardianConsentRequired: false,
    restrictedPurposeKeys: [...DEFAULT_RESTRICTED_PURPOSE_KEYS],
    minimumAssurance: "assured",
    sessionTtlHours: DEFAULT_SESSION_TTL_HOURS,
  };
}

function parseKeys(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const keys = value
    .map((item) => String(item ?? "").trim().toLowerCase())
    .filter((item) => item.length > 0 && item.length <= 100);
  return [...new Set(keys)];
}

export function parseChildProtectionConfig(
  raw: unknown,
): ChildProtectionConfig {
  const defaults = defaultChildProtectionConfig();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return defaults;
  const value = raw as Record<string, unknown>;
  const nested =
    value.childProtection && typeof value.childProtection === "object" && !Array.isArray(value.childProtection)
      ? (value.childProtection as Record<string, unknown>)
      : value;
  const minimumAge = Number(nested.minimumAge);
  const childMaxAge = Number(nested.childMaxAge);
  const ttl = Number(nested.sessionTtlHours);
  const assurance = String(nested.minimumAssurance ?? defaults.minimumAssurance);
  return {
    enabled: nested.enabled === true,
    childDirected: nested.childDirected === true,
    ageAssuranceRequired: nested.ageAssuranceRequired === true || nested.childDirected === true,
    minimumAge: Number.isFinite(minimumAge) && minimumAge > 0 ? Math.min(21, Math.round(minimumAge)) : null,
    childMaxAge: Number.isFinite(childMaxAge) && childMaxAge > 0 ? Math.min(17, Math.round(childMaxAge)) : null,
    guardianConsentRequired: nested.guardianConsentRequired === true,
    restrictedPurposeKeys: parseKeys(nested.restrictedPurposeKeys, defaults.restrictedPurposeKeys),
    minimumAssurance: (MINIMUM_ASSURANCE_LEVELS as readonly string[]).includes(assurance)
      ? (assurance as MinimumAssuranceLevel)
      : "assured",
    sessionTtlHours: Number.isFinite(ttl) && ttl >= 1 ? Math.min(24 * 365, Math.round(ttl)) : DEFAULT_SESSION_TTL_HOURS,
  };
}

export function childProtectionActive(config: ChildProtectionConfig): boolean {
  return config.enabled === true || config.childDirected === true;
}

export function isRestrictedPurposeKey(
  purposeKey: string,
  config: ChildProtectionConfig,
): boolean {
  const key = purposeKey.trim().toLowerCase();
  return config.restrictedPurposeKeys.includes(key);
}

export function childProtectionIsComplete(config: ChildProtectionConfig): boolean {
  if (!childProtectionActive(config)) return true;
  return (
    typeof config.minimumAge === "number" &&
    config.minimumAge > 0 &&
    config.ageAssuranceRequired &&
    config.restrictedPurposeKeys.length > 0 &&
    (!config.childDirected || config.guardianConsentRequired)
  );
}
