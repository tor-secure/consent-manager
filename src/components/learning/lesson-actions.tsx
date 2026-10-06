"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LessonActions({ slug, lessonComplete }: { slug: string; lessonComplete: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function complete() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/learning/modules/${slug}/lesson`, { method: "POST" });
      if (!response.ok) {
        setError("The lesson could not be marked complete.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {lessonComplete ? (
        <a className="inline-block rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white" href={`/e-learning/module/${slug}/quiz`}>
          Take module quiz
        </a>
      ) : (
        <button type="button" className="rounded-lg bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white" onClick={complete} disabled={pending}>
          {pending ? "Saving…" : "Mark lesson complete"}
        </button>
      )}
    </div>
  );
}
