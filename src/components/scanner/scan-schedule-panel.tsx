"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";

export type ScheduleRow = {
  websiteId: string;
  websiteName: string;
  websiteDomain: string;
  enabled: boolean;
  frequency: string;
  timezone: string;
  nextScanAt: string | null;
  lastScanAt: string | null;
  lastScanStatus: string | null;
  lastError: string | null;
};

function fmt(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return (
    date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) +
    " " +
    date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
  );
}

export function ScanSchedulePanel({ schedules }: { schedules: ScheduleRow[] }) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const [busyWebsite, setBusyWebsite] = useState<string | null>(null);
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(
      schedules.map((row) => [
        row.websiteId,
        { enabled: row.enabled, frequency: row.frequency || "weekly" },
      ]),
    ),
  );

  async function save(websiteId: string) {
    const current = draft[websiteId];
    await run(async () => {
      setBusyWebsite(websiteId);
      try {
        await dashboardFetch(
          `/api/websites/${websiteId}/scan-schedule`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              enabled: current.enabled,
              frequency: current.frequency,
            }),
          },
          {
            successMessage: current.enabled
              ? "Automatic scanning saved"
              : "Automatic scanning turned off",
            errorFallback: "Unable to save scan schedule.",
          },
        );
        router.refresh();
      } finally {
        setBusyWebsite(null);
      }
    });
  }

  async function scanNow(websiteId: string) {
    await run(async () => {
      setBusyWebsite(websiteId);
      try {
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
        else router.refresh();
      } finally {
        setBusyWebsite(null);
      }
    });
  }

  if (schedules.length === 0) return null;

  return (
    <div className="rounded-2xl bg-white card-shadow">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-base font-semibold text-slate-900">Automatic scanning</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Daily, weekly, or monthly scans. An external scheduler must call the scan job in production.
        </p>
      </div>
      <div className="table-scroll scrollbar-thin">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {["Website", "Automatic", "Frequency", "Last scan", "Next scan", "Result", ""].map((heading) => (
                <th
                  key={heading}
                  className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {schedules.map((row) => {
              const current = draft[row.websiteId] ?? {
                enabled: row.enabled,
                frequency: row.frequency,
              };
              const busy = pending && busyWebsite === row.websiteId;
              return (
                <tr key={row.websiteId}>
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{row.websiteName}</p>
                    <p className="text-xs text-slate-400">{row.websiteDomain}</p>
                  </td>
                  <td className="px-5 py-4">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={current.enabled}
                        onChange={(event) =>
                          setDraft((prev) => ({
                            ...prev,
                            [row.websiteId]: {
                              ...current,
                              enabled: event.target.checked,
                            },
                          }))
                        }
                      />
                      {current.enabled ? "On" : "Off"}
                    </label>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={current.frequency}
                      onChange={(event) =>
                        setDraft((prev) => ({
                          ...prev,
                          [row.websiteId]: {
                            ...current,
                            frequency: event.target.value,
                          },
                        }))
                      }
                      className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </td>
                  <td className="px-5 py-4 text-slate-500">{fmt(row.lastScanAt)}</td>
                  <td className="px-5 py-4 text-slate-500">
                    {current.enabled ? fmt(row.nextScanAt) : "—"}
                  </td>
                  <td className="px-5 py-4">
                    {row.lastScanStatus ? (
                      <div className="space-y-1">
                        <Badge
                          variant={
                            row.lastScanStatus === "completed"
                              ? "success"
                              : row.lastScanStatus === "failed"
                                ? "danger"
                                : "neutral"
                          }
                          size="sm"
                          className="capitalize"
                        >
                          {row.lastScanStatus}
                        </Badge>
                        {row.lastError && (
                          <p className="max-w-[180px] truncate text-xs text-rose-500">{row.lastError}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        loading={busy}
                        onClick={() => save(row.websiteId)}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        loading={busy}
                        onClick={() => scanNow(row.websiteId)}
                      >
                        {busy ? "Starting scan..." : "Scan now"}
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
