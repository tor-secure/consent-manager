"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { primaryBtn, secondaryBtn } from "@/components/learning/ui";
import { quizStartStorageKey, type PreloadedQuizStart } from "@/lib/learning/quiz-start-cache";

export function LessonActions({
  slug,
  lessonComplete,
  quizPassed = false,
  sectionsReady = false,
  sectionIds = [],
}: {
  slug: string;
  lessonComplete: boolean;
  quizPassed?: boolean;
  sectionsReady?: boolean;
  sectionIds?: string[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const quizHref = `/e-learning/module/${slug}/quiz?start=1`;

  useEffect(() => {
    if (!sectionsReady || lessonComplete) return;
    router.prefetch(quizHref);
  }, [sectionsReady, lessonComplete, quizHref, router]);

  async function complete() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/learning/modules/${slug}/lesson`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionIds, startQuiz: true }),
      });
      const body = (await response.json().catch(() => null)) as
        | (PreloadedQuizStart & { message?: string; error?: string })
        | null;
      if (!response.ok) {
        setError(body?.message ?? "The lesson could not be marked complete. Try again.");
        return;
      }
      if (body?.attemptId && Array.isArray(body.questions) && body.questions.length > 0) {
        try {
          sessionStorage.setItem(
            quizStartStorageKey(slug),
            JSON.stringify({
              attemptId: body.attemptId,
              questions: body.questions,
              passPercent: body.passPercent,
            } satisfies PreloadedQuizStart),
          );
        } catch {
          // Quiz page will start via POST if storage is unavailable.
        }
      }
      setJustCompleted(true);
      router.push(quizHref);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      {lessonComplete ? (
        <Link className={quizPassed ? secondaryBtn : primaryBtn} href={`/e-learning/module/${slug}/quiz`} prefetch>
          {quizPassed ? "Retake module quiz" : "Take module quiz"}
        </Link>
      ) : (
        <button type="button" className={primaryBtn} onClick={complete} disabled={pending || !sectionsReady} aria-busy={pending}>
          {pending ? "Opening quiz…" : "Mark lesson complete"}
        </button>
      )}
      <div aria-live="polite" className="text-sm">
        {justCompleted ? <p className="font-medium text-[#065f52]">Lesson marked complete. Opening the quiz.</p> : null}
      </div>
      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
