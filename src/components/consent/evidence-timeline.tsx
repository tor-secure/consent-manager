import { ProvenanceBadge } from "@/components/ui/provenance-badge";

export type EvidenceTimelineItem = { id: string; title: string; description?: string; timestamp?: string | null; provenance: string };

export function EvidenceTimeline({ items, title = "Evidence timeline" }: { items: EvidenceTimelineItem[]; title?: string }) {
  return <section aria-label={title}><h2 className="mb-6 text-base font-semibold">{title}</h2>{items.length ? <ol className="evidence-timeline">{items.map((item) => <li key={item.id}><span className="evidence-timeline-marker" aria-hidden="true" /><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold capitalize">{item.title.replaceAll("_", " ")}</h3><ProvenanceBadge value={item.provenance} /></div>{item.description && <p className="mt-2 break-words text-sm leading-6 text-[var(--muted-foreground)]">{item.description}</p>}{item.timestamp && <time className="mt-2 block" dateTime={item.timestamp}>{new Date(item.timestamp).toLocaleString()}</time>}</li>)}</ol> : <p className="text-sm text-[var(--muted-foreground)]">No linked events recorded yet.</p>}</section>;
}
