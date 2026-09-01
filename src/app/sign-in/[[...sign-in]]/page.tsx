import { SignIn } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] px-4 py-10">
      <div className="mb-6 flex w-full max-w-md items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-[var(--foreground)]">
          Consent Manager
        </Link>
        <ThemeToggle />
      </div>
      <SignIn fallbackRedirectUrl="/dashboard" signUpUrl="/sign-up" />
    </div>
  );
}
