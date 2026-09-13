"use client";

import { useMemo } from "react";
import { Combobox } from "@/components/ui/combobox";
import { LOCALE_OPTIONS, localeLabel } from "@/lib/i18n/locale-registry";

const NO_EXTRA: Array<{ value: string; label: string }> = [];
const NO_EXCLUDE: string[] = [];

export function LocaleSelect({
  id,
  name,
  value,
  onChange,
  includeCurrent,
  extraOptions = NO_EXTRA,
  exclude = NO_EXCLUDE,
  disabled,
  size,
  className,
}: {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  includeCurrent?: string;
  extraOptions?: Array<{ value: string; label: string }>;
  exclude?: string[];
  disabled?: boolean;
  size?: "md" | "sm";
  className?: string;
}) {
  const options = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ value: string; label: string }> = [];

    for (const extra of extraOptions) {
      if (exclude.includes(extra.value) || seen.has(extra.value)) continue;
      seen.add(extra.value);
      list.push(extra);
    }

    if (includeCurrent && !seen.has(includeCurrent) && !LOCALE_OPTIONS.some((entry) => entry.code === includeCurrent)) {
      seen.add(includeCurrent);
      list.push({ value: includeCurrent, label: localeLabel(includeCurrent) });
    }

    for (const entry of LOCALE_OPTIONS) {
      if (exclude.includes(entry.code) || seen.has(entry.code)) continue;
      seen.add(entry.code);
      list.push({ value: entry.code, label: entry.label });
    }

    return list;
  }, [includeCurrent, extraOptions, exclude]);

  return (
    <Combobox
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      options={options}
      disabled={disabled}
      size={size}
      className={className}
      placeholder="Select language"
      searchPlaceholder="Search languages"
      emptyText="No languages match"
    />
  );
}
