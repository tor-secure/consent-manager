"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type RuntimeDiscoveryRow = {
  id: string; websiteId: string; observationType: string; pageUrl: string; destinationHost: string | null;
  resourcePath: string | null; party: string; evidenceStatus: string; observedAt: Date; trackerName: string | null; vendorName: string | null; purposeName: string | null; consentState: Record<string, boolean>;
};

function label(value: string) { return value.replace(/_/g, " "); }
function tone(value: string) { return value === "third-party" ? "bg-[var(--warning-soft)] text-[var(--warning)]" : value === "observed" ? "bg-[var(--success-soft)] text-[var(--success)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"; }

export function RuntimeDiscoveryTable({ websites, activeWebsiteId, observations }: { websites: Array<{ id: string; name: string; domain: string }>; activeWebsiteId: string; observations: RuntimeDiscoveryRow[] }) {
  const router = useRouter(); const params = useSearchParams();
  function selectWebsite(value: string) { const next = new URLSearchParams(params.toString()); if (value) next.set("website", value); else next.delete("website"); router.push(`/dashboard/discovery/runtime?${next.toString()}`); }
  return <>
    <div className="flex flex-wrap items-end justify-between gap-4">
      <label className="grid gap-1.5 text-sm font-medium text-[var(--foreground)]">Website
        <select value={activeWebsiteId} onChange={(event) => selectWebsite(event.target.value)} className="min-h-11 min-w-64 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] outline-none focus:ring-2 focus:ring-[var(--ring)]">
          <option value="">All websites</option>{websites.map((site) => <option key={site.id} value={site.id}>{site.name} · {site.domain}</option>)}
        </select>
      </label>
      <p className="max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">Each row is browser-observed evidence. Linked tracker, vendor, and purpose data are configured intelligence and remain distinct from the observation.</p>
    </div>
    {observations.length === 0 ? <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-14 text-center"><h2 className="text-lg font-semibold text-[var(--foreground)]">No runtime evidence yet</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[var(--muted-foreground)]">Install the existing Consent Guru script and browse the selected website. Discovery begins automatically and records only sanitized metadata.</p></div> :
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]"><div className="table-scroll scrollbar-thin"><table className="min-w-full text-sm"><thead><tr className="border-b border-[var(--border)] bg-[var(--muted)]/60 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{["Observation", "Destination", "Page", "Evidence", "Mapped intelligence", "Time"].map((h) => <th key={h} className="px-5 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border)]">{observations.map((row) => <tr key={row.id} className="align-top hover:bg-[var(--muted)]/60"><td className="px-5 py-4"><span className="capitalize font-medium text-[var(--foreground)]">{label(row.observationType)}</span><p className="mt-1 text-xs text-[var(--muted-foreground)]">{row.party}</p></td><td className="px-5 py-4"><p className="font-medium text-[var(--foreground)]">{row.destinationHost ?? row.observationType}</p><p className="mt-1 max-w-64 truncate text-xs text-[var(--muted-foreground)]">{row.resourcePath ?? "No destination"}</p></td><td className="px-5 py-4"><p className="max-w-64 truncate text-[var(--foreground)]">{row.pageUrl}</p></td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${tone(row.evidenceStatus)}`}>{row.evidenceStatus}</span><p className="mt-2 max-w-44 text-xs leading-5 text-[var(--muted-foreground)]">Sanitized · confidence 100%</p></td><td className="px-5 py-4"><p className="text-[var(--foreground)]">{row.trackerName ?? "Unknown destination"}</p><p className="mt-1 text-xs text-[var(--muted-foreground)]">{[row.vendorName, row.purposeName].filter(Boolean).join(" · ") || "No configured mapping"}</p></td><td className="whitespace-nowrap px-5 py-4 text-xs text-[var(--muted-foreground)]">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.observedAt))}</td></tr>)}</tbody></table></div></div>}
  </>;
}
