"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type Node = { id: string; type: string; label: string; provenance: string; data?: Record<string, unknown> };
type Edge = { id: string; source: string; target: string; relation: string; provenance: string; evidenceIds?: string[] };

export function PrivacyGraphExplorer({ websiteId, nodes, edges }: { websiteId: string; nodes: Node[]; edges: Edge[] }) {
  const [type, setType] = useState("all");
  const [provenance, setProvenance] = useState("all");
  const [selected, setSelected] = useState<Node | null>(null);
  const [simulation, setSimulation] = useState<string[]>([]);
  const [simulationError, setSimulationError] = useState("");
  const [simulating, setSimulating] = useState(false);
  const filtered = useMemo(() => nodes.filter((node) => (type === "all" || node.type === type) && (provenance === "all" || node.provenance === provenance)), [nodes, type, provenance]);

  async function simulate() {
    if (!selected || selected.type !== "purpose") return;
    setSimulating(true);
    setSimulationError("");
    try {
      const response = await fetch("/api/privacy-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId, type: "disable_purpose", purposeId: selected.id.replace("purpose:", "") }),
      });
      const result = await response.json();
      if (!response.ok || result.success === false) throw new Error(result.message || "Unable to run simulation");
      setSimulation(result.affected?.map((node: Node) => node.label) ?? []);
    } catch (error) {
      setSimulationError(error instanceof Error ? error.message : "Unable to run simulation");
    } finally {
      setSimulating(false);
    }
  }

  return <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select aria-label="Filter by entity type" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="all">All entities</option>
          {[...new Set(nodes.map((node) => node.type))].sort().map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
        </Select>
        <Select aria-label="Filter by provenance" value={provenance} onChange={(event) => setProvenance(event.target.value)}>
          <option value="all">All provenance</option>
          {["observed", "configured", "inferred", "enforced", "unknown"].map((value) => <option key={value} value={value}>{value}</option>)}
        </Select>
      </div>
      {filtered.length ? <div className="grid gap-2 sm:grid-cols-2">{filtered.map((node) => <button type="button" onClick={() => { setSelected(node); setSimulation([]); }} className="rounded-lg border p-3 text-left hover:bg-[var(--muted)]" key={node.id}><p className="font-medium">{node.label}</p><p className="text-xs text-[var(--muted-foreground)]">{node.type.replaceAll("_", " ")} · <span className="capitalize">{node.provenance}</span></p></button>)}</div> : <p className="rounded-lg border border-dashed p-6 text-sm text-[var(--muted-foreground)]">No graph entities match these filters.</p>}
    </div>
    <aside className="rounded-xl border p-4">
      <h2 className="font-semibold">Relationship inspector</h2>
      {selected ? <>
        <p className="mt-3 font-medium">{selected.label}</p>
        <p className="text-sm capitalize text-[var(--muted-foreground)]">{selected.type.replaceAll("_", " ")} · {selected.provenance}</p>
        {selected.data && Object.keys(selected.data).length > 0 && <dl className="mt-3 space-y-1 text-xs">{Object.entries(selected.data).map(([key, value]) => <div className="flex justify-between gap-3" key={key}><dt className="text-[var(--muted-foreground)]">{key.replaceAll("_", " ")}</dt><dd className="max-w-[65%] break-words text-right">{typeof value === "string" ? value : String(value)}</dd></div>)}</dl>}
        <ul className="mt-4 space-y-2 text-sm">{edges.filter((edge) => edge.source === selected.id || edge.target === selected.id).map((edge) => <li key={edge.id}><span className="capitalize">{edge.relation.replaceAll("_", " ")}</span> · <span className="capitalize">{edge.provenance}</span>{edge.evidenceIds?.length ? <p className="break-all text-xs text-[var(--muted-foreground)]">Evidence: {edge.evidenceIds.join(", ")}</p> : null}</li>)}</ul>
        {selected.type === "purpose" && <Button className="mt-4" onClick={simulate} loading={simulating}>Simulate disabling purpose</Button>}
        {simulationError && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{simulationError}</p>}
        {simulation.length > 0 && <p className="mt-3 text-sm">Read-only impact: {simulation.join(", ")}</p>}
      </> : <p className="mt-3 text-sm text-[var(--muted-foreground)]">Select an entity to inspect its evidence relationships.</p>}
    </aside>
  </div>;
}
