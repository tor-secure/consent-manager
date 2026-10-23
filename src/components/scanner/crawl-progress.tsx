"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { m } from "motion/react";

export function CrawlProgress({ scanId, status, progress, pagesScanned, errorMessage }: { scanId: string; status: string; progress: number; pagesScanned: number; errorMessage: string | null }) {
  const router = useRouter();
  const [current, setCurrent] = useState({ status, progress, pagesScanned, errorMessage });
  const [error, setError] = useState("");
  useEffect(() => {
    if (!["queued", "running"].includes(current.status)) return;
    const controller = new AbortController();
    let inFlight = false;
    const timer = setInterval(async () => {
      if (document.hidden || inFlight) return;
      inFlight = true;
      try {
        const response = await fetch(`/api/browser-crawls/${scanId}`, { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.scan) throw new Error("Unable to refresh scan progress. Reload to try again.");
        setCurrent(result.scan); setError("");
        if (!["queued", "running"].includes(result.scan.status)) router.refresh();
      } catch { if (!controller.signal.aborted) setError("Unable to refresh scan progress. Reload to try again."); }
      finally { inFlight = false; }
    }, 4000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [scanId, current.status, router]);
  const value = Math.min(100, Math.max(0, current.progress));
  return <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5" aria-label="Crawl progress">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold capitalize">{current.status === "completed" ? "Crawl completed" : current.status === "queued" ? "Waiting for the scan worker" : `Crawl ${current.status}`}</h2><p className="mt-1 text-xs text-[var(--muted-foreground)]">{current.pagesScanned} pages processed</p></div><span className="text-sm font-semibold tabular-nums">{value}%</span></div>
    <div role="progressbar" aria-label="Crawl completion" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]"><m.div initial={false} animate={{ width: `${value}%` }} className="h-full rounded-full bg-[var(--primary)]" /></div>
    {current.errorMessage && <p role="alert" className="mt-3 text-sm text-[var(--danger)]">{current.errorMessage}</p>}{error && <p role="status" className="mt-3 text-xs text-[var(--warning)]">{error}</p>}
  </section>;
}
