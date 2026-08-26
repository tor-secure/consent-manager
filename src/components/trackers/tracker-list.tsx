"use client";

import { useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TrackerRow = {
  id: string;
  name: string;
  type: string;
  domain: string | null;
  identifier: string | null;
  status: string;
  isEssential: boolean;
  detectionMethod: string;
  lastSeenAt: Date | null;
  firstSeenAt: Date | null;
  // Resolved names (null = not linked)
  websiteName?: string;
  websiteDomain?: string;
  vendorName: string | null;
  purposeName: string | null;
};

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
    inactive: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/20",
    blocked: "bg-red-50 text-red-700 ring-1 ring-red-600/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.inactive}`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    cookie: "bg-amber-50 text-amber-700",
    pixel: "bg-blue-50 text-blue-700",
    script: "bg-purple-50 text-purple-700",
    beacon: "bg-pink-50 text-pink-700",
    fingerprint: "bg-red-50 text-red-700",
    storage: "bg-teal-50 text-teal-700",
    other: "bg-neutral-100 text-neutral-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[type] ?? styles.other}`}
    >
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

function EssentialBadge({ isEssential }: { isEssential: boolean }) {
  if (!isEssential) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-600/20">
      Essential
    </span>
  );
}

function DetectionBadge({ method }: { method: string }) {
  const label: Record<string, string> = {
    manual: "Manual",
    scan: "Scan",
    api: "API",
  };
  return (
    <span className="text-xs text-neutral-400">
      {label[method] ?? method}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TrackerList — client component with search + type filter
// ---------------------------------------------------------------------------

const ALL_TYPES = ["cookie", "pixel", "script", "beacon", "fingerprint", "storage", "other"];

export function TrackerList({
  trackers,
  showWebsite = false,
}: {
  trackers: TrackerRow[];
  showWebsite?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = trackers.filter((t) => {
    const matchesQuery =
      query.trim() === "" ||
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      (t.domain ?? "").toLowerCase().includes(query.toLowerCase()) ||
      (t.identifier ?? "").toLowerCase().includes(query.toLowerCase()) ||
      (t.vendorName ?? "").toLowerCase().includes(query.toLowerCase());

    const matchesType = typeFilter === "all" || t.type === typeFilter;

    return matchesQuery && matchesType;
  });

  // Collect types actually present for filter options.
  const presentTypes = [...new Set(trackers.map((t) => t.type))].sort();

  return (
    <div>
      {/* Filters */}
      {trackers.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative max-w-xs flex-1">
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
              placeholder="Search trackers…"
              className="w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            />
          </div>

          {/* Type filter */}
          {presentTypes.length > 1 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
            >
              <option value="all">All types</option>
              {presentTypes.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Empty — no trackers */}
      {trackers.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">No trackers yet</p>
          <p className="mt-1 text-sm text-neutral-400">
            Trackers are detected by running a scan or added manually.
          </p>
        </div>
      )}

      {/* Empty — no filter results */}
      {trackers.length > 0 && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-neutral-500">No trackers match your filters.</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setTypeFilter("all"); }}
            className="mt-3 text-sm text-neutral-900 underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full divide-y text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-3">Tracker</th>
                {showWebsite && <th className="px-4 py-3">Website</th>}
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Purpose</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((t) => (
                <tr key={t.id} className="transition hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900">{t.name}</p>
                    {t.domain && (
                      <p className="mt-0.5 text-xs text-neutral-400">{t.domain}</p>
                    )}
                    {t.identifier && (
                      <code className="mt-0.5 block max-w-[200px] truncate text-xs text-neutral-400">
                        {t.identifier}
                      </code>
                    )}
                  </td>
                  {showWebsite && (
                    <td className="px-4 py-3 text-neutral-600">
                      <p>{t.websiteName ?? "—"}</p>
                      {t.websiteDomain && (
                        <p className="text-xs text-neutral-400">{t.websiteDomain}</p>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <TypeBadge type={t.type} />
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {t.vendorName ?? <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {t.purposeName ?? <span className="text-neutral-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <EssentialBadge isEssential={t.isEssential} />
                      <DetectionBadge method={t.detectionMethod} />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {t.lastSeenAt
                      ? t.lastSeenAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : <span className="text-neutral-300">—</span>}
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
