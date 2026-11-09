import { SignIn } from "@clerk/nextjs";
import { AuthPageShell, clerkAuthAppearance } from "@/components/auth/auth-page-shell";

export default function SignInPage() {
  return (
    <AuthPageShell mode="sign-in">
      <SignIn
        path="/sign-in"
        routing="path"
        fallbackRedirectUrl="/dashboard"
        forceRedirectUrl="/dashboard"
        signUpUrl="/sign-up"
        appearance={clerkAuthAppearance}
      />
    </AuthPageShell>
  );
}
