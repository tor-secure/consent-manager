"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function WebsiteDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Website detail failed:", error);
  }, [error]);

  return (
    <div className="page-wrap flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">This website page could not load</h1>
      <p className="max-w-md text-sm text-[var(--muted-foreground)]">
        The website was created. Reload this page, or go back to the websites list.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="btn btn-primary"
        >
          Try again
        </button>
        <Link
          href="/dashboard/websites"
          className="btn btn-outline"
        >
          Back to websites
        </Link>
      </div>
    </div>
  );
}
