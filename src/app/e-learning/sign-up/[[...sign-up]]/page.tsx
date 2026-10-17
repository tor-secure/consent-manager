import { SignUp } from "@clerk/nextjs";

import { AuthPageShell, clerkAuthAppearance } from "@/components/auth/auth-page-shell";
import { learningClerkKeys, safeLearningPath } from "@/lib/learning/clerk";

export default async function LearningSignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  const next = safeLearningPath(redirect_url);
  const sessionUrl = `/e-learning/session?next=${encodeURIComponent(next)}`;
  const signInHref = `/e-learning/sign-in?redirect_url=${encodeURIComponent(next)}`;
  if (!learningClerkKeys().configured) {
    return (
      <AuthPageShell mode="sign-up" audience="learning" accountHref={signInHref}>
        <p className="text-sm text-[#0B2C4A]">
          E-learning sign-up is not configured yet. Add the learning Clerk keys, then reload this page.
        </p>
      </AuthPageShell>
    );
  }
  return (
    <AuthPageShell mode="sign-up" audience="learning" accountHref={signInHref}>
      <SignUp
        forceRedirectUrl={sessionUrl}
        fallbackRedirectUrl={sessionUrl}
        signInUrl={`/e-learning/sign-in?redirect_url=${encodeURIComponent(next)}`}
        appearance={clerkAuthAppearance}
      />
    </AuthPageShell>
  );
}
