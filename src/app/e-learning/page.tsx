import type { Metadata } from "next";
import Link from "next/link";

import { EnrollButton } from "@/components/learning/enroll-button";
import { ModuleCards } from "@/components/learning/module-cards";
import { PageHeader } from "@/components/ui/page-header";
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

function CourseFacts({
  home,
}: {
  home: {
    course: { instructor: string; moduleCount: number; estimatedMinutes: number; difficulty: string };
  };
}) {
  return (
    <section className="grid gap-4 rounded-xl border border-[#d5e3e0] bg-white p-5 text-[#0B2C4A] sm:grid-cols-2 lg:grid-cols-4">
      <p>
        <span className="block text-xs font-semibold uppercase tracking-wide text-[#4d6570]">Instructor</span>
        <span className="mt-1 block text-base">{home.course.instructor}</span>
      </p>
      <p>
        <span className="block text-xs font-semibold uppercase tracking-wide text-[#4d6570]">Modules</span>
        <span className="mt-1 block text-base">{home.course.moduleCount}</span>
      </p>
      <p>
        <span className="block text-xs font-semibold uppercase tracking-wide text-[#4d6570]">Estimated time</span>
        <span className="mt-1 block text-base">{Math.round(home.course.estimatedMinutes / 60)} hours</span>
      </p>
      <p>
        <span className="block text-xs font-semibold uppercase tracking-wide text-[#4d6570]">Difficulty</span>
        <span className="mt-1 block text-base">{home.course.difficulty}</span>
      </p>
    </section>
  );
}

export default async function DpdpCoursePage() {
  const learner = await learnerPageContext();
  const home = await getCourseHome(learner);

  if (!home.enrolled) {
    return (
      <div className="page-wrap space-y-6 text-[#0B2C4A] [&_.page-description]:text-base [&_.page-description]:leading-7 [&_.page-description]:text-[#0B2C4A]">
        <PageHeader
          eyebrow="DPDP Act 2023 Training"
          title={home.course.title}
          description={home.course.description}
          action={<EnrollButton moduleCount={home.course.moduleCount} />}
        />
        <CourseFacts home={home} />
        <p className="text-base leading-7 text-[#0B2C4A]">{home.course.disclaimer}</p>
        <ModuleCards modules={home.modules} />
      </div>
    );
  }

  const current = home.modules.find((item) => item.status === "in_progress" || item.status === "available");
  const continueHref = home.progress.certificateEligible
    ? "/e-learning/certificate"
    : current
      ? `/e-learning/module/${current.slug}`
      : "/e-learning/final-exam";

  return (
    <div className="page-wrap space-y-6 text-[#0B2C4A] [&_.page-description]:text-base [&_.page-description]:leading-7 [&_.page-description]:text-[#0B2C4A]">
      <PageHeader
        eyebrow="DPDP Act 2023 Training"
        title={home.course.title}
        description={home.course.description}
        action={
          <Link href={continueHref} className="rounded-lg bg-[#0B2C4A] px-4 py-2 text-sm font-semibold text-white">
            {home.progress.certificateEligible ? "View certificate" : "Continue learning"}
          </Link>
        }
      />
      <CourseFacts home={home} />
      <section aria-label="Course progress">
        <p className="text-base font-semibold text-[#0B2C4A]">
          {home.progress.completedModules} / {home.progress.totalModules} modules completed · {home.progress.completionPercentage}%
        </p>
        <div className="mt-2 h-2 rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={home.progress.completionPercentage} aria-label="Course completion">
          <div className="h-2 rounded-full bg-[#00C4A7]" style={{ width: `${home.progress.completionPercentage}%` }} />
        </div>
      </section>
      <p className="text-base leading-7 text-[#0B2C4A]">{home.course.disclaimer}</p>
      <p className="text-sm leading-6 text-[#0B2C4A]">Last reviewed {home.course.lastReviewedOn}. Content version is stored with the course so later legal updates do not require an application rewrite.</p>
      {learner.operator ? (
        <Link href="/e-learning/manage" className="text-sm font-medium text-[#0B2C4A] underline">
          Manage course content and learner progress
        </Link>
      ) : null}
      <ModuleCards modules={home.modules} />
    </div>
  );
}
