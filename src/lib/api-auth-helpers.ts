import "server-only";

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

export function hasRole(roleName: string, allowed: readonly string[]): boolean {
  return allowed.includes(roleName);
}
