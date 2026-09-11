"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
// Icons
// ---------------------------------------------------------------------------

function IconSearch() {
  return (
    <svg className="h-4 w-4 text-[var(--muted-foreground)]" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconEmpty() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      className="text-[var(--border)]">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4l2 2" />
    </svg>
  );
}

function IconClearFilters() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

function StatusDot({ status }: { status: string }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${
      status === "active" ? "bg-[var(--success)]" : "bg-[var(--border)]"
    }`} />
  );
}

// ---------------------------------------------------------------------------
// PurposeList
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

  // ── No data ────────────────────────────────────────────────────────────
  if (purposes.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--muted)]">
            <IconEmpty />
          </div>
          <div>
            <p className="text-base font-semibold text-[var(--foreground)]">No purposes yet</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Create your first purpose to start building consent policies.
            </p>
          </div>
          <Link
            href="/dashboard/purposes/new"
            className="btn btn-primary"
          >
            Create purpose
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
          <IconSearch />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, key, or description…"
          className="field-input pl-9"
        />
      </div>

      {/* No search results */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <IconEmpty />
            <p className="text-sm text-[var(--muted-foreground)]">
              No purposes match &ldquo;{query}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--muted-foreground)] shadow-sm transition hover:bg-[var(--muted)]"
            >
              <IconClearFilters />
              Clear search
            </button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <Card>
          <div className="table-scroll scrollbar-thin">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                  {["Name", "Key", "Status", "Required", "Created"].map((h) => (
                    <th key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((p) => (
                  <tr key={p.id} className="group transition-colors hover:bg-[var(--muted)]/80">
                    {/* Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2.5">
                        <StatusDot status={p.status} />
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                            <Link href={`/dashboard/purposes/${p.id}`}>{p.name}</Link>
                          </p>
                          {p.description && (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-[var(--muted-foreground)]">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Key */}
                    <td className="px-5 py-4">
                      <code className="rounded-lg bg-[var(--muted)] px-2 py-1 font-mono text-xs text-[var(--secondary-foreground)] group-hover:bg-[var(--info-soft)] group-hover:text-[var(--primary)] transition-colors">
                        {p.key}
                      </code>
                    </td>
                    {/* Status */}
                    <td className="px-5 py-4">
                      <Badge
                        variant={p.status === "active" ? "success" : "neutral"}
                        size="sm"
                      >
                        {p.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    {/* Required */}
                    <td className="px-5 py-4">
                      {p.isRequired ? (
                        <Badge variant="primary" size="sm">Required</Badge>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    {/* Created */}
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">
                      {p.createdAt.toLocaleDateString("en-GB", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
