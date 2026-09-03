"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";

export type WebsiteOption = { id: string; name: string; domain: string };

export function StartScanForm({ websites }: { websites: WebsiteOption[] }) {
  const router = useRouter();
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? "");
  const { pending: running, run } = useAsyncAction();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        "/api/scanner/run",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ websiteId }),
        },
        {
          successMessage: "Scan started successfully",
          errorFallback: "Unable to start scan. Please try again.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      const scanId =
        typeof result.data === "object" &&
        result.data !== null &&
        "scanId" in result.data &&
        typeof (result.data as { scanId?: unknown }).scanId === "string"
          ? (result.data as { scanId: string }).scanId
          : null;
      if (scanId) router.push(`/dashboard/scanner/${scanId}`);
      else router.push("/dashboard/scanner");
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl bg-white card-shadow p-6">
      {/* Header row */}
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl stat-icon-blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Run a new scan</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Fetches your website&apos;s homepage and analyses it for cookies, scripts, pixels, and tracking technologies.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Website
          </label>
          <select
            value={websiteId}
            onChange={(e) => setWebsiteId(e.target.value)}
            required
            className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition"
          >
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.domain})
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" loading={running}>
          {running ? "Starting scan..." : "Start scan"}
        </Button>
      </form>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}
