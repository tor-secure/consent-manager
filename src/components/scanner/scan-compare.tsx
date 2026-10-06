"use client";

import { useState } from "react";

type ChangeSet = { added: string[]; removed: string[] };
type Comparison = {
  evidenceStatus: string;
  pages: ChangeSet;
  destinations: ChangeSet;
  cookies: ChangeSet;
  resourceTypes: ChangeSet;
  trackers: { added: string[]; removed: string[]; note: string };
};

export function ScanCompare({ scanId, previousScans }: { scanId: string; previousScans: Array<{ id: string; label: string }> }) {
  const [previousId, setPreviousId] = useState(previousScans[0]?.id ?? "");
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function compare() {
    if (!previousId) return;
    setBusy(true); setError(""); setComparison(null);
    try {
      const response = await fetch(`/api/browser-crawls/${encodeURIComponent(scanId)}/compare?previousScanId=${encodeURIComponent(previousId)}`, { cache: "no-store" });
      const data = await response.json() as { success?: boolean; message?: string } & Partial<Comparison>;
      if (!response.ok || !data.success) throw new Error(data.message || "Unable to compare scans");
      setComparison(data as Comparison);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to compare scans"); }
    finally { setBusy(false); }
  }

  return <section className="space-y-3 rounded-xl border border-[var(--border)] p-4" aria-labelledby="scan-compare-title">
    <div><h2 id="scan-compare-title" className="font-semibold">Compare scans</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">Compare observed pages, destinations, cookies, and resource types against an earlier crawl.</p></div>
    {previousScans.length === 0 ? <p className="text-sm text-[var(--muted-foreground)]">Run another crawl of this website to compare changes.</p> : <div className="flex flex-wrap gap-2"><label className="sr-only" htmlFor="previous-scan">Earlier scan</label><select id="previous-scan" className="field-input min-w-56" value={previousId} onChange={(event) => setPreviousId(event.target.value)}>{previousScans.map((scan) => <option key={scan.id} value={scan.id}>{scan.label}</option>)}</select><button type="button" className="btn btn-outline btn-sm" onClick={() => void compare()} disabled={busy || !previousId}>{busy ? "Comparing…" : "Compare scans"}</button></div>}
    {error && <p role="alert" className="text-sm text-[var(--danger)]">{error}</p>}
    {comparison && <div className="grid gap-3 sm:grid-cols-2">{(["pages", "destinations", "cookies", "resourceTypes"] as const).map((key) => <div className="rounded-lg bg-[var(--muted)] p-3" key={key}><h3 className="font-medium capitalize">{key === "resourceTypes" ? "Resource types" : key}</h3><p className="mt-1 text-xs text-[var(--muted-foreground)]">Added {comparison[key].added.length} · removed {comparison[key].removed.length}</p><ul className="mt-2 space-y-1 text-xs">{comparison[key].added.slice(0, 8).map((value) => <li key={`add:${value}`}><span className="font-semibold text-emerald-700">Added</span> · {value}</li>)}{comparison[key].removed.slice(0, 8).map((value) => <li key={`remove:${value}`}><span className="font-semibold text-amber-700">Removed</span> · {value}</li>)}{!comparison[key].added.length && !comparison[key].removed.length && <li className="text-[var(--muted-foreground)]">No observed changes</li>}</ul></div>)}</div>}
    {comparison && <p className="text-xs text-[var(--muted-foreground)]">Tracker changes are not inferred from destination changes. {comparison.trackers.note}</p>}
  </section>;
}
