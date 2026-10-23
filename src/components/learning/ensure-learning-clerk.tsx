"use client";

import { useEffect } from "react";

const learningKey = process.env.NEXT_PUBLIC_LEARNING_CLERK_PUBLISHABLE_KEY?.trim();

/**
 * The site root keeps the workspace Clerk app mounted across client navigations.
 * If that app is still active on an e-learning sign-in page, reload so only the
 * learning Clerk application is used.
 */
export function EnsureLearningClerk() {
  useEffect(() => {
    if (!learningKey) return;
    const active = (window as Window & { __clerk_publishable_key?: string }).__clerk_publishable_key;
    if (active && active !== learningKey) {
      window.location.reload();
    }
  }, []);

  return null;
}
