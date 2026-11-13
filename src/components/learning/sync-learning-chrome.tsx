"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { LEARNING_UI_COOKIE } from "@/lib/learning/ui-cookie";

function hasLearningUiCookie() {
  try {
    return document.cookie.split("; ").some((part) => part.startsWith(`${LEARNING_UI_COOKIE}=`));
  } catch {
    return false;
  }
}

/**
 * After logout the guest /e-learning tree can be soft-cached. If the readable
 * session marker is present but SSR still rendered the guest chrome (no sidebar),
 * force a refresh so LearningPortal mounts with signedIn.
 */
export function SyncLearningChrome({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const attempted = useRef(false);

  useEffect(() => {
    if (signedIn || attempted.current) return;
    if (!hasLearningUiCookie()) return;
    attempted.current = true;
    router.refresh();
  }, [signedIn, router]);

  return null;
}
