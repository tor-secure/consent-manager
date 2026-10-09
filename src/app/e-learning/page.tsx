import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";

import { EnrollButton } from "@/components/learning/enroll-button";
import { ModuleCards } from "@/components/learning/module-cards";
import { VerifyCertificateForm } from "@/components/learning/verify-certificate-form";
import { ProgressBar } from "@/components/learning/progress-bar";
import { StatusIcon } from "@/components/learning/status-icon";
import { card, eyebrow, pad, primaryBtn, secondaryBtn, textLink } from "@/components/learning/ui";
import { JsonLd } from "@/components/seo/json-ld";
import { INDEXABLE_ROBOTS, pageAlternates, socialMetadata } from "@/lib/site-metadata";
import { breadcrumbSchema, courseSchema, graphSchema } from "@/lib/structured-data";
import { learnerPageContext } from "@/lib/learning/page-context";
import { getCourseHome, getPublicCourseCatalog, warmLearningCatalog, warmModuleLesson } from "@/lib/learning/service";

const title = "DPDP Act Training";
const description =
  "A 30-module course on the Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025. Passing earns a certificate of completion from Consent Guru, not a government or university accreditation.";

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
  difficulty: string;
  passPercent: number;
  examQuestionCount: number;
};

const courseHighlights = [
  "30 modules, about 15 minutes each",
  "A video, a lesson, and a 15-question quiz in every module",
  "Modules unlock in order, and your progress is saved",
  "A 50-question final exam drawn from the module questions",
  "A certificate when you pass",
];

