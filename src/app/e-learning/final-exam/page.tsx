import Link from "next/link";
import { redirect } from "next/navigation";

import { AssessmentRunner } from "@/components/learning/assessment-runner";
import { LockMark } from "@/components/learning/lock-mark";
import { ProgressBar } from "@/components/learning/progress-bar";
import { primaryBtn, secondaryBtn } from "@/components/learning/ui";
import { FINAL_EXAM_DURATION_SECONDS } from "@/lib/learning/catalog";
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
    <div className="mx-auto max-w-5xl space-y-6 text-[#0B2C4A]">
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

      <section className="overflow-hidden rounded-[1.5rem] bg-white shadow-[0_20px_50px_-40px_rgba(11,44,74,0.4)] ring-1 ring-[#e4eeec]">
        <div className="border-b border-[#eef4f3] bg-[linear-gradient(135deg,#0B2C4A_0%,#123a5c_50%,#0a4f4a_100%)] px-6 py-7 text-white sm:px-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7FE8D6]">Final examination</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-[1.85rem]">DPDP course examination</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
            This is a course examination. It is not a government or legally mandated DPDP certification.
          </p>
        </div>
        <div className="px-6 py-6 sm:px-8">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Questions", String(history.questionCount)],
              ["Pass mark", `${history.passPercent}%`],
              ["Coverage", `All ${total} modules`],
              ["Time", `${history.estimatedMinutes} min`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#f7fbfa] px-3 py-3 ring-1 ring-[#e4eeec]">
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#4d6570]">{label}</dt>
                <dd className="mt-1 text-sm font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-sm leading-6 text-[#36505c]">
            Below {history.passPercent}% is not a pass. {history.passPercent}–79 is B, 80–89 is A, and 90–100 is A+.
          </p>
          {passedAttempt ? (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#bfe9e0] bg-[#E6F9F5] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold">
                You passed with {passedAttempt.percentage}%. Your certificate is ready.
              </p>
              <Link href="/e-learning/certificate" className={primaryBtn}>
                View certificate
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      {!history.unlocked ? (
        <section className="rounded-[1.5rem] bg-white p-6 text-center ring-1 ring-[#e4eeec] sm:p-8" aria-labelledby="exam-locked">
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
          intro={`Two questions are drawn at random from each of the ${total} modules, ${history.questionCount} in total. The order is shuffled. You have ${FINAL_EXAM_DURATION_SECONDS / 60} minutes. When that time ends, the exam submits the answers you have given. Each retake draws a new set.`}
          questionCount={history.questionCount}
          defaultPassPercent={history.passPercent}
          startPath="/api/learning/exam"
          submitBasePath="/api/learning/exam"
          onPassedHref="/e-learning/certificate"
          passedLabel="View certificate"
          timeLimitSeconds={FINAL_EXAM_DURATION_SECONDS}
        />
      )}

      {history.attempts.length > 0 ? (
        <section aria-labelledby="attempt-history" className="space-y-3">
          <h2 id="attempt-history" className="text-lg font-semibold">
            Attempt history
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {history.attempts.map((attempt) => {
              const status = !attempt.submittedAt ? "In progress" : attempt.passed ? "Passed" : "Not passed";
              const tone = !attempt.submittedAt
                ? "bg-[#eef3f2] text-[#0B2C4A]"
                : attempt.passed
                  ? "bg-[#E6F9F5] text-[#065f52]"
                  : "bg-red-50 text-red-800";
              return (
                <li
                  key={attempt.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-4 ring-1 ring-[#e4eeec]"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#0B2C4A]">Attempt {attempt.attemptNumber}</p>
                    <p className="mt-0.5 text-xs text-[#4d6570]">{formatDate(attempt.submittedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums text-[#0B2C4A]">
                      {attempt.submittedAt ? `${attempt.percentage}%` : "—"}
                    </p>
                    <span className={`mt-1 inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${tone}`}>
                      {status}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
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
