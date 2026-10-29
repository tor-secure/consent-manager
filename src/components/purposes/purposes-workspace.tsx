"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { PieChart } from "@/components/charts/pie-chart";
import { Select } from "@/components/ui/select";
import type { PurposeRow } from "@/components/purposes/purpose-list";

export type PurposeWorkspaceRow = PurposeRow & {
  linkedPolicies: number;
};

type PurposeCategory =
  | "Necessary"
  | "Analytics"
  | "Marketing"
  | "Functional"
  | "Personalization"
  | "Other";

type PurposeVisual = {
  category: PurposeCategory;
  iconBg: string;
  iconFg: string;
  icon: ReactNode;
};

function IconLayers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function IconActive() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconRequired() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}

function IconMegaphone() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-5v12L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 11-5.2-3" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconShieldLock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <rect x="9" y="10" width="6" height="5" rx="1" />
      <path d="M10 10V9a2 2 0 114 0v1" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function IconShieldCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M7.5 2v11M2 7.5h11" />
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

function IconList() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

function IconBulb() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 00-4 12.7V17h8v-2.3A7 7 0 0012 2z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function resolvePurposeVisual(purpose: Pick<PurposeRow, "key" | "name" | "isRequired">): PurposeVisual {
  const hay = `${purpose.key} ${purpose.name}`.toLowerCase();

  if (purpose.isRequired || /necess|essential|strictly/.test(hay)) {
    return {
      category: "Necessary",
      iconBg: "bg-emerald-50",
      iconFg: "text-emerald-600",
      icon: <IconShieldCheck />,
    };
  }
  if (/advert|market|promo|campaign/.test(hay)) {
    return {
      category: "Marketing",
      iconBg: "bg-sky-50",
      iconFg: "text-sky-600",
      icon: <IconMegaphone />,
    };
  }
  if (/analytic|statistic|measure|tracking/.test(hay)) {
    return {
      category: "Analytics",
      iconBg: "bg-violet-50",
      iconFg: "text-violet-600",
      icon: <IconChart />,
    };
  }
  if (/personal|profil|recommend/.test(hay)) {
    return {
      category: "Personalization",
      iconBg: "bg-pink-50",
      iconFg: "text-pink-600",
      icon: <IconUser />,
    };
  }
  if (/otp|verif|auth|login|security|lock/.test(hay)) {
    return {
      category: "Necessary",
      iconBg: "bg-orange-50",
      iconFg: "text-orange-600",
      icon: <IconShieldLock />,
    };
  }
  if (/contact|enquir|inquiry|email|message|support/.test(hay)) {
    return {
      category: "Functional",
      iconBg: "bg-teal-50",
      iconFg: "text-teal-600",
      icon: <IconMail />,
    };
  }
  if (/function|prefer|setting|ux|experience/.test(hay)) {
    return {
      category: "Functional",
      iconBg: "bg-blue-50",
      iconFg: "text-blue-600",
      icon: <IconGear />,
    };
  }
  return {
    category: "Other",
    iconBg: "bg-slate-100",
    iconFg: "text-slate-600",
    icon: <IconLayers />,
  };
}