function Hero({ course, action, note, pitch }: { course: CourseInfo; action: ReactNode; note?: ReactNode; pitch?: boolean }) {
  const facts = [
    ["Modules", String(course.moduleCount)],
    ["Duration", "30 days, 15 min a day"],
    ["Level", course.difficulty],
    ["Instructor", course.instructor],
  ];
  return (
    <section className={`${card} overflow-hidden`}>
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <p className={eyebrow}>DPDP Act 2023 training</p>
          <h1 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[#0B2C4A] sm:text-[2rem] sm:leading-[1.2]">
            {pitch ? "DPDP Act training" : course.title}
          </h1>
          <p className="mt-3 max-w-3xl text-justify text-base leading-7 text-[#36505c]">
            {pitch
              ? "A 30-module course on the Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025. Plan on about 15 minutes a day. Passing earns a certificate of completion from Consent Guru. It is not a government, university, or Data Protection Board accreditation."
              : course.description}
          </p>
          {pitch ? (
            <ul className="mt-4 max-w-3xl space-y-2">
              {courseHighlights.map((item) => (
                <li key={item} className="flex gap-3 text-[15px] leading-6 text-[#0B2C4A]">
                  <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#00C4A7]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : null}
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

function BeforeYouStart({ disclaimer, passPercent }: { disclaimer: string; passPercent: number }) {
  const body = disclaimer.replace(/^Legal status note:\s*/, "");
  const [status, educational] = body.split(/(?=This training material)/);
  const prerequisites = [
    "A Consent Guru account, so your progress, quizzes, and certificate stay with you.",
    "No earlier DPDP module. This foundation programme begins with privacy, data protection, and the terms used in the Act.",
    "About 15 minutes a day for 30 days.",
    `A score of ${passPercent}% or more on each module quiz and on the final exam.`,
  ];
  return (
    <section aria-labelledby="before-you-start" className={`${card} space-y-6 p-6 sm:p-8`}>
      <div>
        <h2 id="before-you-start" className="text-xl font-semibold text-[#0B2C4A]">Before you start</h2>
        <p className="mt-2 max-w-3xl text-justify text-base leading-7 text-[#36505c]">
          Read this before you enrol. It is the note from the first page of the programme, with what you need in place to begin.
        </p>
      </div>
      <div>
        <h3 className="text-base font-semibold text-[#0B2C4A]">Prerequisites</h3>
        <ul className="mt-3 max-w-3xl space-y-2.5">
          {prerequisites.map((item) => (
            <li key={item} className="flex gap-3 text-[15px] leading-7 text-[#0B2C4A]">
              <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#00C4A7]" />
              <span className="min-w-0 flex-1 text-justify">{item}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-base font-semibold text-[#0B2C4A]">Disclaimer</h3>
        <p className="mt-3 max-w-3xl text-justify text-base leading-7 text-[#0B2C4A]">
          <strong className="font-semibold">Legal status note: </strong>
          {status}
        </p>
        {educational ? <p className="mt-3 max-w-3xl text-justify text-base leading-7 text-[#0B2C4A]">{educational}</p> : null}
      </div>
    </section>
  );
}

function VerifyCertificate() {
  return (
    <section aria-labelledby="verify-certificate" className={`${card} p-6 sm:p-8`}>
      <h2 id="verify-certificate" className="text-xl font-semibold text-[#0B2C4A]">Verify a certificate</h2>
      <p className="mt-2 max-w-3xl text-justify text-base leading-7 text-[#36505c]">
        Enter the certificate ID printed on a Consent Guru DPDP certificate. A valid certificate is good for one year from the date it was issued.
      </p>
      <VerifyCertificateForm />
    </section>
  );
}

function Disclaimer({ text, reviewed }: { text: string; reviewed?: string }) {
  return (
    <section aria-label="Course disclaimer" className="border-t border-[#d5e3e0] pt-6">
      <p className="max-w-4xl text-justify text-sm leading-6 text-[#4d6570]">{text}</p>
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
        <p className="mt-1 text-justify text-sm leading-6 text-[#4d6570]">{detail}</p>
      </div>
      {action}
    </div>
  );
}

export default async function DpdpCoursePage() {
  const catalogReady = warmLearningCatalog();
  const session = await auth();
  if (!session.userId) {
    const home = await getPublicCourseCatalog();
    await catalogReady;
    const courseLd = graphSchema([
      courseSchema({
        name: home.course.title || "DPDP Act training",
        description,
      }),
      breadcrumbSchema([
        { name: "Home", path: "/" },
        { name: "DPDP Act training", path: "/e-learning" },
      ]),
    ]);
    return (
      <div className="space-y-8 text-[#0B2C4A]">
        <JsonLd id="dpdp-course-jsonld" data={courseLd} />
        <Hero course={home.course} pitch action={<EnrollButton moduleCount={home.course.moduleCount} />} />
        <BeforeYouStart disclaimer={home.course.disclaimer} passPercent={home.course.passPercent} />
        <VerifyCertificate />
        <section aria-labelledby="curriculum-heading" className="space-y-4">
          <div>
            <h2 id="curriculum-heading" className="text-xl font-semibold text-[#0B2C4A]">
              Curriculum
            </h2>
            <p className="mt-1 text-sm text-[#4d6570]">
              {home.course.moduleCount} modules, each with a video, a lesson, and a 15-question quiz. Sign in to enrol. Lessons stay private to your account.
            </p>
          </div>
          <ModuleCards modules={home.modules} />
        </section>
      </div>
    );
  }

  const learner = await learnerPageContext();
  const home = await getCourseHome(learner);
  await catalogReady;

  const courseLd = graphSchema([
    courseSchema({
      name: home.course.title || "DPDP Act training",
      description,
    }),
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "DPDP Act training", path: "/e-learning" },
    ]),
  ]);

  if (!home.enrolled) {
    return (
      <div className="space-y-8 text-[#0B2C4A]">
        <JsonLd id="dpdp-course-jsonld" data={courseLd} />
        <Hero
          course={home.course}
          pitch
          action={<EnrollButton moduleCount={home.course.moduleCount} />}
        />
        <BeforeYouStart disclaimer={home.course.disclaimer} passPercent={home.course.passPercent} />
        <VerifyCertificate />
        <section aria-labelledby="curriculum-heading" className="space-y-4">
          <div>
            <h2 id="curriculum-heading" className="text-xl font-semibold text-[#0B2C4A]">Curriculum</h2>
            <p className="mt-1 text-sm text-[#4d6570]">
              {home.course.moduleCount} modules, each with a video, a lesson, and a 15-question quiz. Modules unlock in order. The final exam is 50 questions drawn from those quizzes.
            </p>
          </div>
          <ModuleCards modules={home.modules} />
        </section>
      </div>
    );
  }

  const { progress } = home;
  const current = home.modules.find((item) => item.status === "in_progress" || item.status === "available");
  if (current) warmModuleLesson(current.slug).catch(() => undefined);
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
      <JsonLd id="dpdp-course-jsonld" data={courseLd} />
      <Hero
        course={home.course}
        action={
          <Link href={primary.href} {...(primary.href.includes("/module/") ? { prefetch: true } : {})} className={primaryBtn}>
            {primary.label}
          </Link>
        }
      />

      {progress.completedModules === 0 && !current?.lessonComplete ? (
        <BeforeYouStart disclaimer={home.course.disclaimer} passPercent={home.course.passPercent} />
      ) : null}
      <VerifyCertificate />

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
                <Link href={`/e-learning/module/${current.slug}`} prefetch className={primaryBtn}>
                  {current.lessonComplete ? "Go to module" : "Resume module"}
                </Link>
                {current.lessonComplete ? (
                  <Link href={`/e-learning/module/${current.slug}/quiz`} prefetch className={secondaryBtn}>
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

      {progress.completedModules === 0 && !current?.lessonComplete ? null : (
        <Disclaimer text={home.course.disclaimer} reviewed={home.course.lastReviewedOn} />
      )}
    </div>
  );
}
