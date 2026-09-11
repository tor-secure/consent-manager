import "server-only";

import { eq, and, count } from "drizzle-orm";

import { db } from "@/db";
import { memberships } from "@/db/schema/memberships";
import { organizations } from "@/db/schema/organizations";
import { roles } from "@/db/schema/roles";
import { clerkRoleToLocalRole, type LocalOrgRole } from "@/lib/org-roles";

type RoleRow = typeof roles.$inferSelect;
type MembershipRow = typeof memberships.$inferSelect;

export async function ensureNamedRole(
  tx: { select: typeof db.select; insert: typeof db.insert },
  name: LocalOrgRole,
  description: string,
): Promise<RoleRow> {
  const [existing] = await tx.select().from(roles).where(eq(roles.name, name)).limit(1);
  if (existing) return existing;
  const [created] = await tx
    .insert(roles)
    .values({ name, description })
    .returning();
  return created;
}

export async function orgMembershipCount(organizationId: string): Promise<number> {
  const [row] = await db
    .select({ count: count() })
    .from(memberships)
    .where(and(eq(memberships.organizationId, organizationId), eq(memberships.status, "active")));
  return Number(row?.count ?? 0);
}

export async function ensureMembershipForClerkRole(input: {
  organizationId: string;
  userId: string;
  clerkRole: string | null | undefined;
  /** When true, Clerk membership events may update the local role. Dashboard bootstrap must leave in-app roles alone. */
  syncRole?: boolean;
}): Promise<MembershipRow> {
  return db.transaction(async (tx) => {
    await tx
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.id, input.organizationId))
      .for("update")
      .limit(1);

    const [countRow] = await tx
      .select({ count: count() })
      .from(memberships)
      .where(
        and(eq(memberships.organizationId, input.organizationId), eq(memberships.status, "active")),
      );
    const firstMembership = Number(countRow?.count ?? 0) === 0;
    const localRole = clerkRoleToLocalRole(input.clerkRole, { firstMembership });

    const role = await ensureNamedRole(
      tx,
      localRole,
      localRole === "Owner"
        ? "Full access to the organization and its resources."
        : localRole === "Admin"
          ? "Administrative access without transferring ownership."
          : "Standard organization access.",
    );

    const [existing] = await tx
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, input.organizationId),
          eq(memberships.userId, input.userId),
        ),
      )
      .limit(1);

    if (existing) {
      const nextRoleId = input.syncRole ? role.id : existing.roleId;
      if (existing.roleId !== nextRoleId || existing.status !== "active") {
        const [updated] = await tx
          .update(memberships)
          .set({ roleId: nextRoleId, status: "active", updatedAt: new Date() })
          .where(eq(memberships.id, existing.id))
          .returning();
        return updated;
      }
      return existing;
    }

    const [created] = await tx
      .insert(memberships)
      .values({
        organizationId: input.organizationId,
        userId: input.userId,
        roleId: role.id,
        status: "active",
        joinedAt: new Date(),
      })
      .returning();
    return created;
  });
}

export async function deactivateMembership(organizationId: string, userId: string): Promise<void> {
  await db
    .update(memberships)
    .set({ status: "inactive", updatedAt: new Date() })
    .where(
      and(eq(memberships.organizationId, organizationId), eq(memberships.userId, userId)),
    );
}
