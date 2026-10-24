import type { ReactNode } from "react";
import { headers } from "next/headers";

import { LearningPortal } from "@/components/learning/learning-portal";
import { SkipLink } from "@/components/ui/skip-link";
import { getLearningSession } from "@/lib/learning/auth";
import { getCourseHome, getPublicCourseCatalog } from "@/lib/learning/service";
export default async function ELearningLayout({ children }: { children: ReactNode }) {
  const path = (await headers()).get("x-cg-path") ?? "";
  if (path.startsWith("/e-learning/sign-in") || path.startsWith("/e-learning/sign-up")) return children;

  return (
    <>
      <SkipLink />
      <LearningFrame>{children}</LearningFrame>
    </>
  );
}

async function LearningFrame({ children }: { children: ReactNode }) {
  const learnerSession = await getLearningSession();
  const courseHome = learnerSession ? await getCourseHome(learnerSession) : await getPublicCourseCatalog();

  return (
    <LearningPortal
      signedIn={Boolean(learnerSession)}
      enrolled={courseHome.enrolled}
      modules={courseHome.modules}
      progress={courseHome.enrolled ? courseHome.progress : null}
      courseTitle={courseHome.course.title}
    >
      {children}
    </LearningPortal>
  );
}
