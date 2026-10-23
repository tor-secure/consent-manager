"use client";

import { useState, useTransition } from "react";

import { ShieldLoader } from "@/components/ui/shield-loader";
import { enrollInDpdpCourse } from "@/lib/learning/enroll-action";
import { primaryBtn } from "@/components/learning/ui";

const GUEST_ENROLL_HREF = `/e-learning/sign-in?redirect_url=${encodeURIComponent("/e-learning?intent=enroll")}`;

export function EnrollButton({
  moduleCount,
  signedIn,
}: {
  moduleCount: number;
  signedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  if (!signedIn) {
    return (
      <a
        href={GUEST_ENROLL_HREF}
        aria-label={`Log in to enroll in all ${moduleCount} modules`}
        className={`${primaryBtn} h-12 min-w-40 px-8 text-base`}
      >
        Enroll
      </a>
    );
  }

  function enroll() {
    if (pending) return;
    setError("");
    startTransition(async () => {
      const result = await enrollInDpdpCourse();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={enroll}
        disabled={pending}
        aria-busy={pending}
        aria-label={`Enroll in all ${moduleCount} modules`}
        className={`${primaryBtn} h-12 min-w-40 px-8 text-base`}
      >
        {pending ? (
          <>
            <ShieldLoader />
            Enrolling…
          </>
        ) : (
          "Enroll"
        )}
      </button>
      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
