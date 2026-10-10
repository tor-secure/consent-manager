"use client";

import { useState, useTransition } from "react";

import { enrollInDpdpCourse } from "@/lib/learning/enroll-action";
import { primaryBtn } from "@/components/learning/ui";

export function EnrollButton({ moduleCount }: { moduleCount: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function enroll() {
    if (pending) return;
    setError("");
    startTransition(async () => {
      const result = await enrollInDpdpCourse();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 lg:items-end">
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
            <span aria-hidden="true" className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white motion-safe:animate-spin" />
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
