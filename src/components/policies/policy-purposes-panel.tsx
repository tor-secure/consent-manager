"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// ---------------------------------------------------------------------------
// Types — mirroring what the server page passes down
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
// Badges
// ---------------------------------------------------------------------------

function RequiredBadge({ isRequired }: { isRequired: boolean }) {
  if (!isRequired) return null;
  return (
    <span className="ml-1.5 inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20">
      Required
    </span>
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
  available: PurposeSummary[];   // org purposes NOT yet attached
  latestVersionId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

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
      const res = await fetch(
        `/api/policies/${policyId}/purposes/${purposeId}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to detach purpose");
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyId(null);
    }
  }

  const noVersion = !latestVersionId;

  return (
    <div className="rounded-lg border bg-white p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Purposes</h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            Select the consent purposes collected by this policy version.
          </p>
        </div>

        <Link
          href="/dashboard/purposes/new"
          className="shrink-0 text-sm font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
        >
          + New purpose
        </Link>
      </div>

      {noVersion && (
        <div className="rounded-md border border-dashed px-4 py-6 text-center">
          <p className="text-sm text-neutral-400">
            No policy version found. Create a version before attaching purposes.
          </p>
        </div>
      )}

      {!noVersion && (
        <>
          {/* Attached purposes */}
          {attached.length === 0 && available.length === 0 && (
            <div className="rounded-md border border-dashed px-4 py-6 text-center">
              <p className="text-sm text-neutral-400">
                No purposes in your organization yet.{" "}
                <Link
                  href="/dashboard/purposes/new"
                  className="font-medium text-neutral-700 underline underline-offset-2"
                >
                  Create one
                </Link>
              </p>
            </div>
          )}

          {attached.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Attached ({attached.length})
              </p>
              <ul role="list" className="space-y-1.5">
                {attached.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-md border bg-neutral-50 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-neutral-900">
                        {p.name}
                      </span>
                      <RequiredBadge isRequired={p.isRequired} />
                      {p.description && (
                        <p className="mt-0.5 truncate text-xs text-neutral-400">
                          {p.description}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isPending || busyId === p.id || p.isRequired}
                      onClick={() => detach(p.id)}
                      title={p.isRequired ? "Required purposes cannot be detached" : "Remove"}
                      className="ml-3 shrink-0 rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busyId === p.id ? "…" : "Remove"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Available purposes to attach */}
          {available.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Available to attach ({available.length})
              </p>
              <ul role="list" className="space-y-1.5">
                {available.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-neutral-700">
                        {p.name}
                      </span>
                      <RequiredBadge isRequired={p.isRequired} />
                      {p.description && (
                        <p className="mt-0.5 truncate text-xs text-neutral-400">
                          {p.description}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isPending || busyId === p.id}
                      onClick={() => attach(p.id)}
                      className="ml-3 shrink-0 rounded px-2 py-1 text-xs font-medium text-neutral-900 hover:bg-neutral-100 disabled:opacity-40"
                    >
                      {busyId === p.id ? "…" : "Attach"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </>
      )}
    </div>
  );
}
