"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  matchDashboardPages,
  type DashboardSearchHit,
} from "@/lib/dashboard-search";

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function typeLabel(type: DashboardSearchHit["type"]) {
  if (type === "page") return "Page";
  if (type === "website") return "Website";
  if (type === "policy") return "Policy";
  if (type === "purpose") return "Purpose";
  return "Vendor";
}

export function DashboardSearch() {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [remote, setRemote] = useState<DashboardSearchHit[]>([]);

  const pages = useMemo(() => matchDashboardPages(query), [query]);
  const results = useMemo(() => {
    const seen = new Set(pages.map((item) => item.href + item.title));
    const extra = remote.filter((item) => !seen.has(item.href + item.title));
    return [...pages, ...extra].slice(0, 12);
  }, [pages, remote]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setRemote([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { results?: DashboardSearchHit[] };
        setRemote(Array.isArray(data.results) ? data.results : []);
      } catch {
        /* ignore abort/network */
      }
    }, 220);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [results]);

  const close = useCallback(() => {
    setOpen(false);
    setMobileOpen(false);
  }, []);

  const go = useCallback(
    (href: string) => {
      close();
      setQuery("");
      router.push(href);
    },
    [close, router],
  );

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (window.matchMedia("(min-width: 768px)").matches) {
          setOpen(true);
          inputRef.current?.focus();
        } else {
          setMobileOpen(true);
        }
      }
      if (event.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (mobileOpen) {
      const id = window.setTimeout(() => mobileInputRef.current?.focus(), 20);
      return () => window.clearTimeout(id);
    }
  }, [mobileOpen]);

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = results[activeIndex];
      if (hit) go(hit.href);
    }
  }

  const list = (
    <ul
      id={listId}
      role="listbox"
      className="max-h-80 overflow-y-auto py-2 scrollbar-thin"
    >
      {results.length === 0 ? (
        <li className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
          No matching pages or records.
        </li>
      ) : (
        results.map((hit, index) => (
          <li key={hit.id} role="option" aria-selected={index === activeIndex}>
            <button
              type="button"
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => go(hit.href)}
              className={[
                "flex w-full items-start gap-3 px-4 py-2.5 text-left",
                index === activeIndex ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]/70",
              ].join(" ")}
            >
              <span className="mt-0.5 rounded-md bg-[var(--secondary)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                {typeLabel(hit.type)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                  {hit.title}
                </span>
                <span className="block truncate text-xs text-[var(--muted-foreground)]">
                  {hit.subtitle}
                </span>
              </span>
            </button>
          </li>
        ))
      )}
    </ul>
  );

  return (
    <div className="flex w-full min-w-0 items-center">
      <div className="relative hidden min-w-0 flex-1 md:block">
        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label="Search dashboard"
          placeholder="Search pages, websites, policies…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
          onKeyDown={onInputKeyDown}
          className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-11 pr-16 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none transition-[box-shadow,border-color] duration-200 focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/30 lg:h-11"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[var(--border)] bg-[var(--card)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] lg:inline">
          Ctrl K
        </kbd>
        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-50 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-md)]">
            {list}
          </div>
        )}
      </div>

      <button
        type="button"
        className="relative ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] md:hidden"
        aria-label="Open search"
        onClick={() => setMobileOpen(true)}
      >
        <SearchIcon />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true" aria-label="Search dashboard">
          <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--foreground)_45%,transparent)]" onClick={close} />
          <div className="absolute inset-x-0 top-0 bg-[var(--card)] px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[var(--shadow-md)]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                ref={mobileInputRef}
                type="search"
                role="combobox"
                aria-expanded
                aria-controls={listId}
                aria-label="Search dashboard"
                placeholder="Search…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onInputKeyDown}
                className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] pl-11 pr-12 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]/30"
              />
              <button
                type="button"
                onClick={close}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-medium text-[var(--muted-foreground)]"
              >
                Close
              </button>
            </div>
            <div className="mt-2 overflow-hidden rounded-xl border border-[var(--border)]">
              {list}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardHelpLink() {
  return (
    <Link
      href="/dashboard/developers"
      aria-label="Help and SDK installation"
      title="Help and SDK installation"
      className="relative hidden h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] sm:flex lg:h-11 lg:w-11"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </svg>
    </Link>
  );
}
