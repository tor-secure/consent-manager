"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/components/feedback/notify";
import { dashboardFetch } from "@/components/feedback/use-async-action";

// ---------------------------------------------------------------------------
// NotificationActions
// Used in two modes:
//   1. hasUnread=true, no notificationId → "Mark all as read" button
//   2. hasUnread=false, notificationId provided → per-item "Mark as read" button
// ---------------------------------------------------------------------------

export function NotificationActions({
  notificationId,
  hasUnread,
}: {
  notificationId?: string;
  hasUnread: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  async function markOne() {
    if (!notificationId || done) return;
    try {
      const res = await fetch(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      if (!res.ok) {
        notify.error("Unable to update notification. Please try again.");
        return;
      }
      setDone(true);
      startTransition(() => router.refresh());
    } catch {
      notify.error("Unable to connect. Please try again.");
    }
  }

  async function markAll() {
    const result = await dashboardFetch(
      "/api/notifications/read-all",
      { method: "POST" },
      {
        successMessage: "Notifications marked as read",
        errorFallback: "Unable to update notifications. Please try again.",
      },
    );
    if (!result.ok) return;
    startTransition(() => router.refresh());
  }

  // Mark all button
  if (hasUnread) {
    return (
      <button
        type="button"
        disabled={isPending}
        onClick={markAll}
        className="shrink-0 rounded-md border bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
      >
        {isPending ? "Marking…" : "Mark all as read"}
      </button>
    );
  }

  // Per-item mark as read button
  if (done) return null;

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={markOne}
      title="Mark as read"
      className="shrink-0 rounded px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 disabled:opacity-40"
    >
      {isPending ? "…" : "Mark read"}
    </button>
  );
}
