import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { eq, and, ne, sql, desc, getTableColumns } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { organizations } from "@/db/schema/organizations";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";
import { websites } from "@/db/schema/websites";
import {
  organizationCoreSelect,
  toOrganizationRow,
  userCoreSelect,
} from "@/lib/schema-selects";
import { ensureMembershipForClerkRole, ensureNamedRole } from "@/lib/local-membership";
import { OWNER_ROLE } from "@/lib/org-roles";
import { isDatabaseUnreachableError, isSchemaMismatchError, isTransientDatabaseError } from "@/lib/schema-mismatch";

export type BootstrapContext = {
  user: typeof users.$inferSelect;
  organization: typeof organizations.$inferSelect;
  membership: typeof memberships.$inferSelect;
  roleName: string;
};

export type BootstrapContextNoOrg = {
  user: typeof users.$inferSelect;
  organization: null;
  membership: null;
};

export type BootstrapResult = BootstrapContext | BootstrapContextNoOrg;

const LOGIN_TOUCH_MS = 60 * 60 * 1000;

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    if ("code" in current && (current as { code?: string }).code === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

async function roleNameFor(roleId: string): Promise<string> {
  const [row] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, roleId)).limit(1);
  return row?.name ?? "Member";
}

function rethrowBootstrapDbError(error: unknown): never {
  if (isDatabaseUnreachableError(error)) {
    throw new Error(
      "Cannot reach the database. Neon hostname lookup failed. Set Windows DNS to 8.8.8.8 and 1.1.1.1, run ipconfig /flushdns, then retry.",
      { cause: error },
    );
  }
  if (isTransientDatabaseError(error)) {
    throw new Error("The database connection dropped. Refresh the page.", { cause: error });
  }
  if (isSchemaMismatchError(error)) {
    throw new Error(
      "Database schema is missing required user or organization columns. Run npm run db:ensure-schema, then retry.",
      { cause: error },
    );
  }
  throw error;
}

