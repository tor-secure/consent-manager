import type { ConsentGraphSnapshot, GraphTracker } from "./graph-model";

export type TwinRestoreTracker = {
  id: string;
  purposeId: string | null;
  vendorId: string | null;
  status: string;
  isEssential: boolean;
};

export function trackersFromTwinPayload(payload: unknown): TwinRestoreTracker[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const graph = (payload as { graph?: ConsentGraphSnapshot }).graph;
  if (!graph || !Array.isArray(graph.trackers)) return [];
  return graph.trackers
    .filter((row): row is GraphTracker => Boolean(row && typeof row.id === "string"))
    .map((row) => ({
      id: row.id,
      purposeId: row.purposeId ?? null,
      vendorId: row.vendorId ?? null,
      status: row.status || "active",
      isEssential: row.isEssential === true,
    }));
}
