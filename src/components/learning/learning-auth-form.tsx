"use client";

import { SignIn, SignUp, useAuth } from "@clerk/nextjs";

import { clerkAuthAppearance } from "@/components/auth/auth-page-shell";
import { ShieldLoader } from "@/components/ui/shield-loader";

function AuthFormSkeleton({ label }: { label: string }) {
  return (
    <div
      className="cmp-auth-form-card w-full max-w-full rounded-2xl border border-solid border-[#E5E7EB] bg-white px-4 py-8 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.28)] min-[400px]:px-6 sm:px-8 sm:py-10"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3">
        <ShieldLoader />
        <p className="text-sm font-semibold text-[#4d6570]">{label}</p>
      </div>
      <div className="mt-8 space-y-3" aria-hidden="true">
        <div className="h-11 w-full animate-pulse rounded-xl bg-[#E5E7EB]" />
        <div className="h-11 w-full animate-pulse rounded-xl bg-[#E5E7EB]" />
        <div className="h-11 w-full animate-pulse rounded-xl bg-[#d7e3e0]" />
        <div className="h-11 w-full animate-pulse rounded-xl bg-[#0B2C4A]" />
      </div>
    </div>
  );
}

const SIGN_IN_LOADING = "Loading sign-in" + "...";
const SIGN_UP_LOADING = "Loading sign-up" + "...";

export function LearningSignInForm({
  sessionUrl,
  signUpUrl,
}: {
  sessionUrl: string;
  signUpUrl: string;
}) {
  const { isLoaded } = useAuth();
  if (!isLoaded) {
    return <AuthFormSkeleton label={SIGN_IN_LOADING} />;
  }
  return (
    <SignIn
      path="/e-learning/sign-in"
      routing="path"
      forceRedirectUrl={sessionUrl}
      fallbackRedirectUrl={sessionUrl}
      signUpUrl={signUpUrl}
      signUpForceRedirectUrl={sessionUrl}
      appearance={clerkAuthAppearance}
    />
  );
}

export function LearningSignUpForm({
  sessionUrl,
  signInUrl,
}: {
  sessionUrl: string;
  signInUrl: string;
}) {
  const { isLoaded } = useAuth();
  if (!isLoaded) {
    return <AuthFormSkeleton label={SIGN_UP_LOADING} />;
  }
  return (
    <SignUp
      path="/e-learning/sign-up"
      routing="path"
      forceRedirectUrl={sessionUrl}
      fallbackRedirectUrl={sessionUrl}
      signInUrl={signInUrl}
      signInForceRedirectUrl={sessionUrl}
      appearance={clerkAuthAppearance}
    />
  );
}
