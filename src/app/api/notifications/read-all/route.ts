import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { notifications } from "@/db/schema/notifications";

// POST /api/notifications/read-all — mark all unread notifications as read.
export async function POST() {
  try {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const [organization] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkOrganizationId, orgId))
      .limit(1);

    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }

    const [localUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!localUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const now = new Date();

    await db
      .update(notifications)
      .set({ isRead: true, readAt: now })
      .where(
        and(
          eq(notifications.organizationId, organization.id),
          eq(notifications.isRead, false),
          sql`(${notifications.userId} = ${localUser.id} OR ${notifications.userId} IS NULL)`,
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark all read failed:", error);
    return NextResponse.json({ success: false, message: "Failed to mark all as read" }, { status: 500 });
  }
}
