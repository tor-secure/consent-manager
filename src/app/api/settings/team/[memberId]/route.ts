import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, count } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";
import { auditLogs } from "@/db/schema/audit-logs";

const AUTHORIZED_ROLES = ["Owner", "Admin"] as const;

// ---------------------------------------------------------------------------
// DELETE /api/settings/team/[memberId]
//
// Removes a member from the organization (sets status = "inactive").
// Guards:
//   • Caller must be Owner or Admin.
//   • Cannot remove yourself.
//   • Cannot remove the last active Owner.
//   • Audit log written on every successful removal.
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> },
) {
  try {
    const { memberId } = await params;
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // ── Resolve org ──────────────────────────────────────────────────────────
    const [organization] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkOrganizationId, orgId))
      .limit(1);

    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }

    // ── Resolve caller ───────────────────────────────────────────────────────
    const [localUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!localUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // ── Authorize caller ─────────────────────────────────────────────────────
    const [callerMembership] = await db
      .select({ id: memberships.id, roleName: roles.name })
      .from(memberships)
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .where(
        and(
          eq(memberships.organizationId, organization.id),
          eq(memberships.userId, localUser.id),
          eq(memberships.status, "active"),
        ),
      )
      .limit(1);

    if (!(AUTHORIZED_ROLES as readonly string[]).includes(callerMembership?.roleName ?? "")) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    // ── Verify target membership belongs to this org ─────────────────────────
    const [targetMembership] = await db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        roleName: roles.name,
        status: memberships.status,
      })
      .from(memberships)
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .where(
        and(
          eq(memberships.id, memberId),
          eq(memberships.organizationId, organization.id),
        ),
      )
      .limit(1);

    if (!targetMembership) {
      return NextResponse.json({ success: false, message: "Member not found" }, { status: 404 });
    }

    // ── Guard: cannot remove yourself ────────────────────────────────────────
    if (targetMembership.userId === localUser.id) {
      return NextResponse.json(
        { success: false, message: "You cannot remove yourself from the organization." },
        { status: 422 },
      );
    }

    // ── Guard: cannot remove the last active Owner ────────────────────────────
    if (targetMembership.roleName === "Owner") {
      const [ownerCount] = await db
        .select({ count: count() })
        .from(memberships)
        .innerJoin(roles, eq(memberships.roleId, roles.id))
        .where(
          and(
            eq(memberships.organizationId, organization.id),
            eq(memberships.status, "active"),
            eq(roles.name, "Owner"),
          ),
        );

      if ((ownerCount?.count ?? 0) <= 1) {
        return NextResponse.json(
          { success: false, message: "Cannot remove the last Owner of the organization." },
          { status: 422 },
        );
      }
    }

    // ── Deactivate membership ─────────────────────────────────────────────────
    await db
      .update(memberships)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(memberships.id, targetMembership.id));

    // ── Audit log ─────────────────────────────────────────────────────────────
    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: localUser.id,
      action: "team.member.removed",
      resourceType: "membership",
      resourceId: targetMembership.id,
      description: `Member removed (role: ${targetMembership.roleName})`,
      metadata: { targetUserId: targetMembership.userId, role: targetMembership.roleName },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove member failed:", error);
    return NextResponse.json({ success: false, message: "Failed to remove member" }, { status: 500 });
  }
}
