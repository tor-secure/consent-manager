import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { LockMark } from "@/components/learning/lock-mark";
import { ModuleReading } from "@/components/learning/module-reading";
import { ProgressBar } from "@/components/learning/progress-bar";
import { StatusChip, StatusIcon } from "@/components/learning/status-icon";
import { card, eyebrow, pad, primaryBtn, secondaryBtn } from "@/components/learning/ui";
import { displayModuleNumber } from "@/lib/learning/course-parts";
import { learnerPageContext } from "@/lib/learning/page-context";
import { getCourseHome, getModuleForLearner, warmLearningCatalog, warmModuleLesson } from "@/lib/learning/service";
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

export default async function ModulePage({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const { moduleSlug } = await params;
  const catalogReady = warmLearningCatalog();
  const lessonReady = warmModuleLesson(moduleSlug);
  lessonReady.catch(() => undefined);
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
        <header className="rounded-2xl border border-[#e4eeec] bg-white px-5 py-5 shadow-[0_14px_36px_-30px_rgba(11,44,74,0.35)] sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="rounded-full bg-[#E6F9F5] px-2.5 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#0B2C4A]">
              Module {pad(courseModule.number)} of {result.progress.total}
            </p>
            <StatusChip status={status} />
            <span className="text-sm font-medium text-[#4d6570]">{courseModule.minutes} minutes</span>
          </div>
          <h1 className="mt-3 max-w-4xl text-2xl font-semibold leading-tight tracking-tight sm:text-[1.85rem]">
            {courseModule.title}
          </h1>
        </header>

        <ModuleReading
          moduleNumber={courseModule.number}
          objectives={courseModule.objectives}
          lesson={courseModule.lesson}
          video={courseModule.video}
          slug={courseModule.slug}
          lessonComplete={courseModule.lessonComplete}
          quizPassed={courseModule.quizPassed}
          passPercent={result.course.passPercent}
          learnerId={learner.learnerId}
        />

        <Suspense fallback={<ModulePagerSkeleton />}>
          <ModulePager homePromise={homePromise} currentSlug={courseModule.slug} />
        </Suspense>
      </article>
    </div>
  );
}

function PagerChevron({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {direction === "prev" ? <path d="M15 6 9 12l6 6" /> : <path d="m9 6 6 6-6 6" />}
    </svg>
  );
}

function ModulePagerCard({
  direction,
  href,
  label,
  numberLabel,
  title,
  locked = false,
  emphasis = false,
}: {
  direction: "prev" | "next";
  href?: string;
  label: string;
  numberLabel: string;
  title: string;
  locked?: boolean;
  /** Next / exam gets the stronger CTA treatment. */
  emphasis?: boolean;
}) {
  const isNext = direction === "next";
  const shell = isNext ? "sm:flex-row-reverse sm:text-right" : "";

  const content = (
    <>
      <span
        className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl motion-safe:transition-colors ${
          locked
            ? "bg-[#eef3f2] text-[#8aa0a8]"
            : emphasis
              ? "bg-white/15 text-white group-hover:bg-white/25"
              : "bg-[#E6F9F5] text-[#0B2C4A] group-hover:bg-[#d7f3ee]"
        }`}
      >
        {locked ? <StatusIcon status="locked" size={20} /> : <PagerChevron direction={direction} />}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block text-[11px] font-bold uppercase tracking-[0.16em] ${
            locked ? "text-[#8aa0a8]" : emphasis ? "text-white/75" : "text-[#4d6570]"
          }`}
        >
          {label}
          {locked ? " · Locked" : null}
        </span>
        <span
          className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${
            locked
              ? "bg-[#eef3f2] text-[#8aa0a8]"
              : emphasis
                ? "bg-white/15 text-white"
                : "bg-[#f3f7f6] text-[#0B2C4A]"
          }`}
        >
          {numberLabel}
        </span>
        <span
          className={`mt-2 line-clamp-2 block text-[15px] font-semibold leading-snug ${
            locked ? "text-[#8aa0a8]" : emphasis ? "text-white" : "text-[#0B2C4A]"
          }`}
        >
          {title}
        </span>
      </span>
    </>
  );

  if (locked || !href) {
    return (
      <div
        className={`flex min-h-[6.25rem] items-center gap-4 rounded-2xl border border-dashed border-[#d5e3e0] bg-[linear-gradient(180deg,#fbfdfc_0%,#f3f7f6_100%)] px-4 py-4 ${shell}`}
        aria-label={`${label}: ${title} is locked`}
      >
        {content}
      </div>
    );
  }

  if (emphasis) {
    return (
      <Link
        href={href}
        prefetch
        className={`group relative flex min-h-[6.25rem] items-center gap-4 overflow-hidden rounded-2xl bg-[#0B2C4A] px-4 py-4 text-white shadow-[0_18px_40px_-28px_rgba(11,44,74,0.85)] motion-safe:transition-[transform,box-shadow] motion-safe:duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-24px_rgba(11,44,74,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] focus-visible:ring-offset-2 ${shell}`}
      >
        <span
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,196,167,0.35),transparent_55%)]"
          aria-hidden="true"
        />
        {content}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      prefetch
      className={`group flex min-h-[6.25rem] items-center gap-4 rounded-2xl border border-[#d5e3e0] bg-white px-4 py-4 shadow-[0_14px_32px_-28px_rgba(11,44,74,0.45)] motion-safe:transition-[border-color,box-shadow,transform] motion-safe:duration-200 hover:-translate-y-0.5 hover:border-[#0B2C4A]/40 hover:shadow-[0_20px_40px_-28px_rgba(11,44,74,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C4A7] focus-visible:ring-offset-2 ${shell}`}
    >
      {content}
    </Link>
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
    <nav aria-label="Module navigation" className="grid gap-3 sm:grid-cols-2 sm:gap-4">
      {previous ? (
        <ModulePagerCard
          direction="prev"
          href={`/e-learning/module/${previous.slug}`}
          label="Previous"
          numberLabel={`Module ${pad(displayModuleNumber(previous.number))}`}
          title={previous.title}
        />
      ) : (
        <div
          className="flex min-h-[6.25rem] items-center gap-4 rounded-2xl border border-[#e4eeec] bg-[linear-gradient(180deg,#fbfdfc_0%,#f3f7f6_100%)] px-4 py-4 text-[#8aa0a8]"
          aria-hidden="true"
        >
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eef3f2] text-[#8aa0a8]">
            <PagerChevron direction="prev" />
          </span>
          <span className="min-w-0">
            <span className="block text-[11px] font-bold uppercase tracking-[0.16em]">Previous</span>
            <span className="mt-2 block text-sm font-medium leading-snug">Start of the course</span>
          </span>
        </div>
      )}

      {next ? (
        <ModulePagerCard
          direction="next"
          href={next.unlocked ? `/e-learning/module/${next.slug}` : undefined}
          label="Next"
          numberLabel={`Module ${pad(displayModuleNumber(next.number))}`}
          title={next.title}
          locked={!next.unlocked}
          emphasis={next.unlocked}
        />
      ) : (
        <ModulePagerCard
          direction="next"
          href="/e-learning/final-exam"
          label="Up next"
          numberLabel="Final exam"
          title="Final examination"
          emphasis
        />
      )}
    </nav>
  );
}
