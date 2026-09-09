import { isRestrictedPurposeKey, type ChildProtectionConfig } from "./config";
import { restrictedProcessingAllowed, type AgeAssuranceState } from "./state";
import type { ConsentGrants } from "../sdk/enforcement";

export function denyRestrictedDecisions<T extends { purposeId: string | null; granted: boolean }>(
  rows: T[],
  purposes: Array<{ id: string; key: string; isRequired: boolean }>,
  config: ChildProtectionConfig,
  state: AgeAssuranceState | null,
  now = new Date(),
): T[] {
  if (restrictedProcessingAllowed(config, state, now)) return rows;
  const restrictedIds = new Set(
    purposes
      .filter((purpose) => !purpose.isRequired && isRestrictedPurposeKey(purpose.key, config))
      .map((purpose) => purpose.id),
  );
  return rows.map((row) =>
    row.purposeId && restrictedIds.has(row.purposeId)
      ? { ...row, granted: false }
      : row,
  );
}

export function applyChildRestrictionsToGrants(
  grants: ConsentGrants,
  purposes: Array<{ id: string; key: string; isRequired: boolean }>,
  config: ChildProtectionConfig,
  state: AgeAssuranceState | null,
  now = new Date(),
): ConsentGrants {
  const restrictedIds = purposes
    .filter((purpose) => !purpose.isRequired && isRestrictedPurposeKey(purpose.key, config))
    .map((purpose) => purpose.id);
  if (restrictedProcessingAllowed(config, state, now)) {
    return { ...grants, childRestrictedPurposeIds: [] };
  }
  const purposesNext = { ...grants.purposes };
  for (const id of restrictedIds) purposesNext[id] = false;
  return {
    ...grants,
    purposes: purposesNext,
    childRestrictedPurposeIds: restrictedIds,
  };
}

export function childRestrictionReason(
  purposeKey: string,
  isRequired: boolean,
  config: ChildProtectionConfig,
  state: AgeAssuranceState | null,
  now = new Date(),
): "CHILD_RESTRICTED" | null {
  if (isRequired) return null;
  if (!isRestrictedPurposeKey(purposeKey, config)) return null;
  return restrictedProcessingAllowed(config, state, now) ? null : "CHILD_RESTRICTED";
}
