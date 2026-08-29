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
// POST /api/settings/team/role
// Body: { targetMembershipId: string; newRoleId: string }
//
// Changes a member's role.
// Guards:
//   • Caller must be Owner or Admin of the org.
//   • targetMembershipId must belong to this org.
//   • Cannot demote the last Owner of the org.
//   • Audit log written on every successful change.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
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
      .select({ roleName: roles.name })
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

    // ── Parse body ───────────────────────────────────────────────────────────
    const body = await request.json();
    const targetMembershipId = String(body.targetMembershipId ?? "").trim();
    const newRoleId = String(body.newRoleId ?? "").trim();

    if (!targetMembershipId || !newRoleId) {
      return NextResponse.json(
        { success: false, message: "targetMembershipId and newRoleId are required" },
        { status: 400 },
      );
    }

    // ── Verify target membership belongs to this org ─────────────────────────
    const [targetMembership] = await db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        roleId: memberships.roleId,
        roleName: roles.name,
      })
      .from(memberships)
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .where(
        and(
          eq(memberships.id, targetMembershipId),
          eq(memberships.organizationId, organization.id),
        ),
      )
      .limit(1);

    if (!targetMembership) {
      return NextResponse.json({ success: false, message: "Member not found" }, { status: 404 });
    }

    // ── No-op if role hasn't changed ─────────────────────────────────────────
    if (targetMembership.roleId === newRoleId) {
      return NextResponse.json({ success: true, message: "No change" });
    }

    // ── Verify new role exists ────────────────────────────────────────────────
    const [newRole] = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, newRoleId))
      .limit(1);

    if (!newRole) {
      return NextResponse.json({ success: false, message: "Role not found" }, { status: 404 });
    }

    // ── Guard: cannot demote the last Owner ───────────────────────────────────
    if (targetMembership.roleName === "Owner" && newRole.name !== "Owner") {
      // Count remaining active Owner memberships in this org.
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
          { success: false, message: "Cannot change the role of the last Owner." },
          { status: 422 },
        );
      }
    }

    // ── Apply role change ─────────────────────────────────────────────────────
    await db
      .update(memberships)
      .set({ roleId: newRoleId, updatedAt: new Date() })
      .where(eq(memberships.id, targetMembership.id));

    // ── Audit log ─────────────────────────────────────────────────────────────
    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: localUser.id,
      action: "team.member.role_changed",
      resourceType: "membership",
      resourceId: targetMembership.id,
      description: `Member role changed from "${targetMembership.roleName}" to "${newRole.name}"`,
      metadata: {
        targetUserId: targetMembership.userId,
        fromRole: targetMembership.roleName,
        toRole: newRole.name,
      },
    });

    return NextResponse.json({ success: true, newRole: newRole.name });
  } catch (error) {
    console.error("Role change failed:", error);
    return NextResponse.json({ success: false, message: "Failed to change role" }, { status: 500 });
  }
}
