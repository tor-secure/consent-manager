import { isFirstPartyDomain, itemKey, type ScanItemSnapshot, type TrackerSnapshot } from "./drift-engine";

export type PageIntelligence = {
  pageUrl: string;
  path: string;
  trackerCount: number;
  knownCount: number;
  unknownCount: number;
  unmappedCount: number;
  vendorNames: string[];
  purposeNames: string[];
  requiredCount: number;
  optionalCount: number;
  enforcementReadyCount: number;
  driftFindingCount: number;
  shadowFindingCount: number;
  risk: "critical" | "high" | "medium" | "low" | "clear";
};

function pagePath(pageUrl: string): string {
  try {
    const url = new URL(pageUrl);
    return url.pathname || "/";
  } catch {
    return pageUrl || "/";
  }
}

export function buildPageIntelligence(input: {
  websiteDomain: string;
  items: ScanItemSnapshot[];
  trackers: TrackerSnapshot[];
  vendorNamesById: Record<string, string>;
  purposeNamesById: Record<string, string>;
  purposeRequiredById: Record<string, boolean>;
  findings: { findingType: string; severity: string; detailsPageUrl?: string | null; subjectKey?: string }[];
}): PageIntelligence[] {
  const groups = new Map<string, ScanItemSnapshot[]>();
  for (const item of input.items) {
    const pageUrl = item.pageUrl?.trim() || `https://${input.websiteDomain}/`;
    const list = groups.get(pageUrl) ?? [];
    list.push(item);
    groups.set(pageUrl, list);
  }

  const pages: PageIntelligence[] = [];
  for (const [pageUrl, items] of groups) {
    const keys = new Set(items.map((item) => itemKey(item)).filter(Boolean));
    let knownCount = 0;
    let unknownCount = 0;
    let unmappedCount = 0;
    let requiredCount = 0;
    let optionalCount = 0;
    let enforcementReadyCount = 0;
    const vendorNames = new Set<string>();
    const purposeNames = new Set<string>();

    for (const item of items) {
      if (item.classificationStatus === "known") knownCount += 1;
      else unknownCount += 1;
      if (isFirstPartyDomain(item.domain, input.websiteDomain)) continue;
      const tracker = input.trackers.find(
        (row) => (row.identifier ?? "").trim().toLowerCase() === itemKey(item),
      );
      if (!tracker || (!tracker.vendorId && !tracker.purposeId && !tracker.isEssential)) {
        unmappedCount += 1;
      }
      if (tracker?.vendorId && input.vendorNamesById[tracker.vendorId]) {
        vendorNames.add(input.vendorNamesById[tracker.vendorId]);
      }
      if (tracker?.purposeId && input.purposeNamesById[tracker.purposeId]) {
        purposeNames.add(input.purposeNamesById[tracker.purposeId]);
        if (input.purposeRequiredById[tracker.purposeId]) requiredCount += 1;
        else optionalCount += 1;
      } else if (tracker && !tracker.isEssential) {
        optionalCount += 1;
      }
      if (tracker && (tracker.domain || tracker.identifier)) enforcementReadyCount += 1;
    }

    const related = input.findings.filter((finding) => {
      if (finding.detailsPageUrl && finding.detailsPageUrl === pageUrl) return true;
      return finding.subjectKey ? keys.has(finding.subjectKey.toLowerCase()) : false;
    });
    const shadowFindingCount = related.filter((finding) => finding.findingType.startsWith("shadow_")).length;
    const driftFindingCount = related.length - shadowFindingCount;
    let risk: PageIntelligence["risk"] = "clear";
    if (related.some((finding) => finding.severity === "critical")) risk = "critical";
    else if (related.some((finding) => finding.severity === "high") || unmappedCount > 0) risk = "high";
    else if (related.some((finding) => finding.severity === "medium")) risk = "medium";
    else if (related.length > 0) risk = "low";

    pages.push({
      pageUrl,
      path: pagePath(pageUrl),
      trackerCount: items.length,
      knownCount,
      unknownCount,
      unmappedCount,
      vendorNames: [...vendorNames].sort(),
      purposeNames: [...purposeNames].sort(),
      requiredCount,
      optionalCount,
      enforcementReadyCount,
      driftFindingCount,
      shadowFindingCount,
      risk,
    });
  }

  return pages.sort((a, b) => a.path.localeCompare(b.path));
}
