"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { ConsentGraphSnapshot } from "@/lib/intelligence/graph-model";
import { PrivacyGraphExplorer, type GraphNode, type GraphEdge } from "./privacy-graph-explorer";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";

const Topology = dynamic(() => import("./twin-topology"), { ssr: false, loading: () => <div role="status" className="rounded-xl bg-[var(--muted)] p-12 text-center text-sm">Loading 3D view…</div> });

export function TwinExplorer({ snapshot }: { snapshot: ConsentGraphSnapshot }) {
  const [view, setView] = useState("map"), [selected, setSelected] = useState<GraphNode | null>(null);
  const graph = useMemo(() => {
    const nodes: GraphNode[] = [...snapshot.purposes.map((item) => ({ id: `purpose:${item.id}`, label: item.name, type: "purpose", provenance: "configured" })), ...snapshot.vendors.map((item) => ({ id: `vendor:${item.id}`, label: item.name, type: "vendor", provenance: "configured" })), ...snapshot.trackers.map((item) => ({ id: `tracker:${item.id}`, label: item.name, type: "tracker", provenance: "configured" }))];
    const edges: GraphEdge[] = [];
    const add = (source: string, target: string, relation: string) => edges.push({ id: `${source}:${target}`, source, target, relation, provenance: "configured" });
    snapshot.vendors.forEach((item) => item.purposeIds.forEach((purpose) => add(`vendor:${item.id}`, `purpose:${purpose}`, "uses_purpose")));
    snapshot.trackers.forEach((item) => { if (item.purposeId) add(`tracker:${item.id}`, `purpose:${item.purposeId}`, "uses_purpose"); if (item.vendorId) add(`tracker:${item.id}`, `vendor:${item.vendorId}`, "belongs_to_vendor"); });
    return { nodes, edges };
  }, [snapshot]);
  return <section className="space-y-4" aria-label="Digital twin dependency explorer">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Explore the dependency model</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Configured relationships for {snapshot.website.name}. Select a purpose to preview its impact.</p></div><div className="workspace-segments"><button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>Dependency map</button><button type="button" aria-pressed={view === "3d"} onClick={() => setView("3d")}>3D exploration</button></div></div>
    {view === "map" ? <PrivacyGraphExplorer websiteId={snapshot.website.id} nodes={graph.nodes} edges={graph.edges} /> : <><Topology nodes={graph.nodes} edges={graph.edges} onSelect={setSelected} /><div className="workspace-toolbar"><label className="flex flex-1 flex-wrap items-center gap-3 text-sm">Inspect entity<select className="field-input max-w-sm" value={selected?.id ?? ""} onChange={(event) => setSelected(graph.nodes.find((node) => node.id === event.target.value) ?? null)}><option value="">Select from all entities</option>{graph.nodes.map((node) => <option key={node.id} value={node.id}>{node.type}: {node.label}</option>)}</select></label>{selected && <ProvenanceBadge value={selected.provenance} />}</div>{selected && <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5"><h3 className="font-semibold">{selected.label}</h3><ul className="mt-3 space-y-2 text-sm">{graph.edges.filter((edge) => edge.source === selected.id || edge.target === selected.id).map((edge) => <li key={edge.id}>{edge.relation.replaceAll("_", " ")} · {graph.nodes.find((node) => node.id === (edge.source === selected.id ? edge.target : edge.source))?.label}</li>)}</ul><p className="mt-3 text-xs text-[var(--muted-foreground)]">Use the dependency map for evidence and purpose simulations.</p></div>}</>}
  </section>;
}
