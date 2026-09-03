"use client";

import { useState } from "react";

export function AbTestControls({
  policyId,
  enabled,
}: {
  policyId: string;
  enabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(nextEnabled: boolean) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/policies/${policyId}/ab-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled, seedDefault: true }),
      });
      const data = (await res.json()) as { success?: boolean; message?: string };
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Unable to update experiment");
      }
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update experiment");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void save(!enabled)}
        className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
      >
        {busy ? "Saving…" : enabled ? "Pause experiment" : "Start default experiment"}
      </button>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
