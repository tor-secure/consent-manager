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
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Clerk org-role strings accepted for invitations.
const VALID_CLERK_ROLES = ["org:admin", "org:member"] as const;

// ---------------------------------------------------------------------------
// POST /api/settings/team/invite
// Body: { email: string; role: "org:admin" | "org:member" }
//
// Sends a Clerk Organization invitation.
// Guards:
//   • Caller must be Owner or Admin.
//   • Email must be valid.
//   • role must be one of the allowed Clerk org roles.
//   • Prevents sending a duplicate invitation to an already-pending address.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // ── Resolve org ──────────────────────────────────────────────────────────
    const [organization] = await db
      .select({ id: organizations.id, name: organizations.name })
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

    // ── Validate body ────────────────────────────────────────────────────────
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const role = String(body.role ?? "").trim();

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ success: false, message: "A valid email address is required." }, { status: 400 });
    }

    if (!(VALID_CLERK_ROLES as readonly string[]).includes(role)) {
      return NextResponse.json(
        { success: false, message: `Role must be one of: ${VALID_CLERK_ROLES.join(", ")}` },
        { status: 400 },
      );
    }

    // ── Guard: no duplicate pending invite ───────────────────────────────────
    const clerk = await clerkClient();
    const existingInvites = await clerk.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ["pending"],
    });

    const alreadyInvited = existingInvites.data.some(
      (inv) => inv.emailAddress.toLowerCase() === email,
    );

    if (alreadyInvited) {
      return NextResponse.json(
        { success: false, message: `An invitation has already been sent to ${email}.` },
        { status: 409 },
      );
    }

    // ── Send invitation ──────────────────────────────────────────────────────
    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: orgId,
      inviterUserId: userId,
      emailAddress: email,
      role,
    });

    // ── Audit log ─────────────────────────────────────────────────────────────
    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: localUser.id,
      action: "team.member.invited",
      resourceType: "invitation",
      description: `Invitation sent to ${email} with role ${role}`,
      metadata: { email, role, invitationId: invitation.id },
    });

    return NextResponse.json(
      {
        success: true,
        invitation: {
          id: invitation.id,
          email: invitation.emailAddress,
          role: invitation.role,
          status: invitation.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Send invitation failed:", error);
    return NextResponse.json({ success: false, message: "Failed to send invitation" }, { status: 500 });
  }
}
