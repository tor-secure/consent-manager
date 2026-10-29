"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Select } from "@/components/ui/select";
import { VendorLogo } from "@/components/vendors/vendor-logo";
import type { VendorRow } from "@/components/vendors/vendor-list";

export type VendorWorkspaceRow = VendorRow & {
  description?: string | null;
  updatedAt?: Date | string | null;
  purposes: string[];
  cookieCount: number;
  category: string;
};

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7.5 2v11M2 7.5h11" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function IconActive() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconInactive() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
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

function IconExternal() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function purposeTone(label: string) {
  const key = label.toLowerCase();
  if (key.includes("analytic")) return "bg-sky-50 text-sky-700 ring-sky-200";
  if (key.includes("advert") || key.includes("market")) return "bg-violet-50 text-violet-700 ring-violet-200";
  if (key.includes("function") || key.includes("prefer")) return "bg-teal-50 text-teal-700 ring-teal-200";
  if (key.includes("necess") || key.includes("essential")) return "bg-slate-100 text-slate-700 ring-slate-200";
  return "bg-indigo-50 text-indigo-700 ring-indigo-200";
}

function statusMeta(status: string) {
  const key = status.toLowerCase();
  if (key === "active") return { label: "Active", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" };
  if (key === "pending" || key === "pending_review" || key === "review") {
    return { label: "Pending", tone: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" };
  }
  return { label: key === "archived" ? "Inactive" : "Inactive", tone: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" };
}

function isUnknownRole(role: string | null | undefined) {
  return !role || role === "unknown";
}

function fmtDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function domainHref(domain: string) {
  return domain.startsWith("http") ? domain : `https://${domain}`;
}

const PAGE_SIZES = [10, 25, 50] as const;

function pageItems(current: number, count: number) {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const wanted = [1, count, current - 1, current, current + 1].filter((p) => p >= 1 && p <= count);
  const pages = [...new Set(wanted)].sort((a, b) => a - b);
  const items: Array<number | "gap"> = [];
  for (const page of pages) {
    const previous = items.at(-1);
    if (typeof previous === "number" && page - previous > 1) items.push("gap");
    items.push(page);
  }
  return items;
}

export function VendorsWorkspace({ vendors }: { vendors: VendorWorkspaceRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "pending" | "inactive">("all");
  const [purpose, setPurpose] = useState("all");
  const [category, setCategory] = useState("all");
  const [region, setRegion] = useState("all");
  const [moreOpen, setMoreOpen] = useState(false);
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const purposeOptions = useMemo(
    () => [...new Set(vendors.flatMap((v) => v.purposes))].sort((a, b) => a.localeCompare(b)),
    [vendors],
  );
  const categoryOptions = useMemo(
    () => [...new Set(vendors.map((v) => v.category).filter(Boolean))].sort(),
    [vendors],
  );
  const regionOptions = useMemo(
    () => [...new Set(vendors.map((v) => v.country).filter(Boolean) as string[])].sort(),
    [vendors],
  );
  const sourceOptions = useMemo(
    () => [...new Set(vendors.map((v) => v.source).filter(Boolean))].sort(),
    [vendors],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vendors.filter((v) => {
      const meta = statusMeta(v.status);
      if (status === "active" && meta.label !== "Active") return false;
      if (status === "pending" && meta.label !== "Pending") return false;
      if (status === "inactive" && meta.label !== "Inactive") return false;
      if (purpose !== "all" && !v.purposes.includes(purpose)) return false;
      if (category !== "all" && v.category !== category) return false;
      if (region !== "all" && (v.country ?? "") !== region) return false;
      if (source !== "all" && v.source !== source) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.key.toLowerCase().includes(q) ||
        (v.domain ?? "").toLowerCase().includes(q) ||
        v.purposes.some((p) => p.toLowerCase().includes(q)) ||
        (v.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [vendors, query, status, purpose, category, region, source]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(filtered.length, safePage * pageSize);

  const total = vendors.length;
  const active = vendors.filter((v) => statusMeta(v.status).label === "Active").length;
  const pending = vendors.filter((v) => statusMeta(v.status).label === "Pending").length;
  const inactive = vendors.filter((v) => statusMeta(v.status).label === "Inactive").length;
  const unknownRoleCount = vendors.filter((v) => isUnknownRole(v.role)).length;

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(pageRows.map((row) => row.id)) : new Set());
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  if (vendors.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <p className="text-base font-semibold text-slate-900">No vendors yet</p>
        <p className="mt-1 text-sm text-slate-500">Add vendors to associate them with consent purposes.</p>
        <Link href="/dashboard/vendors/new" className="btn btn-primary mt-4">
          <IconPlus />
          Add vendor
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Vendors</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Manage third-party vendors who process data through cookies and similar technologies.
          </p>
        </div>
        <Link
          href="/dashboard/vendors/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <IconPlus />
          Add vendor
        </Link>
      </div>

      {unknownRoleCount > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {unknownRoleCount === 1
            ? "1 vendor has no role. Open it, set Role, and save — policies that use it cannot publish until then."
            : `${unknownRoleCount} vendors have no role. Open each one, set Role, and save — policies that use them cannot publish until then.`}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total Vendors", value: total, tip: "In your organisation", icon: <IconUsers />, tone: "bg-sky-50 text-sky-600" },
          { label: "Active", value: active, tip: "Ready for policies", icon: <IconActive />, tone: "bg-emerald-50 text-emerald-600" },
          { label: "Pending Review", value: pending, tip: "Needs attention", icon: <IconClock />, tone: "bg-amber-50 text-amber-600" },
          { label: "Inactive", value: inactive, tip: "Not currently used", icon: <IconInactive />, tone: "bg-rose-50 text-rose-600" },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{card.value}</p>
                <p className="mt-1 text-xs text-slate-500">{card.tip}</p>
              </div>
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.tone}`}>
                {card.icon}
              </span>
            </div>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <IconSearch />
            </span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search vendors by name, domain, or purpose..."
              className="field-input is-sm w-full pl-9"
              aria-label="Search vendors"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              size="sm"
              className="w-[8.5rem]"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as typeof status);
                setPage(1);
              }}
            >
              <option value="all">Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </Select>
            <Select
              size="sm"
              className="w-[9rem]"
              value={purpose}
              onChange={(event) => {
                setPurpose(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Purpose</option>
              {purposeOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Select
              size="sm"
              className="w-[9rem]"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Category</option>
              {categoryOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <Select
              size="sm"
              className="w-[8.5rem]"
              value={region}
              onChange={(event) => {
                setRegion(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">Region</option>
              {regionOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <button
              type="button"
              onClick={() => setMoreOpen((open) => !open)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <IconFilter />
              More filters
            </button>
          </div>
        </div>

        {moreOpen ? (
          <div className="flex flex-wrap gap-3 border-b border-slate-100 px-4 py-3">
            <Select
              size="sm"
              className="w-[9rem]"
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setPage(1);
              }}
            >
              <option value="all">All sources</option>
              {sourceOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              onClick={() => {
                setQuery("");
                setStatus("all");
                setPurpose("all");
                setCategory("all");
                setRegion("all");
                setSource("all");
                setPage(1);
              }}
            >
              Reset filters
            </button>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <p className="px-5 py-14 text-center text-sm text-slate-500">No vendors match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[72rem] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label="Select all vendors on this page"
                      checked={pageRows.length > 0 && pageRows.every((row) => selected.has(row.id))}
                      onChange={(event) => toggleAll(event.target.checked)}
                    />
                  </th>
                  <th className="px-3 py-3 font-semibold">Vendor</th>
                  <th className="px-3 py-3 font-semibold">Domain</th>
                  <th className="px-3 py-3 font-semibold">Purposes</th>
                  <th className="px-3 py-3 font-semibold">Cookies</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Last Updated</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.map((row) => {
                  const status = statusMeta(row.status);
                  const shownPurposes = row.purposes.slice(0, 2);
                  const extra = Math.max(0, row.purposes.length - shownPurposes.length);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          aria-label={`Select ${row.name}`}
                          checked={selected.has(row.id)}
                          onChange={(event) => toggleOne(row.id, event.target.checked)}
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="flex min-w-0 items-start gap-3">
                          <VendorLogo name={row.name} domain={row.domain} keyHint={row.key} />
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/vendors/${row.id}`}
                              className="font-semibold text-slate-900 hover:text-blue-600"
                            >
                              {row.name}
                            </Link>
                            <p className="mt-0.5 line-clamp-1 max-w-xs text-xs text-slate-500">
                              {row.description?.trim() ||
                                (isUnknownRole(row.role)
                                  ? "Role not set — open vendor to configure"
                                  : `${(row.role ?? "").replaceAll("_", " ")} · ${row.source}`)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        {row.domain ? (
                          <a
                            href={domainHref(row.domain)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm text-slate-700 hover:text-blue-600"
                          >
                            <span className="truncate max-w-[10rem]">{row.domain}</span>
                            <span className="text-blue-500">
                              <IconExternal />
                            </span>
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        {shownPurposes.length === 0 ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {shownPurposes.map((item) => (
                              <span
                                key={item}
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${purposeTone(item)}`}
                              >
                                {item}
                              </span>
                            ))}
                            {extra > 0 ? (
                              <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                +{extra}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex min-w-[2rem] justify-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-slate-700">
                          {row.cookieCount}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ${purposeTone(row.category)}`}>
                          {row.category}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${status.tone}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap text-slate-500">
                        {fmtDate(row.updatedAt ?? row.createdAt)}
                      </td>
                      <td className="relative px-3 py-3.5">
                        <button
                          type="button"
                          aria-label={`Actions for ${row.name}`}
                          onClick={() => setOpenMenuId((id) => (id === row.id ? null : row.id))}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <IconMore />
                        </button>
                        {openMenuId === row.id ? (
                          <div className="absolute right-3 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                            <Link
                              href={`/dashboard/vendors/${row.id}`}
                              className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              onClick={() => setOpenMenuId(null)}
                            >
                              Open
                            </Link>
                            <Link
                              href={`/dashboard/vendors/${row.id}`}
                              className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              onClick={() => setOpenMenuId(null)}
                            >
                              Edit
                            </Link>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
          <p className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-semibold text-slate-800">
              {filtered.length === 0 ? "0" : `${rangeStart}-${rangeEnd}`}
            </span>{" "}
            of {filtered.length} vendors
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40"
            >
              Prev
            </button>
            {pageItems(safePage, pageCount).map((item, index) =>
              item === "gap" ? (
                <span key={`gap-${index}`} className="px-1 text-xs text-slate-400">
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPage(item)}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-xs font-semibold ${
                    item === safePage
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              ),
            )}
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              className="rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40"
            >
              Next
            </button>
            <Select
              size="sm"
              className="w-[6.5rem]"
              value={String(pageSize)}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]);
                setPage(1);
              }}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>
    </div>
  );
}
