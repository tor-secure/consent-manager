import type { TrackerRule } from "../sdk/enforcement";

export type GraphPurpose = {
  id: string;
  key: string;
  name: string;
  isRequired: boolean;
  dataCategories: string[];
  legalBasis: string | null;
};

export type GraphVendor = {
  id: string;
  name: string;
  domain: string | null;
  country: string | null;
  purposeIds: string[];
};

export type GraphTracker = {
  id: string;
  name: string;
  type: string;
  domain: string | null;
  identifier: string | null;
  purposeId: string | null;
  vendorId: string | null;
  isEssential: boolean;
  status: string;
};

export type ConsentGraphSnapshot = {
  website: { id: string; name: string; domain: string };
  purposes: GraphPurpose[];
  vendors: GraphVendor[];
  trackers: GraphTracker[];
};

export function graphToTrackerRules(snapshot: ConsentGraphSnapshot): TrackerRule[] {
  const purposeKey = new Map(snapshot.purposes.map((row) => [row.id, row.key]));
  return snapshot.trackers
    .filter((row) => row.status === "active")
    .map((row) => ({
      id: row.id,
      name: row.name,
      type: (row.type as TrackerRule["type"]) || "other",
      domain: row.domain,
      identifier: row.identifier,
      purposeKey: row.purposeId ? purposeKey.get(row.purposeId) ?? null : null,
      purposeId: row.purposeId,
      vendorId: row.vendorId,
      isEssential: row.isEssential,
      status: row.status,
    }));
}
