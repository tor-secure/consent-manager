"use client";

import { AuthenticateWithRedirectCallback, useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

import { PageLoader } from "@/components/ui/page-loader";

export default function SignUpSsoCallbackPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || redirected.current) return;

    const timer = window.setTimeout(() => {
      if (redirected.current) return;
      redirected.current = true;
      window.location.replace("/dashboard");
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [isLoaded, isSignedIn]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F3F4F6]">
      <PageLoader label="Completing sign up…" />
      <AuthenticateWithRedirectCallback
        signInForceRedirectUrl="/dashboard"
        signUpForceRedirectUrl="/dashboard"
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
