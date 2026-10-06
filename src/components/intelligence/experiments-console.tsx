"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Site = { id: string; name: string };
type PolicyOption = { websiteId: string; policyId: string; policyName: string; policyVersionId: string; version: number; isPublished: boolean };
type Variant = { id: string; label: string; weight: number; overrides: Record<string, string | number> };
type VariantResult = { variantId: string; label: string; allocation: number; assignments: number; impressions: number; consentDecisions: number; acceptances: number; rejections: number; granularDecisions: number; withdrawals: number; decisionRate: number | null; acceptanceRate: number | null; rejectionRate: number | null };
type Experiment = { id: string; websiteId: string; policyVersionId: string; name: string; description: string; status: string; variants: Variant[]; controlVariantId: string; scheduledStartAt: string | null; scheduledEndAt: string | null; startedAt: string | null; endedAt: string | null; createdAt: string; results?: VariantResult[] };
type EventRow = { id: string; eventType: string; variantId: string; choice: string | null; sessionId: string | null; occurredAt: string };

const statusActions: Record<string, string[]> = {
  DRAFT: ["RUNNING", "ARCHIVED"],
  SCHEDULED: ["PAUSED", "ARCHIVED"],
  RUNNING: ["PAUSED", "COMPLETED"],
  PAUSED: ["RUNNING", "COMPLETED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

function dateLabel(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}

export function ExperimentsConsole({ sites, policies }: { sites: Site[]; policies: PolicyOption[] }) {
  const [websiteId, setWebsiteId] = useState(sites[0]?.id ?? "");
  const [items, setItems] = useState<Experiment[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [policyVersionId, setPolicyVersionId] = useState("");
  const [controlWeight, setControlWeight] = useState(50);
  const [treatmentLayout, setTreatmentLayout] = useState("dialog");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const sitePolicies = useMemo(() => policies.filter((policy) => policy.websiteId === websiteId), [policies, websiteId]);
  const activePolicyVersionId = sitePolicies.some((policy) => policy.policyVersionId === policyVersionId)
    ? policyVersionId
    : sitePolicies[0]?.policyVersionId ?? "";

  const load = useCallback(async () => {
    if (!websiteId) { setItems([]); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/experiments?websiteId=${encodeURIComponent(websiteId)}`, { cache: "no-store" });
      const data = await response.json() as { success?: boolean; message?: string; experiments?: Experiment[] };
      if (!response.ok || !data.success) throw new Error(data.message || "Could not load experiments");
      setItems(data.experiments ?? []);
      setSelectedId((current) => current && data.experiments?.some((item) => item.id === current) ? current : data.experiments?.[0]?.id ?? "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load experiments"); }
    finally { setLoading(false); }
  }, [websiteId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    fetch(`/api/experiments/${selectedId}`, { cache: "no-store" }).then(async (response) => {
      const data = await response.json() as { success?: boolean; events?: EventRow[]; message?: string };
      if (!response.ok || !data.success) throw new Error(data.message || "Could not load experiment evidence");
      if (!cancelled) setEvents(data.events ?? []);
    }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load experiment evidence"); });
    return () => { cancelled = true; };
  }, [selectedId]);

  async function createExperiment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setSuccess("");
    if (controlWeight <= 0 || controlWeight >= 100) { setError("Control and treatment allocation must each be between 1% and 99%."); return; }
    setBusyId("create");
    try {
      const body = {
        name, description, websiteId, policyVersionId: activePolicyVersionId,
        controlVariantId: "control",
        variants: [
          { id: "control", label: "Control", weight: controlWeight, overrides: { layout: "bar" } },
          { id: "treatment", label: "Treatment", weight: 100 - controlWeight, overrides: { layout: treatmentLayout, ...(treatmentLayout === "dialog" ? { position: "center" } : {}) } },
        ],
        ...(startAt ? { scheduledStartAt: new Date(startAt).toISOString() } : {}),
        ...(endAt ? { scheduledEndAt: new Date(endAt).toISOString() } : {}),
      };
      const response = await fetch("/api/experiments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json() as { success?: boolean; message?: string };
      if (!response.ok || !data.success) throw new Error(data.message || "Could not create experiment");
      setName(""); setDescription(""); setStartAt(""); setEndAt("");
      setSuccess("Experiment created. Start it now or schedule it for later.");
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not create experiment"); }
    finally { setBusyId(""); }
  }

  async function updateStatus(experiment: Experiment, status: string) {
    setBusyId(experiment.id); setError(""); setSuccess("");
    try {
      const response = await fetch(`/api/experiments/${experiment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const data = await response.json() as { success?: boolean; message?: string };
      if (!response.ok || !data.success) throw new Error(data.message || "Could not update experiment");
      setSuccess(`Experiment ${status.toLowerCase()}.`);
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update experiment"); }
    finally { setBusyId(""); }
  }

  const selected = items.find((item) => item.id === selectedId);
  const publishedPolicyOptions = sitePolicies.filter((policy) => policy.isPublished);

  if (!sites.length) return <Card><CardContent className="p-6 text-sm text-[var(--muted-foreground)]">Add a website to create consent experiments.</CardContent></Card>;

  return <div className="space-y-5">
    <Card><CardContent className="grid gap-4 p-5 sm:grid-cols-2">
      <label className="grid gap-1 text-sm font-medium">Website
        <select className="field-input" value={websiteId} onChange={(event) => setWebsiteId(event.target.value)}>{sites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</select>
      </label>
      <div className="flex items-end text-sm text-[var(--muted-foreground)]">Assignments stay stable for the browser session. Experiment variants change only banner layout and styling.</div>
    </CardContent></Card>

    <Card><CardContent className="p-5">
      <h2 className="text-base font-semibold">Create experiment</h2>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Consent semantics, legal copy, purposes, enforcement, and published policy requirements are held fixed.</p>
      {publishedPolicyOptions.length === 0 ? <p className="mt-4 rounded-lg bg-[var(--muted)] p-3 text-sm">This website has no published policy version. Publish a policy before creating an experiment.</p> : <form onSubmit={(event) => void createExperiment(event)} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm">Name<input required minLength={2} maxLength={160} className="field-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Banner layout test" /></label>
        <label className="grid gap-1 text-sm">Published policy version<select className="field-input" value={activePolicyVersionId} onChange={(event) => setPolicyVersionId(event.target.value)}>{publishedPolicyOptions.map((policy) => <option key={policy.policyVersionId} value={policy.policyVersionId}>{policy.policyName} · v{policy.version}</option>)}</select></label>
        <label className="grid gap-1 text-sm sm:col-span-2">Description<textarea maxLength={2000} rows={2} className="field-input" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What presentation question are you testing?" /></label>
        <label className="grid gap-1 text-sm">Control allocation: {controlWeight}%<input type="range" min={1} max={99} value={controlWeight} onChange={(event) => setControlWeight(Number(event.target.value))} /><span className="text-xs text-[var(--muted-foreground)]">Treatment allocation: {100 - controlWeight}%</span></label>
        <label className="grid gap-1 text-sm">Treatment layout<select className="field-input" value={treatmentLayout} onChange={(event) => setTreatmentLayout(event.target.value)}><option value="dialog">Centered dialog</option><option value="bar">Banner bar</option></select></label>
        <label className="grid gap-1 text-sm">Schedule start (optional)<input type="datetime-local" className="field-input" value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label>
        <label className="grid gap-1 text-sm">Schedule end (optional)<input type="datetime-local" className="field-input" value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label>
        <div className="sm:col-span-2"><button type="submit" disabled={busyId === "create" || !activePolicyVersionId} className="btn btn-primary">{busyId === "create" ? "Creating…" : startAt ? "Create scheduled experiment" : "Create draft experiment"}</button></div>
      </form>}
    </CardContent></Card>

    {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {success && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{success}</p>}

    <section aria-labelledby="experiment-list-title" className="grid gap-5 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.5fr)]">
      <Card><CardContent className="p-5">
        <div className="flex items-center justify-between"><h2 id="experiment-list-title" className="font-semibold">Experiment history</h2><button className="text-sm underline" onClick={() => void load()} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button></div>
        {loading && items.length === 0 ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">Loading experiments…</p> : items.length === 0 ? <p className="mt-4 text-sm text-[var(--muted-foreground)]">No experiments for this website yet.</p> : <ul className="mt-4 space-y-2">{items.map((item) => <li key={item.id}><button className={`w-full rounded-lg border p-3 text-left ${selectedId === item.id ? "border-[var(--primary)] bg-[var(--muted)]" : "border-[var(--border)]"}`} onClick={() => setSelectedId(item.id)}><span className="block font-medium">{item.name}</span><span className="mt-1 block text-xs text-[var(--muted-foreground)]">{item.status} · {dateLabel(item.startedAt || item.scheduledStartAt || item.createdAt)}</span></button></li>)}</ul>}
      </CardContent></Card>

      <Card><CardContent className="p-5">
        {!selected ? <p className="text-sm text-[var(--muted-foreground)]">Select an experiment to inspect its progress and evidence.</p> : <>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">{selected.name}</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">{selected.description || "No description"}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">Start: {dateLabel(selected.startedAt || selected.scheduledStartAt)} · End: {dateLabel(selected.endedAt || selected.scheduledEndAt)}</p></div><Badge variant={selected.status === "RUNNING" ? "success" : "neutral"}>{selected.status}</Badge></div>
          <div className="mt-4 flex flex-wrap gap-2">{(statusActions[selected.status] ?? []).map((status) => <button key={status} disabled={busyId === selected.id} className="btn btn-outline btn-sm" onClick={() => void updateStatus(selected, status)}>{busyId === selected.id ? "Saving…" : status === "RUNNING" ? "Start / resume" : status === "COMPLETED" ? "Complete" : status === "PAUSED" ? "Pause" : status === "ARCHIVED" ? "Archive" : "Schedule"}</button>)}</div>
          <p className="mt-4 text-xs text-[var(--muted-foreground)]">Results are observed counts. They do not imply statistical significance or prove that a variant caused a difference.</p>
          <div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead><tr className="border-b text-[var(--muted-foreground)]"><th className="py-2 pr-3">Variant</th><th className="pr-3">Allocation</th><th className="pr-3">Assignments</th><th className="pr-3">Impressions</th><th className="pr-3">Decisions</th><th className="pr-3">Accept all</th><th className="pr-3">Reject all</th><th className="pr-3">Granular</th><th>Withdrawals</th></tr></thead><tbody>{(selected.results ?? []).map((result) => <tr key={result.variantId} className="border-b"><td className="py-2 pr-3 font-medium">{result.label}{result.variantId === selected.controlVariantId ? " (control)" : ""}</td><td className="pr-3">{result.allocation}%</td><td className="pr-3">{result.assignments}</td><td className="pr-3">{result.impressions}</td><td className="pr-3">{result.consentDecisions}{result.decisionRate !== null ? ` (${result.decisionRate}% of impressions)` : ""}</td><td className="pr-3">{result.acceptances}{result.acceptanceRate !== null ? ` (${result.acceptanceRate}%)` : ""}</td><td className="pr-3">{result.rejections}{result.rejectionRate !== null ? ` (${result.rejectionRate}%)` : ""}</td><td className="pr-3">{result.granularDecisions}</td><td>{result.withdrawals}</td></tr>)}</tbody></table></div>
          <h3 className="mt-5 font-semibold">Recent experiment events</h3>
          {events.length === 0 ? <p className="mt-2 text-sm text-[var(--muted-foreground)]">No events recorded yet. Assignments and impressions appear after the running experiment is loaded by a visitor.</p> : <div className="mt-2 max-h-64 overflow-auto"><table className="min-w-full text-left text-xs"><thead><tr className="border-b text-[var(--muted-foreground)]"><th className="py-2 pr-3">Time</th><th className="pr-3">Event</th><th className="pr-3">Variant</th><th className="pr-3">Decision</th><th>Consent session</th></tr></thead><tbody>{events.map((event) => <tr key={event.id} className="border-b"><td className="py-2 pr-3">{dateLabel(event.occurredAt)}</td><td className="pr-3">{event.eventType.replaceAll("_", " ")}</td><td className="pr-3">{event.variantId}</td><td className="pr-3">{event.choice || "—"}</td><td>{event.sessionId ? `${event.sessionId.slice(0, 8)}…` : "—"}</td></tr>)}</tbody></table></div>}
        </>}
      </CardContent></Card>
    </section>
  </div>;
}
