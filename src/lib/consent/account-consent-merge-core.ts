/**
 * Pure helpers for guest vs account consent merge / deny-wins.
 * Safe for unit tests without DB.
 */

export type DecisionMap = Record<string, boolean>;

export type MergeItem = {
  id: string;
  kind: "purpose" | "vendor";
  name: string;
  guestGranted: boolean | null;
  accountGranted: boolean | null;
  effectiveGranted: boolean;
  conflict: boolean;
};

export function decisionMapKey(kind: "purpose" | "vendor", id: string): string {
  return `${kind}:${id}`;
}

/** Deny wins: if either side explicitly denies, result is denied. */
export function denyWinsGrant(
  guestGranted: boolean | null,
  accountGranted: boolean | null,
): boolean {
  if (guestGranted === false || accountGranted === false) return false;
  if (guestGranted === true || accountGranted === true) return true;
  return false;
}

export function buildMergeItems(input: {
  purposes: Array<{ id: string; name: string; isRequired?: boolean }>;
  vendors?: Array<{ id: string; name: string }>;
  guestPurposes: DecisionMap;
  guestVendors: DecisionMap;
  accountPurposes: DecisionMap;
  accountVendors: DecisionMap;
  hasGuestSnapshot: boolean;
  hasAccountSnapshot: boolean;
}): MergeItem[] {
  const items: MergeItem[] = [];
  for (const purpose of input.purposes) {
    if (purpose.isRequired) continue;
    const guestGranted = input.hasGuestSnapshot
      ? Boolean(input.guestPurposes[purpose.id])
      : null;
    const accountGranted = input.hasAccountSnapshot
      ? Boolean(input.accountPurposes[purpose.id])
      : null;
    const effectiveGranted = denyWinsGrant(guestGranted, accountGranted);
    const conflict =
      guestGranted !== null &&
      accountGranted !== null &&
      guestGranted !== accountGranted;
    items.push({
      id: purpose.id,
      kind: "purpose",
      name: purpose.name,
      guestGranted,
      accountGranted,
      effectiveGranted,
      conflict,
    });
  }
  for (const vendor of input.vendors || []) {
    const guestGranted = input.hasGuestSnapshot
      ? Boolean(input.guestVendors[vendor.id])
      : null;
    const accountGranted = input.hasAccountSnapshot
      ? Boolean(input.accountVendors[vendor.id])
      : null;
    const effectiveGranted = denyWinsGrant(guestGranted, accountGranted);
    const conflict =
      guestGranted !== null &&
      accountGranted !== null &&
      guestGranted !== accountGranted;
    items.push({
      id: vendor.id,
      kind: "vendor",
      name: vendor.name,
      guestGranted,
      accountGranted,
      effectiveGranted,
      conflict,
    });
  }
  return items;
}

export function guestChoiceIsFullReject(items: MergeItem[]): boolean {
  if (items.length === 0) return false;
  return items.every((item) => item.guestGranted === false);
}

export function guestChoiceIsFullAccept(items: MergeItem[]): boolean {
  if (items.length === 0) return false;
  return items.every((item) => item.guestGranted === true);
}
