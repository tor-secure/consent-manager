import type { ReactNode } from "react";
import { headers } from "next/headers";

import { LearningPortal } from "@/components/learning/learning-portal";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
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
  const learningAuth = { signedIn: Boolean(learnerSession) };

  return (
    <div className="flex min-h-full flex-col">
      <HomeNavbar learningAuth={learningAuth} />
      <div className="flex min-h-0 flex-1 flex-col">
        <LearningPortal
          signedIn={Boolean(learnerSession)}
          enrolled={courseHome.enrolled}
          modules={courseHome.modules}
          progress={courseHome.enrolled ? courseHome.progress : null}
          courseTitle={courseHome.course.title}
        >
          {children}
        </LearningPortal>
      </div>
      <HomeFooter />
    </div>
  );
}
