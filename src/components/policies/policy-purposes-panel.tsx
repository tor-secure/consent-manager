"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PurposeSummary = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isRequired: boolean;
  status: string;
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconPurpose() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M8 5v3l2 1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7l3.5 3.5L12 3.5" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M7 2v10M2 7h10" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// PolicyPurposesPanel
// ---------------------------------------------------------------------------

export function PolicyPurposesPanel({
  policyId,
  attached,
  available,
  latestVersionId,
}: {
  policyId: string;
  attached: PurposeSummary[];
  available: PurposeSummary[];
  latestVersionId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 2500);
  }

  async function attach(purposeId: string) {
    setBusyId(purposeId);
    setError("");
    try {
      const res = await fetch(`/api/policies/${policyId}/purposes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purposeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to attach purpose");
      flash("Purpose attached.");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  async function detach(purposeId: string) {
    setBusyId(purposeId);
    setError("");
    try {
      const res = await fetch(`/api/policies/${policyId}/purposes/${purposeId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to detach purpose");
      flash("Purpose removed.");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  const noVersion = !latestVersionId;
  const noPurposes = attached.length === 0 && available.length === 0;

  return (
    <div className="rounded-2xl bg-white card-shadow overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <IconPurpose />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Purposes</h2>
            <p className="text-xs text-slate-500">
              Select the consent purposes for this policy version.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/purposes/new"
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
        >
          <IconPlus />
          New purpose
        </Link>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="p-5 space-y-4">

        {/* Feedback */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}><circle cx="8" cy="8" r="6"/><path strokeLinecap="round" d="M8 5v3M8 11h.01"/></svg>
            {error}
            <button onClick={() => setError("")} className="ml-auto shrink-0 text-rose-400 hover:text-rose-600">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
            <IconCheck />
            {successMsg}
          </div>
        )}

        {/* No version guard */}
        {noVersion && (
          <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
            <p className="text-sm text-slate-400">
              No policy version found. Create a version before attaching purposes.
            </p>
          </div>
        )}

        {/* No purposes at all */}
        {!noVersion && noPurposes && (
          <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
            <p className="text-sm font-medium text-slate-600">No purposes in your organisation yet.</p>
            <p className="mt-1 text-xs text-slate-400">
              Create purposes to start defining consent requirements.
            </p>
            <Link href="/dashboard/purposes/new"
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700">
              <IconPlus />
              Create purpose
            </Link>
          </div>
        )}

        {/* Attached purposes */}
        {!noVersion && attached.length > 0 && (
          <div>
            <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
              Attached
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 normal-case tracking-normal">
                {attached.length}
              </span>
            </p>
            <ul role="list" className="space-y-2">
              {attached.map((p) => (
                <li key={p.id}
                  className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 transition hover:border-slate-300 hover:bg-white">
                  <div className="flex min-w-0 items-start gap-3">
                    {/* Check indicator */}
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                      <IconCheck />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{p.name}</span>
                        {p.isRequired && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-500/20">
                            Required
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{p.description}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isPending || busyId === p.id || p.isRequired}
                    onClick={() => detach(p.id)}
                    title={p.isRequired ? "Required purposes cannot be removed" : "Remove from policy"}
                    className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busyId === p.id ? <IconSpinner /> : "Remove"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Available to attach */}
        {!noVersion && available.length > 0 && (
          <div>
            <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
              Available to attach
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 normal-case tracking-normal">
                {available.length}
              </span>
            </p>
            <ul role="list" className="space-y-2">
              {available.map((p) => (
                <li key={p.id}
                  className="group flex items-start justify-between gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-3 transition hover:border-indigo-200 hover:bg-indigo-50/30">
                  <div className="flex min-w-0 items-start gap-3">
                    {/* Dashed circle placeholder */}
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 group-hover:border-indigo-300 group-hover:text-indigo-500 transition">
                      <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-slate-600">{p.name}</span>
                        {p.isRequired && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-500/20">
                            Required
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{p.description}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isPending || busyId === p.id}
                    onClick={() => attach(p.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-40"
                  >
                    {busyId === p.id ? <IconSpinner /> : <><IconPlus /> Attach</>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}
