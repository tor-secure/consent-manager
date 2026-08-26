"use client";

import Link from "next/link";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Types — mirror the columns we actually use from the websites table
// ---------------------------------------------------------------------------

export type WebsiteRow = {
  id: string;
  name: string;
  domain: string;
  environment: string;
  status: string;
  defaultLanguage: string;
  defaultRegion: string | null;
  verified: boolean;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active:
      "bg-green-50 text-green-700 ring-1 ring-green-600/20",
    inactive:
      "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/20",
    suspended:
      "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  };

  const label: Record<string, string> = {
    active: "Active",
    inactive: "Inactive",
    suspended: "Suspended",
  };

  const cls = styles[status] ?? styles.inactive;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {label[status] ?? status}
    </span>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600">
        {/* checkmark */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="6" cy="6" r="5.25" fill="#16a34a" />
          <path
            d="M3.5 6l2 2 3-3"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Verified
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-neutral-400">
      {/* dash circle */}
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="6"
          cy="6"
          r="5.25"
          stroke="#d1d5db"
          strokeWidth="1.5"
        />
        <path
          d="M3.5 6h5"
          stroke="#d1d5db"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      Not verified
    </span>
  );
}

// ---------------------------------------------------------------------------
// WebsiteList — receives server-fetched data, handles client-side search
// ---------------------------------------------------------------------------

export function WebsiteList({ websites }: { websites: WebsiteRow[] }) {
  const [query, setQuery] = useState("");

  const filtered =
    query.trim() === ""
      ? websites
      : websites.filter(
          (w) =>
            w.name.toLowerCase().includes(query.toLowerCase()) ||
            w.domain.toLowerCase().includes(query.toLowerCase()),
        );

  return (
    <div>
      {/* Search bar */}
      {websites.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="6.5"
              cy="6.5"
              r="5"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M10.5 10.5l3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search websites…"
            className="w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>
      )}

      {/* Empty state — no websites at all */}
      {websites.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">
            No websites yet
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Add your first website to start configuring consent management.
          </p>
          <Link
            href="/dashboard/websites/new"
            className="mt-5 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Add your first website
          </Link>
        </div>
      )}

      {/* Empty state — search returned nothing */}
      {websites.length > 0 && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-neutral-500">
            No websites match &ldquo;{query}&rdquo;
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

      {/* Website cards */}
      {filtered.length > 0 && (
        <ul
          role="list"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {filtered.map((website) => (
            <li key={website.id}>
              <Link
                href={`/dashboard/websites/${website.id}`}
                className="group flex h-full flex-col rounded-lg border bg-white p-5 transition hover:border-neutral-400 hover:shadow-sm"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-neutral-900 group-hover:text-neutral-700">
                      {website.name}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-neutral-500">
                      {website.domain}
                    </p>
                  </div>

                  <StatusBadge status={website.status} />
                </div>

                {/* Meta rows */}
                <dl className="mt-4 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-500">Environment</dt>
                    <dd className="capitalize text-neutral-700">
                      {website.environment}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-500">Region</dt>
                    <dd className="text-neutral-700">
                      {website.defaultRegion ?? "—"}
                    </dd>
                  </div>

                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-500">Language</dt>
                    <dd className="uppercase text-neutral-700">
                      {website.defaultLanguage}
                    </dd>
                  </div>
                </dl>

                {/* Footer */}
                <div className="mt-4 border-t pt-3">
                  <VerifiedBadge verified={website.verified} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
