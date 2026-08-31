"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

const DATE_RANGES = [
  { label: "7d",    value: "7"   },
  { label: "30d",   value: "30"  },
  { label: "90d",   value: "90"  },
  { label: "All",   value: "all" },
] as const;

export function AuditLogFilters({
  currentQ,
  currentDays,
  totalCount,
}: {
  currentQ: string;
  currentDays: string;
  totalCount: number;
}) {
  const router     = useRouter();
  const pathname   = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || value === "all") params.delete(key);
      else params.set(key, value);
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Search input */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            defaultValue={currentQ}
            onChange={(e) => {
              const value = e.target.value;
              const handle = setTimeout(() => updateParam("q", value), 400);
              return () => clearTimeout(handle);
            }}
            placeholder="Search action or resource…"
            className="h-9 w-64 rounded-2xl border border-slate-200 bg-white pl-9 pr-3 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition"
          />
        </div>

        {/* Date range pills */}
        <div className="flex items-center gap-0.5 rounded-2xl border border-slate-200 bg-slate-50 p-0.5 shadow-sm">
          {DATE_RANGES.map((r) => {
            const active = currentDays === r.value || (r.value === "all" && !["7","30","90"].includes(currentDays));
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => updateParam("days", r.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Count / loading */}
      <p className={`text-xs font-medium transition-opacity ${isPending ? "opacity-50" : "opacity-100"}`}>
        <span className="text-slate-400">
          {isPending
            ? "Loading…"
            : `${totalCount.toLocaleString()} event${totalCount !== 1 ? "s" : ""}`}
        </span>
      </p>
    </div>
  );
}
