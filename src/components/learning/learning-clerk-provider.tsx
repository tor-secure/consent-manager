import { ClerkProvider } from "@clerk/nextjs";
import { ui } from "@clerk/ui";
import type { ReactNode } from "react";

import { learningClerkKeys } from "@/lib/learning/clerk";

/** Separate Clerk application for e-learning — never the workspace/dashboard app. */
export function LearningClerkProvider({ children }: { children: ReactNode }) {
  const { publishableKey, configured } = learningClerkKeys();
  if (!configured) return children;
  return (
    <ClerkProvider
      // Must be the Learning app key — never NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (dashboard).
      publishableKey={publishableKey}
      signInUrl="/e-learning/sign-in"
      signUpUrl="/e-learning/sign-up"
      signInFallbackRedirectUrl="/e-learning/session"
      signUpFallbackRedirectUrl="/e-learning/session"
      signInForceRedirectUrl="/e-learning/session"
      signUpForceRedirectUrl="/e-learning/session"
      afterSignOutUrl="/e-learning"
      dynamic
      ui={ui}
    >
      {children}
    </ClerkProvider>
  );
}
