"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/select";

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
      <div className="flex items-center gap-1 rounded-md border bg-[var(--card)] p-1">
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
                  ? "bg-[var(--foreground)] text-white"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--hover)] hover:text-[var(--foreground)]",
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
    <label className="text-xs font-medium text-[var(--muted-foreground)]">
      {label}
      <Select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        size="sm"
        className="mt-1 min-w-[140px]"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}
