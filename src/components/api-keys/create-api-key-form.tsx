"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreatedKey = { fullKey: string; name: string };

const inputCls = "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition disabled:bg-slate-50 disabled:opacity-60";

export function CreateApiKeyForm({ onCreated }: { onCreated: (created: CreatedKey) => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("live");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, environment, expiresAt: expiresAt || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to create key");
      onCreated({ fullKey: data.fullKey, name });
      setName(""); setEnvironment("live"); setExpiresAt(""); setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally { setSaving(false); }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M7 1v12M1 7h12" />
        </svg>
        Create API key
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl bg-white card-shadow p-6">
      <h2 className="mb-5 text-base font-semibold text-slate-900">New API key</h2>

      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Key name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={255}
            placeholder="Production integration" className={inputCls} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">Environment</label>
          <div className="flex flex-wrap gap-4">
            {(["live", "test"] as const).map((env) => (
              <label key={env} className="flex cursor-pointer items-center gap-2 text-sm">
                <input type="radio" name="environment" value={env}
                  checked={environment === env} onChange={() => setEnvironment(env)}
                  className="h-4 w-4 accent-indigo-600" />
                <span className="capitalize text-slate-700">{env}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Expiry date <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition" />
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="8" cy="8" r="6" /><path strokeLinecap="round" d="M8 5v3M8 11h.01" />
          </svg>
          {error}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          {saving ? "Creating…" : "Create key"}
        </button>
        <button type="button" onClick={() => { setOpen(false); setError(""); }}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
          Cancel
        </button>
      </div>
    </form>
  );
}
