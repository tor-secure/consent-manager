"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DateField } from "@/components/dashboard/dashboard-controls";
import { Select } from "@/components/ui/select";
import { recordListHref, type RecordListQuery } from "@/lib/consent/record-list-params";

export function ConsentRecordControls({
  query,
  policies,
  jurisdictions,
  exportHref,
}: {
  query: RecordListQuery;
  policies: { id: string; name: string }[];
  jurisdictions: string[];
  exportHref: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q);
  useEffect(() => setSearch(query.q), [query.q]);

  function go(overrides: Partial<RecordListQuery>) {
    const href = recordListHref(query, { ...overrides, page: 1 });
    startTransition(() => router.push(href));
  }

  return (
    <form
      className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-4 ${isPending ? "opacity-70" : ""}`}
      onSubmit={(event) => {
        event.preventDefault();
        go({ q: search.trim() });
      }}
    >
      <label className="min-w-0 sm:col-span-2">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">Search</span>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Consent ID or website"
          aria-label="Search by consent ID or website"
          className="field-input is-sm mt-1 w-full"
        />
      </label>
      <label className="min-w-0">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">Status</span>
        <Select
          aria-label="Filter by status"
          size="sm"
          searchable={false}
          className="mt-1 w-full"
          value={query.status}
          onChange={(event) => go({ status: event.target.value as RecordListQuery["status"] })}
        >
          <option value="">All statuses</option>
          <option value="accepted">Accepted</option>
          <option value="partial">Partially Accepted</option>
          <option value="rejected">Denied</option>
          <option value="withdrawn">Withdrawn</option>
          <option value="expired">Expired</option>
        </Select>
      </label>
      <label className="min-w-0">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">Policy</span>
        <Select
          aria-label="Filter by policy"
          size="sm"
          searchable={policies.length > 8}
          className="mt-1 w-full"
          value={query.policyId}
          onChange={(event) => go({ policyId: event.target.value })}
        >
          <option value="">All policies</option>
          {policies.map((policy) => (
            <option key={policy.id} value={policy.id}>
              {policy.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="min-w-0">
        <span className="text-xs font-medium text-[var(--muted-foreground)]">Jurisdiction</span>
        <Select
          aria-label="Filter by jurisdiction"
          size="sm"
          searchable={jurisdictions.length > 8}
          className="mt-1 w-full"
          value={query.jurisdiction}
          onChange={(event) => go({ jurisdiction: event.target.value })}
        >
          <option value="">All jurisdictions</option>
          <option value="unknown">Unknown</option>
          {jurisdictions.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
      </label>
      <div className="min-w-0">
        <DateField label="From" value={query.from} max={query.to || undefined} onChange={(from) => go({ from })} />
      </div>
      <div className="min-w-0">
        <DateField label="To" value={query.to} min={query.from || undefined} onChange={(to) => go({ to })} />
      </div>
      <div className="flex items-end gap-2 sm:col-span-2">
        <button type="submit" className="btn btn-secondary h-9 px-3 text-sm">
          Search
        </button>
        <a href={exportHref} className="btn btn-secondary h-9 px-3 text-sm" title="Downloads the current filters, up to 5,000 records. Visitor identifiers are left out.">
          Export CSV
        </a>
      </div>
    </form>
  );
}
