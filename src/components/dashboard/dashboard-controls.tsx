"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { Select } from "@/components/ui/select";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseIso(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, (month ?? 1) - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function toIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function DateField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  const autoId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const selected = parseIso(value);
  const [cursor, setCursor] = useState(() => selected ?? new Date());
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const minDate = min ? parseIso(min) : null;
  const maxDate = max ? parseIso(max) : null;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 280;
      const left = Math.min(rect.left, window.innerWidth - width - 8);
      setCoords({ top: rect.bottom + 6, left: Math.max(8, left) });
    };
    place();
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const labelText = selected
    ? selected.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "dd/mm/yyyy";

  function pick(date: Date) {
    onChange(toIso(date));
    setOpen(false);
  }

  function blocked(date: Date) {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  const panel = mounted && open && coords
    ? createPortal(
        <div
          ref={panelRef}
          id={`${autoId}-panel`}
          role="dialog"
          aria-label={`${label} calendar`}
          className="fixed z-[80] w-[17.5rem] rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-md"
          style={{ top: coords.top, left: coords.left }}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)]"
              aria-label="Previous month"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              {cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </p>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--foreground)] hover:bg-[var(--muted)]"
              aria-label="Next month"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-[var(--muted-foreground)]">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {days.map((date) => {
              const outside = date.getMonth() !== month;
              const isSelected = selected ? sameDay(date, selected) : false;
              const isToday = sameDay(date, today);
              const disabled = blocked(date);
              return (
                <button
                  key={toIso(date)}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(date)}
                  className={[
                    "h-8 rounded-lg text-xs font-medium",
                    isSelected
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                      : isToday
                        ? "text-[var(--primary)] ring-1 ring-[var(--ring)]"
                        : "text-[var(--foreground)] hover:bg-[var(--muted)]",
                    outside && !isSelected ? "text-[var(--muted-foreground)]" : "",
                    disabled ? "cursor-not-allowed opacity-40 hover:bg-transparent" : "",
                  ].join(" ")}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-[var(--border)] pt-2">
            <button
              type="button"
              className="text-xs font-semibold text-[var(--primary)]"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className="text-xs font-semibold text-[var(--primary)] disabled:opacity-40"
              disabled={blocked(today)}
              onClick={() => pick(today)}
            >
              Today
            </button>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <label className="w-44 text-xs font-medium text-[var(--muted-foreground)]">
      {label}
      <button
        ref={buttonRef}
        type="button"
        id={autoId}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`${autoId}-panel`}
        onClick={() => {
          setCursor(selected ?? new Date());
          setOpen((current) => !current);
        }}
        className="cmp-combobox-trigger is-sm mt-1"
      >
        <span className={selected ? "cmp-combobox-value" : "cmp-combobox-value is-placeholder"}>{labelText}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--muted-foreground)]">
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M8 3.5V7M16 3.5V7M3.5 10h17" />
        </svg>
      </button>
      {panel}
    </label>
  );
}

const RANGES = [
  { label: "7 days", value: "7" },
  { label: "30 days", value: "30" },
  { label: "90 days", value: "90" },
  { label: "All time", value: "all" },
] as const;

export function DashboardFilters({
  websites,
}: {
  websites: { id: string; name: string; domain: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const custom = Boolean(from || to);
  const days = custom ? "" : (params.get("days") ?? "30");

  function push(next: URLSearchParams) {
    const query = next.toString();
    startTransition(() => {
      router.push(query ? `${pathname}?${query}` : pathname);
    });
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (!value) next.delete(key);
    else next.set(key, value);
    push(next);
  }

  function selectRange(value: string) {
    const next = new URLSearchParams(params.toString());
    next.delete("from");
    next.delete("to");
    if (value === "30") next.delete("days");
    else next.set("days", value);
    push(next);
  }

  return (
    <div className={`flex flex-wrap items-end gap-3 ${isPending ? "opacity-70" : ""}`}>
      <div className="flex h-9 items-center gap-1 self-end rounded-xl border border-[var(--border)] bg-[var(--card)] p-1">
        {RANGES.map((range) => {
          const active = days === range.value;
          return (
            <button
              key={range.value}
              type="button"
              onClick={() => selectRange(range.value)}
              disabled={isPending}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                active
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {range.label}
            </button>
          );
        })}
      </div>
      <DateField label="From" value={from} max={to || undefined} onChange={(next) => setParam("from", next)} />
      <DateField label="To" value={to} min={from || undefined} onChange={(next) => setParam("to", next)} />
      <label className="w-52 text-xs font-medium text-[var(--muted-foreground)]">
        Website
        <Select
          value={params.get("websiteId") ?? ""}
          onChange={(event) => setParam("websiteId", event.target.value)}
          size="sm"
          searchable={false}
          className="mt-1"
        >
          <option value="">All websites</option>
          {websites.map((site) => (
            <option key={site.id} value={site.id}>
              {site.name}
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}

export function DashboardSort({
  param,
  value,
  options,
}: {
  param: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const current = options.some((option) => option.value === value) ? value : options[0]?.value ?? "";

  return (
    <Select
      aria-label="Sort"
      value={current}
      disabled={isPending}
      size="sm"
      searchable={false}
      className="w-48 shrink-0"
      onChange={(event) => {
        const next = new URLSearchParams(params.toString());
        const picked = event.target.value;
        if (!picked || picked === options[0]?.value) next.delete(param);
        else next.set(param, picked);
        const query = next.toString();
        startTransition(() => {
          router.push(query ? `${pathname}?${query}` : pathname);
        });
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
}
