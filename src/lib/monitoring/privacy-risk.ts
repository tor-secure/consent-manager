export type RiskSeverity = "critical" | "high" | "medium" | "low";

export type RiskStatus = RiskSeverity | "clear";

export type RiskFindingRow = {
  id: string;
  websiteId: string;
  findingType: string;
  severity: string;
  status: string;
  trackerId: string | null;
  vendorId: string | null;
  firstDetectedAt: Date;
};

export function overallRiskStatus(bySeverity: {
  critical: number;
  high: number;
  medium: number;
  low: number;
}): RiskStatus {
  if (bySeverity.critical > 0) return "critical";
  if (bySeverity.high > 0) return "high";
  if (bySeverity.medium > 0) return "medium";
  if (bySeverity.low > 0) return "low";
  return "clear";
}

export function filterRiskFindings(
  findings: RiskFindingRow[],
  filters: {
    websiteId?: string;
    severity?: string;
    findingType?: string;
    status?: string;
    from?: Date;
    to?: Date;
  },
): RiskFindingRow[] {
  return findings.filter((row) => {
    if (filters.websiteId && row.websiteId !== filters.websiteId) return false;
    if (filters.severity && row.severity !== filters.severity) return false;
    if (filters.findingType && row.findingType !== filters.findingType) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (filters.from && row.firstDetectedAt < filters.from) return false;
    if (filters.to && row.firstDetectedAt > filters.to) return false;
    return true;
  });
}

export function aggregatePrivacyRisk(findings: RiskFindingRow[], now = new Date()) {
  const unresolved = findings.filter((row) => row.status !== "resolved");
  const bySeverity = {
    critical: unresolved.filter((row) => row.severity === "critical").length,
    high: unresolved.filter((row) => row.severity === "high").length,
    medium: unresolved.filter((row) => row.severity === "medium").length,
    low: unresolved.filter((row) => row.severity === "low").length,
  };
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const newFindings = unresolved.filter((row) => row.firstDetectedAt >= weekAgo).length;
  const affectedWebsiteIds = [...new Set(unresolved.map((row) => row.websiteId))];

  const trackerCounts = new Map<string, number>();
  const vendorCounts = new Map<string, number>();
  for (const row of unresolved) {
    if (row.trackerId) trackerCounts.set(row.trackerId, (trackerCounts.get(row.trackerId) ?? 0) + 1);
    if (row.vendorId) vendorCounts.set(row.vendorId, (vendorCounts.get(row.vendorId) ?? 0) + 1);
  }

  const topTrackerIds = [...trackerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
  const topVendorIds = [...vendorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  return {
    bySeverity,
    unresolvedCount: unresolved.length,
    newFindings,
    affectedWebsiteIds,
    overallStatus: overallRiskStatus(bySeverity),
    topTrackerIds,
    topVendorIds,
    trackerCounts,
    vendorCounts,
  };
}
