"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";

import { DateField } from "@/components/dashboard/dashboard-controls";
import { useConsentRecordMotion } from "@/components/consent/record-fade";
import { PieChart } from "@/components/charts/pie-chart";
import { SimpleLineChart } from "@/components/charts/simple-line-chart";
import { Select } from "@/components/ui/select";
import { notify } from "@/components/feedback/notify";
import type { ConsentListRow, ConsentRecordsDashboardStats } from "@/lib/consent/record-list";
import {
  displayConsentStatus,
  isUnknownJurisdiction,
  RECORD_PAGE_SIZES,
  recordExportHref,
  recordListHref,
  type RecordListQuery,
} from "@/lib/consent/record-list-params";

type WebsiteOption = { id: string; name: string; domain: string };
type PolicyOption = { id: string; name: string };

function fmtDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "—";
  return value.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtShort(date: Date | string | null | undefined) {
  if (!date) return "—";
  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "—";
  return value.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function share(part: number, total: number) {
  if (total <= 0) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

function Trend({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-emerald-600" : "text-rose-600"}`}>
      <span aria-hidden="true">{up ? "↑" : "↓"}</span>
      {Math.abs(value)}%
    </span>
  );
}

function StatusPill({ record }: { record: ConsentListRow }) {
  const shown = displayConsentStatus(record);
  const styles: Record<string, string> = {
    accepted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    rejected: "bg-rose-50 text-rose-700 ring-rose-200",
    withdrawn: "bg-violet-50 text-violet-700 ring-violet-200",
    expired: "bg-amber-50 text-amber-700 ring-amber-200",
    partial: "bg-sky-50 text-sky-700 ring-sky-200",
  };
  const label =
    shown.key === "rejected"
      ? "Rejected"
      : shown.key === "expired"
        ? "Pending"
        : shown.key === "partial"
          ? "Partial"
          : shown.label;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${styles[shown.key] ?? "bg-slate-50 text-slate-600 ring-slate-200"}`}>
      {label}
    </span>
  );
}

function SourcePill({ source }: { source: string }) {
  const key = (source || "web").toLowerCase();
  const styles: Record<string, string> = {
    web: "bg-slate-100 text-slate-700",
    sdk: "bg-sky-50 text-sky-700",
    api: "bg-indigo-50 text-indigo-700",
    mobile: "bg-teal-50 text-teal-700",
  };
  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize ${styles[key] ?? "bg-slate-100 text-slate-700"}`}>
      {key}
    </span>
  );
}

function SoftCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function ProgressRows({
  rows,
}: {
  rows: Array<{ label: string; value: number; total: number; color: string }>;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No data yet</p>;
  }
  return (
    <ul className="space-y-3">
      {rows.map((row) => {
        const pct = row.total > 0 ? Math.round((row.value / row.total) * 1000) / 10 : 0;
        return (
          <li key={row.label}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-slate-700">{row.label}</span>
              <span className="tabular-nums text-slate-500">{pct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: row.color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function pageItems(current: number, count: number) {
  if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1);
  const wanted = [1, count, current - 1, current, current + 1].filter((page) => page >= 1 && page <= count);
  const pages = [...new Set(wanted)].sort((a, b) => a - b);
  const items: Array<number | "gap"> = [];
  for (const page of pages) {
    const previous = items.at(-1);
    if (typeof previous === "number" && page - previous > 1) items.push("gap");
    items.push(page);
  }
  return items;
}

function IconRefresh() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function IconExport() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconFilter() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconDoc() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IconLogs() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

const STAT_META = [
  { key: "total" as const, label: "Total Records", iconBg: "bg-slate-100 text-slate-700", tip: null },
  { key: "accepted" as const, label: "Accepted", iconBg: "bg-emerald-50 text-emerald-600", tip: "of total" },
  { key: "rejected" as const, label: "Rejected", iconBg: "bg-rose-50 text-rose-600", tip: "of total" },
  { key: "withdrawn" as const, label: "Withdrawn", iconBg: "bg-violet-50 text-violet-600", tip: "of total" },
  { key: "pending" as const, label: "Pending", iconBg: "bg-amber-50 text-amber-600", tip: "of total" },
  { key: "syncedToday" as const, label: "Synced Today", iconBg: "bg-sky-50 text-sky-600", tip: "sync" },
];

export function ConsentRecordsWorkspace({
  query,
  records,
  filteredTotal,
  stats,
  websites,
  policies,
  jurisdictions,
}: {
  query: RecordListQuery;
  records: ConsentListRow[];
  filteredTotal: number;
  stats: ConsentRecordsDashboardStats;
  websites: WebsiteOption[];
  policies: PolicyOption[];
  jurisdictions: string[];
}) {
  const router = useRouter();
  const motion = useConsentRecordMotion();
  const [, localStart] = useTransition();
  const startTransition = motion?.startTransition ?? localStart;
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [search, setSearch] = useState(query.q);
  const [draft, setDraft] = useState({
    websiteId: query.websiteId,
    policyId: query.policyId,
    status: query.status,
    jurisdiction: query.jurisdiction,
    source: query.source,
    from: query.from,
    to: query.to,
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => setSearch(query.q), [query.q]);
  useEffect(() => {
    setDraft({
      websiteId: query.websiteId,
      policyId: query.policyId,
      status: query.status,
      jurisdiction: query.jurisdiction,
      source: query.source,
      from: query.from,
      to: query.to,
    });
  }, [query]);

  const pageCount = Math.max(1, Math.ceil(filteredTotal / query.size));
  const pageNumber = Math.min(query.page, pageCount);
  const rangeStart = filteredTotal === 0 ? 0 : (query.page - 1) * query.size + 1;
  const rangeEnd = Math.min(filteredTotal, query.page * query.size);
  const exportHref = recordExportHref(query);
  const activeFilterCount = [
    query.q,
    query.status,
    query.websiteId,
    query.policyId,
    query.jurisdiction,
    query.source,
    query.from,
    query.to,
  ].filter(Boolean).length;

  const sourceOptions = [...new Set(stats.bySource.map((row) => row.source).filter(Boolean))];

  const trendPoints = useMemo(
    () =>
      stats.daily.map((row) => ({
        label: row.day.slice(5),
        values: { volume: row.count },
      })),
    [stats.daily],
  );

  const purposeTotal = Math.max(1, stats.topPurposes.reduce((sum, row) => sum + row.count, 0));
  const sourceTotal = Math.max(1, stats.bySource.reduce((sum, row) => sum + row.count, 0));
  const sourceColors = ["#0F172A", "#2563EB", "#6366F1", "#14B8A6", "#94A3B8"];
  const purposeColors = ["#0F172A", "#2563EB", "#8B5CF6", "#10B981", "#F59E0B"];

  function go(overrides: Partial<RecordListQuery>) {
    startTransition(() => router.push(recordListHref(query, { ...overrides, page: 1 })));
  }

  function applyFilters() {
    go({
      q: search.trim(),
      websiteId: draft.websiteId,
      policyId: draft.policyId,
      status: draft.status,
      jurisdiction: draft.jurisdiction,
      source: draft.source,
      from: draft.from,
      to: draft.to,
    });
  }

  function resetFilters() {
    setSearch("");
    setDraft({
      websiteId: "",
      policyId: "",
      status: "",
      jurisdiction: "",
      source: "",
      from: "",
      to: "",
    });
    startTransition(() => router.push("/dashboard/consent"));
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(records.map((row) => row.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function copyId(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notify.success("Consent ID copied");
    } catch {
      notify.error("Unable to copy consent ID");
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <Link href="/dashboard/consent-management" className="hover:text-slate-800">
              Consent Management
            </Link>
            <span className="text-slate-300">›</span>
            <span className="font-medium text-slate-800">Consent Records</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Consent Records</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            View and manage all consent records collected across your websites and applications.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => startTransition(() => router.refresh())}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <IconRefresh />
            Refresh
          </button>
          <a
            href={exportHref}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            title="Downloads the current filters, up to 5,000 records."
          >
            <IconExport />
            Export
          </a>
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
          >
            <IconFilter />
            Filters
            {activeFilterCount > 0 ? (
              <span className="rounded-full bg-white/20 px-1.5 text-[11px]">{activeFilterCount}</span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {STAT_META.map((meta) => {
          const value = stats[meta.key];
          const trend = stats.trends[meta.key];
          return (
            <div
              key={meta.key}
              className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{meta.label}</p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">
                    {value.toLocaleString()}
                  </p>
                </div>
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${meta.iconBg}`}>
                  <IconFilter />
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Trend value={trend} />
                {meta.tip === "of total" ? (
                  <span className="text-xs text-slate-500">{share(value, stats.total)} of total</span>
                ) : null}
                {meta.tip === "sync" ? (
                  <span className="text-xs text-slate-500">
                    Last sync {stats.lastSyncedAt ? fmtDateTime(stats.lastSyncedAt) : "—"}
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      {filtersOpen ? (
        <section className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              applyFilters();
            }}
            className="space-y-4"
          >
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600">
                Website
                <Select
                  size="sm"
                  className="w-full"
                  value={draft.websiteId}
                  onChange={(event) => setDraft((prev) => ({ ...prev, websiteId: event.target.value }))}
                >
                  <option value="">All websites</option>
                  {websites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name} ({site.domain})
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600">
                Policy
                <Select
                  size="sm"
                  className="w-full"
                  value={draft.policyId}
                  onChange={(event) => setDraft((prev) => ({ ...prev, policyId: event.target.value }))}
                >
                  <option value="">All policies</option>
                  {policies.map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      {policy.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600">
                Status
                <Select
                  size="sm"
                  className="w-full"
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      status: event.target.value as RecordListQuery["status"],
                    }))
                  }
                >
                  <option value="">All statuses</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="withdrawn">Withdrawn</option>
                  <option value="partial">Partial</option>
                  <option value="expired">Expired</option>
                </Select>
              </label>
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600">
                Region / Country
                <Select
                  size="sm"
                  className="w-full"
                  value={draft.jurisdiction}
                  onChange={(event) => setDraft((prev) => ({ ...prev, jurisdiction: event.target.value }))}
                >
                  <option value="">All regions</option>
                  <option value="unknown">Unknown</option>
                  {jurisdictions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600">
                Consent Source
                <Select
                  size="sm"
                  className="w-full"
                  value={draft.source}
                  onChange={(event) => setDraft((prev) => ({ ...prev, source: event.target.value }))}
                >
                  <option value="">All sources</option>
                  {sourceOptions.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </Select>
              </label>
              <DateField
                className="min-w-0 w-full"
                label="From"
                value={draft.from}
                max={draft.to || undefined}
                onChange={(from) => setDraft((prev) => ({ ...prev, from }))}
              />
              <DateField
                className="min-w-0 w-full"
                label="To"
                value={draft.to}
                min={draft.from || undefined}
                onChange={(to) => setDraft((prev) => ({ ...prev, to }))}
              />
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-medium text-slate-600">
                Search
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by user, email, device or consent ID..."
                  className="field-input is-sm w-full"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Apply filters
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {/* Main + sidebar */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold tabular-nums text-slate-900">
                {filteredTotal === 0 ? "0" : `${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()}`}
              </span>{" "}
              of {filteredTotal.toLocaleString()} records
              {selected.size > 0 ? (
                <span className="ml-2 text-xs text-slate-500">· {selected.size} selected</span>
              ) : null}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-500">
                Rows per page
                <Select
                  size="sm"
                  className="w-[4.5rem]"
                  value={String(query.size)}
                  onChange={(event) =>
                    go({ size: Number(event.target.value) as (typeof RECORD_PAGE_SIZES)[number] })
                  }
                >
                  {RECORD_PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </Select>
              </label>
              <nav aria-label="Record pages" className="flex items-center gap-1">
                {query.page > 1 ? (
                  <Link
                    href={recordListHref(query, { page: query.page - 1 })}
                    className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Prev
                  </Link>
                ) : (
                  <span className="rounded-md border border-slate-100 px-2.5 py-1.5 text-xs text-slate-300">Prev</span>
                )}
                {pageItems(pageNumber, pageCount).map((item, index) =>
                  item === "gap" ? (
                    <span key={`gap-${index}`} className="px-1 text-xs text-slate-400">
                      …
                    </span>
                  ) : item === pageNumber ? (
                    <span
                      key={item}
                      className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-slate-900 px-2 text-xs font-semibold text-white"
                    >
                      {item}
                    </span>
                  ) : (
                    <Link
                      key={item}
                      href={recordListHref(query, { page: item })}
                      className="inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {item}
                    </Link>
                  ),
                )}
                {query.page < pageCount ? (
                  <Link
                    href={recordListHref(query, { page: query.page + 1 })}
                    className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Next
                  </Link>
                ) : (
                  <span className="rounded-md border border-slate-100 px-2.5 py-1.5 text-xs text-slate-300">Next</span>
                )}
              </nav>
            </div>
          </div>

          {records.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">
              No records match these filters.{" "}
              <button type="button" onClick={resetFilters} className="font-medium text-blue-600 hover:underline">
                Clear filters
              </button>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[72rem] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all records on this page"
                        checked={records.length > 0 && selected.size === records.length}
                        onChange={(event) => toggleAll(event.target.checked)}
                      />
                    </th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">User / Identifier</th>
                    <th className="px-3 py-3 font-semibold">Website</th>
                    <th className="px-3 py-3 font-semibold">Purposes</th>
                    <th className="px-3 py-3 font-semibold">Consent ID</th>
                    <th className="px-3 py-3 font-semibold">Source</th>
                    <th className="px-3 py-3 font-semibold">Region</th>
                    <th className="px-3 py-3 font-semibold">Consent Date</th>
                    <th className="px-3 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {records.map((record) => {
                    const domain = record.websiteDomain.includes(".deleted.")
                      ? "Removed site"
                      : record.websiteDomain;
                    const detailsHref = `/dashboard/consent/${encodeURIComponent(record.consentId)}/details`;
                    const proofHref = `/dashboard/consent/${encodeURIComponent(record.consentId)}`;
                    const purposes = record.purposes ?? [];
                    const firstPurpose = purposes.find((p) => p.granted) ?? purposes[0];
                    const extra = Math.max(0, purposes.filter((p) => p.granted).length - 1);
                    return (
                      <tr key={record.id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${record.consentId}`}
                            checked={selected.has(record.id)}
                            onChange={(event) => toggleOne(record.id, event.target.checked)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill record={record} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {record.visitorId || "Anonymous visitor"}
                            </p>
                            <p className="truncate text-xs text-slate-500">
                              {record.visitorId ? `ID ${record.visitorId.slice(0, 12)}…` : "No user ID stored"}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <Link
                            href={`/dashboard/websites/${record.websiteId}`}
                            className="block truncate font-medium text-slate-900 hover:text-blue-600"
                          >
                            {record.websiteName}
                          </Link>
                          <p className="truncate text-xs text-slate-500">{domain}</p>
                        </td>
                        <td className="px-3 py-3">
                          {firstPurpose ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {firstPurpose.name}
                              {extra > 0 ? <span className="text-slate-400">+{extra}</span> : null}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <Link
                              href={detailsHref}
                              className="max-w-[8rem] truncate font-mono text-xs text-slate-700 hover:text-blue-600"
                              title={record.consentId}
                            >
                              {record.consentId}
                            </Link>
                            <button
                              type="button"
                              onClick={() => void copyId(record.consentId)}
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              aria-label="Copy consent ID"
                            >
                              <IconCopy />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <SourcePill source={record.source} />
                        </td>
                        <td className="px-3 py-3">
                          {isUnknownJurisdiction(record.jurisdiction) ? (
                            <span className="text-xs text-amber-700">Unknown</span>
                          ) : (
                            <span className="text-xs font-semibold uppercase text-slate-700">
                              {record.jurisdiction}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <p className="whitespace-nowrap text-xs text-slate-700">{fmtDateTime(record.consentedAt)}</p>
                          <p className="mt-0.5 text-[11px] text-slate-400">
                            Updated {fmtShort(record.withdrawnAt ?? record.consentedAt)}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <Link
                              href={detailsHref}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              title="View details"
                            >
                              <IconEye />
                            </Link>
                            <Link
                              href={proofHref}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              title="Download proof"
                            >
                              <IconDoc />
                            </Link>
                            <Link
                              href={detailsHref}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                              title="View logs"
                            >
                              <IconLogs />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <SoftCard
            title="Consent Trends"
            action={<span className="text-[11px] font-medium text-slate-500">Last 30 days</span>}
          >
            <SimpleLineChart
              points={trendPoints}
              series={[{ key: "volume", label: "Records", color: "#2563EB" }]}
              label="Consent volume over the last 30 days"
              emptyTitle="No trend data"
              emptyDescription="Records will appear here after visitors make choices."
            />
          </SoftCard>

          <SoftCard title="Consent by Status">
            <PieChart
              slices={stats.byStatus.map((row) => ({
                label: row.label,
                value: row.value,
                color: row.color,
              }))}
              label="Consent records by status"
              emptyTitle="No status split"
              emptyDescription="Status distribution appears once records exist."
              centerLabel="records"
              legend="row"
              variant="donut"
            />
          </SoftCard>

          <SoftCard title="Top Purposes">
            <ProgressRows
              rows={stats.topPurposes.map((row, index) => ({
                label: row.name,
                value: row.count,
                total: purposeTotal,
                color: purposeColors[index % purposeColors.length],
              }))}
            />
          </SoftCard>

          <SoftCard title="Consent Sources">
            <ProgressRows
              rows={stats.bySource.map((row, index) => ({
                label: row.source,
                value: row.count,
                total: sourceTotal,
                color: sourceColors[index % sourceColors.length],
              }))}
            />
          </SoftCard>
        </aside>
      </div>
    </div>
  );
}
