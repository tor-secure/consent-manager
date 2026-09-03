"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const RANGES = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
  { label: "All time", value: "all" },
] as const;

type Option = { value: string; label: string };

export function AnalyticsFilters({
  currentDays,
  websites,
  countries,
  devices,
  browsers,
  purposes,
  policyVersions,
}: {
  currentDays: string;
  websites: Option[];
  countries: Option[];
  devices: Option[];
  browsers: Option[];
  purposes: Option[];
  policyVersions: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-1 rounded-md border bg-white p-1">
        {RANGES.map((range) => {
          const active = currentDays === range.value;
          return (
            <button
              key={range.value}
              type="button"
              onClick={() => setParam("days", range.value)}
              disabled={isPending}
              className={[
                "rounded px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900",
              ].join(" ")}
            >
              {range.label}
            </button>
          );
        })}
      </div>
      <FilterSelect
        label="Website"
        value={params.get("websiteId") ?? ""}
        options={websites}
        onChange={(value) => setParam("websiteId", value)}
        disabled={isPending}
      />
      <FilterSelect
        label="Country"
        value={params.get("country") ?? ""}
        options={countries}
        onChange={(value) => setParam("country", value)}
        disabled={isPending}
      />
      <FilterSelect
        label="Device"
        value={params.get("device") ?? ""}
        options={devices}
        onChange={(value) => setParam("device", value)}
        disabled={isPending}
      />
      <FilterSelect
        label="Browser"
        value={params.get("browser") ?? ""}
        options={browsers}
        onChange={(value) => setParam("browser", value)}
        disabled={isPending}
      />
      <FilterSelect
        label="Purpose"
        value={params.get("purposeId") ?? ""}
        options={purposes}
        onChange={(value) => setParam("purposeId", value)}
        disabled={isPending}
      />
      <FilterSelect
        label="Policy version"
        value={params.get("policyVersionId") ?? ""}
        options={policyVersions}
        onChange={(value) => setParam("policyVersionId", value)}
        disabled={isPending}
      />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  if (options.length === 0) return null;
  return (
    <label className="text-xs font-medium text-slate-600">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 block h-9 min-w-[140px] rounded-xl border border-slate-200 bg-white px-2 text-sm text-slate-800"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
