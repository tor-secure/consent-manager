"use client";

export default function RuntimeDiscoveryError({ reset }: { error: Error; reset: () => void }) {
  return <div className="page-wrap"><div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8"><h1 className="text-xl font-semibold text-[var(--foreground)]">Runtime discovery could not load</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted-foreground)]">Refresh the evidence view. If the problem persists, verify the database migration and your organization access.</p><button type="button" onClick={reset} className="btn btn-primary mt-5">Try again</button></div></div>;
}
