import { SignUp } from "@clerk/nextjs";
import { AuthPageShell, clerkAuthAppearance } from "@/components/auth/auth-page-shell";

export default function SignUpPage() {
  return (
    <AuthPageShell mode="sign-up">
      <SignUp
        fallbackRedirectUrl="/dashboard"
        signInUrl="/sign-in"
        appearance={clerkAuthAppearance}
      />
    </AuthPageShell>
  );
}
