"use client";

import { useCallback, useRef, useState } from "react";
import { notify } from "@/components/feedback/notify";
import { userFacingError } from "@/lib/dashboard-feedback";

export function useAsyncAction() {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  const run = useCallback(async (task: () => Promise<void>) => {
    if (pendingRef.current) return false;
    pendingRef.current = true;
    setPending(true);
    try {
      await task();
      return true;
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, []);

  return { pending, run };
}

export async function dashboardFetch(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  options: {
    successMessage: string;
    errorFallback: string;
    onValidation?: (message: string) => void;
    silentSuccess?: boolean;
  },
): Promise<{ ok: true; data: unknown } | { ok: false }> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    notify.error("Unable to connect. Please try again.");
    return { ok: false };
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (response.ok) {
    if (!options.silentSuccess) notify.success(options.successMessage);
    return { ok: true, data };
  }

  const serverMessage =
    typeof data === "object" &&
    data !== null &&
    "message" in data &&
    typeof (data as { message: unknown }).message === "string"
      ? (data as { message: string }).message
      : undefined;

  const error = userFacingError(response.status, serverMessage, options.errorFallback);
  if (error.showInline && options.onValidation) {
    options.onValidation(error.message);
  } else {
    notify.error(error.message);
  }
  return { ok: false };
}
