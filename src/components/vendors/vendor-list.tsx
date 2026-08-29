"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VendorRow = {
  id: string;
  key: string;
  name: string;
  domain: string | null;
  country: string | null;
  status: string;
  source: string;
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
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 00-4 0v2" />
    </svg>
  );
}

function IconClear() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Source badge — colour-coded by registry
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, "purple" | "primary" | "neutral"> = {
    iab:    "purple",
    google: "primary",
    custom: "neutral",
  };
  return (
    <Badge variant={map[source] ?? "neutral"} size="sm">
      {source.toUpperCase()}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Vendor initial avatar tile
// ---------------------------------------------------------------------------

function VendorAvatar({ name }: { name: string }) {
  const colors = [
    "bg-indigo-100 text-indigo-700",
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-semibold ${colors[idx]}`}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ---------------------------------------------------------------------------
// VendorList
// ---------------------------------------------------------------------------

export function VendorList({ vendors }: { vendors: VendorRow[] }) {
  const [query, setQuery] = useState("");

  const filtered =
    query.trim() === ""
      ? vendors
      : vendors.filter(
          (v) =>
            v.name.toLowerCase().includes(query.toLowerCase()) ||
            v.key.toLowerCase().includes(query.toLowerCase()) ||
            (v.domain ?? "").toLowerCase().includes(query.toLowerCase()),
        );

  // ── No data ────────────────────────────────────────────────────────────
  if (vendors.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50">
            <IconEmpty />
          </div>
          <div>
            <p className="text-base font-semibold text-slate-700">No vendors yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Add vendors to associate them with consent purposes.
            </p>
          </div>
          <Link
            href="/dashboard/vendors/new"
            className="inline-flex items-center gap-1.5 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            Create vendor
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
          placeholder="Search by name, domain, or key…"
          className="h-10 w-full rounded-2xl border border-slate-200 bg-white pl-9 pr-4 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition"
        />
      </div>

      {/* No search results */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <IconEmpty />
            <p className="text-sm text-slate-500">
              No vendors match &ldquo;{query}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              <IconClear />
              Clear search
            </button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {["Vendor", "Key", "Domain", "Country", "Source", "Status", "Added"].map((h) => (
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
                {filtered.map((v) => (
                  <tr key={v.id} className="group transition-colors hover:bg-slate-50/80">

                    {/* Vendor name + avatar */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <VendorAvatar name={v.name} />
                        <span className="font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {v.name}
                        </span>
                      </div>
                    </td>

                    {/* Key */}
                    <td className="px-5 py-4">
                      <code className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                        {v.key}
                      </code>
                    </td>

                    {/* Domain */}
                    <td className="px-5 py-4">
                      {v.domain ? (
                        <span className="text-slate-600">{v.domain}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Country */}
                    <td className="px-5 py-4">
                      {v.country ? (
                        <Badge variant="neutral" size="sm">{v.country}</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Source */}
                    <td className="px-5 py-4">
                      <SourceBadge source={v.source} />
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${
                          v.status === "active" ? "bg-emerald-500" : "bg-slate-300"
                        }`} />
                        <Badge
                          variant={v.status === "active" ? "success" : "neutral"}
                          size="sm"
                        >
                          {v.status === "active" ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </td>

                    {/* Added */}
                    <td className="px-5 py-4 text-slate-500">
                      {v.createdAt.toLocaleDateString("en-GB", {
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
