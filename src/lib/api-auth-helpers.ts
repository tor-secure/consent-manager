import "server-only";

import { clerkClient } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { organizations } from "@/db/schema/organizations";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";

export type AuthContext = {
  user: { id: typeof users.$inferSelect.id };
  organization: { id: typeof organizations.$inferSelect.id };
  membership: { id: typeof memberships.$inferSelect.id; roleId: typeof memberships.$inferSelect.roleId };
  role?: { id: typeof roles.$inferSelect.id; name: typeof roles.$inferSelect.name };
};

export type AuthContextNoOrg = {
  user: { id: typeof users.$inferSelect.id };
  organization: null;
  membership: null;
  role: null;
};

export async function resolveActiveMembership(
  organizationId: string,
  userId: string,
): Promise<{ membershipId: string; roleId: string; roleName: string } | null> {
  const [row] = await db
    .select({
      membershipId: memberships.id,
      roleId: memberships.roleId,
      roleName: roles.name,
    })
    .from(memberships)
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .where(
      and(
        eq(memberships.organizationId, organizationId),
        eq(memberships.userId, userId),
        eq(memberships.status, "active"),
      ),
    )
    .limit(1);

  if (!row) return null;
  return {
    membershipId: row.membershipId,
    roleId: row.roleId,
    roleName: row.roleName,
  };
}

export async function resolveLocalUser(
  clerkUserId: string,
): Promise<{ id: typeof users.$inferSelect.id } | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  return row ?? null;
}

export async function resolveLocalOrganization(
  clerkOrganizationId: string,
): Promise<{ id: typeof organizations.$inferSelect.id } | null> {
  const [row] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, clerkOrganizationId))
    .limit(1);
  return row ?? null;
}

/**
 * Clerk sessions often have a user but no active orgId yet after sign-in.
 * Fall back to the first Clerk membership, then a local membership.
 */
export async function resolveActiveClerkOrgId(
  userId: string,
  sessionOrgId: string | null | undefined,
): Promise<string | null> {
  if (sessionOrgId) return sessionOrgId;

  try {
    const client = await clerkClient();
    const list = await client.users.getOrganizationMembershipList({
      userId,
      limit: 1,
    });
    const fromClerk = list.data[0]?.organization.id;
    if (fromClerk) return fromClerk;
  } catch {
    /* User may not belong to any Clerk organization yet. */
  }

  const localUser = await resolveLocalUser(userId);
  if (!localUser) return null;

  const [linked] = await db
    .select({ clerkOrganizationId: organizations.clerkOrganizationId })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(
      and(
        eq(memberships.userId, localUser.id),
        eq(memberships.status, "active"),
      ),
    )
    .limit(1);

  return linked?.clerkOrganizationId ?? null;
}

export function hasRole(roleName: string, allowed: readonly string[]): boolean {
  return allowed.includes(roleName);
}
