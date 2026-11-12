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
    consentId?: string | null;
  };
  getConsent?: () => { consentId?: string | null };
  getConsentContext?: () => {
    mode?: string;
    subjectKey?: string | null;
    consentId?: string | null;
  };
};

/**
 * Consent Guru first-party: after Clerk login/sign-up, mint a subject session and
 * bind the verified email to the current guest consentId when present. Ownership
 * remains (websiteId, Clerk userId). On sign-out, clear only the subject session —
 * browser Accept/Reject choices stay remembered on this device.
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

      const api = cmp();
      const snap = api?.getPreferenceSnapshot?.();
      const websiteId = snap?.websiteId?.trim() || "";
      const siteKey =
        document.querySelector("script[data-site-key]")?.getAttribute("data-site-key")?.trim() ||
        "";
      const consentId =
        snap?.consentId?.trim() ||
        api?.getConsent?.()?.consentId?.trim() ||
        api?.getConsentContext?.()?.consentId?.trim() ||
        "";

      if (!websiteId || !siteKey) {
        if (attempts < 40) timer = window.setTimeout(() => void establishSession(), 500);
        return;
      }

      const sessionKey = `${userId}:${websiteId}:${consentId || "-"}`;
      if (lastSessionKey.current === sessionKey) {
        const ctx = api?.getConsentContext?.();
        if (ctx?.mode === "account" && ctx.subjectKey === userId) {
          // Session is live; keep polling briefly until a guest consentId exists to bind.
          if (!consentId && attempts < 8) {
            timer = window.setTimeout(() => void establishSession(), 1500);
          }
          return;
        }
      }

      try {
        const res = await fetch("/api/consent/subject/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            websiteId,
            siteKey,
            ...(consentId ? { consentId } : {}),
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          success?: boolean;
          subjectSessionToken?: string;
          expiresAt?: string;
          subjectKey?: string;
          emailBound?: boolean;
          consentEmailBound?: boolean;
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
        await api?.setSubjectSession?.({
          token: data.subjectSessionToken,
          websiteId,
          expiresAt: data.expiresAt || undefined,
          subjectKey: data.subjectKey || userId || undefined,
        });

        if (!consentId && attempts < 8) {
          timer = window.setTimeout(() => void establishSession(), 1500);
        }
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
