import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { notifications } from "@/db/schema/notifications";

// PATCH /api/notifications/[id]/read — mark a single notification as read.
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    // Update only if the notification belongs to this org AND (this user OR org-wide).
    const updated = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.organizationId, organization.id),
          sql`(${notifications.userId} = ${localUser.id} OR ${notifications.userId} IS NULL)`,
        ),
      )
      .returning({ id: notifications.id });

    if (updated.length === 0) {
      return NextResponse.json({ success: false, message: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark read failed:", error);
    return NextResponse.json({ success: false, message: "Failed to mark as read" }, { status: 500 });
  }
}
