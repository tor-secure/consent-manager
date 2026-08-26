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
        // Non-critical — just don't show badge on error.
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
      className="relative flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
    >
      {/* Bell icon */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M9 2A5.25 5.25 0 0 0 3.75 7.25v3.5L2.5 12.5h13l-1.25-1.75v-3.5A5.25 5.25 0 0 0 9 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M7.25 12.5v.5a1.75 1.75 0 0 0 3.5 0v-.5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>

      {/* Unread badge */}
      {loaded && count > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
