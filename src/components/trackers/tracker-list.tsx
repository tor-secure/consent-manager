"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";

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
  category?: string | null;
  party?: string;
  cookieNames?: string[];
  storageTypes?: string[];
  duration?: string | null;
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconEmpty() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      className="text-[var(--border)]">
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
  cookie:      "bg-[var(--warning-soft)]  text-[var(--warning)]  ring-[color-mix(in_srgb,var(--warning)_22%,transparent)]",
  pixel:       "bg-[var(--info-soft)]    text-[var(--info)]    ring-[color-mix(in_srgb,var(--info)_22%,transparent)]",
  script:      "bg-[var(--info-soft)] text-[var(--purple)] ring-[color-mix(in_srgb,var(--purple)_22%,transparent)]",
  iframe:      "bg-[var(--info-soft)] text-[var(--primary)] ring-[color-mix(in_srgb,var(--primary)_22%,transparent)]",
  beacon:      "bg-[var(--danger-soft)] text-[var(--pink)] ring-[color-mix(in_srgb,var(--pink)_22%,transparent)]",
  fingerprint: "bg-[var(--danger-soft)]   text-[var(--danger)]   ring-[color-mix(in_srgb,var(--danger)_22%,transparent)]",
  storage:     "bg-[var(--success-soft)] text-[var(--teal)] ring-[color-mix(in_srgb,var(--teal)_22%,transparent)]",
  other:       "bg-[var(--secondary)] text-[var(--muted-foreground)]  ring-[var(--border)]",
};

const TYPE_DOTS: Record<string, string> = {
  cookie:      "bg-[var(--warning)]",
  pixel:       "bg-[var(--info)]",
  script:      "bg-[var(--purple)]",
  iframe:      "bg-[var(--primary)]",
  beacon:      "bg-[var(--pink)]",
  fingerprint: "bg-[var(--danger)]",
  storage:     "bg-[var(--teal)]",
  other:       "bg-[var(--muted-foreground)]",
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
    <span className="rounded-lg bg-[var(--secondary)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
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
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--muted)]">
            <IconEmpty />
          </div>
          <div>
            <p className="text-base font-semibold text-[var(--foreground)]">No trackers yet</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
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
        <div className="min-w-[220px] flex-1 max-w-sm">
          <SearchInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            placeholder="Search by name, domain, or vendor…"
            label="Search trackers"
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
                  ? "bg-[var(--foreground)] text-white shadow-sm"
                  : "bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--muted)]"
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
                    ? "bg-[var(--foreground)] text-white shadow-sm"
                    : "bg-[var(--card)] text-[var(--muted-foreground)] border border-[var(--border)] hover:bg-[var(--muted)]"
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${TYPE_DOTS[t] ?? "bg-[var(--muted-foreground)]"}`} />
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
            <p className="text-sm text-[var(--muted-foreground)]">No trackers match your filters.</p>
            <button
              type="button"
              onClick={() => { setQuery(""); setTypeFilter("all"); }}
              className="btn btn-outline btn-sm"
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
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
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
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((t) => (
                  <tr key={t.id} className="group transition-colors hover:bg-[var(--muted)]/80">

                    {/* Tracker name + domain + identifier */}
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        {/* Type-coloured dot tile */}
                        <div className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${TYPE_DOTS[t.type] ?? "bg-[var(--muted-foreground)]"}`} />
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                            {t.name}
                          </p>
                          {t.domain && (
                            <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">{t.domain}</p>
                          )}
                          {t.identifier && (
                            <code className="mt-0.5 block max-w-[200px] truncate rounded bg-[var(--secondary)] px-1 py-0.5 font-mono text-[10px] text-[var(--muted-foreground)] group-hover:bg-[var(--info-soft)] group-hover:text-[var(--primary)] transition-colors">
                              {t.identifier}
                            </code>
                          )}
                          {(t.category || t.party || t.cookieNames?.length) && (
                            <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">
                              {[t.category, t.party, t.cookieNames?.length
                                ? `${t.cookieNames.length} cookie pattern${t.cookieNames.length === 1 ? "" : "s"}`
                                : null]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Website (optional) */}
                    {showWebsite && (
                      <td className="px-5 py-4">
                        {t.websiteName ? (
                          <div>
                            <p className="font-medium text-[var(--foreground)]">{t.websiteName}</p>
                            {t.websiteDomain && (
                              <p className="text-xs text-[var(--muted-foreground)]">{t.websiteDomain}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">—</span>
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
                        <span className="text-[var(--foreground)]">{t.vendorName}</span>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>

                    {/* Purpose */}
                    <td className="px-5 py-4">
                      {t.purposeName ? (
                        <Badge variant="primary" size="sm">{t.purposeName}</Badge>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${
                          t.status === "active"  ? "bg-[var(--success)]" :
                          t.status === "blocked" ? "bg-[var(--danger)]"    : "bg-[var(--border)]"
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
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">
                      {t.lastSeenAt
                        ? t.lastSeenAt.toLocaleDateString("en-GB", {
                            day: "numeric", month: "short", year: "numeric",
                          })
                        : <span className="text-[var(--muted-foreground)]">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer count */}
          <div className="border-t border-[var(--border)] px-5 py-3">
            <p className="text-xs text-[var(--muted-foreground)]">
              {filtered.length} tracker{filtered.length !== 1 ? "s" : ""}
              {filtered.length < trackers.length && ` (filtered from ${trackers.length})`}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
