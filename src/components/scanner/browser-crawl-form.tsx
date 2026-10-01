"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { dashboardFetch } from "@/components/feedback/use-async-action";
import type { WebsiteOption } from "./start-scan-form";

export function BrowserCrawlForm({ websites }: { websites: WebsiteOption[] }) {
  const router = useRouter(); const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? ""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const [maxDepth, setMaxDepth] = useState("2"); const [maxPages, setMaxPages] = useState("25"); const [concurrency, setConcurrency] = useState("1");
  async function submit(event: React.FormEvent) { event.preventDefault(); setBusy(true); setError("");
    const result = await dashboardFetch("/api/browser-crawls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteId, config: { maxDepth: Number(maxDepth), maxPages: Number(maxPages), concurrency: Number(concurrency), respectRobots: true } }) }, { successMessage: "Browser crawl queued", errorFallback: "Unable to queue browser crawl.", onValidation: setError });
    setBusy(false); if (result.ok) router.refresh();
  }
  return <form onSubmit={submit} className="rounded-2xl bg-[var(--card)] card-shadow p-6 space-y-4">
    <div><h2 className="text-base font-semibold">Browser crawl</h2><p className="mt-1 text-sm text-[var(--muted-foreground)]">A background browser scan follows safe internal links, respects robots.txt, and records sanitized observed evidence.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="field-label">Website<Select value={websiteId} onChange={(e) => setWebsiteId(e.target.value)}>{websites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}</Select></label><label className="field-label">Maximum depth<Select value={maxDepth} onChange={(e) => setMaxDepth(e.target.value)}><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option></Select></label><label className="field-label">Maximum pages<Select value={maxPages} onChange={(e) => setMaxPages(e.target.value)}><option value="10">10</option><option value="25">25</option><option value="50">50</option><option value="100">100</option></Select></label><label className="field-label">Parallel pages<Select value={concurrency} onChange={(e) => setConcurrency(e.target.value)}><option value="1">1 (safer)</option><option value="2">2</option><option value="3">3</option></Select></label></div>
    <div className="flex items-center justify-between gap-3"><p className="text-xs text-[var(--muted-foreground)]">Uses isolated browser contexts. Private networks, localhost, unsafe redirects, queries, and cookie values are excluded. Higher parallelism may increase load on the site.</p><Button type="submit" loading={busy}>{busy ? "Queueing…" : "Queue browser crawl"}</Button></div>{error && <p className="text-sm text-[var(--danger)]">{error}</p>}
  </form>;
}
