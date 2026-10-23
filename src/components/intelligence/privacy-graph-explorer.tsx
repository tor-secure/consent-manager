"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ProvenanceBadge } from "@/components/ui/provenance-badge";

export type GraphNode = { id: string; type: string; label: string; provenance: string; data?: Record<string, unknown> };
export type GraphEdge = { id: string; source: string; target: string; relation: string; provenance: string; evidenceIds?: string[] };
const label = (value: string) => value.replaceAll("_", " ");
const column = (type: string) => ["organization", "website", "page"].includes(type) ? 0 : ["policy", "policy_version", "purpose", "consent_state", "consent_session"].includes(type) ? 1 : ["tracker", "vendor", "enforcement_rule"].includes(type) ? 2 : ["destination", "resource"].includes(type) ? 3 : 4;

export function PrivacyGraphExplorer({ websiteId, nodes, edges }: { websiteId: string; nodes: GraphNode[]; edges: GraphEdge[] }) {
  const [type, setType] = useState("all"), [provenance, setProvenance] = useState("all"), [query, setQuery] = useState("");
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = nodes.find((node) => node.id === selectedId) ?? null;
  const [simulation, setSimulation] = useState<string[] | null>(null), [simulationError, setSimulationError] = useState("");
  const [simulating, setSimulating] = useState(false), [limit, setLimit] = useState(50);
  const simulationRequest = useRef(0);
  const filtered = useMemo(() => nodes.filter((node) => (type === "all" || node.type === type) && (provenance === "all" || node.provenance === provenance) && `${node.label} ${node.type}`.toLowerCase().includes(query.toLowerCase())), [nodes, type, provenance, query]);
  const layout = useMemo(() => {
    const columns: number[] = [...new Set(filtered.slice(0, 40).map((node) => column(node.type)))].sort();
    const counts = [0, 0, 0, 0, 0];
    const points = new Map<string, { x: number; y: number }>();
    filtered.slice(0, 40).forEach((node) => { const col = columns.indexOf(column(node.type)); points.set(node.id, { x: 18 + col * 210, y: 56 + counts[col]++ * 78 }); });
    return { points, columns, width: Math.max(300, columns.length * 210), height: Math.max(450, Math.max(...counts) * 78 + 90) };
  }, [filtered]);
  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const relationships = selected ? edges.filter((edge) => edge.source === selected.id || edge.target === selected.id) : [];
  function select(node: GraphNode) { simulationRequest.current++; setSelectedId(node.id); setSimulation(null); setSimulationError(""); setSimulating(false); }
  async function simulate() {
    if (!selected || selected.type !== "purpose") return;
    const request = ++simulationRequest.current;
    setSimulating(true); setSimulationError("");
    try {
      const response = await fetch("/api/privacy-graph", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteId, type: "disable_purpose", purposeId: selected.id.replace("purpose:", "") }) });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || "Unable to run simulation");
      if (request === simulationRequest.current) setSimulation(result.affected?.map((node: GraphNode) => node.label) ?? []);
    } catch (error) { if (request === simulationRequest.current) setSimulationError(error instanceof Error ? error.message : "Unable to run simulation"); }
    finally { if (request === simulationRequest.current) setSimulating(false); }
  }
  return <div className="space-y-4">
    <div className="workspace-toolbar">
      <input className="field-input flex-1" aria-label="Search graph entities" placeholder="Find a page, tracker or purpose…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Select aria-label="Filter by entity type" value={type} onChange={(event) => setType(event.target.value)}><option value="all">All entities</option>{[...new Set(nodes.map((node) => node.type))].sort().map((value) => <option key={value} value={value}>{label(value)}</option>)}</Select>
      <Select aria-label="Filter by provenance" value={provenance} onChange={(event) => setProvenance(event.target.value)}><option value="all">All provenance</option>{["observed", "configured", "inferred", "enforced", "unknown"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</Select>
      <div className="workspace-segments" aria-label="Graph view"><button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>Map</button><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>List</button></div>
    </div>
    <div className="graph-layout">
      <div className="graph-stage">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-3 text-xs text-[var(--muted-foreground)]"><span>{filtered.length} matching entities · {edges.length} total relationships</span><span>Choose an entity to trace its evidence</span></div>
        {!filtered.length ? <div className="p-12 text-center"><h2 className="font-semibold">No matching entities</h2><p className="mt-2 text-sm text-[var(--muted-foreground)]">Try another search or clear the filters.</p><Button variant="secondary" className="mt-4" onClick={() => { setQuery(""); setType("all"); setProvenance("all"); }}>Clear filters</Button></div> : view === "map" ? <>
          <p className="border-b border-[var(--border)] px-5 py-2 text-xs text-[var(--muted-foreground)]">Scroll horizontally to explore the map, or choose List to read all entities.</p>
          <div className="max-h-[520px] overflow-auto" tabIndex={0} aria-label="Scrollable relationship map">
            <svg width={layout.width} height={layout.height} viewBox={`0 0 ${layout.width} ${layout.height}`} role="group" aria-label="Privacy relationship map" className="block" style={{ minWidth: layout.width }}>
              {["Site & pages", "Consent & policy", "Trackers & vendors", "Destinations", "Evidence & activity"].filter((_, index) => layout.columns.includes(index)).map((name, index) => <text key={name} x={18 + index * 210} y="28" fontSize="11" fill="var(--muted-foreground)">{name}</text>)}
              {edges.filter((edge) => layout.points.has(edge.source) && layout.points.has(edge.target)).slice(0, 180).map((edge) => { const a = layout.points.get(edge.source)!, b = layout.points.get(edge.target)!; return <path key={edge.id} className="graph-edge" data-active={selectedId === edge.source || selectedId === edge.target} d={`M ${a.x + 180} ${a.y + 26} C ${a.x + 205} ${a.y + 26}, ${b.x - 25} ${b.y + 26}, ${b.x} ${b.y + 26}`}><title>{label(edge.relation)} · {edge.provenance}</title></path>; })}
              {filtered.slice(0, 40).map((node) => { const position = layout.points.get(node.id)!; return <g key={node.id} className="graph-node" transform={`translate(${position.x},${position.y})`} role="button" tabIndex={0} aria-label={`${node.label}, ${label(node.type)}, ${node.provenance}`} aria-pressed={selectedId === node.id} data-selected={selectedId === node.id} onClick={() => select(node)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(node); } }}><title>{node.label}</title><rect width="180" height="54" rx="8" /><text x="12" y="22" fontSize="12" fontWeight="600">{node.label.length > 23 ? `${node.label.slice(0, 22)}…` : node.label}</text><text x="12" y="40" fontSize="10" opacity="0.75">{label(node.type)} · {node.provenance}</text></g>; })}
            </svg>
          </div>
          <p className="border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--muted-foreground)]">Map shows up to 40 entities and 180 connecting relationships. Use filters or List to inspect all loaded entities.</p>
        </> : <div className="max-h-[580px] overflow-auto"><ul className="divide-y divide-[var(--border)]">{filtered.slice(0, limit).map((node) => <li key={node.id}><button type="button" aria-pressed={selectedId === node.id} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[var(--muted)]" onClick={() => select(node)}><span className="min-w-0"><span className="block truncate text-sm font-medium">{node.label}</span><span className="text-xs text-[var(--muted-foreground)] capitalize">{label(node.type)}</span></span><ProvenanceBadge value={node.provenance} /></button></li>)}</ul>{filtered.length > limit && <Button variant="ghost" className="m-4" onClick={() => setLimit(limit + 50)}>Show 50 more entities</Button>}</div>}
      </div>
      <aside className="graph-inspector" aria-label="Relationship inspector">
        <h2 className="font-semibold">Relationship inspector</h2>
        {!selected ? <p className="py-10 text-sm leading-6 text-[var(--muted-foreground)]">Select a node to see what it connects to, where the evidence comes from, and what a change could affect.</p> : <>
          <h3 className="mt-5 break-words text-lg font-semibold">{selected.label}</h3><p className="mb-3 mt-1 text-xs capitalize text-[var(--muted-foreground)]">{label(selected.type)}</p><ProvenanceBadge value={selected.provenance} />
          {selected.data && <dl className="mt-5 space-y-3 text-xs">{Object.entries(selected.data).map(([key, value]) => <div key={key}><dt className="text-[var(--muted-foreground)]">{label(key)}</dt><dd className="mt-1 break-words">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd></div>)}</dl>}
          <h4 className="mt-6 border-t border-[var(--border)] pt-5 text-xs font-semibold">{relationships.length} relationships</h4>
          <ul className="mt-3 space-y-4">{relationships.slice(0, 100).map((edge) => { const other = nodeMap.get(edge.source === selected.id ? edge.target : edge.source); return <li key={edge.id} className="text-xs"><p className="mb-1 capitalize text-[var(--muted-foreground)]">{label(edge.relation)}</p>{other && <button type="button" onClick={() => select(other)} className="mb-2 block break-words text-left font-medium text-[var(--primary)] hover:underline">{other.label}</button>}<ProvenanceBadge value={edge.provenance} />{edge.evidenceIds?.length ? <details className="mt-2"><summary className="cursor-pointer text-[var(--muted-foreground)]">Evidence references ({edge.evidenceIds.length})</summary><ul className="mt-2 space-y-2">{edge.evidenceIds.map((id) => <li key={id} className="break-all font-mono text-[10px]">{id}</li>)}</ul></details> : null}</li>; })}</ul>
          {relationships.length > 100 && <p className="mt-3 text-xs">Showing the first 100 relationships.</p>}
          {selected.type === "purpose" && <div className="mt-6 border-t border-[var(--border)] pt-4"><Button onClick={simulate} loading={simulating}>Preview disabling purpose</Button><p className="mt-2 text-xs text-[var(--muted-foreground)]">Read-only analysis. Your configuration stays unchanged.</p></div>}
          {simulationError && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{simulationError}</p>}
          {simulation !== null && <div role="status" className="mt-4 rounded-lg bg-[var(--accent-soft)] p-3 text-sm"><p className="font-medium">{simulation.length} affected entities</p><ul className="mt-2 space-y-1 text-xs">{simulation.map((name, index) => <li key={`${index}:${name}`}>{name}</li>)}</ul></div>}
        </>}
      </aside>
    </div>
  </div>;
}
