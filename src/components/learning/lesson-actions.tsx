"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { primaryBtn, secondaryBtn } from "@/components/learning/ui";

export function LessonActions({
  slug,
  lessonComplete,
  quizPassed = false,
}: {
  slug: string;
  lessonComplete: boolean;
  quizPassed?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);

  async function complete() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/learning/modules/${slug}/lesson`, { method: "POST" });
      if (!response.ok) {
        setError("The lesson could not be marked complete. Try again.");
        return;
      }
      setJustCompleted(true);
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {lessonComplete ? (
        <Link className={quizPassed ? secondaryBtn : primaryBtn} href={`/e-learning/module/${slug}/quiz`}>
          {quizPassed ? "Retake module quiz" : "Take module quiz"}
        </Link>
      ) : (
        <button type="button" className={primaryBtn} onClick={complete} disabled={pending} aria-busy={pending}>
          {pending ? "Saving…" : "Mark lesson complete"}
        </button>
      )}
      <div aria-live="polite" className="text-sm">
        {justCompleted && lessonComplete ? <p className="font-medium text-[#065f52]">Lesson marked complete. The quiz is open.</p> : null}
      </div>
      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
