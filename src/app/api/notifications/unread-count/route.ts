import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { notifications } from "@/db/schema/notifications";

export async function GET() {
  try {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ count: 0 });
    }

    const [organization] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkOrganizationId, orgId))
      .limit(1);

    if (!organization) {
      return NextResponse.json({ count: 0 });
    }

    const [localUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!localUser) {
      return NextResponse.json({ count: 0 });
    }

    // Count unread notifications scoped to this org+user (or org-wide where userId is null).
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.organizationId, organization.id),
          eq(notifications.isRead, false),
          // Include notifications addressed to this user OR org-wide (userId IS NULL).
          sql`(${notifications.userId} = ${localUser.id} OR ${notifications.userId} IS NULL)`,
        ),
      );

    return NextResponse.json({ count: result?.count ?? 0 });
  } catch (error) {
    console.error("Unread count failed:", error);
    return NextResponse.json({ count: 0 });
  }
}
