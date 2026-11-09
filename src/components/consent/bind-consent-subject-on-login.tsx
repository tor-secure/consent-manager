"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

type CmpApi = {
  getPreferenceSnapshot?: () => {
    consentId?: string | null;
    websiteId?: string | null;
  };
  onConsentChange?: (fn: () => void) => void;
};

/**
 * After Clerk login (and whenever consentId changes), attach the verified
 * account email to the active consent record.
 */
export function BindConsentSubjectOnLogin() {
  const { isLoaded, isSignedIn } = useAuth();
  const lastKey = useRef("");

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;
    let pollTimer: number | undefined;
    let listenerAttached = false;

    async function tryBind(force = false) {
      if (cancelled) return;
      attempts += 1;

      const cmp = (window as Window & { CMP?: CmpApi }).CMP;
      const snap = cmp?.getPreferenceSnapshot?.();
      const consentId = snap?.consentId?.trim() || "";
      const websiteId = snap?.websiteId?.trim() || "";
      const siteKey =
        document.querySelector("script[data-site-key]")?.getAttribute("data-site-key")?.trim() ||
        "";

      if (!consentId || !websiteId || !siteKey) {
        if (attempts < 40) timer = window.setTimeout(() => void tryBind(force), 500);
        return;
      }

      const key = `${consentId}:${websiteId}`;
      if (!force && lastKey.current === key) return;

      try {
        const res = await fetch("/api/consent/subject/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ consentId, websiteId, siteKey }),
        });
        const data = (await res.json().catch(() => null)) as
          | { bound?: boolean; reason?: string | null; message?: string }
          | null;
        if (res.ok && data?.bound) {
          lastKey.current = key;
        } else if (
          res.ok &&
          (data?.reason === "consent_not_found" || data?.reason === "not_signed_in") &&
          attempts < 40
        ) {
          timer = window.setTimeout(() => void tryBind(true), 500);
        } else if (process.env.NODE_ENV !== "production") {
          console.warn(
            "[CMP] subject bind skipped",
            !res.ok ? res.status : data?.reason || data?.message || "unknown",
          );
        }
      } catch {
        // Binding is best-effort; record/withdraw also bind in-request.
      }
    }

    function onConsentChanged() {
      attempts = 0;
      void tryBind(true);
    }

    function attachCmpListener() {
      if (cancelled || listenerAttached) return;
      const cmp = (window as Window & { CMP?: CmpApi }).CMP;
      if (!cmp?.onConsentChange) return false;
      cmp.onConsentChange(onConsentChanged);
      listenerAttached = true;
      return true;
    }

    void tryBind(true);
    if (!attachCmpListener()) {
      let polls = 0;
      pollTimer = window.setInterval(() => {
        polls += 1;
        if (attachCmpListener() || polls >= 40) {
          if (pollTimer) window.clearInterval(pollTimer);
        }
      }, 500);
    }

    window.addEventListener("cmp:consent", onConsentChanged);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      if (pollTimer) window.clearInterval(pollTimer);
      window.removeEventListener("cmp:consent", onConsentChanged);
    };
  }, [isLoaded, isSignedIn]);

  return null;
}
