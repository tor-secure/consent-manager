"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

type CmpApi = {
  setSubjectSession?: (input: {
    token: string;
    websiteId?: string;
    expiresAt?: string;
    subjectKey?: string;
  }) => Promise<unknown> | unknown;
  clearSubjectSession?: () => unknown;
  getPreferenceSnapshot?: () => {
    websiteId?: string | null;
  };
  getConsentContext?: () => {
    mode?: string;
    subjectKey?: string | null;
  };
};

/**
 * Consent Guru first-party: after Clerk login, mint a subject session and hand
 * it to the CMP SDK. Ownership is (websiteId, Clerk userId) — not email and not
 * guest consentId. On sign-out / user switch, clear the subject session and
 * start a fresh guest context so grants cannot leak across accounts.
 */
export function BindConsentSubjectOnLogin() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const lastSessionKey = useRef("");
  const wasSignedIn = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    const cmp = () => (window as Window & { CMP?: CmpApi }).CMP;

    if (!isSignedIn || !userId) {
      if (wasSignedIn.current) {
        wasSignedIn.current = false;
        lastSessionKey.current = "";
        try {
          cmp()?.clearSubjectSession?.();
        } catch {
          // Best-effort isolation on logout.
        }
      }
      return;
    }

    wasSignedIn.current = true;

    let cancelled = false;
    let attempts = 0;
    let timer: number | undefined;

    async function establishSession() {
      if (cancelled) return;
      attempts += 1;

      const snap = cmp()?.getPreferenceSnapshot?.();
      const websiteId = snap?.websiteId?.trim() || "";
      const siteKey =
        document.querySelector("script[data-site-key]")?.getAttribute("data-site-key")?.trim() ||
        "";

      if (!websiteId || !siteKey) {
        if (attempts < 40) timer = window.setTimeout(() => void establishSession(), 500);
        return;
      }

      const sessionKey = `${userId}:${websiteId}`;
      if (lastSessionKey.current === sessionKey) {
        const ctx = cmp()?.getConsentContext?.();
        if (ctx?.mode === "account" && ctx.subjectKey === userId) return;
      }

      try {
        const res = await fetch("/api/consent/subject/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ websiteId, siteKey }),
        });
        const data = (await res.json().catch(() => null)) as {
          success?: boolean;
          subjectSessionToken?: string;
          expiresAt?: string;
          subjectKey?: string;
          message?: string;
        } | null;

        if (!res.ok || !data?.success || !data.subjectSessionToken) {
          if (attempts < 40) timer = window.setTimeout(() => void establishSession(), 500);
          else if (process.env.NODE_ENV !== "production") {
            console.warn(
              "[CMP] subject session skipped",
              !res.ok ? res.status : data?.message || "unknown",
            );
          }
          return;
        }

        lastSessionKey.current = sessionKey;
        await cmp()?.setSubjectSession?.({
          token: data.subjectSessionToken,
          websiteId,
          expiresAt: data.expiresAt || undefined,
          subjectKey: data.subjectKey || userId || undefined,
        });
      } catch {
        if (attempts < 40) timer = window.setTimeout(() => void establishSession(), 500);
      }
    }

    void establishSession();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [isLoaded, isSignedIn, userId]);

  return null;
}
