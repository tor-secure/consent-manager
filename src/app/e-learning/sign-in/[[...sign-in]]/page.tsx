import { SignIn } from "@clerk/nextjs";

import { AuthPageShell, clerkAuthAppearance } from "@/components/auth/auth-page-shell";
import { learningClerkKeys, safeLearningPath } from "@/lib/learning/clerk";

export default async function LearningSignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const { redirect_url } = await searchParams;
  const next = safeLearningPath(redirect_url);
  const sessionUrl = `/e-learning/session?next=${encodeURIComponent(next)}`;
  const signUpHref = `/e-learning/sign-up?redirect_url=${encodeURIComponent(next)}`;
  if (!learningClerkKeys().configured) {
    return (
      <AuthPageShell mode="sign-in" accountHref={signUpHref}>
        <p className="text-sm text-[#0B2C4A]">
          E-learning sign-in is not configured yet. Add the learning Clerk keys, then reload this page.
        </p>
      </AuthPageShell>
    );
  }
  return (
    <AuthPageShell mode="sign-in" accountHref={signUpHref}>
      <SignIn
        forceRedirectUrl={sessionUrl}
        fallbackRedirectUrl={sessionUrl}
        signUpUrl={`/e-learning/sign-up?redirect_url=${encodeURIComponent(next)}`}
        appearance={clerkAuthAppearance}
      />
    </AuthPageShell>
  );
}
