"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const RANGES = [
  { label: "7 days",  value: "7"   },
  { label: "30 days", value: "30"  },
  { label: "90 days", value: "90"  },
  { label: "All time", value: "all" },
] as const;

export function DateRangeFilter({ current }: { current: string }) {
  const router    = useRouter();
  const pathname  = usePathname();
  const params    = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function select(value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "all") {
      next.delete("days");
    } else {
      next.set("days", value);
    }
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <div className="flex items-center gap-1 rounded-md border bg-white p-1">
      {RANGES.map((r) => {
        const active = current === r.value || (r.value === "all" && current === "all");
        return (
          <button
            key={r.value}
            type="button"
            onClick={() => select(r.value)}
            disabled={isPending}
            className={[
              "rounded px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900",
            ].join(" ")}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}
