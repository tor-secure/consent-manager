"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { dashboardFetch } from "@/components/feedback/use-async-action";

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

  async function attach(purposeId: string) {
    if (busyId) return;
    setBusyId(purposeId);
    setError("");
    const result = await dashboardFetch(
      `/api/policies/${policyId}/purposes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purposeId }),
      },
      {
        successMessage: "Purpose updated successfully",
        errorFallback: "Unable to attach purpose. Please try again.",
        onValidation: setError,
      },
    );
    setBusyId(null);
    if (!result.ok) return;
    startTransition(() => router.refresh());
  }

  async function detach(purposeId: string) {
    if (busyId) return;
    setBusyId(purposeId);
    setError("");
    const result = await dashboardFetch(
      `/api/policies/${policyId}/purposes/${purposeId}`,
      { method: "DELETE" },
      {
        successMessage: "Purpose removed successfully",
        errorFallback: "Unable to remove purpose. Please try again.",
        onValidation: setError,
      },
    );
    setBusyId(null);
    if (!result.ok) return;
    startTransition(() => router.refresh());
  }

  const noVersion = !latestVersionId;
  const noPurposes = attached.length === 0 && available.length === 0;

  return (
    <div className="rounded-2xl bg-[var(--card)] card-shadow overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="card-section-header border-[var(--border)]">
        <div className="icon-text-row">
          <div data-icon-tile className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--info-soft)] text-[var(--primary)]">
            <IconPurpose />
          </div>
          <div className="icon-text-body">
            <h2 className="icon-text-title">Purposes</h2>
            <p className="icon-text-desc">
              Select the consent purposes for this policy version.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/purposes/new"
          className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] shadow-sm transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
        >
          <IconPlus />
          New purpose
        </Link>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="p-5 space-y-4">

        {/* Feedback */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-3 py-2.5 text-xs text-[var(--danger)]">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}><circle cx="8" cy="8" r="6"/><path strokeLinecap="round" d="M8 5v3M8 11h.01"/></svg>
            {error}
            <button onClick={() => setError("")} className="ml-auto shrink-0 text-[var(--danger)] hover:text-[var(--danger)]">✕</button>
          </div>
        )}

        {/* No version guard */}
        {noVersion && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              No policy version found. Create a version before attaching purposes.
            </p>
          </div>
        )}

        {/* No purposes at all */}
        {!noVersion && noPurposes && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-8 text-center">
            <p className="text-sm font-medium text-[var(--muted-foreground)]">No purposes in your organisation yet.</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Create purposes to start defining consent requirements.
            </p>
            <Link href="/dashboard/purposes/new"
              className="mt-3 inline-flex items-center gap-1 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-medium text-white shadow-sm transition hover:bg-[var(--primary-hover)]">
              <IconPlus />
              Create purpose
            </Link>
          </div>
        )}

        {/* Attached purposes */}
        {!noVersion && attached.length > 0 && (
          <div>
            <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              Attached
              <span className="rounded-full bg-[var(--info-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--primary)] normal-case tracking-normal">
                {attached.length}
              </span>
            </p>
            <ul role="list" className="space-y-2">
              {attached.map((p) => (
                <li key={p.id}
                  className="group flex items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/60 px-4 py-3 transition hover:border-[var(--border)] hover:bg-[var(--card)]">
                  <div className="flex min-w-0 items-start gap-3">
                    {/* Check indicator */}
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-[var(--info-soft)] text-[var(--primary)]">
                      <IconCheck />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[var(--foreground)]">{p.name}</span>
                        {p.isRequired && (
                          <span className="inline-flex items-center rounded-full bg-[var(--info-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--info)] ring-1 ring-[color-mix(in_srgb,var(--info)_22%,transparent)]">
                            Required
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-[var(--muted-foreground)]">{p.description}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isPending || busyId === p.id || p.isRequired}
                    onClick={() => detach(p.id)}
                    title={p.isRequired ? "Required purposes cannot be removed" : "Remove from policy"}
                    className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)] disabled:cursor-not-allowed disabled:opacity-40"
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
            <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">
              Available to attach
              <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted-foreground)] normal-case tracking-normal">
                {available.length}
              </span>
            </p>
            <ul role="list" className="space-y-2">
              {available.map((p) => (
                <li key={p.id}
                  className="group flex items-start justify-between gap-3 rounded-2xl border border-dashed border-[var(--border)] px-4 py-3 transition hover:border-[color-mix(in_srgb,var(--primary)_28%,transparent)] hover:bg-[var(--info-soft)]/30">
                  <div className="flex min-w-0 items-start gap-3">
                    {/* Dashed circle placeholder */}
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-[var(--border)] text-[var(--muted-foreground)] group-hover:border-[var(--ring)] group-hover:text-[var(--primary)] transition">
                      <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" /></svg>
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-[var(--muted-foreground)]">{p.name}</span>
                        {p.isRequired && (
                          <span className="inline-flex items-center rounded-full bg-[var(--info-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--info)] ring-1 ring-[color-mix(in_srgb,var(--info)_22%,transparent)]">
                            Required
                          </span>
                        )}
                      </div>
                      {p.description && (
                        <p className="mt-0.5 line-clamp-1 text-xs text-[var(--muted-foreground)]">{p.description}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isPending || busyId === p.id}
                    onClick={() => attach(p.id)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[color-mix(in_srgb,var(--primary)_28%,transparent)] bg-[var(--info-soft)] px-2.5 py-1 text-xs font-medium text-[var(--primary)] transition hover:bg-[var(--info-soft)] disabled:opacity-40"
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
