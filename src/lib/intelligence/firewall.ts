import { buildBlocklist, buildGrantsFromDecisions, type ConsentGrants, type TrackerRule } from "../sdk/enforcement";
import type { ConsentGraphSnapshot } from "./graph-model";

export type FirewallScenario = "reject-all" | "accept-all" | "essential-only";

export function grantsForScenario(
  snapshot: ConsentGraphSnapshot,
  scenario: FirewallScenario,
): ConsentGrants {
  const grants: ConsentGrants = { purposes: {}, vendors: {} };
  if (scenario === "essential-only" || scenario === "reject-all") {
    for (const purpose of snapshot.purposes) {
      grants.purposes[purpose.id] = purpose.isRequired;
    }
    for (const vendor of snapshot.vendors) {
      grants.vendors[vendor.id] = false;
    }
    return grants;
  }
  for (const purpose of snapshot.purposes) grants.purposes[purpose.id] = true;
  for (const vendor of snapshot.vendors) grants.vendors[vendor.id] = true;
  return grants;
}

export function evaluateFirewall(rules: TrackerRule[], grants: ConsentGrants) {
  const list = buildBlocklist(rules, grants);
  return {
    blockedCount: list.blocked.length,
    allowedCount: list.allowed.length,
    blockedDomains: [...list.domains].sort(),
    blockedIdentifiers: [...list.identifiers].sort(),
    blocked: list.blocked.map((row) => ({
      id: row.id,
      name: row.name,
      domain: row.domain,
      reason: row.isEssential
        ? "essential"
        : !row.purposeId && !row.vendorId
          ? "unclassified"
          : "consent_denied",
    })),
    allowed: list.allowed.map((row) => ({
      id: row.id,
      name: row.name,
      domain: row.domain,
    })),
  };
}

export function grantsFromGraphDecisions(
  snapshot: ConsentGraphSnapshot,
  grantedPurposeIds: string[],
) {
  const granted = new Set(grantedPurposeIds);
  return buildGrantsFromDecisions([
    ...snapshot.purposes.map((purpose) => ({
      purposeId: purpose.id,
      vendorId: null,
      granted: purpose.isRequired || granted.has(purpose.id),
    })),
    ...snapshot.vendors.map((vendor) => ({
      purposeId: null,
      vendorId: vendor.id,
      granted: vendor.purposeIds.some((id) => granted.has(id)),
    })),
  ]);
}
