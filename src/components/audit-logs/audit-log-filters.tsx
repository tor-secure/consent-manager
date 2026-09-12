"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useRef, useTransition } from "react";
import { SearchInput } from "@/components/ui/search-input";

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
  const debounceRef = useRef<number>(0);

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
        <SearchInput
          className="w-64"
          defaultValue={currentQ}
          label="Search action or resource"
          placeholder="Search action or resource…"
          onChange={(e) => {
            const value = e.target.value;
            window.clearTimeout(debounceRef.current);
            debounceRef.current = window.setTimeout(() => updateParam("q", value), 400);
          }}
          onClear={() => {
            window.clearTimeout(debounceRef.current);
            updateParam("q", "");
          }}
        />

        {/* Date range pills */}
        <div className="flex items-center gap-0.5 rounded-2xl border border-[var(--border)] bg-[var(--muted)] p-0.5 shadow-sm">
          {DATE_RANGES.map((r) => {
            const active = currentDays === r.value || (r.value === "all" && !["7","30","90"].includes(currentDays));
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => updateParam("days", r.value)}
                className={`rounded-xl px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
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
        <span className="text-[var(--muted-foreground)]">
          {isPending
            ? "Loading…"
            : `${totalCount.toLocaleString()} event${totalCount !== 1 ? "s" : ""}`}
        </span>
      </p>
    </div>
  );
}
