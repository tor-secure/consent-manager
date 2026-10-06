"use client";

import Link from "next/link";
import { useEffect } from "react";

import { primaryBtn, secondaryBtn } from "@/components/learning/ui";

export default function ELearningError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section role="alert" className="mx-auto max-w-xl rounded-xl border border-[#d5e3e0] bg-white p-8 text-center text-[#0B2C4A]">
      <h1 className="text-xl font-semibold">This page could not load</h1>
      <p className="mt-2 text-base leading-7 text-[#36505c]">
        Your progress is saved. Try again, or return to the course.
      </p>
      {error.digest ? <p className="mt-2 text-xs text-[#4d6570]">Reference: {error.digest}</p> : null}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" className={primaryBtn} onClick={() => retry()}>
          Try again
        </button>
        <Link href="/e-learning" className={secondaryBtn}>
          Back to the course
        </Link>
      </div>
    </section>
  );
}
