"use client";

import { useSyncExternalStore } from "react";
import { GetLiveStrip, type GetLiveStep } from "@/components/dashboard/get-live-strip";

export const SETUP_DISMISS_KEY = "cmp:setup:dismissed";
const SETUP_EVENT = "cmp-setup-change";

function readDismissed() {
  try {
    return window.localStorage.getItem(SETUP_DISMISS_KEY) === "true";
  } catch {
    return false;
  }
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SETUP_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SETUP_EVENT, onStoreChange);
  };
}

export function setSetupDismissed(dismissed: boolean) {
  try {
    window.localStorage.setItem(SETUP_DISMISS_KEY, String(dismissed));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(SETUP_EVENT));
}

export function useSetupDismissed() {
  return useSyncExternalStore(subscribe, readDismissed, () => false);
}

export function SetupGuide({
  steps,
  complete,
}: {
  steps: GetLiveStep[];
  complete: boolean;
}) {
  const dismissed = useSetupDismissed();
  if (complete || dismissed) return null;
  return <GetLiveStrip steps={steps} onDismiss={() => setSetupDismissed(true)} />;
}

export function SetupGuideHeaderButton({ complete }: { complete: boolean }) {
  const dismissed = useSetupDismissed();
  if (complete || !dismissed) return null;
  return (
    <a
      href="/dashboard#get-live"
      onClick={() => setSetupDismissed(false)}
      className="hidden h-10 items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 text-xs font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] sm:inline-flex"
    >
      Setup
    </a>
  );
}
