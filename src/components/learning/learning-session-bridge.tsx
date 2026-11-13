"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { LearningClerkProvider } from "@/components/learning/learning-clerk-provider";
import { learningClerkKeys } from "@/lib/learning/clerk";

function readSignedOutFlag() {
  try {
    return document.cookie.split("; ").some((part) => part.startsWith("cg_learning_signed_out="));
  } catch {
    return false;
  }
}

/**
 * If Learning Clerk is signed in but the app session cookie (cg_learning) is missing,
 * mint the app session once. Skips when the user just logged out on purpose.
 */
function Bridge({ hasAppSession }: { hasAppSession: boolean }) {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = usePathname();
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded || hasAppSession || !isSignedIn || started.current) return;
    if (readSignedOutFlag()) return;
    if (pathname.startsWith("/e-learning/sign-in") || pathname.startsWith("/e-learning/sign-up")) return;
    if (pathname.startsWith("/e-learning/sign-out")) return;
    if (pathname.startsWith("/e-learning/session")) return;
    started.current = true;
    const next = encodeURIComponent(pathname || "/e-learning");
    window.location.replace(`/e-learning/session?next=${next}`);
  }, [hasAppSession, isLoaded, isSignedIn, pathname]);

  return null;
}

export function LearningSessionBridge({ hasAppSession }: { hasAppSession: boolean }) {
  if (hasAppSession || !learningClerkKeys().configured) return null;
  return (
    <LearningClerkProvider>
      <Bridge hasAppSession={hasAppSession} />
    </LearningClerkProvider>
  );
}
