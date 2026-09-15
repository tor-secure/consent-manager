"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dashboardFetch } from "@/components/feedback/use-async-action";

export function RestoreTwinButton({
  websiteId,
  snapshotId,
}: {
  websiteId: string;
  snapshotId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  async function restore() {
    setMessage(null);
    const result = await dashboardFetch(
      "/api/intelligence/digital-twin",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", websiteId, snapshotId }),
      },
      {
        successMessage: "Tracker mappings restored from the snapshot. Policy was not published.",
        errorFallback: "Unable to restore this snapshot",
      },
    );
    if (result.ok) startTransition(() => router.refresh());
    else setMessage("Restore failed");
  }

  return (
    <div className="mt-2">
      <button type="button" className="btn btn-outline btn-sm" disabled={pending} onClick={() => void restore()}>
        Restore tracker mappings
      </button>
      {message ? <p className="mt-1 text-xs text-[var(--danger)]">{message}</p> : null}
    </div>
  );
}
