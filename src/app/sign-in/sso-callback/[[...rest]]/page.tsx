"use client";

import { AuthenticateWithRedirectCallback, useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

import { PageLoader } from "@/components/ui/page-loader";

/**
 * Dedicated OAuth/SSO finish route. The catch-all <SignIn /> path can leave
 * Clerk's spinner mounted forever after Google redirect; this handler + hard
 * navigation fallback unsticks App Router post-auth redirects.
 */
export default function SignInSsoCallbackPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || redirected.current) return;

    // If Clerk's soft navigation hangs (known with server redirect() targets),
    // force a full document navigation after a short grace period.
    const timer = window.setTimeout(() => {
      if (redirected.current) return;
      redirected.current = true;
      window.location.replace("/dashboard");
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6]">
      <PageLoader label="Completing sign in…" />
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/dashboard"
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
