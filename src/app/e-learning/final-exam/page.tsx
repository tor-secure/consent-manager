import { redirect } from "next/navigation";

import { AssessmentRunner } from "@/components/learning/assessment-runner";
import { LockMark } from "@/components/learning/lock-mark";
import { learnerPageContext } from "@/lib/learning/page-context";
import { getExamHistory } from "@/lib/learning/service";

export default async function FinalExamPage() {
  const learner = await learnerPageContext();
  const history = await getExamHistory(learner);
  if (history.error) redirect("/e-learning");
  return (
    <div className="page-wrap space-y-6">
      <section className="rounded-xl border border-[var(--border)] bg-white p-5">
        <h1 className="text-2xl font-semibold">Final DPDP certification examination</h1>
        <p className="mt-2 text-sm">This is a course examination. It is not a government or legally mandated DPDP certification.</p>
        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
          <li>{history.questionCount} questions</li>
          <li>Passing score: {history.passPercent}%</li>
          <li>Coverage: all 30 modules</li>
          <li>Estimated time: {history.estimatedMinutes} minutes</li>
          <li>Answer every question. Submit when you are ready. Retakes are kept as separate attempts.</li>
          <li className="flex items-center gap-2">
            Modules completed: {history.completedModules} / 30.
            {history.unlocked ? <span>Examination available</span> : <LockMark />}
          </li>
        </ul>
      </section>
      {history.attempts.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold">Attempt history</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {history.attempts.map((attempt) => (
              <li key={attempt.id}>
                Attempt {attempt.attemptNumber} — {attempt.submittedAt ? `${attempt.percentage}% — ${attempt.passed ? "Passed" : "Failed"}` : "In progress"}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <AssessmentRunner
        title="Start examination"
        startPath="/api/learning/exam"
        submitPath={(attemptId) => `/api/learning/exam/${attemptId}`}
        onPassedHref="/e-learning/certificate"
      />
    </div>
  );
}
