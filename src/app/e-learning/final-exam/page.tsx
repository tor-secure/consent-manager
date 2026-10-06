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
    <div className="space-y-6 text-[#0B2C4A]">
      <section className="rounded-xl border border-[var(--border)] bg-white p-5">
        <h1 className="text-2xl font-semibold">Final DPDP certification examination</h1>
        <p className="mt-2 text-sm">This is a course examination. It is not a government or legally mandated DPDP certification.</p>
        <dl className="mt-4 grid gap-2 text-sm leading-6 sm:grid-cols-2">
          <div><dt className="text-[#4d6570]">Questions</dt><dd>{history.questionCount}</dd></div>
          <div><dt className="text-[#4d6570]">Passing score</dt><dd>{history.passPercent}%</dd></div>
          <div><dt className="text-[#4d6570]">Coverage</dt><dd>All 30 modules</dd></div>
          <div><dt className="text-[#4d6570]">Estimated time</dt><dd>{history.estimatedMinutes} minutes</dd></div>
          <div className="sm:col-span-2"><dt className="text-[#4d6570]">Modules completed</dt><dd className="flex items-center gap-2">{history.completedModules} / 30 {history.unlocked ? null : <LockMark />}</dd></div>
        </dl>
        <p className="mt-4 text-sm leading-6">Answer every question. Submit when you are ready. Retakes are kept as separate attempts.</p>
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
