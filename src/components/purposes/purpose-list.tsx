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
      status === "active" ? "bg-emerald-500" : "bg-slate-300"
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
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
            <IconEmpty />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-700">No purposes yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Create your first purpose to start building consent policies.
            </p>
          </div>
          <Link
            href="/dashboard/purposes/new"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
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
          className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition"
        />
      </div>

      {/* No search results */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <IconEmpty />
            <p className="text-sm text-slate-500">
              No purposes match &ldquo;{query}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
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
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {["Name", "Key", "Status", "Required", "Created"].map((h) => (
                    <th key={h}
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="group transition-colors hover:bg-slate-50/80">
                    {/* Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-2.5">
                        <StatusDot status={p.status} />
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {p.name}
                          </p>
                          {p.description && (
                            <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">
                              {p.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Key */}
                    <td className="px-5 py-4">
                      <code className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
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
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    {/* Created */}
                    <td className="px-5 py-4 text-slate-500">
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