function fmtDate(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

const PAGE_SIZES = [10, 25, 50] as const;

export function PurposesWorkspace({ purposes }: { purposes: PurposeWorkspaceRow[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [category, setCategory] = useState<"all" | PurposeCategory>("all");
  const [required, setRequired] = useState<"all" | "required" | "optional">("all");
  const [sort, setSort] = useState<"created" | "name" | "linked">("created");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const enriched = useMemo(
    () =>
      purposes.map((purpose) => ({
        ...purpose,
        visual: resolvePurposeVisual(purpose),
      })),
    [purposes],
  );

  const categories = useMemo(
    () => [...new Set(enriched.map((row) => row.visual.category))].sort(),
    [enriched],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = enriched.filter((row) => {
      if (status === "active" && row.status !== "active") return false;
      if (status === "inactive" && row.status === "active") return false;
      if (category !== "all" && row.visual.category !== category) return false;
      if (required === "required" && !row.isRequired) return false;
      if (required === "optional" && row.isRequired) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.key.toLowerCase().includes(q) ||
        (row.description ?? "").toLowerCase().includes(q)
      );
    });

    rows = [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "linked") return b.linkedPolicies - a.linkedPolicies;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return rows;
  }, [enriched, query, status, category, required, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(filtered.length, safePage * pageSize);

  const total = purposes.length;
  const active = purposes.filter((p) => p.status === "active").length;
  const inactive = total - active;
  const requiredCount = purposes.filter((p) => p.isRequired).length;
  const linkedPolicies = purposes.reduce((sum, p) => sum + p.linkedPolicies, 0);

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

  if (purposes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <p className="text-base font-semibold text-slate-900">No purposes yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Create your first purpose to start building consent policies.
        </p>
        <Link href="/dashboard/purposes/new" className="btn btn-primary mt-4">
          <IconPlus />
          Create purpose
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-2 text-sm text-slate-500">
            <Link href="/dashboard/consent-management" className="hover:text-slate-800">
              Consent Management
            </Link>
            <span className="text-slate-300">›</span>
            <span className="font-medium text-slate-800">Purposes</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">Purposes</h1>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-500">
            Manage consent purposes used across all policies in your organisation. Purposes help you
            categorise why data is collected and must be clearly described to your users.
          </p>
        </div>
        <Link
          href="/dashboard/purposes/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
        >
          <IconPlus />
          Create purpose
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Total Purposes",
            value: total,
            tip: "All purposes in your organisation",
            icon: <IconLayers />,
            tone: "bg-sky-50 text-sky-600",
          },
          {
            label: "Active Purposes",
            value: active,
            tip: total ? `${Math.round((active / total) * 100)}% of total` : "0% of total",
            icon: <IconActive />,
            tone: "bg-emerald-50 text-emerald-600",
          },
          {
            label: "Required Purposes",
            value: requiredCount,
            tip: total ? `${Math.round((requiredCount / total) * 100)}% of total` : "0% of total",
            icon: <IconRequired />,
            tone: "bg-orange-50 text-orange-600",
          },
          {
            label: "Linked Policies",
            value: linkedPolicies,
            tip: "Across all purposes",
            icon: <IconLink />,
            tone: "bg-violet-50 text-violet-600",
          },
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
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
                placeholder="Search by name, key, or description..."
                className="field-input is-sm w-full pl-9"
                aria-label="Search purposes"
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
                <option value="all">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
              <Select
                size="sm"
                className="w-[9.5rem]"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value as typeof category);
                  setPage(1);
                }}
              >
                <option value="all">All categories</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </Select>
              <Select
                size="sm"
                className="w-[9rem]"
                value={required}
                onChange={(event) => {
                  setRequired(event.target.value as typeof required);
                  setPage(1);
                }}
              >
                <option value="all">All purposes</option>
                <option value="required">Required</option>
                <option value="optional">Optional</option>
              </Select>
              <Select
                size="sm"
                className="w-[9.5rem]"
                value={sort}
                onChange={(event) => setSort(event.target.value as typeof sort)}
              >
                <option value="created">Date created</option>
                <option value="name">Name</option>
                <option value="linked">Linked policies</option>
              </Select>
              <div className="inline-flex overflow-hidden rounded-lg border border-slate-200">
                <button
                  type="button"
                  aria-pressed={view === "list"}
                  onClick={() => setView("list")}
                  className={`p-2 ${view === "list" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                  title="List view"
                >
                  <IconList />
                </button>
                <button
                  type="button"
                  aria-pressed={view === "grid"}
                  onClick={() => setView("grid")}
                  className={`p-2 ${view === "grid" ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}
                  title="Grid view"
                >
                  <IconGrid />
                </button>
              </div>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="px-5 py-14 text-center text-sm text-slate-500">
              No purposes match these filters.
            </p>
          ) : view === "list" ? (
            <div className="overflow-x-auto">
              <table className="min-w-[64rem] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all purposes on this page"
                        checked={pageRows.length > 0 && pageRows.every((row) => selected.has(row.id))}
                        onChange={(event) => toggleAll(event.target.checked)}
                      />
                    </th>
                    <th className="px-3 py-3 font-semibold">Purpose</th>
                    <th className="px-3 py-3 font-semibold">Key</th>
                    <th className="px-3 py-3 font-semibold">Category</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Required</th>
                    <th className="px-3 py-3 font-semibold">Linked Policies</th>
                    <th className="px-3 py-3 font-semibold">Created</th>
                    <th className="px-3 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRows.map((row) => (
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
                          <span
                            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${row.visual.iconBg} ${row.visual.iconFg}`}
                          >
                            {row.visual.icon}
                          </span>
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/purposes/${row.id}`}
                              className="font-semibold text-slate-900 hover:text-blue-600"
                            >
                              {row.name}
                            </Link>
                            <p className="mt-0.5 line-clamp-2 max-w-sm text-xs leading-relaxed text-slate-500">
                              {row.description || "No description yet"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3.5">
                        <code className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-600">
                          {row.key}
                        </code>
                      </td>
                      <td className="px-3 py-3.5 text-slate-700">{row.visual.category}</td>
                      <td className="px-3 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              row.status === "active" ? "bg-emerald-500" : "bg-slate-300"
                            }`}
                          />
                          {row.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-3 py-3.5">
                        {row.isRequired ? (
                          <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-200">
                            Required
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 tabular-nums text-slate-700">{row.linkedPolicies}</td>
                      <td className="px-3 py-3.5 whitespace-nowrap text-slate-500">
                        {fmtDate(row.createdAt)}
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
                              href={`/dashboard/purposes/${row.id}`}
                              className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              onClick={() => setOpenMenuId(null)}
                            >
                              Open
                            </Link>
                            <Link
                              href={`/dashboard/purposes/${row.id}`}
                              className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                              onClick={() => setOpenMenuId(null)}
                            >
                              Edit
                            </Link>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {pageRows.map((row) => (
                <Link
                  key={row.id}
                  href={`/dashboard/purposes/${row.id}`}
                  className="rounded-xl border border-slate-200 p-4 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${row.visual.iconBg} ${row.visual.iconFg}`}
                    >
                      {row.visual.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{row.name}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                        {row.description || "No description yet"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                          {row.key}
                        </code>
                        <span className="text-[11px] text-slate-500">{row.visual.category}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-800">
                {filtered.length === 0 ? "0" : `${rangeStart}–${rangeEnd}`}
              </span>{" "}
              of {filtered.length} purposes
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
              <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-md bg-slate-900 px-2 text-xs font-semibold text-white">
                {safePage}
              </span>
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
                className="w-[7rem]"
                value={String(pageSize)}
                onChange={(event) => {
                  setPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]);
                  setPage(1);
                }}
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <SoftCard title="Purpose Usage">
            <PieChart
              slices={[
                { label: "Active", value: active, color: "#10B981" },
                { label: "Inactive", value: inactive, color: "#CBD5E1" },
                { label: "Required", value: requiredCount, color: "#F59E0B" },
              ]}
              label="Purpose usage breakdown"
              emptyTitle="No purposes"
              emptyDescription="Create purposes to see usage."
              centerLabel="Purposes"
              legend="row"
              variant="donut"
            />
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center justify-between text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Active
                </span>
                <span className="tabular-nums">
                  {active} ({total ? Math.round((active / total) * 100) : 0}%)
                </span>
              </li>
              <li className="flex items-center justify-between text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300" /> Inactive
                </span>
                <span className="tabular-nums">
                  {inactive} ({total ? Math.round((inactive / total) * 100) : 0}%)
                </span>
              </li>
              <li className="flex items-center justify-between text-slate-600">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Required
                </span>
                <span className="tabular-nums">
                  {requiredCount} ({total ? Math.round((requiredCount / total) * 100) : 0}%)
                </span>
              </li>
            </ul>
          </SoftCard>

          <SoftCard
            title="Quick Tips"
            action={
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <IconBulb />
              </span>
            }
          >
            <ul className="space-y-3 text-sm text-slate-600">
              {[
                "Use clear and simple language visitors can understand.",
                "Only mark as required when the purpose is strictly necessary.",
                "Link purposes to your consent policies before publishing.",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="mt-0.5 text-emerald-600">
                    <IconCheck />
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard/learning"
              className="mt-4 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Learn more about purposes →
            </Link>
          </SoftCard>
        </aside>
      </div>
    </div>
  );
}
