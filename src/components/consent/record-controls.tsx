"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { DateField } from "@/components/dashboard/dashboard-controls";
import { useConsentRecordMotion } from "@/components/consent/record-fade";
import { Select } from "@/components/ui/select";
import { recordListHref, type RecordListQuery } from "@/lib/consent/record-list-params";

export function ConsentRecordControls({
  query,
  websites,
  policies,
  jurisdictions,
  exportHref,
}: {
  query: RecordListQuery;
  websites: { id: string; name: string; domain: string }[];
  policies: { id: string; name: string }[];
  jurisdictions: string[];
  exportHref: string;
}) {
  const router = useRouter();
  const motion = useConsentRecordMotion();
  const [, localStart] = useTransition();
  const startTransition = motion?.startTransition ?? localStart;
  const [search, setSearch] = useState(query.q);
  useEffect(() => setSearch(query.q), [query.q]);

  function go(overrides: Partial<RecordListQuery>) {
    const href = recordListHref(query, { ...overrides, page: 1 });
    startTransition(() => router.push(href));
  }

  const filtered = Boolean(query.q || query.status || query.websiteId || query.policyId || query.jurisdiction || query.source || query.from || query.to);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        go({ q: search.trim() });
      }}
    >
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 xl:grid-cols-12">
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-[var(--muted-foreground)] sm:col-span-2 xl:col-span-3">
          <span>Search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Consent ID or website"
            aria-label="Search by consent ID or website"
            className="field-input is-sm w-full"
          />
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-[var(--muted-foreground)] xl:col-span-3">
          <span>Website</span>
          <Select
            aria-label="Filter by website"
            size="sm"
            searchable={websites.length > 8}
            className="w-full"
            value={query.websiteId}
            onChange={(event) => go({ websiteId: event.target.value })}
          >
            <option value="">All websites</option>
            {websites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name} ({site.domain})
              </option>
            ))}
          </Select>
        </label>
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-[var(--muted-foreground)] xl:col-span-3">
          <span>Status</span>
          <Select
            aria-label="Filter by status"
            size="sm"
            searchable={false}
            className="w-full"
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
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-[var(--muted-foreground)] xl:col-span-3">
          <span>Policy</span>
          <Select
            aria-label="Filter by policy"
            size="sm"
            searchable={policies.length > 8}
            className="w-full"
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
        <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-[var(--muted-foreground)] xl:col-span-3">
          <span>Jurisdiction</span>
          <Select
            aria-label="Filter by jurisdiction"
            size="sm"
            searchable={jurisdictions.length > 8}
            className="w-full"
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
        <DateField className="min-w-0 w-full xl:col-span-3" label="From" value={query.from} max={query.to || undefined} onChange={(from) => go({ from })} />
        <DateField className="min-w-0 w-full xl:col-span-3" label="To" value={query.to} min={query.from || undefined} onChange={(to) => go({ to })} />
        <div className="flex items-center justify-end gap-2 sm:col-span-1 xl:col-span-3">
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
          <a
            href={exportHref}
            className="btn btn-secondary btn-sm"
            title="Downloads the current filters, up to 5,000 records. Visitor identifiers are left out."
          >
            Export CSV
          </a>
          {filtered ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => startTransition(() => router.push("/dashboard/consent"))}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
