import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getLearningSession } from "@/lib/learning/auth";
import { safeLearningPath } from "@/lib/learning/clerk";
import { isOperatorRole } from "@/lib/org-roles";
import type { LearnerContext } from "@/lib/learning/service";

export async function learnerPageContext(): Promise<LearnerContext & { operator: boolean }> {
  const learner = await getLearningSession();
  if (!learner) {
    const path = safeLearningPath((await headers()).get("x-cg-path"));
    redirect(`/e-learning/sign-in?redirect_url=${encodeURIComponent(path)}`);
  }
  return { ...learner, operator: isOperatorRole(learner.roleName) };
}
