import "server-only";

import { auth } from "@clerk/nextjs/server";

import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { isOperatorRole } from "@/lib/org-roles";
import type { LearnerContext } from "@/lib/learning/service";

export async function learnerPageContext(): Promise<LearnerContext & { operator: boolean }> {
  const session = await auth();
  if (!session.userId) {
    session.redirectToSignIn();
  }
  const ctx = await requireDashboardContext();
  const roleName = ctx.membership.status === "active" ? ctx.roleName : "Member";
  return {
    organizationId: ctx.organization.id,
    userId: ctx.user.id,
    roleName,
    learnerName: ctx.user.name,
    operator: isOperatorRole(roleName),
  };
}
