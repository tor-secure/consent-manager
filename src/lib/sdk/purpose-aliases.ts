// Maps operator purpose keys onto a small set of enforcement families so
// built-in tracker rules (analytics / marketing / functionality) still bind
// when a policy uses a template key such as "advertising" or "functional".
// Exact purposeId mappings always win. Optional builtins never bind to a
// required purpose.

export const PURPOSE_KEY_FAMILIES: Record<string, string> = {
  necessary: "essential",
  essential: "essential",
  required: "essential",
  security: "essential",
  analytics: "analytics",
  statistics: "analytics",
  measurement: "analytics",
  marketing: "marketing",
  advertising: "marketing",
  ads: "marketing",
  targeting: "marketing",
  functionality: "functionality",
  functional: "functionality",
  personalization: "personalization",
  preferences: "personalization",
};

export type PurposeAliasRef = {
  id: string;
  key: string;
  isRequired?: boolean;
};

export function purposeKeyFamily(key: string | null | undefined): string | null {
  const normalized = String(key ?? "").trim().toLowerCase();
  if (!normalized) return null;
  return PURPOSE_KEY_FAMILIES[normalized] ?? null;
}

export function purposeKeysEquivalent(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  const a = String(left ?? "").trim().toLowerCase();
  const b = String(right ?? "").trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  const leftFamily = purposeKeyFamily(a);
  const rightFamily = purposeKeyFamily(b);
  return Boolean(leftFamily && rightFamily && leftFamily === rightFamily);
}

export function resolvePurposeForTrackerKey(
  purposeKey: string | null | undefined,
  purposes: PurposeAliasRef[],
): PurposeAliasRef | null {
  const key = String(purposeKey ?? "").trim();
  if (!key) return null;
  const exact = purposes.find(
    (purpose) => purpose.key === key || purpose.key.toLowerCase() === key.toLowerCase(),
  );
  if (exact) return exact;

  const family = purposeKeyFamily(key);
  if (!family || family === "essential") return null;
  return (
    purposes.find((purpose) => !purpose.isRequired && purposeKeyFamily(purpose.key) === family) ??
    null
  );
}

export function bindTrackerRuleToPurposes<
  T extends { purposeId: string | null; purposeKey: string | null; isEssential?: boolean },
>(rule: T, purposes: PurposeAliasRef[]): T {
  if (rule.purposeId) {
    const mapped = purposes.find((purpose) => purpose.id === rule.purposeId);
    return mapped ? { ...rule, purposeKey: mapped.key } : rule;
  }
  if (rule.isEssential) return rule;
  const resolved = resolvePurposeForTrackerKey(rule.purposeKey, purposes);
  if (!resolved) return rule;
  return { ...rule, purposeId: resolved.id, purposeKey: resolved.key };
}
