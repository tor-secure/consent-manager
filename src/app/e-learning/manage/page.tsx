import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseSettingsForm } from "@/components/learning/course-settings-form";
import { PageHeader } from "@/components/ui/page-header";
import { learnerPageContext } from "@/lib/learning/page-context";
import { getCourseHome, listOrgProgress } from "@/lib/learning/service";

export default async function ManageCoursePage() {
  const learner = await learnerPageContext();
  if (!learner.operator) notFound();
  const [home, progress] = await Promise.all([getCourseHome(learner), listOrgProgress(learner)]);
  return (
    <div className="space-y-6 text-[#0B2C4A]">
      <PageHeader title="Manage DPDP training" description="Owner and Admin only. Learners do not see this page." />
      <CourseSettingsForm
        passPercent={home.course.passPercent}
        examPassPercent={home.course.examPassPercent}
        examQuestionCount={home.course.examQuestionCount}
      />
      <section>
        <h2 className="text-lg font-semibold">Modules</h2>
        <ul className="mt-3 space-y-2">
          {home.modules.map((item) => (
            <li key={item.slug}>
              <Link className="text-sm underline" href={`/e-learning/module/${item.slug}/edit`}>
                Module {item.number}: {item.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-semibold">Learner progress in this workspace</h2>
        {!progress.error && progress.progress.length > 0 ? (
          <ul className="mt-2 space-y-2 text-sm">
            {progress.progress.map((row) => (
              <li key={row.userId}>
                {row.name}: {row.completedModules} / 30 modules{row.completedAt ? " · course completed" : ""}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm">No enrollments yet.</p>
        )}
      </section>
    </div>
  );
}
