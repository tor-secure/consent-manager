import Link from "next/link";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";
import { permissions } from "@/db/schema/permissions";
import { rolePermissions } from "@/db/schema/role-permissions";
import {
  TeamMembersPanel,
  type TeamMember,
  type AvailableRole,
  type PendingInvitation,
} from "@/components/settings/team-members-panel";
import { InviteMemberForm } from "@/components/settings/invite-member-form";

const MANAGE_ROLES = ["Owner", "Admin"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function RolePermissionsCard({
  roleName,
  permissionNames,
}: {
  roleName: string;
  permissionNames: string[];
}) {
  const colors: Record<string, string> = {
    Owner: "border-purple-200 bg-purple-50",
    Admin: "border-blue-200 bg-blue-50",
    Member: "border-neutral-200 bg-neutral-50",
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[roleName] ?? colors.Member}`}>
      <p className="mb-2 text-sm font-semibold text-neutral-900">{roleName}</p>
      {permissionNames.length === 0 ? (
        <p className="text-xs text-neutral-400">No permissions assigned.</p>
      ) : (
        <ul className="space-y-0.5">
          {permissionNames.map((p) => (
            <li key={p} className="flex items-center gap-1.5 text-xs text-neutral-600">
              <svg
                aria-hidden="true"
                className="h-3 w-3 shrink-0 text-green-500"
                fill="none"
                viewBox="0 0 12 12"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2 6l2.5 2.5L10 3.5"
                />
              </svg>
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page — server component
// ---------------------------------------------------------------------------

export default async function TeamPage() {
  const { orgId, userId: clerkUserId } = await auth();
  if (!orgId || !clerkUserId) return null;

  // ── Resolve local org ────────────────────────────────────────────────────
  const [organization] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!organization) return null;

  // ── Resolve current local user ───────────────────────────────────────────
  const [localUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);

  if (!localUser) return null;

  // ── Caller's role ────────────────────────────────────────────────────────
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

  const callerRole = callerMembership?.roleName ?? "";
  const canManage = MANAGE_ROLES.includes(callerRole);

  // ── Fetch all active members with user + role info ───────────────────────
  const memberRows = await db
    .select({
      membershipId: memberships.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      avatarUrl: users.avatarUrl,
      roleName: roles.name,
      roleId: roles.id,
      memberStatus: memberships.status,
      joinedAt: memberships.joinedAt,
    })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .where(eq(memberships.organizationId, organization.id))
    .orderBy(memberships.joinedAt);

  const members: TeamMember[] = memberRows.map((m) => ({
    membershipId: m.membershipId,
    userId: m.userId,
    name: m.name,
    email: m.email,
    avatarUrl: m.avatarUrl,
    roleName: m.roleName,
    roleId: m.roleId,
    status: m.memberStatus,
    joinedAt: m.joinedAt,
    isCurrentUser: m.userId === localUser.id,
  }));

  // ── All roles (for the role-change selector) ─────────────────────────────
  const allRoles = await db
    .select({ id: roles.id, name: roles.name })
    .from(roles)
    .orderBy(roles.name);

  const availableRoles: AvailableRole[] = allRoles;

  // ── Roles + their permissions (for the permissions view) ─────────────────
  const allPermissions = await db
    .select({ id: permissions.id, key: permissions.key, name: permissions.name })
    .from(permissions)
    .orderBy(permissions.name);

  const allRolePermissions = await db
    .select({ roleId: rolePermissions.roleId, permissionId: rolePermissions.permissionId })
    .from(rolePermissions);

  // Build roleId → permissionName[]
  const permMap = new Map(allPermissions.map((p) => [p.id, p.name]));
  const rolePermMap = new Map<string, string[]>();
  for (const rp of allRolePermissions) {
    const pName = permMap.get(rp.permissionId);
    if (!pName) continue;
    const existing = rolePermMap.get(rp.roleId) ?? [];
    existing.push(pName);
    rolePermMap.set(rp.roleId, existing);
  }

  // Ordered display: Owner → Admin → Member → rest
  const ROLE_ORDER = ["Owner", "Admin", "Member"];
  const sortedRoles = [...allRoles].sort((a, b) => {
    const ai = ROLE_ORDER.indexOf(a.name);
    const bi = ROLE_ORDER.indexOf(b.name);
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  // ── Pending Clerk invitations ────────────────────────────────────────────
  let pendingInvitations: PendingInvitation[] = [];
  try {
    const clerk = await clerkClient();
    const inviteList = await clerk.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ["pending"],
    });
    pendingInvitations = inviteList.data.map((inv) => ({
      id: inv.id,
      email: inv.emailAddress,
      role: inv.role,
      createdAt: inv.createdAt,
    }));
  } catch {
    // Invitation fetch is non-critical — render the page without them.
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const activeCount = members.filter((m) => m.status === "active").length;

  return (
    <div className="page-wrap">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-2 text-sm text-neutral-500"
      >
        <Link href="/dashboard/settings/organization" className="hover:text-neutral-900">
          Settings
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-900">Team &amp; Roles</span>
      </nav>

      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Team &amp; Roles
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {activeCount} active member{activeCount !== 1 ? "s" : ""} in{" "}
            <span className="font-medium text-neutral-700">{organization.name}</span>.
          </p>
        </div>

        <InviteMemberForm canInvite={canManage} />
      </div>

      {/* Read-only notice for non-managers */}
      {!canManage && (
        <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have <strong>read-only</strong> access. Only Owners and Admins can
          manage team members and roles.
        </div>
      )}

      <div className="space-y-8">
        {/* Members + invitations panels */}
        <TeamMembersPanel
          members={members}
          availableRoles={availableRoles}
          pendingInvitations={pendingInvitations}
          canManage={canManage}
          currentUserId={localUser.id}
        />

        {/* Roles & permissions reference */}
        <div className="rounded-lg border bg-white">
          <div className="border-b px-6 py-4">
            <h2 className="text-base font-semibold text-neutral-900">
              Roles &amp; permissions
            </h2>
            <p className="mt-0.5 text-sm text-neutral-500">
              Permissions assigned to each role in this organisation.
            </p>
          </div>

          {allPermissions.length === 0 && allRoles.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-neutral-400">
              No roles or permissions have been configured yet.
            </div>
          ) : (
            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedRoles.map((role) => (
                  <RolePermissionsCard
                    key={role.id}
                    roleName={role.name}
                    permissionNames={rolePermMap.get(role.id) ?? []}
                  />
                ))}
              </div>

              {allPermissions.length > 0 && (
                <div className="mt-6 border-t pt-5">
                  <h3 className="mb-3 text-sm font-medium text-neutral-700">
                    All permissions ({allPermissions.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {allPermissions.map((p) => (
                      <span
                        key={p.id}
                        title={p.name}
                        className="rounded-full bg-neutral-100 px-2.5 py-0.5 font-mono text-xs text-neutral-600"
                      >
                        {p.key}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
