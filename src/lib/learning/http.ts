import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import type { LearnerContext } from "@/lib/learning/service";

export async function requireLearner(): Promise<LearnerContext | NextResponse> {
  const session = await auth();
  if (!session.userId || !session.orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [localUser, organization] = await Promise.all([
    resolveLocalUser(session.userId),
    resolveLocalOrganization(session.orgId),
  ]);
  if (!localUser || !organization) return NextResponse.json({ error: "Organization required" }, { status: 403 });
  const [membership, [user]] = await Promise.all([
    resolveActiveMembership(organization.id, localUser.id),
    db.select({ name: users.name }).from(users).where(eq(users.id, localUser.id)).limit(1),
  ]);
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return {
    organizationId: organization.id,
    userId: localUser.id,
    roleName: membership.roleName,
    learnerName: user?.name ?? "Learner",
  };
}

export function isResponse(value: LearnerContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
