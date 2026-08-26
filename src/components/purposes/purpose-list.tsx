"use client";

import Link from "next/link";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PurposeRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isRequired: boolean;
  status: string;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
    inactive: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/20",
  };
  const labels: Record<string, string> = { active: "Active", inactive: "Inactive" };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.inactive}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

function RequiredBadge({ isRequired }: { isRequired: boolean }) {
  if (!isRequired) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20">
      Required
    </span>
  );
}

// ---------------------------------------------------------------------------
// PurposeList — search filtering over server-fetched data
// ---------------------------------------------------------------------------

export function PurposeList({ purposes }: { purposes: PurposeRow[] }) {
  const [query, setQuery] = useState("");

  const filtered =
    query.trim() === ""
      ? purposes
      : purposes.filter(
          (p) =>
            p.name.toLowerCase().includes(query.toLowerCase()) ||
            p.key.toLowerCase().includes(query.toLowerCase()) ||
            (p.description ?? "").toLowerCase().includes(query.toLowerCase()),
        );

  return (
    <div>
      {/* Search */}
      {purposes.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search purposes…"
            className="w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>
      )}

      {/* Empty — no purposes */}
      {purposes.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">No purposes yet</p>
          <p className="mt-1 text-sm text-neutral-400">
            Create your first purpose to start building consent policies.
          </p>
          <Link
            href="/dashboard/purposes/new"
            className="mt-5 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Create purpose
          </Link>
        </div>
      )}

      {/* Empty — no search results */}
      {purposes.length > 0 && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-neutral-500">
            No purposes match &ldquo;{query}&rdquo;
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-3 text-sm text-neutral-900 underline underline-offset-2"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="min-w-full divide-y text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Key</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Required</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => (
                <tr key={p.id} className="transition hover:bg-neutral-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-neutral-900">{p.name}</p>
                    {p.description && (
                      <p className="mt-0.5 max-w-xs truncate text-xs text-neutral-400">
                        {p.description}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">
                      {p.key}
                    </code>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-3">
                    <RequiredBadge isRequired={p.isRequired} />
                    {!p.isRequired && (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-neutral-500">
                    {p.createdAt.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
