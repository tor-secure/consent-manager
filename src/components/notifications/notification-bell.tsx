"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

let unreadRequest: Promise<number> | null = null;

function requestUnreadCount() {
  if (!unreadRequest) {
    unreadRequest = fetch("/api/notifications/unread-count", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return 0;
        const data = (await res.json()) as { count?: unknown };
        return typeof data.count === "number" ? data.count : 0;
      })
      .catch(() => 0)
      .finally(() => {
        unreadRequest = null;
      });
  }
  return unreadRequest;
}

export function NotificationBell({
  className = "",
  countEnabled = true,
}: {
  className?: string;
  countEnabled?: boolean;
}) {
  const [count, setCount] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!countEnabled) return;
    let cancelled = false;

    requestUnreadCount().then((nextCount) => {
      if (cancelled) return;
      setCount(nextCount);
      setLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [countEnabled]);

  return (
    <Link
      href="/dashboard/notifications"
      aria-label={
        count > 0
          ? `Notifications — ${count} unread`
          : "Notifications"
      }
      className={[
        "relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
        className,
      ].join(" ")}
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