function buildOrgSlug(name: string, clerkId: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${base || "organization"}-${clerkId.slice(-8)}`;
}

function clerkRoleForOrg(
  clerkUser: unknown,
  clerkOrgId: string,
): string | null {
  const memberships = (clerkUser as {
    organizationMemberships?: Array<{ role?: string; organization?: { id?: string } }>;
  })?.organizationMemberships ?? [];
  const membership = memberships.find((row) => row.organization?.id === clerkOrgId);
  return membership?.role ?? null;
}

const websiteCountExpr = sql<number>`coalesce((
  select count(*)::int from ${websites}
  where ${websites.organizationId} = ${organizations.id}
    and ${websites.deletedAt} is null
), 0)`;

/**
 * After switching Clerk Development → Production, the same human gets a new
 * `org_…` id. Websites stay on the old local organization row. Prefer that
 * row (especially if it already has websites) over inserting an empty org.
 */
async function findLegacyOrganizationForUser(localUserId: string, excludeOrgId?: string) {
  const rows = await db
    .select({
      organization: organizationCoreSelect,
      membership: getTableColumns(memberships),
      websiteCount: websiteCountExpr,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(
      excludeOrgId
        ? and(eq(memberships.userId, localUserId), ne(organizations.id, excludeOrgId))
        : eq(memberships.userId, localUserId),
    )
    .orderBy(desc(websiteCountExpr), desc(organizations.createdAt));

  return rows[0] ?? null;
}

async function remountOrganizationToClerkId(
  localOrgId: string,
  newClerkOrganizationId: string,
  vacateOrgId?: string,
) {
  return db.transaction(async (tx) => {
    if (vacateOrgId && vacateOrgId !== localOrgId) {
      // Free the unique clerk_organization_id on the empty production shell org.
      await tx
        .update(organizations)
        .set({
          clerkOrganizationId: `retired-${vacateOrgId}`,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, vacateOrgId));
    }

    const [updated] = await tx
      .update(organizations)
      .set({
        clerkOrganizationId: newClerkOrganizationId,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, localOrgId))
      .returning(organizationCoreSelect);

    return updated;
  });
}

/**
 * Call once per /dashboard request (from the layout).
 * Cached per request. The hot path is a local user + org + membership read
 * without Clerk organization fetches or a lastLoginAt write.
 */
export const bootstrapCurrentContext = cache(async function bootstrapCurrentContext(): Promise<BootstrapResult> {
  try {
    return await bootstrapCurrentContextUncached();
  } catch (error) {
    rethrowBootstrapDbError(error);
  }
});

async function bootstrapCurrentContextUncached(): Promise<BootstrapResult> {
  const { isAuthenticated, userId, orgId } = await auth();

  if (!isAuthenticated || !userId) {
    throw new Error("User is not authenticated");
  }

  // Returning visitors already have local rows. Skip Clerk's currentUser()
  // (a network hop) and load user + org + membership in one query.
  if (orgId) {
    const loadHotContext = () =>
      db
        .select({
          user: userCoreSelect,
          organization: organizationCoreSelect,
          membership: getTableColumns(memberships),
          roleName: roles.name,
          websiteCount: websiteCountExpr,
        })
        .from(users)
        .innerJoin(organizations, eq(organizations.clerkOrganizationId, orgId))
        .innerJoin(
          memberships,
          and(
            eq(memberships.userId, users.id),
            eq(memberships.organizationId, organizations.id),
          ),
        )
        .leftJoin(roles, eq(roles.id, memberships.roleId))
        .where(eq(users.clerkUserId, userId))
        .limit(1);

    let hotRows: Awaited<ReturnType<typeof loadHotContext>>;
    try {
      hotRows = await loadHotContext();
    } catch (error) {
      if (!isTransientDatabaseError(error)) throw error;
      hotRows = await loadHotContext();
    }
    const [hot] = hotRows;

    if (hot) {
      if (Number(hot.websiteCount) === 0) {
        const legacy = await findLegacyOrganizationForUser(hot.user.id, hot.organization.id);
        if (legacy && Number(legacy.websiteCount) > 0) {
          const remounted = await remountOrganizationToClerkId(
            legacy.organization.id,
            orgId,
            hot.organization.id,
          );
          if (remounted) {
            return {
              user: hot.user,
              organization: toOrganizationRow(remounted),
              membership: legacy.membership,
              roleName: await roleNameFor(legacy.membership.roleId),
            };
          }
        }
      }

      return {
        user: hot.user,
        organization: toOrganizationRow(hot.organization),
        membership: hot.membership,
        roleName: hot.roleName ?? "Member",
      };
    }
  }

  const [clerkUser, existingUserRows] = await Promise.all([
    currentUser(),
    db.select(userCoreSelect).from(users).where(eq(users.clerkUserId, userId)).limit(1),
  ]);

  if (!clerkUser) {
    throw new Error("Clerk user not found");
  }

  const primaryEmailObj = clerkUser.emailAddresses.find(
    (e) => e.id === clerkUser.primaryEmailAddressId,
  );

  if (!primaryEmailObj) {
    throw new Error("Authenticated Clerk user has no primary email");
  }

  const email = primaryEmailObj.emailAddress;
  const name =
    [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    clerkUser.username ||
    email;
  const isEmailVerified = primaryEmailObj.verification?.status === "verified";
  const avatarUrl = clerkUser.imageUrl ?? null;

  let localUser = existingUserRows[0];

  if (!localUser) {
    const [sameEmail] = await db.select(userCoreSelect).from(users).where(eq(users.email, email)).limit(1);
    if (sameEmail) {
      [localUser] = await db
        .update(users)
        .set({
          clerkUserId: userId,
          name,
          avatarUrl,
          lastLoginAt: new Date(),
          emailVerifiedAt: isEmailVerified ? (sameEmail.emailVerifiedAt ?? new Date()) : sameEmail.emailVerifiedAt,
          updatedAt: new Date(),
        })
        .where(eq(users.id, sameEmail.id))
        .returning(userCoreSelect);
    } else {
      try {
        [localUser] = await db
          .insert(users)
          .values({
            clerkUserId: userId,
            email,
            name,
            avatarUrl,
            status: "active",
            timezone: "UTC",
            locale: "en",
            metadata: {},
            lastLoginAt: new Date(),
            emailVerifiedAt: isEmailVerified ? new Date() : null,
          })
          .returning(userCoreSelect);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        const [linked] = await db.select(userCoreSelect).from(users).where(eq(users.email, email)).limit(1);
        if (!linked) throw error;
        [localUser] = await db
          .update(users)
          .set({ clerkUserId: userId, name, avatarUrl, lastLoginAt: new Date(), updatedAt: new Date() })
          .where(eq(users.id, linked.id))
          .returning(userCoreSelect);
      }
    }
  } else {
    const profileChanged =
      localUser.email !== email ||
      localUser.name !== name ||
      localUser.avatarUrl !== avatarUrl ||
      (isEmailVerified && !localUser.emailVerifiedAt);
    const loginStale =
      !localUser.lastLoginAt ||
      Date.now() - localUser.lastLoginAt.getTime() > LOGIN_TOUCH_MS;

    if (profileChanged || loginStale) {
      [localUser] = await db
        .update(users)
        .set({
          email,
          name,
          avatarUrl,
          lastLoginAt: loginStale ? new Date() : localUser.lastLoginAt,
          emailVerifiedAt: isEmailVerified
            ? (localUser.emailVerifiedAt ?? new Date())
            : localUser.emailVerifiedAt,
          updatedAt: new Date(),
        })
        .where(eq(users.clerkUserId, userId))
        .returning(userCoreSelect);
    }
  }

  const clerkMemberships =
    (
      clerkUser as {
        organizationMemberships?: Array<{ organization?: { id?: string } }>;
      }
    ).organizationMemberships ?? [];

  let resolvedOrgId = orgId ?? clerkMemberships[0]?.organization?.id ?? null;

  if (resolvedOrgId) {
    const [existingOrg] = await db
      .select({
        organization: organizationCoreSelect,
        websiteCount: websiteCountExpr,
      })
      .from(organizations)
      .where(eq(organizations.clerkOrganizationId, resolvedOrgId))
      .limit(1);

    if (existingOrg) {
      // Empty production shell org while an older membership still holds websites.
      if (Number(existingOrg.websiteCount) === 0) {
        const legacy = await findLegacyOrganizationForUser(localUser.id, existingOrg.organization.id);
        if (legacy && Number(legacy.websiteCount) > 0) {
          const remounted = await remountOrganizationToClerkId(
            legacy.organization.id,
            resolvedOrgId,
            existingOrg.organization.id,
          );
          if (remounted) {
            return {
              user: localUser,
              organization: toOrganizationRow(remounted),
              membership: legacy.membership,
              roleName: await roleNameFor(legacy.membership.roleId),
            };
          }
        }
      }

      const [existingMembership] = await db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.organizationId, existingOrg.organization.id),
            eq(memberships.userId, localUser.id),
          ),
        )
        .limit(1);

      if (existingMembership) {
        return {
          user: localUser,
          organization: toOrganizationRow(existingOrg.organization),
          membership: existingMembership,
          roleName: await roleNameFor(existingMembership.roleId),
        };
      }

      const membership = await ensureMembershipForClerkRole({
        organizationId: existingOrg.organization.id,
        userId: localUser.id,
        clerkRole: clerkRoleForOrg(clerkUser, resolvedOrgId),
      });
      return {
        user: localUser,
        organization: toOrganizationRow(existingOrg.organization),
        membership,
        roleName: await roleNameFor(membership.roleId),
      };
    }
  }

  if (!resolvedOrgId) {
    try {
      const client = await clerkClient();
      const list = await client.users.getOrganizationMembershipList({
        userId,
        limit: 1,
      });
      resolvedOrgId = list.data[0]?.organization.id ?? null;
    } catch {
      /* User may not belong to any Clerk organization yet. */
    }
  }

  if (!resolvedOrgId) {
    const [linkedOrg] = await db
      .select({ clerkOrganizationId: organizations.clerkOrganizationId })
      .from(memberships)
      .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
      .where(eq(memberships.userId, localUser.id))
      .limit(1);
    resolvedOrgId = linkedOrg?.clerkOrganizationId ?? null;
  }

  if (!resolvedOrgId) {
    return {
      user: localUser,
      organization: null,
      membership: null,
    };
  }

  const [existingOrg] = await db
    .select(organizationCoreSelect)
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, resolvedOrgId))
    .limit(1);

  if (existingOrg) {
    const [existingMembership] = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, existingOrg.id),
          eq(memberships.userId, localUser.id),
        ),
      )
      .limit(1);

    if (existingMembership) {
      return {
        user: localUser,
        organization: toOrganizationRow(existingOrg),
        membership: existingMembership,
        roleName: await roleNameFor(existingMembership.roleId),
      };
    }

    const membership = await ensureMembershipForClerkRole({
      organizationId: existingOrg.id,
      userId: localUser.id,
      clerkRole: clerkRoleForOrg(clerkUser, resolvedOrgId),
    });
    return {
      user: localUser,
      organization: toOrganizationRow(existingOrg),
      membership,
      roleName: await roleNameFor(membership.roleId),
    };
  }

  // Production Clerk org id is new — remount the user's existing local org
  // (with websites) instead of creating a blank workspace.
  const legacy = await findLegacyOrganizationForUser(localUser.id);
  if (legacy) {
    const remounted = await remountOrganizationToClerkId(legacy.organization.id, resolvedOrgId);
    if (remounted) {
      return {
        user: localUser,
        organization: toOrganizationRow(remounted),
        membership: legacy.membership,
        roleName: await roleNameFor(legacy.membership.roleId),
      };
    }
  }

  const client = await clerkClient();
  const clerkOrg = await client.organizations.getOrganization({
    organizationId: resolvedOrgId,
  });

  const { organization, membership } = await db.transaction(async (tx) => {
    const slug = clerkOrg.slug || buildOrgSlug(clerkOrg.name, clerkOrg.id);

    const [newOrg] = await tx
      .insert(organizations)
      .values({
        clerkOrganizationId: clerkOrg.id,
        name: clerkOrg.name,
        slug,
        status: "active",
        timezone: "UTC",
        defaultLanguage: "en",
        defaultRegion: null,
        settings: {},
        onboardingCompleted: false,
      })
      .returning(organizationCoreSelect);

    const ownerRole = await ensureNamedRole(
      tx,
      OWNER_ROLE,
      "Full access to the organization and its resources.",
    );

    const [newMembership] = await tx
      .insert(memberships)
      .values({
        organizationId: newOrg.id,
        userId: localUser.id,
        roleId: ownerRole.id,
        status: "active",
        joinedAt: new Date(),
      })
      .returning();

    return { organization: newOrg, membership: newMembership };
  });

  return {
    user: localUser,
    organization: toOrganizationRow(organization),
    membership,
    roleName: OWNER_ROLE,
  };
}

export async function requireDashboardContext(): Promise<BootstrapContext> {
  const context = await bootstrapCurrentContext();
  if (!context.organization || !context.membership) {
    redirect("/create-organization");
  }
  return context;
}
