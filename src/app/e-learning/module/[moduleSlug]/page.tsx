import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { LessonActions } from "@/components/learning/lesson-actions";
import { LockMark } from "@/components/learning/lock-mark";
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
      <div className="text-[#0B2C4A]">
        <section className="rounded-xl border border-[#d5e3e0] bg-white p-6">
          <div className="flex items-center gap-3">
            <LockMark />
            <h1 className="text-2xl font-semibold leading-tight">Module {String(result.moduleNumber).padStart(2, "0")} · {result.title}</h1>
          </div>
          <p className="mt-4 text-base leading-7">Complete Module {result.prerequisiteNumber} to unlock this module.</p>
          <p className="mt-2 text-sm text-[#4d6570]">Progress: {result.completedModules} / {result.totalModules} modules completed.</p>
          <Link href="/e-learning" className="mt-4 inline-block text-sm font-semibold text-[#0B2C4A] underline">
            Back to the course
          </Link>
        </section>
      </div>
    );
  }

  const courseModule = result.module;
  return (
    <div className="space-y-6 text-[#0B2C4A]">
      <div className="flex items-center justify-between gap-4">
        <Link href="/e-learning" className="text-sm font-semibold text-[#0B2C4A] underline">
          All modules
        </Link>
        <p className="text-sm text-[#4d6570]">
          Module {String(courseModule.number).padStart(2, "0")} · {result.progress.completed} / {result.progress.total}
        </p>
      </div>
      <h1 className="text-2xl font-semibold leading-tight text-[#0B2C4A]">{courseModule.title}</h1>
      <VideoPlayer video={courseModule.video} />
      <section className="rounded-xl border border-[#d5e3e0] bg-white p-5">
        <h2 className="text-base font-semibold">Learning objectives</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
          {courseModule.objectives.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="space-y-4 rounded-xl border border-[#d5e3e0] bg-white p-5">
        <h2 className="text-base font-semibold">Lesson</h2>
        {courseModule.lesson.split("\n\n").map((paragraph, index) => (
          <p key={`${courseModule.slug}-lesson-${index}`} className="text-justify text-base leading-7 text-[#0B2C4A]">
            {paragraph}
          </p>
        ))}
      </section>
      <section className="rounded-xl border border-[#d5e3e0] bg-white p-5">
        <h2 className="text-base font-semibold">Key concepts</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
          {courseModule.concepts.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border border-[#d5e3e0] bg-white p-5">
        <h2 className="text-base font-semibold">Practical example</h2>
        <p className="mt-3 text-justify text-base leading-7">{courseModule.example}</p>
      </section>
      <section className="rounded-xl border border-[#d5e3e0] bg-white p-5">
        <h2 className="text-base font-semibold">Case study</h2>
        <p className="mt-3 text-justify text-base leading-7">{courseModule.caseStudy}</p>
      </section>
      <section className="rounded-xl border border-[#d5e3e0] bg-white p-5">
        <h2 className="text-base font-semibold">Key takeaways</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
          {courseModule.takeaways.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
      <div className="flex flex-wrap items-center gap-4">
        <LessonActions slug={courseModule.slug} lessonComplete={courseModule.lessonComplete} />
        {learner.operator ? (
          <Link href={`/e-learning/module/${courseModule.slug}/edit`} className="text-sm font-semibold text-[#0B2C4A] underline">
            Edit this module
          </Link>
        ) : null}
      </div>
    </div>
  );
}
