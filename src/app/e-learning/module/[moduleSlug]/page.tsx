import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { LessonActions } from "@/components/learning/lesson-actions";
import { LockMark } from "@/components/learning/lock-mark";
import { ModuleReading } from "@/components/learning/module-reading";
import { ProgressBar } from "@/components/learning/progress-bar";
import { StatusChip, StatusIcon } from "@/components/learning/status-icon";
import { card, eyebrow, pad, primaryBtn, secondaryBtn } from "@/components/learning/ui";
import { learnerPageContext } from "@/lib/learning/page-context";
import { getCourseHome, getModuleForLearner, warmLearningCatalog } from "@/lib/learning/service";
import { ModulePagerSkeleton } from "./loading";

function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[#4d6570]">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {index > 0 ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link href={item.href} className="rounded font-medium text-[#0B2C4A] underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

function Steps({ lessonComplete, quizPassed }: { lessonComplete: boolean; quizPassed: boolean }) {
  const steps = [
    { label: "Watch the video", done: lessonComplete },
    { label: "Read and mark complete", done: lessonComplete },
    { label: "Pass the quiz", done: quizPassed },
  ];
  const activeIndex = steps.findIndex((step) => !step.done);
  return (
    <ol aria-label="Module steps" className="grid gap-2 sm:grid-cols-3">
      {steps.map((step, index) => {
        const active = index === activeIndex;
        return (
          <li
            key={step.label}
            aria-current={active ? "step" : undefined}
            className={`flex min-h-12 items-center gap-3 rounded-lg border px-3 py-2 text-sm ${
              step.done ? "border-[#bfe9e0] bg-[#E6F9F5]" : active ? "border-[#0B2C4A] bg-white font-semibold" : "border-[#d5e3e0] bg-white text-[#4d6570]"
            }`}
          >
            <StatusIcon status={step.done ? "completed" : active ? "in_progress" : "available"} size={20} />
            <span>
              <span className="sr-only">Step {index + 1}: </span>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default async function ModulePage({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const { moduleSlug } = await params;
  const catalogReady = warmLearningCatalog();
  const learner = await learnerPageContext();
  const homePromise = getCourseHome(learner);
  const result = await getModuleForLearner(learner, moduleSlug);
  await catalogReady;
  if (result.error === "not_enrolled") redirect("/e-learning");
  if (result.error === "not_found") notFound();

  if (result.error === "locked") {
    const home = await homePromise;
    const modules = home.enrolled ? home.modules : [];
    const prerequisite = modules.find((item) => item.number === result.prerequisiteNumber);
    return (
      <div className="space-y-6 text-[#0B2C4A]">
        <Breadcrumb items={[{ label: "E-learning", href: "/e-learning" }, { label: `Module ${pad(result.moduleNumber)}` }]} />
        <section className={`${card} mx-auto max-w-2xl p-8 text-center`}>
          <div className="flex justify-center">
            <LockMark />
          </div>
          <p className={`${eyebrow} mt-4`}>Module {pad(result.moduleNumber)} is locked</p>
          <h1 className="mt-2 text-2xl font-semibold leading-tight">{result.title}</h1>
          <p className="mt-3 text-base leading-7 text-[#36505c]">
            Pass the Module {result.prerequisiteNumber} quiz to unlock this module.
          </p>
          <div className="mx-auto mt-5 max-w-sm">
            <ProgressBar value={(result.completedModules / result.totalModules) * 100} label="Course completion" size="sm" />
            <p className="mt-2 text-sm text-[#4d6570]">
              {result.completedModules} / {result.totalModules} modules completed
            </p>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {prerequisite ? (
              <Link href={`/e-learning/module/${prerequisite.slug}`} prefetch className={primaryBtn}>
                Go to Module {pad(prerequisite.number)}
              </Link>
            ) : null}
            <Link href="/e-learning" className={secondaryBtn}>
              All modules
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const courseModule = result.module;
  const status = courseModule.quizPassed ? "completed" : "in_progress";

  return (
    <div className="space-y-5 text-[#0B2C4A]">
      <Breadcrumb items={[{ label: "E-learning", href: "/e-learning" }, { label: `Module ${pad(courseModule.number)}` }]} />
      <article className="min-w-0 space-y-5">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold tabular-nums text-[#4d6570]">Module {pad(courseModule.number)} of {result.progress.total}</p>
              <StatusChip status={status} />
            </div>
            <h1 className="text-2xl font-semibold leading-tight sm:text-[1.75rem]">{courseModule.title}</h1>
            <p className="text-sm text-[#4d6570]">{courseModule.minutes} minutes</p>
          </header>
          <Steps lessonComplete={courseModule.lessonComplete} quizPassed={courseModule.quizPassed} />

          <ModuleReading objectives={courseModule.objectives} lesson={courseModule.lesson} video={courseModule.video} />

          <section aria-label="Module actions" className={`${card} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <p className="text-base font-semibold">
                {courseModule.quizPassed ? "Module complete" : courseModule.lessonComplete ? "Ready for the quiz" : "Finished the lesson?"}
              </p>
              <p className="mt-1 text-justify text-sm text-[#4d6570]">
                {courseModule.quizPassed
                  ? "You passed this module quiz. You can retake it at any time."
                  : courseModule.lessonComplete
                    ? `Score ${result.course.passPercent}% or more to unlock the next module.`
                    : "Mark the lesson complete to open the module quiz."}
              </p>
            </div>
            <LessonActions slug={courseModule.slug} lessonComplete={courseModule.lessonComplete} quizPassed={courseModule.quizPassed} />
          </section>

          <Suspense fallback={<ModulePagerSkeleton />}>
            <ModulePager homePromise={homePromise} currentSlug={courseModule.slug} />
          </Suspense>
        </article>
    </div>
  );
}

async function ModulePager({
  homePromise,
  currentSlug,
}: {
  homePromise: ReturnType<typeof getCourseHome>;
  currentSlug: string;
}) {
  const home = await homePromise;
  const modules = home.enrolled ? home.modules : [];
  const index = modules.findIndex((item) => item.slug === currentSlug);
  const previous = index > 0 ? modules[index - 1] : null;
  const next = index >= 0 && index < modules.length - 1 ? modules[index + 1] : null;
  return (
    <nav aria-label="Module navigation" className="grid gap-3 sm:grid-cols-2">
      {previous ? (
        <Link href={`/e-learning/module/${previous.slug}`} prefetch className={`${card} flex min-h-16 flex-col justify-center px-4 py-3 motion-safe:transition-colors hover:border-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]`}>
          <span className="text-xs font-semibold uppercase tracking-wide text-[#4d6570]">Previous</span>
          <span className="mt-0.5 text-sm font-semibold">
            {pad(previous.number)} Â· {previous.title}
          </span>
        </Link>
      ) : (
        <span className="hidden sm:block" />
      )}
      {next ? (
        next.unlocked ? (
          <Link href={`/e-learning/module/${next.slug}`} prefetch className={`${card} flex min-h-16 flex-col justify-center px-4 py-3 text-right motion-safe:transition-colors hover:border-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]`}>
            <span className="text-xs font-semibold uppercase tracking-wide text-[#4d6570]">Next</span>
            <span className="mt-0.5 text-sm font-semibold">
              {pad(next.number)} Â· {next.title}
            </span>
          </Link>
        ) : (
          <div className="flex min-h-16 items-center justify-end gap-3 rounded-xl border border-dashed border-[#d5e3e0] bg-[#fbfdfc] px-4 py-3 text-right text-[#4d6570]" aria-label={`Next module ${next.number} is locked`}>
            <span className="flex flex-col">
              <span className="text-xs font-semibold uppercase tracking-wide">Next Â· locked</span>
              <span className="mt-0.5 text-sm font-semibold">
                {pad(next.number)} Â· {next.title}
              </span>
            </span>
            <StatusIcon status="locked" size={20} />
          </div>
        )
      ) : (
        <Link href="/e-learning/final-exam" className={`${card} flex min-h-16 flex-col justify-center px-4 py-3 text-right hover:border-[#0B2C4A]`}>
          <span className="text-xs font-semibold uppercase tracking-wide text-[#4d6570]">Next</span>
          <span className="mt-0.5 text-sm font-semibold">Final examination</span>
        </Link>
      )}
    </nav>
  );
}
