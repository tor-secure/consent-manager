"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

const DATE_RANGES = [
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
  { label: "Last 90 days", value: "90" },
  { label: "All time", value: "all" },
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      // Reset to page 1 on filter change.
      params.delete("page");
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            defaultValue={currentQ}
            onChange={(e) => {
              // Debounce: wait for 400 ms of inactivity.
              const value = e.target.value;
              const handle = setTimeout(() => updateParam("q", value), 400);
              return () => clearTimeout(handle);
            }}
            placeholder="Search action or resource…"
            className="w-64 rounded-md border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
          />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1 rounded-md border bg-white p-1">
          {DATE_RANGES.map((r) => {
            const active = currentDays === r.value || (r.value === "all" && currentDays === "all");
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => updateParam("days", r.value)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Count + pending indicator */}
      <p className="text-sm text-neutral-400">
        {isPending ? "Loading…" : `${totalCount.toLocaleString()} event${totalCount !== 1 ? "s" : ""}`}
      </p>
    </div>
  );
}
