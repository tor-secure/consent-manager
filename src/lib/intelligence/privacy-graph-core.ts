export const GRAPH_PROVENANCE = ["observed", "configured", "inferred", "enforced", "unknown"] as const;
export type GraphProvenance = (typeof GRAPH_PROVENANCE)[number];
export type PrivacyGraphNode = { id: string; type: string; label: string; provenance: GraphProvenance; data?: Record<string, unknown> };
export type PrivacyGraphEdge = { id: string; source: string; target: string; relation: string; provenance: GraphProvenance; evidenceIds?: string[] };
export type PrivacyGraph = { websiteId: string; nodes: PrivacyGraphNode[]; edges: PrivacyGraphEdge[]; generatedAt: string };

export function uniqueGraph(nodes: PrivacyGraphNode[], edges: PrivacyGraphEdge[]): PrivacyGraph {
  const nodeMap = new Map(nodes.map((node) => [node.id, node])); const edgeMap = new Map<string, PrivacyGraphEdge>();
  for (const edge of edges) { if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) edgeMap.set(`${edge.source}:${edge.target}:${edge.relation}:${edge.provenance}`, edge); }
  return { websiteId: "", nodes: [...nodeMap.values()], edges: [...edgeMap.values()], generatedAt: new Date().toISOString() };
}

export function simulatePurposeDisabled(graph: PrivacyGraph, purposeId: string) {
  const purpose = `purpose:${purposeId}`; const affected = new Set<string>([purpose]); let changed = true;
  // Walk relationships that depend on the disabled purpose, then follow the
  // evidence outward to the observations, destinations, and pages affected.
  // This is a read-only impact query; it never mutates policy or enforcement.
  const dependencyEdges = new Set([
    "uses_purpose", "belongs_to_vendor", "governed_by", "covers_purpose", "identifies",
    "decides_purpose", "limited_to_purpose", "decided_under", "uses_policy_version",
    "authorized_by_consent", "part_of_consent", "transfers_activity", "covers_activity",
    "uses_authorization", "encrypted_for_key",
    "concerns_purpose", "concerns_tracker", "concerns_vendor", "concerns_transfer", "concerns_authorization",
  ]);
  const evidenceEdges = new Set(["contacts", "occurs_on", "exposes", "part_of_consent", "authorizes_transfer"]);
  while (changed) {
    changed = false;
    for (const edge of graph.edges) {
      const reachesAffectedDependency = affected.has(edge.target) && dependencyEdges.has(edge.relation);
      const reachesAffectedEvidence = affected.has(edge.source) && evidenceEdges.has(edge.relation);
      if ((reachesAffectedDependency || reachesAffectedEvidence) && !affected.has(reachesAffectedDependency ? edge.source : edge.target)) {
        affected.add(reachesAffectedDependency ? edge.source : edge.target);
        changed = true;
      }
    }
  }
  return { simulation: "disable_purpose", readOnly: true, affected: graph.nodes.filter((node) => affected.has(node.id)), relationships: graph.edges.filter((edge) => affected.has(edge.source) || affected.has(edge.target)) };
}
