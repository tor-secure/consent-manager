import type { ConsentGraphSnapshot } from "./graph-model";

export type DataFlowHop = {
  trackerId: string;
  tracker: string;
  trackerType: string;
  domain: string | null;
  vendor: string | null;
  vendorCountry: string | null;
  purpose: string | null;
  purposeKey: string | null;
  dataCategories: string[];
};

export function buildDataFlowMap(snapshot: ConsentGraphSnapshot): DataFlowHop[] {
  const purposeMap = new Map(snapshot.purposes.map((row) => [row.id, row]));
  const vendorMap = new Map(snapshot.vendors.map((row) => [row.id, row]));
  return snapshot.trackers
    .filter((row) => row.status === "active")
    .map((tracker) => {
      const purpose = tracker.purposeId ? purposeMap.get(tracker.purposeId) : undefined;
      const vendor = tracker.vendorId ? vendorMap.get(tracker.vendorId) : undefined;
      const fromVendorPurposes = vendor
        ? vendor.purposeIds
            .map((id) => purposeMap.get(id))
            .filter(Boolean)
            .flatMap((row) => row?.dataCategories ?? [])
        : [];
      const categories = [...new Set([...(purpose?.dataCategories ?? []), ...fromVendorPurposes])];
      return {
        trackerId: tracker.id,
        tracker: tracker.name,
        trackerType: tracker.type,
        domain: tracker.domain,
        vendor: vendor?.name ?? null,
        vendorCountry: vendor?.country ?? null,
        purpose: purpose?.name ?? null,
        purposeKey: purpose?.key ?? null,
        dataCategories: categories,
      };
    });
}
