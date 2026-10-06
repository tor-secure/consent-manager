import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { EnrollButton } from "@/components/learning/enroll-button";
import { ModuleCards } from "@/components/learning/module-cards";
import { ProgressBar } from "@/components/learning/progress-bar";
import { StatusIcon } from "@/components/learning/status-icon";
import { card, eyebrow, pad, primaryBtn, secondaryBtn, textLink } from "@/components/learning/ui";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";
import { learnerPageContext } from "@/lib/learning/page-context";
import { getCourseHome } from "@/lib/learning/service";

const title = "E-learning — DPDP Act";
const description =
  "Thirty-module DPDP Act 2023 training with quizzes, a final examination, and a certificate of completion.";

export const metadata: Metadata = {
  title,
  description,
  robots: INDEXABLE_ROBOTS,
  alternates: pageAlternates("/e-learning"),
  ...socialMetadata({ title: `${title} — Consent Guru`, description, path: "/e-learning" }),
};

type CourseInfo = {
  title: string;
  description: string;
  instructor: string;
  moduleCount: number;
  estimatedMinutes: number;
  difficulty: string;
  passPercent: number;
  examQuestionCount: number;
};

function Hero({ course, action, note }: { course: CourseInfo; action: ReactNode; note?: ReactNode }) {
  const facts = [
    ["Modules", String(course.moduleCount)],
    ["Duration", `About ${Math.round(course.estimatedMinutes / 60)} hours`],
    ["Level", course.difficulty],
    ["Instructor", course.instructor],
  ];
  return (
    <section className={`${card} overflow-hidden`}>
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className={eyebrow}>DPDP Act 2023 training</p>
          <h1 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[#0B2C4A] sm:text-[2rem] sm:leading-[1.2]">
            {course.title}
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[#36505c]">{course.description}</p>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          {action}
          {note}
        </div>
      </div>
      <dl className="grid grid-cols-2 border-t border-[#d5e3e0] bg-[#fbfdfc] sm:grid-cols-4">
        {facts.map(([label, value], index) => (
          <div
            key={label}
            className={`px-6 py-4 sm:px-8 ${index % 2 === 1 ? "border-l border-[#d5e3e0]" : ""} ${index >= 2 ? "border-t border-[#d5e3e0] sm:border-t-0" : ""} ${index === 2 ? "sm:border-l" : ""}`}
          >
            <dt className="text-xs font-semibold uppercase tracking-wide text-[#4d6570]">{label}</dt>
            <dd className="mt-1 text-sm font-semibold leading-6 text-[#0B2C4A] sm:text-base">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Disclaimer({ text, reviewed }: { text: string; reviewed?: string }) {
  return (
    <section aria-label="Course disclaimer" className="border-t border-[#d5e3e0] pt-6">
      <p className="max-w-4xl text-sm leading-6 text-[#4d6570]">{text}</p>
      {reviewed ? <p className="mt-2 text-sm text-[#4d6570]">Last reviewed {reviewed}.</p> : null}
    </section>
  );
}

function AchievementCard({
  title: heading,
  state,
  detail,
  done,
  locked,
  action,
}: {
  title: string;
  state: string;
  detail: string;
  done: boolean;
  locked: boolean;
  action?: ReactNode;
}) {
  return (
    <div className={`${card} flex flex-col gap-4 p-5 sm:flex-row sm:items-center`}>
      <StatusIcon status={done ? "completed" : locked ? "locked" : "available"} size={32} />
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-semibold text-[#0B2C4A]">{heading}</h3>
        <p className="mt-0.5 text-sm font-medium text-[#0B2C4A]">{state}</p>
        <p className="mt-1 text-sm leading-6 text-[#4d6570]">{detail}</p>
      </div>
      {action}
    </div>
  );
}

export default async function DpdpCoursePage() {
  const learner = await learnerPageContext();
  const home = await getCourseHome(learner);

  if (!home.enrolled) {
    return (
      <div className="space-y-8 text-[#0B2C4A]">
        <Hero
          course={home.course}
          action={<EnrollButton moduleCount={home.course.moduleCount} />}
          note={<p className="text-sm text-[#4d6570]">Your progress is saved to your account.</p>}
        />
        <section aria-labelledby="curriculum-heading" className="space-y-4">
          <div>
            <h2 id="curriculum-heading" className="text-xl font-semibold text-[#0B2C4A]">Curriculum</h2>
            <p className="mt-1 text-sm text-[#4d6570]">
              {home.course.moduleCount} modules, each with a video, a lesson, and a quiz. Modules unlock in order.
            </p>
          </div>
          <ModuleCards modules={home.modules} />
        </section>
        <Disclaimer text={home.course.disclaimer} reviewed={home.course.lastReviewedOn} />
      </div>
    );
  }

  const { progress } = home;
  const current = home.modules.find((item) => item.status === "in_progress" || item.status === "available");
  const allModulesDone = progress.completedModules >= progress.totalModules;
  const primary = progress.certificateEligible
    ? { href: "/e-learning/certificate", label: "View certificate" }
    : allModulesDone
      ? { href: "/e-learning/final-exam", label: "Take the final exam" }
      : current
        ? { href: `/e-learning/module/${current.slug}`, label: progress.completedModules === 0 && !current.lessonComplete ? "Start learning" : "Continue learning" }
        : { href: "/e-learning/final-exam", label: "Take the final exam" };

  return (
    <div className="space-y-8 text-[#0B2C4A]">
      <Hero
        course={home.course}
        action={
          <Link href={primary.href} className={primaryBtn}>
            {primary.label}
          </Link>
        }
      />

      <section aria-labelledby="continue-heading" className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className={`${card} flex flex-col p-6`}>
          <h2 id="continue-heading" className={eyebrow}>
            {current && !allModulesDone ? "Continue learning" : "Next step"}
          </h2>
          {current && !allModulesDone ? (
            <>
              <p className="mt-3 text-sm font-semibold tabular-nums text-[#4d6570]">Module {pad(current.number)}</p>
              <p className="mt-1 text-xl font-semibold leading-snug text-[#0B2C4A]">{current.title}</p>
              <p className="mt-2 text-sm text-[#4d6570]">
                {current.minutes} minutes · {current.lessonComplete ? "Lesson done. Pass the quiz to unlock the next module." : "Watch the video and read the lesson."}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/e-learning/module/${current.slug}`} className={primaryBtn}>
                  {current.lessonComplete ? "Go to module" : "Resume module"}
                </Link>
                {current.lessonComplete ? (
                  <Link href={`/e-learning/module/${current.slug}/quiz`} className={secondaryBtn}>
                    Take the quiz
                  </Link>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-xl font-semibold leading-snug text-[#0B2C4A]">
                {progress.certificateEligible ? "Course complete" : "All 30 modules passed"}
              </p>
              <p className="mt-2 text-sm text-[#4d6570]">
                {progress.certificateEligible
                  ? "Your certificate of completion is ready."
                  : `Pass the final examination with ${home.course.passPercent}% or more to earn your certificate.`}
              </p>
              <div className="mt-5">
                <Link href={primary.href} className={primaryBtn}>
                  {primary.label}
                </Link>
              </div>
            </>
          )}
        </div>
        <div className={`${card} p-6`}>
          <h2 className={eyebrow}>Your progress</h2>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-[#0B2C4A]">
            {progress.completedModules}
            <span className="text-lg font-medium text-[#4d6570]"> / {progress.totalModules} modules</span>
          </p>
          <div className="mt-4">
            <ProgressBar value={progress.completionPercentage} label="Course completion" />
          </div>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[#4d6570]">Final exam</dt>
              <dd className="font-semibold">
                {progress.examPassed ? `Passed · ${progress.examPercentage}%` : progress.examPercentage !== null ? `Last score ${progress.examPercentage}%` : "Not taken"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[#4d6570]">Certificate</dt>
              <dd className="font-semibold">{progress.certificateEligible ? "Earned" : "Not yet"}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="curriculum-heading" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 id="curriculum-heading" className="text-xl font-semibold text-[#0B2C4A]">Curriculum</h2>
            <p className="mt-1 text-sm text-[#4d6570]">Pass each module quiz with {home.course.passPercent}% to unlock the next module.</p>
          </div>
          <p className="text-sm font-semibold tabular-nums text-[#4d6570]">
            {progress.completedModules} of {progress.totalModules} completed
          </p>
        </div>
        <ModuleCards modules={home.modules} currentSlug={allModulesDone ? null : current?.slug} />
      </section>

      <section aria-labelledby="achievements-heading" className="space-y-4">
        <h2 id="achievements-heading" className="text-xl font-semibold text-[#0B2C4A]">Exam and certificate</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <AchievementCard
            title="Final examination"
            done={progress.examPassed}
            locked={!allModulesDone}
            state={progress.examPassed ? `Passed with ${progress.examPercentage}%` : allModulesDone ? "Ready to take" : "Locked"}
            detail={`${home.course.examQuestionCount} questions across all modules.`}
            action={
              allModulesDone && !progress.examPassed ? (
                <Link href="/e-learning/final-exam" className={secondaryBtn}>
                  Start exam
                </Link>
              ) : null
            }
          />
          <AchievementCard
            title="Certificate of completion"
            done={progress.certificateEligible}
            locked={!progress.certificateEligible}
            state={progress.certificateEligible ? `Issued · ${progress.certificateCode ?? ""}`.trim() : "Locked"}
            detail="Includes a QR code anyone can scan to verify it."
            action={
              progress.certificateEligible ? (
                <Link href="/e-learning/certificate" className={secondaryBtn}>
                  View
                </Link>
              ) : null
            }
          />
        </div>
      </section>

      {learner.operator ? (
        <p>
          <Link href="/e-learning/manage" className={textLink}>
            Manage course content and learner progress
          </Link>
        </p>
      ) : null}

      <Disclaimer text={home.course.disclaimer} reviewed={home.course.lastReviewedOn} />
    </div>
  );
}
