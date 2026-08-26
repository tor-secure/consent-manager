"use client";

import Link from "next/link";
import { useState } from "react";

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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-green-50 text-green-700 ring-1 ring-green-600/20",
    inactive: "bg-neutral-100 text-neutral-600 ring-1 ring-neutral-500/20",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? styles.inactive}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    custom: "bg-neutral-100 text-neutral-600",
    iab: "bg-purple-50 text-purple-700",
    google: "bg-blue-50 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[source] ?? styles.custom}`}>
      {source.toUpperCase()}
    </span>
  );
}

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

  return (
    <div>
      {vendors.length > 0 && (
        <div className="relative mb-6 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendors…"
            className="w-full rounded-md border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>
      )}

      {vendors.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="text-sm font-medium text-neutral-600">No vendors yet</p>
          <p className="mt-1 text-sm text-neutral-400">
            Add vendors to associate them with consent purposes.
          </p>
          <Link
            href="/dashboard/vendors/new"
            className="mt-5 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            Create vendor
          </Link>
        </div>
      )}

      {vendors.length > 0 && filtered.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-neutral-500">No vendors match &ldquo;{query}&rdquo;</p>
          <button type="button" onClick={() => setQuery("")} className="mt-3 text-sm text-neutral-900 underline underline-offset-2">
            Clear search
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="min-w-full divide-y text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Key</th>
                <th className="px-5 py-3">Domain</th>
                <th className="px-5 py-3">Country</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((v) => (
                <tr key={v.id} className="transition hover:bg-neutral-50">
                  <td className="px-5 py-3 font-medium text-neutral-900">{v.name}</td>
                  <td className="px-5 py-3">
                    <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">{v.key}</code>
                  </td>
                  <td className="px-5 py-3 text-neutral-500">{v.domain ?? "—"}</td>
                  <td className="px-5 py-3 text-neutral-500">{v.country ?? "—"}</td>
                  <td className="px-5 py-3"><SourceBadge source={v.source} /></td>
                  <td className="px-5 py-3"><StatusBadge status={v.status} /></td>
                  <td className="px-5 py-3 text-neutral-500">
                    {v.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
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
