"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type WebsiteOption = { id: string; name: string; domain: string };

export function StartScanForm({ websites }: { websites: WebsiteOption[] }) {
  const router = useRouter();
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? "");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRunning(true);
    setError("");

    try {
      const res = await fetch("/api/scanner/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Scan failed");
      router.push(`/dashboard/scanner/${data.scanId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setRunning(false);
    }
  }

  return (
    <div className="rounded-lg border bg-white p-6">
      <h2 className="mb-4 text-base font-semibold text-neutral-900">
        Run a new scan
      </h2>
      <p className="mb-5 text-sm text-neutral-500">
        The scanner fetches your website&apos;s homepage and analyses it for cookies,
        third-party scripts, pixels, and other tracking technologies.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            Website
          </label>
          <select
            value={websiteId}
            onChange={(e) => setWebsiteId(e.target.value)}
            required
            className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
          >
            {websites.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.domain})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={running}
          className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
        >
          {running ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Scanning…
            </span>
          ) : "Start scan"}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
