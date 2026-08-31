import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema/notifications";
import { resolveLocalOrganization, resolveLocalUser, resolveActiveMembership } from "@/lib/api-auth-helpers";

// POST /api/notifications/read-all — mark all unread notifications as read.
export async function POST() {
  try {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const localUser = await resolveLocalUser(userId);

    if (!localUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    const organization = await resolveLocalOrganization(orgId);

    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }

    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) {
      return NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 });
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
