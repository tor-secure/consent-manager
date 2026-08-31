"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
  websiteName?: string;
  websiteDomain?: string;
  vendorName: string | null;
  purposeName: string | null;
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconSearch() {
  return (
    <svg className="h-4 w-4 text-slate-400" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconEmpty() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      className="text-slate-300">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconClear() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Type badge — colour per tracker category
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<string, string> = {
  cookie:      "bg-amber-50  text-amber-700  ring-amber-500/20",
  pixel:       "bg-sky-50    text-sky-700    ring-sky-500/20",
  script:      "bg-violet-50 text-violet-700 ring-violet-500/20",
  beacon:      "bg-pink-50   text-pink-700   ring-pink-500/20",
  fingerprint: "bg-rose-50   text-rose-700   ring-rose-500/20",
  storage:     "bg-teal-50   text-teal-700   ring-teal-500/20",
  other:       "bg-slate-100 text-slate-600  ring-slate-200",
};

const TYPE_DOTS: Record<string, string> = {
  cookie:      "bg-amber-500",
  pixel:       "bg-sky-500",
  script:      "bg-violet-500",
  beacon:      "bg-pink-500",
  fingerprint: "bg-rose-500",
  storage:     "bg-teal-500",
  other:       "bg-slate-400",
};

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_STYLES[type] ?? TYPE_STYLES.other;
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Detection method pill
// ---------------------------------------------------------------------------

function DetectionPill({ method }: { method: string }) {
  const label: Record<string, string> = { manual: "Manual", scan: "Scan", api: "API" };
  return (
    <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
      {label[method] ?? method}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TrackerList
// ---------------------------------------------------------------------------

export function TrackerList({
  trackers,
  showWebsite = false,
}: {
  trackers: TrackerRow[];
  showWebsite?: boolean;
}) {
  const [query, setQuery]           = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const presentTypes = [...new Set(trackers.map((t) => t.type))].sort();

  const filtered = trackers.filter((t) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q === "" ||
      t.name.toLowerCase().includes(q) ||
      (t.domain ?? "").toLowerCase().includes(q) ||
      (t.identifier ?? "").toLowerCase().includes(q) ||
      (t.vendorName ?? "").toLowerCase().includes(q);
    const matchesType = typeFilter === "all" || t.type === typeFilter;
    return matchesQuery && matchesType;
  });

  // ── No data ────────────────────────────────────────────────────────────
  if (trackers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
            <IconEmpty />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-700">No trackers yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Trackers are detected by running a website scan.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative min-w-[220px] flex-1 max-w-sm">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
            <IconSearch />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, domain, or vendor…"
            className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition"
          />
        </div>

        {/* Type pills */}
        {presentTypes.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                typeFilter === "all"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              All
            </button>
            {presentTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(typeFilter === t ? "all" : t)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  typeFilter === t
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${TYPE_DOTS[t] ?? "bg-slate-400"}`} />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── No filter results ────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <IconEmpty />
            <p className="text-sm text-slate-500">No trackers match your filters.</p>
            <button
              type="button"
              onClick={() => { setQuery(""); setTypeFilter("all"); }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <IconClear />
              Clear filters
            </button>
          </CardContent>
        </Card>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <Card>
          <div className="table-scroll scrollbar-thin">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {[
                    "Tracker",
                    ...(showWebsite ? ["Website"] : []),
                    "Type",
                    "Vendor",
                    "Purpose",
                    "Status",
                    "Detection",
                    "Last seen",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="group transition-colors hover:bg-slate-50/80">

                    {/* Tracker name + domain + identifier */}
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        {/* Type-coloured dot tile */}
                        <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${TYPE_DOTS[t.type] ?? "bg-slate-400"}`} />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {t.name}
                          </p>
                          {t.domain && (
                            <p className="mt-0.5 truncate text-xs text-slate-400">{t.domain}</p>
                          )}
                          {t.identifier && (
                            <code className="mt-0.5 block max-w-[200px] truncate rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                              {t.identifier}
                            </code>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Website (optional) */}
                    {showWebsite && (
                      <td className="px-5 py-4">
                        {t.websiteName ? (
                          <div>
                            <p className="font-medium text-slate-700">{t.websiteName}</p>
                            {t.websiteDomain && (
                              <p className="text-xs text-slate-400">{t.websiteDomain}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    )}

                    {/* Type */}
                    <td className="px-5 py-4">
                      <TypeBadge type={t.type} />
                    </td>

                    {/* Vendor */}
                    <td className="px-5 py-4">
                      {t.vendorName ? (
                        <span className="text-slate-700">{t.vendorName}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Purpose */}
                    <td className="px-5 py-4">
                      {t.purposeName ? (
                        <Badge variant="primary" size="sm">{t.purposeName}</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${
                          t.status === "active"  ? "bg-emerald-500" :
                          t.status === "blocked" ? "bg-rose-500"    : "bg-slate-300"
                        }`} />
                        <Badge
                          variant={
                            t.status === "active"  ? "success" :
                            t.status === "blocked" ? "danger"  : "neutral"
                          }
                          size="sm"
                        >
                          {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                        </Badge>
                      </div>
                    </td>

                    {/* Detection + essential flag */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <DetectionPill method={t.detectionMethod} />
                        {t.isEssential && (
                          <Badge variant="primary" size="sm">Essential</Badge>
                        )}
                      </div>
                    </td>

                    {/* Last seen */}
                    <td className="px-5 py-4 text-slate-500">
                      {t.lastSeenAt
                        ? t.lastSeenAt.toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })
                        : <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div className="border-t border-slate-100 px-5 py-3">
            <p className="text-xs text-slate-400">
              {filtered.length} tracker{filtered.length !== 1 ? "s" : ""}
              {filtered.length < trackers.length && ` (filtered from ${trackers.length})`}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
