import type { ReactNode } from "react";
import { headers } from "next/headers";

import { LearningPortal } from "@/components/learning/learning-portal";
import { LearningSessionBridge } from "@/components/learning/learning-session-bridge";
import { RememberReturningLearner } from "@/components/learning/remember-returning-learner";
import { SyncLearningChrome } from "@/components/learning/sync-learning-chrome";
import { HomeFooter } from "@/components/public/home-footer";
import { HomeNavbar } from "@/components/public/home-navbar";
import { SkipLink } from "@/components/ui/skip-link";
import { getLearningSession } from "@/lib/learning/auth";
import { enrollInCourse, getCourseHome, getPublicCourseCatalog } from "@/lib/learning/service";

export const dynamic = "force-dynamic";

export default async function ELearningLayout({ children }: { children: ReactNode }) {
  const path = (await headers()).get("x-cg-path") ?? "";
  if (
    path.startsWith("/e-learning/sign-in") ||
    path.startsWith("/e-learning/sign-up") ||
    path.startsWith("/e-learning/sign-out")
  ) {
    return children;
  }

  return (
    <>
      <SkipLink />
      <LearningFrame>{children}</LearningFrame>
    </>
  );
}

async function LearningFrame({ children }: { children: ReactNode }) {
  const learnerSession = await getLearningSession();
  let courseHome = learnerSession ? await getCourseHome(learnerSession) : await getPublicCourseCatalog();
  // Keep sidebar + progress in sync: signed-in learners are enrolled on first load.
  if (learnerSession && !courseHome.enrolled) {
    await enrollInCourse(learnerSession);
    courseHome = await getCourseHome(learnerSession);
  }
  const learningAuth = { signedIn: Boolean(learnerSession) };

  const signedIn = Boolean(learnerSession);

  return (
    <div className="flex min-h-full flex-col">
      <RememberReturningLearner active={signedIn && courseHome.enrolled} />
      <SyncLearningChrome signedIn={signedIn} />
      <LearningSessionBridge hasAppSession={signedIn} />
      <HomeNavbar learningAuth={learningAuth} />
      <div className="flex min-h-0 flex-1 flex-col">
        <LearningPortal
          signedIn={signedIn}
          enrolled={courseHome.enrolled}
          modules={courseHome.modules}
          progress={courseHome.enrolled ? courseHome.progress : null}
          courseTitle={courseHome.course.title}
        >
          {children}
        </LearningPortal>
      </div>
      <HomeFooter showCertifications={false} />
    </div>
  );
}
