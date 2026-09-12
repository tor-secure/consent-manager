"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { IconText } from "@/components/ui/icon-text";
import { SearchInput } from "@/components/ui/search-input";

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
  role?: string | null;
  dpaStatus?: string | null;
  createdAt: Date;
};

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconEmpty() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
      className="text-[var(--border)]">
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

function vendorAvatarClass(name: string) {
  const colors = [
    "bg-[var(--info-soft)] text-[var(--primary)]",
    "bg-[var(--info-soft)] text-[var(--purple)]",
    "bg-[var(--info-soft)] text-[var(--info)]",
    "bg-[var(--success-soft)] text-[var(--success)]",
    "bg-[var(--danger-soft)] text-[var(--danger)]",
    "bg-[var(--warning-soft)] text-[var(--warning)]",
  ];
  return `text-xs font-semibold ${colors[name.charCodeAt(0) % colors.length]}`;
}

// ---------------------------------------------------------------------------
// VendorList
// ---------------------------------------------------------------------------

function isUnknownRole(role: string | null | undefined) {
  return !role || role === "unknown";
}

export function VendorList({ vendors }: { vendors: VendorRow[] }) {
  const [query, setQuery] = useState("");
  const unknownRoleCount = vendors.filter((v) => isUnknownRole(v.role)).length;

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
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--muted)]">
            <IconEmpty />
          </div>
          <div>
            <p className="text-base font-semibold text-[var(--foreground)]">No vendors yet</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Add vendors to associate them with consent purposes.
            </p>
          </div>
          <Link
            href="/dashboard/vendors/new"
            className="btn btn-primary"
          >
            Create vendor
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {unknownRoleCount > 0 ? (
        <div className="rounded-2xl border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]">
          {unknownRoleCount === 1
            ? "1 vendor has no role. Open it, set Role, and save — policies that use it cannot publish until then."
            : `${unknownRoleCount} vendors have no role. Open each one, set Role, and save — policies that use them cannot publish until then.`}
        </div>
      ) : null}

      {/* Search bar */}
      <div className="max-w-sm">
        <SearchInput
          id="vendor-search"
          label="Search vendors"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder="Search by name, domain, or key…"
        />
      </div>

      {/* No search results */}
      {filtered.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <IconEmpty />
            <p className="text-sm text-[var(--muted-foreground)]">
              No vendors match &ldquo;{query}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="btn btn-outline btn-sm"
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
          <div className="table-scroll scrollbar-thin">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--muted)]/60">
                  {["Vendor", "Key", "Domain", "Country", "Role", "DPA", "Source", "Status", "Added"].map((h) => (
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
                {filtered.map((v) => (
                  <tr key={v.id} className="group transition-colors hover:bg-[var(--muted)]/80">

                    {/* Vendor name + avatar */}
                    <td className="px-5 py-4">
                      <IconText
                        size="sm"
                        icon={v.name.charAt(0).toUpperCase()}
                        iconClassName={vendorAvatarClass(v.name)}
                        title={
                          <Link
                            href={`/dashboard/vendors/${v.id}`}
                            className="font-medium leading-snug text-[var(--foreground)] transition-colors group-hover:text-[var(--primary)]"
                          >
                            {v.name}
                          </Link>
                        }
                      />
                    </td>

                    {/* Key */}
                    <td className="px-5 py-4">
                      <code className="rounded-lg bg-[var(--secondary)] px-2 py-1 font-mono text-xs text-[var(--muted-foreground)] group-hover:bg-[var(--info-soft)] group-hover:text-[var(--primary)] transition-colors">
                        {v.key}
                      </code>
                    </td>

                    {/* Domain */}
                    <td className="px-5 py-4">
                      {v.domain ? (
                        <span className="text-[var(--muted-foreground)]">{v.domain}</span>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>

                    {/* Country */}
                    <td className="px-5 py-4">
                      {v.country ? (
                        <Badge variant="neutral" size="sm">{v.country}</Badge>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>

                    <td className="px-5 py-4 capitalize">
                      {isUnknownRole(v.role) ? (
                        <Link
                          href={`/dashboard/vendors/${v.id}`}
                          className="rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-xs font-medium text-[var(--warning)] hover:bg-[var(--warning-soft)]"
                        >
                          Set role
                        </Link>
                      ) : (
                        <span className="text-[var(--muted-foreground)]">{(v.role ?? "").replaceAll("_", " ")}</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-[var(--muted-foreground)] capitalize">{(v.dpaStatus ?? "not_configured").replaceAll("_", " ")}</td>

                    {/* Source */}
                    <td className="px-5 py-4">
                      <SourceBadge source={v.source} />
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${
                          v.status === "active" ? "bg-[var(--success)]" : "bg-[var(--border)]"
                        }`} />
                        <Badge
                          variant={v.status === "active" ? "success" : "neutral"}
                          size="sm"
                        >
                          {v.status === "active" ? "Active" : v.status === "archived" ? "Archived" : "Inactive"}
                        </Badge>
                      </div>
                    </td>

                    {/* Added */}
                    <td className="px-5 py-4 text-[var(--muted-foreground)]">
                      {new Date(v.createdAt).toLocaleDateString("en-GB", {
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
