import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AssessmentRunner } from "@/components/learning/assessment-runner";
import { pad, secondaryBtn } from "@/components/learning/ui";
import { MODULE_QUIZ_DRAW_COUNT } from "@/lib/learning/catalog";
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
  const passedHref = next ? `/e-learning/module/${next.slug}` : "/e-learning/final-exam";
  const passedLabel = next ? `Continue to Module ${pad(next.number)}` : "Go to the final exam";

  return (
    <div className="mx-auto max-w-3xl space-y-5 text-[#0B2C4A]">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-[#4d6570]">
          <li>
            <Link href="/e-learning" className="font-medium text-[#0B2C4A] underline-offset-4 hover:underline">
              E-learning
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/e-learning/module/${courseModule.slug}`} className="font-medium text-[#0B2C4A] underline-offset-4 hover:underline">
              Module {pad(courseModule.number)}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Quiz</li>
        </ol>
      </nav>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold tabular-nums text-[#4d6570]">Module {pad(courseModule.number)} quiz</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight">{courseModule.title}</h1>
        </div>
        <Link href={`/e-learning/module/${courseModule.slug}`} className={secondaryBtn}>
          Back to lesson
        </Link>
      </header>
      <AssessmentRunner
        title="Module quiz"
        intro={`Five questions drawn at random from Module ${courseModule.number}. Passing unlocks the next module.`}
        questionCount={MODULE_QUIZ_DRAW_COUNT}
        defaultPassPercent={home.course.passPercent}
        startPath={`/api/learning/modules/${moduleSlug}/quiz`}
        submitBasePath="/api/learning/quizzes"
        onPassedHref={passedHref}
        passedLabel={passedLabel}
        autoStart={start === "1"}
      />
    </div>
  );
}
