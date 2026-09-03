import type { ConsentGraphSnapshot } from "./graph-model";
import type { ConsentQualityScore } from "../monitoring/consent-quality";

export type Recommendation = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  href: string;
};

export function buildConsentRecommendations(input: {
  snapshot: ConsentGraphSnapshot;
  quality: ConsentQualityScore | null;
  openFindingCount: number;
  published: boolean;
}): Recommendation[] {
  const { snapshot, quality, openFindingCount, published } = input;
  const items: Recommendation[] = [];
  const unclassified = snapshot.trackers.filter(
    (row) => row.status === "active" && !row.isEssential && !row.purposeId && !row.vendorId,
  );
  const vendorsWithoutPurpose = snapshot.vendors.filter((row) => row.purposeIds.length === 0);
  const purposesWithoutCategory = snapshot.purposes.filter((row) => row.dataCategories.length === 0);

  if (unclassified.length > 0) {
    items.push({
      id: "unclassified-trackers",
      severity: "high",
      title: "Classify blocked-by-default trackers",
      detail: `${unclassified.length} active tracker${unclassified.length === 1 ? "" : "s"} have no purpose or vendor and stay blocked until mapped.`,
      href: `/dashboard/trackers`,
    });
  }
  if (!published) {
    items.push({
      id: "publish-policy",
      severity: "high",
      title: "Publish a consent policy",
      detail: "Visitors cannot receive a live banner until a policy version is published.",
      href: `/dashboard/policies`,
    });
  }
  if (openFindingCount > 0) {
    items.push({
      id: "open-findings",
      severity: "medium",
      title: "Review privacy drift findings",
      detail: `${openFindingCount} open finding${openFindingCount === 1 ? "" : "s"} from scans are still unresolved.`,
      href: `/dashboard/monitoring`,
    });
  }
  if (vendorsWithoutPurpose.length > 0) {
    items.push({
      id: "vendor-purposes",
      severity: "medium",
      title: "Attach purposes to vendors",
      detail: `${vendorsWithoutPurpose.length} vendor${vendorsWithoutPurpose.length === 1 ? "" : "s"} have no purpose mapping, so the data-flow map and banner vendor list stay incomplete.`,
      href: `/dashboard/vendors`,
    });
  }
  if (purposesWithoutCategory.length > 0) {
    items.push({
      id: "data-categories",
      severity: "low",
      title: "Add data categories to purposes",
      detail: `${purposesWithoutCategory.length} purpose${purposesWithoutCategory.length === 1 ? "" : "s"} have no DPDP data categories for the notice.`,
      href: `/dashboard/purposes`,
    });
  }
  if (quality && quality.overall < 75) {
    items.push({
      id: "quality",
      severity: quality.overall < 50 ? "high" : "medium",
      title: "Raise the consent quality score",
      detail: `Operational score is ${quality.overall}/100 (${quality.category.replaceAll("_", " ")}). ${quality.lostPoints[0] ?? "See quality dimensions for gaps."}`,
      href: `/dashboard/quality`,
    });
  }
  if (items.length === 0) {
    items.push({
      id: "healthy",
      severity: "low",
      title: "No urgent configuration gaps",
      detail: "Trackers, vendors, and policies look mapped. Re-scan after site changes.",
      href: `/dashboard/scanner`,
    });
  }
  return items;
}
