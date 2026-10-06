import Link from "next/link";
import { redirect } from "next/navigation";

import { AssessmentRunner } from "@/components/learning/assessment-runner";
import { LockMark } from "@/components/learning/lock-mark";
import { ProgressBar } from "@/components/learning/progress-bar";
import { card, eyebrow, primaryBtn, secondaryBtn } from "@/components/learning/ui";
import { MODULE_COUNT } from "@/lib/learning/engine";
import { learnerPageContext } from "@/lib/learning/page-context";
import { getExamHistory } from "@/lib/learning/service";

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default async function FinalExamPage() {
  const learner = await learnerPageContext();
  const history = await getExamHistory(learner);
  if (history.error) redirect("/e-learning");
  const total = MODULE_COUNT;
  const passedAttempt = history.attempts.find((attempt) => attempt.passed);

  return (
    <div className="mx-auto max-w-3xl space-y-6 text-[#0B2C4A]">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[#4d6570]">
          <li>
            <Link href="/e-learning" className="font-medium text-[#0B2C4A] underline-offset-4 hover:underline">
              E-learning
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Final examination</li>
        </ol>
      </nav>

      <section className={`${card} p-6 sm:p-8`}>
        <p className={eyebrow}>Final examination</p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-[1.75rem]">DPDP course examination</h1>
        <p className="mt-2 text-justify text-base leading-7 text-[#36505c]">
          This is a course examination. It is not a government or legally mandated DPDP certification.
        </p>
        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Questions", String(history.questionCount)],
            ["Pass mark", `${history.passPercent}%`],
            ["Coverage", `All ${total} modules`],
            ["Time", `About ${history.estimatedMinutes} min`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg bg-[#f3f7f6] px-3 py-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-[#4d6570]">{label}</dt>
              <dd className="mt-1 text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        {passedAttempt ? (
          <div className="mt-5 flex flex-col gap-3 rounded-lg border border-[#bfe9e0] bg-[#E6F9F5] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold">You passed with {passedAttempt.percentage}%. Your certificate is ready.</p>
            <Link href="/e-learning/certificate" className={primaryBtn}>
              View certificate
            </Link>
          </div>
        ) : null}
      </section>

      {!history.unlocked ? (
        <section className={`${card} p-6 text-center sm:p-8`} aria-labelledby="exam-locked">
          <div className="flex justify-center">
            <LockMark />
          </div>
          <h2 id="exam-locked" className="mt-4 text-lg font-semibold">
            The examination unlocks after all {total} modules
          </h2>
          <p className="mt-2 text-sm text-[#4d6570]">Pass every module quiz to open the final examination.</p>
          <div className="mx-auto mt-5 max-w-sm">
            <ProgressBar value={(history.completedModules / total) * 100} label="Modules completed" size="sm" />
            <p className="mt-2 text-sm text-[#4d6570]">
              {history.completedModules} / {total} modules completed
            </p>
          </div>
          <Link href="/e-learning" className={`${primaryBtn} mt-6`}>
            Continue learning
          </Link>
        </section>
      ) : (
        <AssessmentRunner
          title={history.attempts.length > 0 ? "Start a new attempt" : "Start the examination"}
          intro="Answer every question, then submit. Each retake is saved as a separate attempt."
          questionCount={history.questionCount}
          defaultPassPercent={history.passPercent}
          startPath="/api/learning/exam"
          submitBasePath="/api/learning/exam"
          onPassedHref="/e-learning/certificate"
          passedLabel="View certificate"
        />
      )}

      {history.attempts.length > 0 ? (
        <section aria-labelledby="attempt-history" className="space-y-3">
          <h2 id="attempt-history" className="text-lg font-semibold">
            Attempt history
          </h2>
          <div className={`${card} overflow-hidden`}>
            <table className="w-full text-left text-sm">
              <thead className="hidden bg-[#f3f7f6] text-xs uppercase tracking-wide text-[#4d6570] sm:table-header-group">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Attempt</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Date</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Score</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d5e3e0]">
                {history.attempts.map((attempt) => (
                  <tr key={attempt.id} className="grid grid-cols-2 gap-1 px-4 py-3 sm:table-row sm:p-0">
                    <td className="font-semibold sm:px-4 sm:py-3">Attempt {attempt.attemptNumber}</td>
                    <td className="text-right text-[#4d6570] sm:px-4 sm:py-3 sm:text-left">{formatDate(attempt.submittedAt)}</td>
                    <td className="tabular-nums sm:px-4 sm:py-3">{attempt.submittedAt ? `${attempt.percentage}%` : "—"}</td>
                    <td className="text-right sm:px-4 sm:py-3 sm:text-left">
                      <span
                        className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${
                          !attempt.submittedAt ? "bg-[#eef3f2] text-[#0B2C4A]" : attempt.passed ? "bg-[#E6F9F5] text-[#065f52]" : "bg-red-50 text-red-800"
                        }`}
                      >
                        {!attempt.submittedAt ? "In progress" : attempt.passed ? "Passed" : "Not passed"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <p>
        <Link href="/e-learning" className={secondaryBtn}>
          Back to course
        </Link>
      </p>
    </div>
  );
}
