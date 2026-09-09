"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard route failed:", error);
  }, [error]);

  return (
    <div className="page-wrap flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-semibold text-[var(--foreground)]">This page couldn’t load</h1>
      <Alert variant="error" role="alert" className="max-w-md">
        An unexpected error interrupted this dashboard view. Retry the request; if it continues, share the reference below with an administrator.
      </Alert>
      {error.digest ? <p className="text-xs text-[var(--muted-foreground)]">Reference: <span className="font-mono">{error.digest}</span></p> : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/dashboard"
          className="btn btn-secondary"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
