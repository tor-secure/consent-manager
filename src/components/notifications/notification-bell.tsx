"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function NotificationBell() {
  const [count, setCount] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const res = await fetch("/api/notifications/unread-count", {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          setCount(data.count ?? 0);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    }

    fetchCount();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link
      href="/dashboard/notifications"
      aria-label={
        count > 0
          ? `Notifications — ${count} unread`
          : "Notifications"
      }
      className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
    >
      <svg
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
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>

      {loaded && count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1.5 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--card)]"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
