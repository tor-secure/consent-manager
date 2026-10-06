import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";

import { LessonActions } from "@/components/learning/lesson-actions";
import { LockMark } from "@/components/learning/lock-mark";
import { ModuleNav } from "@/components/learning/module-nav";
import { ProgressBar } from "@/components/learning/progress-bar";
import { StatusChip, StatusIcon } from "@/components/learning/status-icon";
import { card, eyebrow, pad, primaryBtn, secondaryBtn, textLink } from "@/components/learning/ui";
import { VideoPlayer } from "@/components/learning/video-player";
import { learnerPageContext } from "@/lib/learning/page-context";
import { getCourseHome, getModuleForLearner } from "@/lib/learning/service";

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`${card} p-5 sm:p-6`}>
      <h2 className="text-lg font-semibold text-[#0B2C4A]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-[15px] leading-7 text-[#0B2C4A]">
          <span aria-hidden="true" className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#00C4A7]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
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
  const learner = await learnerPageContext();
  const result = await getModuleForLearner(learner, moduleSlug);
  if (result.error === "not_enrolled") redirect("/e-learning");
  if (result.error === "not_found") notFound();

  const home = await getCourseHome(learner);
  const modules = home.enrolled ? home.modules : [];
  const progress = home.enrolled ? home.progress : null;

  if (result.error === "locked") {
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
              <Link href={`/e-learning/module/${prerequisite.slug}`} className={primaryBtn}>
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
  const index = modules.findIndex((item) => item.slug === courseModule.slug);
  const previous = index > 0 ? modules[index - 1] : null;
  const next = index >= 0 && index < modules.length - 1 ? modules[index + 1] : null;
  const status = courseModule.quizPassed ? "completed" : "in_progress";

  return (
    <div className="space-y-5 text-[#0B2C4A]">
      <Breadcrumb items={[{ label: "E-learning", href: "/e-learning" }, { label: `Module ${pad(courseModule.number)}` }]} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        {progress ? (
          <div className="lg:order-2">
            <ModuleNav
              modules={modules}
              currentSlug={courseModule.slug}
              completed={progress.completedModules}
              total={progress.totalModules}
              percentage={progress.completionPercentage}
            />
          </div>
        ) : null}
        <article className="min-w-0 space-y-5 lg:order-1">
          <VideoPlayer video={courseModule.video} />
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold tabular-nums text-[#4d6570]">Module {pad(courseModule.number)} of {result.progress.total}</p>
              <StatusChip status={status} />
            </div>
            <h1 className="text-2xl font-semibold leading-tight sm:text-[1.75rem]">{courseModule.title}</h1>
            <p className="text-sm text-[#4d6570]">{courseModule.minutes} minutes</p>
            <p className="max-w-3xl text-base leading-7 text-[#36505c]">{courseModule.summary}</p>
          </header>
          <Steps lessonComplete={courseModule.lessonComplete} quizPassed={courseModule.quizPassed} />

          <Section title="Learning objectives">
            <BulletList items={courseModule.objectives} />
          </Section>
          <Section title="Lesson">
            <div className="max-w-3xl space-y-4">
              {courseModule.lesson.split("\n\n").map((paragraph, paragraphIndex) => (
                <p key={`${courseModule.slug}-lesson-${paragraphIndex}`} className="text-base leading-7 text-[#0B2C4A]">
                  {paragraph}
                </p>
              ))}
            </div>
          </Section>
          <Section title="Key concepts">
            <BulletList items={courseModule.concepts} />
          </Section>
          <div className="grid gap-5 xl:grid-cols-2">
            <Section title="Practical example">
              <p className="text-base leading-7">{courseModule.example}</p>
            </Section>
            <Section title="Case study">
              <p className="text-base leading-7">{courseModule.caseStudy}</p>
            </Section>
          </div>
          <Section title="Key takeaways">
            <BulletList items={courseModule.takeaways} />
          </Section>

          <section aria-label="Module actions" className={`${card} flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between`}>
            <div>
              <p className="text-base font-semibold">
                {courseModule.quizPassed ? "Module complete" : courseModule.lessonComplete ? "Ready for the quiz" : "Finished the lesson?"}
              </p>
              <p className="mt-1 text-sm text-[#4d6570]">
                {courseModule.quizPassed
                  ? "You passed this module quiz. You can retake it at any time."
                  : courseModule.lessonComplete
                    ? `Score ${result.course.passPercent}% or more to unlock the next module.`
                    : "Mark the lesson complete to open the module quiz."}
              </p>
            </div>
            <LessonActions slug={courseModule.slug} lessonComplete={courseModule.lessonComplete} quizPassed={courseModule.quizPassed} />
          </section>

          <nav aria-label="Module navigation" className="grid gap-3 sm:grid-cols-2">
            {previous ? (
              <Link href={`/e-learning/module/${previous.slug}`} className={`${card} flex min-h-16 flex-col justify-center px-4 py-3 motion-safe:transition-colors hover:border-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]`}>
                <span className="text-xs font-semibold uppercase tracking-wide text-[#4d6570]">Previous</span>
                <span className="mt-0.5 text-sm font-semibold">
                  {pad(previous.number)} · {previous.title}
                </span>
              </Link>
            ) : (
              <span className="hidden sm:block" />
            )}
            {next ? (
              next.unlocked ? (
                <Link href={`/e-learning/module/${next.slug}`} className={`${card} flex min-h-16 flex-col justify-center px-4 py-3 text-right motion-safe:transition-colors hover:border-[#0B2C4A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7]`}>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#4d6570]">Next</span>
                  <span className="mt-0.5 text-sm font-semibold">
                    {pad(next.number)} · {next.title}
                  </span>
                </Link>
              ) : (
                <div className={`flex min-h-16 items-center justify-end gap-3 rounded-xl border border-dashed border-[#d5e3e0] bg-[#fbfdfc] px-4 py-3 text-right text-[#4d6570]`} aria-label={`Next module ${next.number} is locked`}>
                  <span className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wide">Next · locked</span>
                    <span className="mt-0.5 text-sm font-semibold">
                      {pad(next.number)} · {next.title}
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

          {learner.operator ? (
            <p>
              <Link href={`/e-learning/module/${courseModule.slug}/edit`} className={textLink}>
                Edit this module
              </Link>
            </p>
          ) : null}
        </article>
      </div>
    </div>
  );
}
