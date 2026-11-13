"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

import { learningClerkKeys } from "@/lib/learning/clerk";
import { ShieldLoader } from "@/components/ui/shield-loader";

function markSignedOut() {
  try {
    document.cookie = "cg_learning_signed_out=1; Path=/; Max-Age=300; SameSite=Lax";
    document.cookie = "cg_learning_ui=; Path=/; Max-Age=0; SameSite=Lax";
  } catch {
    /* ignore */
  }
}

async function clearAppSession() {
  await fetch("/api/learning/sign-out", {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
}

function goToEnrollHome() {
  window.location.replace("/e-learning");
}

function SignOutShell() {
  return (
    <main className="flex min-h-[50vh] flex-1 flex-col items-center justify-center gap-3 bg-[#f3f7f6] px-4 text-[#0B2C4A]">
      <ShieldLoader />
      <p className="text-sm font-semibold text-[#4d6570]" role="status" aria-live="polite">
        Signing out...
      </p>
    </main>
  );
}

/**
 * Clear the course session immediately, best-effort Clerk signOut (short wait),
 * then land on the public enroll page. Never blocks the UI on slow Clerk load.
 */
function runSignOut(options: {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  signOut: (() => Promise<void>) | null;
}) {
  markSignedOut();

  const clerkStep =
    options.isLoaded && options.isSignedIn && options.signOut
      ? Promise.race([
          options.signOut().then(() => undefined),
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, 1500);
          }),
        ])
      : Promise.resolve();

  return Promise.all([clerkStep, clearAppSession().catch(() => undefined)]).then(() => {
    goToEnrollHome();
  });
}

function AppOnlySignOut() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void runSignOut({ isLoaded: true, isSignedIn: false, signOut: null });
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(goToEnrollHome, 4000);
    return () => window.clearTimeout(timer);
  }, []);

  return <SignOutShell />;
}

function ClerkSignOut() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const started = useRef(false);

  useEffect(() => {
    // Don't wait forever for Clerk — start clearing after 800ms even if still loading.
    const delay = isLoaded ? 0 : 800;
    const timer = window.setTimeout(() => {
      if (started.current) return;
      started.current = true;
      void runSignOut({
        isLoaded,
        isSignedIn,
        signOut: () => signOut().then(() => undefined),
      });
    }, delay);
    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn, signOut]);

  useEffect(() => {
    const timer = window.setTimeout(goToEnrollHome, 5000);
    return () => window.clearTimeout(timer);
  }, []);

  return <SignOutShell />;
}

export default function LearningSignOutPage() {
  if (!learningClerkKeys().configured) {
    return <AppOnlySignOut />;
  }
  return <ClerkSignOut />;
}
