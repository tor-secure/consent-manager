import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AssessmentRunner } from "@/components/learning/assessment-runner";
import { pad, secondaryBtn } from "@/components/learning/ui";
import { MODULE_QUIZ_DRAW_COUNT } from "@/lib/learning/catalog";
import { displayModuleNumber } from "@/lib/learning/course-parts";
import { learnerPageContext } from "@/lib/learning/page-context";
import { getCourseHome } from "@/lib/learning/service";

export default async function ModuleQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ moduleSlug: string }>;
  searchParams: Promise<{ start?: string }>;
}) {
  const { moduleSlug } = await params;
  const { start } = await searchParams;
  const learner = await learnerPageContext();
  const home = await getCourseHome(learner);
  if (!home.enrolled) redirect("/e-learning");
  const index = home.modules.findIndex((item) => item.slug === moduleSlug);
  if (index < 0) notFound();
  const courseModule = home.modules[index];
  if (!courseModule.unlocked) redirect(`/e-learning/module/${moduleSlug}`);
  const next = home.modules[index + 1];
  const shown = displayModuleNumber(courseModule.number);
  const passedHref = next ? `/e-learning/module/${next.slug}` : "/e-learning/final-exam";
  const passedLabel = next
    ? `Continue to Module ${pad(displayModuleNumber(next.number))}`
    : "Go to the final exam";

  return (
    <div className="mx-auto max-w-5xl space-y-5 text-[#0B2C4A]">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[#4d6570]">
          <li>
            <Link href="/e-learning" className="font-medium text-[#0B2C4A] underline-offset-4 hover:underline">
              E-learning
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/e-learning/module/${courseModule.slug}`}
              className="font-medium text-[#0B2C4A] underline-offset-4 hover:underline"
            >
              Module {pad(shown)}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Quiz</li>
        </ol>
      </nav>

      <header className="flex flex-col gap-4 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(120deg,#E6F9F5_0%,#ffffff_48%,#f7fbfa_100%)] p-5 ring-1 ring-[#e4eeec] sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#00A88F]">
            Module {pad(shown)} quiz
          </p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight">{courseModule.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4d6570]">
            {MODULE_QUIZ_DRAW_COUNT} questions · pass mark {home.course.passPercent}% · unlocks the next module
          </p>
        </div>
        <Link href={`/e-learning/module/${courseModule.slug}`} className={secondaryBtn}>
          Back to lesson
        </Link>
      </header>

      <AssessmentRunner
        title={`Module ${pad(shown)} quiz`}
        intro={`Five questions drawn at random from Module ${pad(shown)}. Passing unlocks the next module.`}
        questionCount={MODULE_QUIZ_DRAW_COUNT}
        defaultPassPercent={home.course.passPercent}
        startPath={`/api/learning/modules/${moduleSlug}/quiz`}
        submitBasePath="/api/learning/quizzes"
        onPassedHref={passedHref}
        passedLabel={passedLabel}
        autoStart={start === "1"}
        preloadSlug={moduleSlug}
      />
    </div>
  );
}
