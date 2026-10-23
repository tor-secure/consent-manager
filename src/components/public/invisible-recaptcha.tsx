"use client";

import { useEffect, useImperativeHandle, useRef } from "react";

const SCRIPT_ID = "cmp-recaptcha-api";
const WAIT_MS = 8000;

type Grecaptcha = {
  ready: (callback: () => void) => void;
  render: (
    element: HTMLElement,
    options: {
      sitekey: string;
      size: "invisible";
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ) => number;
  execute: (widgetId: number) => void;
  reset: (widgetId: number) => void;
};

export type InvisibleRecaptchaHandle = {
  execute: () => void;
  reset: () => void;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

/**
 * Invisible reCAPTCHA v2. The host must stay in the layout: `display: none`
 * makes Google fire the error callback before a token exists.
 */
export function InvisibleRecaptcha({
  ref,
  siteKey,
  onToken,
  onMissing,
  onFailed,
}: {
  ref: React.Ref<InvisibleRecaptchaHandle>;
  siteKey: string;
  onToken: (token: string) => void;
  onMissing: () => void;
  onFailed: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const pendingRef = useRef(false);
  const settledRef = useRef(false);
  const usedRef = useRef(false);
  const waitTimerRef = useRef<number | null>(null);
  const onTokenRef = useRef(onToken);
  const onMissingRef = useRef(onMissing);
  const onFailedRef = useRef(onFailed);
  onTokenRef.current = onToken;
  onMissingRef.current = onMissing;
  onFailedRef.current = onFailed;

  function clearWait() {
    if (waitTimerRef.current == null) return;
    window.clearTimeout(waitTimerRef.current);
    waitTimerRef.current = null;
  }

  function reportWidgetFailure() {
    const submitted = pendingRef.current || usedRef.current;
    settledRef.current = true;
    pendingRef.current = false;
    clearWait();
    if (submitted) onFailedRef.current();
  }

  function executeNow() {
    const api = window.grecaptcha;
    const widgetId = widgetIdRef.current;
    if (!api || widgetId == null) return false;
    if (usedRef.current) api.reset(widgetId);
    usedRef.current = true;
    settledRef.current = false;
    api.execute(widgetId);
    return true;
  }

  function armWait(started: boolean) {
    clearWait();
    waitTimerRef.current = window.setTimeout(() => {
      waitTimerRef.current = null;
      if (!pendingRef.current || settledRef.current) return;
      if (!started && executeNow()) {
        armWait(true);
        return;
      }
      pendingRef.current = false;
      onMissingRef.current();
    }, WAIT_MS);
  }

  useImperativeHandle(ref, () => ({
    execute() {
      if (!siteKey) {
        onMissingRef.current();
        return;
      }
      pendingRef.current = true;
      settledRef.current = false;
      const started = executeNow();
      armWait(started);
    },
    reset() {
      clearWait();
      pendingRef.current = false;
      const api = window.grecaptcha;
      const widgetId = widgetIdRef.current;
      if (!api || widgetId == null) return;
      api.reset(widgetId);
    },
  }));

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;

    function mount() {
      const api = window.grecaptcha;
      const host = hostRef.current;
      if (cancelled || !api?.ready || !host || widgetIdRef.current != null) return;
      api.ready(() => {
        const readyApi = window.grecaptcha;
        if (cancelled || !hostRef.current || widgetIdRef.current != null || !readyApi) return;
        widgetIdRef.current = readyApi.render(hostRef.current, {
          sitekey: siteKey,
          size: "invisible",
          callback: (token) => {
            settledRef.current = true;
            pendingRef.current = false;
            clearWait();
            onTokenRef.current(token);
          },
          "expired-callback": () => {
            reportWidgetFailure();
          },
          "error-callback": () => {
            reportWidgetFailure();
          },
        });
        if (pendingRef.current) executeNow();
      });
    }

    function onScriptError() {
      if (!pendingRef.current) return;
      pendingRef.current = false;
      clearWait();
      onMissingRef.current();
    }

    if (window.grecaptcha) {
      mount();
    } else {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement("script");
        script.id = SCRIPT_ID;
        script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount);
      script.addEventListener("error", onScriptError);
      return () => {
        cancelled = true;
        clearWait();
        script?.removeEventListener("load", mount);
        script?.removeEventListener("error", onScriptError);
      };
    }

    return () => {
      cancelled = true;
      clearWait();
    };
  }, [siteKey]);

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute h-px w-px overflow-visible opacity-0"
      aria-hidden="true"
    />
  );
}
