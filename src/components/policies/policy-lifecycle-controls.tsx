"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dashboardFetch } from "@/components/feedback/use-async-action";

export function PolicyLifecycleControls({
  policyId,
  versions,
}: {
  policyId: string;
  versions: Array<{
    id: string;
    version: number;
    isPublished: boolean;
    status: string;
  }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scheduleAt, setScheduleAt] = useState("");
  const published = versions.filter((row) => row.isPublished);
  const archived = versions.filter((row) => !row.isPublished);
  const latestDraft = [...archived].reverse()[0] ?? null;

  async function run(path: string, body?: unknown) {
    const result = await dashboardFetch(
      path,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      },
      {
        successMessage: "Policy lifecycle updated",
        errorFallback: "Unable to update policy lifecycle",
      },
    );
    if (result.ok) startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)] p-4">
      <p className="text-sm font-medium text-[var(--foreground)]">Lifecycle</p>
      <p className="text-xs text-[var(--muted-foreground)]">
        Unpublish removes the live SDK configuration. Rollback copies an older version into a new published version without rewriting history. Schedule applies through the policy cron.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-outline"
          disabled={pending || published.length === 0}
          onClick={() => run(`/api/policies/${policyId}/unpublish`)}
        >
          Unpublish
        </button>
        {archived.slice(0, 3).map((row) => (
          <button
            key={row.id}
            type="button"
            className="btn btn-outline"
            disabled={pending}
            onClick={() => run(`/api/policies/${policyId}/rollback`, { versionId: row.id })}
          >
            Rollback to v{row.version}
          </button>
        ))}
      </div>
      {latestDraft ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-[var(--muted-foreground)]">
            Schedule v{latestDraft.version}
            <input
              type="datetime-local"
              className="mt-1 block rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-sm"
              value={scheduleAt}
              onChange={(event) => setScheduleAt(event.target.value)}
            />
          </label>
          <button
            type="button"
            className="btn btn-outline"
            disabled={pending || !scheduleAt}
            onClick={() =>
              run(`/api/policies/${policyId}/schedule`, {
                versionId: latestDraft.id,
                scheduledPublishAt: new Date(scheduleAt).toISOString(),
              })
            }
          >
            Schedule
          </button>
        </div>
      ) : null}
    </div>
  );
}
