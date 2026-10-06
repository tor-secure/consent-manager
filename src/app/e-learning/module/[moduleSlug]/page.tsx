import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LessonActions } from "@/components/learning/lesson-actions";
import { LockMark } from "@/components/learning/lock-mark";
import { ScriptPanel } from "@/components/learning/script-panel";
import { VideoPlayer } from "@/components/learning/video-player";
import { learnerPageContext } from "@/lib/learning/page-context";
import { getModuleForLearner } from "@/lib/learning/service";

export default async function ModulePage({ params }: { params: Promise<{ moduleSlug: string }> }) {
  const { moduleSlug } = await params;
  const learner = await learnerPageContext();
  const result = await getModuleForLearner(learner, moduleSlug);
  if (result.error === "not_enrolled") redirect("/e-learning");
  if (result.error === "not_found") notFound();
  if (result.error === "locked") {
    return (
      <div className="page-wrap">
        <section className="rounded-xl border border-[var(--border)] bg-white p-6">
          <LockMark />
          <h1 className="mt-2 text-2xl font-semibold">Module {String(result.moduleNumber).padStart(2, "0")} · {result.title}</h1>
          <p className="mt-3">Complete Module {result.prerequisiteNumber} to unlock this module.</p>
          <p className="mt-2 text-sm">Progress: {result.completedModules} / {result.totalModules} modules completed.</p>
          <Link href="/e-learning" className="mt-4 inline-block text-sm font-semibold underline">
            Back to the course
          </Link>
        </section>
      </div>
    );
  }

  const courseModule = result.module;
  return (
    <div className="page-wrap space-y-6">
      <p className="text-sm font-semibold">
        Module {String(courseModule.number).padStart(2, "0")} · Progress {result.progress.completed} / {result.progress.total}
      </p>
      <h1 className="page-title">{courseModule.title}</h1>
      <VideoPlayer video={courseModule.video} />
      <section>
        <h2 className="text-lg font-semibold">Learning objectives</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {courseModule.objectives.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="space-y-3 text-sm leading-6">
        <h2 className="text-lg font-semibold">Lesson</h2>
        {courseModule.lesson.split("\n\n").map((paragraph) => (
          <p key={paragraph.slice(0, 80)}>{paragraph}</p>
        ))}
      </section>
      <section>
        <h2 className="text-lg font-semibold">Key concepts</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {courseModule.concepts.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="text-sm leading-6">
        <h2 className="text-lg font-semibold">Practical example</h2>
        <p className="mt-2">{courseModule.example}</p>
      </section>
      <section className="text-sm leading-6">
        <h2 className="text-lg font-semibold">Case study</h2>
        <p className="mt-2">{courseModule.caseStudy}</p>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Key takeaways</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {courseModule.takeaways.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <ScriptPanel script={courseModule.script} title={courseModule.title} />
      <LessonActions slug={courseModule.slug} lessonComplete={courseModule.lessonComplete} />
      {learner.operator ? (
        <Link href={`/e-learning/module/${courseModule.slug}/edit`} className="text-sm underline">
          Edit this module
        </Link>
      ) : null}
      <Link href="/e-learning" className="block text-sm underline">
        All modules
      </Link>
    </div>
  );
}
