import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";
import { auditLogs } from "@/db/schema/audit-logs";

const AUTHORIZED_ROLES = ["Owner", "Admin"] as const;

// ---------------------------------------------------------------------------
// DELETE /api/settings/team/invite/[invitationId]
//
// Revokes a pending Clerk Organization invitation.
// Guards:
//   • Caller must be Owner or Admin.
//   • invitationId must belong to the caller's active org.
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  try {
    const { invitationId } = await params;
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

    // ── Revoke via Clerk — also verifies invitation belongs to this org ───────
    const clerk = await clerkClient();

    // Fetch the invitation first to confirm it belongs to the caller's org.
    const invitation = await clerk.organizations.getOrganizationInvitation({
      organizationId: orgId,
      invitationId,
    });

    if (!invitation) {
      return NextResponse.json({ success: false, message: "Invitation not found" }, { status: 404 });
    }

    await clerk.organizations.revokeOrganizationInvitation({
      organizationId: orgId,
      invitationId,
      requestingUserId: userId,
    });

    // ── Audit log ─────────────────────────────────────────────────────────────
    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: localUser.id,
      action: "team.invitation.revoked",
      resourceType: "invitation",
      description: `Invitation revoked for ${invitation.emailAddress}`,
      metadata: { email: invitation.emailAddress, role: invitation.role, invitationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Revoke invitation failed:", error);
    return NextResponse.json({ success: false, message: "Failed to revoke invitation" }, { status: 500 });
  }
}
