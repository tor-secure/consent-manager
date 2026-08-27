"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ManagedVendor = {
  id: string;
  name: string;
  key: string;
  domain: string | null;
  country: string | null;
  privacyPolicyUrl: string | null;
  source: string;
  status: string;
  /** Names of the policy's purposes that this vendor is already linked to */
  purposeNames: string[];
};

export type AvailableVendor = {
  id: string;
  name: string;
  key: string;
  domain: string | null;
  source: string;
  status: string;
};

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    custom: "bg-neutral-100 text-neutral-600",
    iab: "bg-purple-50 text-purple-700",
    google: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[source] ?? styles.custom}`}
    >
      {source.toUpperCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// PolicyVendorManagerPanel
//
// Replaces the read-only PolicyVendorsPanel with a real attach/detach UI.
//
// Attach logic: POST /api/policies/[policyId]/vendors with { vendorId }
//   → links the vendor to ALL of the policy's currently attached purposes
//     via vendor_purposes (server chooses the target purposes).
//
// Detach logic: DELETE /api/policies/[policyId]/vendors/[vendorId]
//   → removes all vendor_purposes links between the vendor and the policy's
//     attached purposes.
//
// Props:
//   policyId          — the consent policy id
//   latestVersionId   — null when no version exists (disables all actions)
//   attached          — vendors already linked to this policy's purposes
//   available         — org vendors NOT yet linked to any policy purpose
//   hasPurposes       — true when the policy version has ≥1 purpose attached
// ---------------------------------------------------------------------------

export function PolicyVendorManagerPanel({
  policyId,
  latestVersionId,
  attached,
  available,
  hasPurposes,
}: {
  policyId: string;
  latestVersionId: string | null;
  attached: ManagedVendor[];
  available: AvailableVendor[];
  hasPurposes: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Track which vendor is being added (for per-row spinner)
  const [addingId, setAddingId] = useState<string | null>(null);
  // Track which vendor is being removed
  const [removingId, setRemovingId] = useState<string | null>(null);
  // Inline error message
  const [error, setError] = useState<string | null>(null);
  // Whether the "add vendor" dropdown is open
  const [selectorOpen, setSelectorOpen] = useState(false);
  // Search within the available-vendors selector
  const [selectorSearch, setSelectorSearch] = useState("");

  const filteredAvailable = available.filter(
    (v) =>
      selectorSearch.trim() === "" ||
      v.name.toLowerCase().includes(selectorSearch.toLowerCase()) ||
      v.key.toLowerCase().includes(selectorSearch.toLowerCase()) ||
      (v.domain ?? "").toLowerCase().includes(selectorSearch.toLowerCase()),
  );

  // ── Attach ────────────────────────────────────────────────────────────────

  function handleAttach(vendorId: string) {
    setError(null);
    setAddingId(vendorId);
    setSelectorOpen(false);
    setSelectorSearch("");

    startTransition(async () => {
      try {
        const res = await fetch(`/api/policies/${policyId}/vendors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vendorId }),
        });
        const data = (await res.json()) as { success: boolean; message?: string };
        if (!data.success) {
          setError(data.message ?? "Failed to attach vendor.");
        } else {
          router.refresh();
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setAddingId(null);
      }
    });
  }

  // ── Detach ────────────────────────────────────────────────────────────────

  function handleDetach(vendorId: string) {
    setError(null);
    setRemovingId(vendorId);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/policies/${policyId}/vendors/${vendorId}`, {
          method: "DELETE",
        });
        const data = (await res.json()) as { success: boolean; message?: string };
        if (!data.success) {
          setError(data.message ?? "Failed to detach vendor.");
        } else {
          router.refresh();
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setRemovingId(null);
      }
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const disabled = !latestVersionId || !hasPurposes || isPending;

  return (
    <div className="rounded-lg border bg-white p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Vendors</h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            Third-party vendors that operate under this policy&apos;s purposes.
          </p>
        </div>

        <Link
          href="/dashboard/vendors"
          className="shrink-0 text-sm font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
        >
          Manage all vendors
        </Link>
      </div>

      {/* No version */}
      {!latestVersionId && (
        <div className="rounded-md border border-dashed px-4 py-6 text-center">
          <p className="text-sm text-neutral-400">No policy version found.</p>
        </div>
      )}

      {/* Has version but no purposes attached yet */}
      {latestVersionId && !hasPurposes && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <strong className="font-medium">Attach purposes first.</strong>
          {" "}Vendors can only be added once at least one purpose is attached to this policy.
        </div>
      )}

      {/* Main content — only shown when version + purposes exist */}
      {latestVersionId && hasPurposes && (
        <>
          {/* Error */}
          {error && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Attached vendors list */}
          {attached.length > 0 ? (
            <ul role="list" className="mb-4 space-y-2">
              {attached.map((v) => (
                <li
                  key={v.id}
                  className="flex items-start justify-between gap-3 rounded-md border px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-900">{v.name}</span>
                      <SourceBadge source={v.source} />
                      {v.status === "inactive" && (
                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                          Inactive
                        </span>
                      )}
                    </div>

                    {v.domain && (
                      <p className="mt-0.5 text-xs text-neutral-400">{v.domain}</p>
                    )}

                    {/* Purposes this vendor covers for this policy */}
                    {v.purposeNames.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {v.purposeNames.map((p) => (
                          <span
                            key={p}
                            className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    {v.privacyPolicyUrl && (
                      <a
                        href={v.privacyPolicyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-neutral-500 underline underline-offset-2 hover:text-neutral-900"
                      >
                        Privacy policy
                      </a>
                    )}

                    <button
                      onClick={() => handleDetach(v.id)}
                      disabled={removingId === v.id || isPending}
                      aria-label={`Remove ${v.name} from this policy`}
                      className="rounded px-2.5 py-1 text-xs font-medium text-neutral-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      {removingId === v.id ? "Removing…" : "Remove"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mb-4 rounded-md border border-dashed px-4 py-6 text-center">
              <p className="text-sm text-neutral-400">
                No vendors linked to this policy yet.
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                Use the selector below to add vendors, or link them from the{" "}
                <Link
                  href="/dashboard/vendors"
                  className="underline underline-offset-2 hover:text-neutral-700"
                >
                  Vendors page
                </Link>
                .
              </p>
            </div>
          )}

          {/* Add vendor selector */}
          {available.length > 0 ? (
            <div className="relative">
              {!selectorOpen ? (
                <button
                  onClick={() => setSelectorOpen(true)}
                  disabled={disabled}
                  className="rounded-md border bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
                >
                  + Add vendor
                </button>
              ) : (
                <div className="rounded-lg border bg-white shadow-md">
                  <div className="border-b px-3 py-2">
                    <input
                      type="text"
                      placeholder="Search vendors…"
                      value={selectorSearch}
                      onChange={(e) => setSelectorSearch(e.target.value)}
                      autoFocus
                      className="w-full bg-transparent text-sm text-neutral-900 placeholder-neutral-400 outline-none"
                    />
                  </div>

                  {filteredAvailable.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-neutral-400">
                      No vendors match your search.
                    </div>
                  ) : (
                    <ul role="list" className="max-h-56 overflow-y-auto divide-y">
                      {filteredAvailable.map((v) => (
                        <li key={v.id}>
                          <button
                            onClick={() => handleAttach(v.id)}
                            disabled={addingId === v.id || isPending}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-neutral-50 disabled:opacity-50"
                          >
                            <span>
                              <span className="font-medium text-neutral-900">{v.name}</span>
                              {v.domain && (
                                <span className="ml-2 text-xs text-neutral-400">{v.domain}</span>
                              )}
                            </span>
                            <span className="ml-2 shrink-0">
                              <SourceBadge source={v.source} />
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="border-t px-3 py-2 text-right">
                    <button
                      onClick={() => {
                        setSelectorOpen(false);
                        setSelectorSearch("");
                      }}
                      className="text-xs text-neutral-500 hover:text-neutral-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {addingId && (
                <p className="mt-2 text-xs text-neutral-400">Adding vendor…</p>
              )}
            </div>
          ) : (
            // All org vendors are already attached
            attached.length > 0 && (
              <p className="text-xs text-neutral-400">
                All your organisation&apos;s vendors are already linked to this policy.{" "}
                <Link
                  href="/dashboard/vendors/new"
                  className="underline underline-offset-2 hover:text-neutral-700"
                >
                  Create a new vendor
                </Link>
                .
              </p>
            )
          )}
        </>
      )}
    </div>
  );
}
