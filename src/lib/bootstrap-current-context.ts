import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { organizations } from "@/db/schema/organizations";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BootstrapContext = {
  user: typeof users.$inferSelect;
  organization: typeof organizations.$inferSelect;
  membership: typeof memberships.$inferSelect;
};

export type BootstrapContextNoOrg = {
  user: typeof users.$inferSelect;
  organization: null;
  membership: null;
};

export type BootstrapResult = BootstrapContext | BootstrapContextNoOrg;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildOrgSlug(name: string, clerkId: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${base || "organization"}-${clerkId.slice(-8)}`;
}

// ---------------------------------------------------------------------------
// bootstrapCurrentContext
//
// Call once per /dashboard request (from the layout).
// Guarantees:
//   1. Clerk user is authenticated
//   2. Local user row exists and is up-to-date
//   3. If an active Clerk org exists:
//      a. Clerk org details are fetched
//      b. Local organization row exists
//      c. Owner role exists
//      d. Membership for this user+org exists
//
// Throws an Error if the user is not authenticated — the caller (layout)
// is responsible for redirecting to /sign-in.
// Returns { organization: null, membership: null } when there is no active
// Clerk org — the caller (layout) should redirect to /create-organization.
// ---------------------------------------------------------------------------

export const bootstrapCurrentContext = cache(async function bootstrapCurrentContext(): Promise<BootstrapResult> {
  // --------------------------------------------------
  // 1. AUTHENTICATE
  // --------------------------------------------------

  const { isAuthenticated, userId, orgId } = await auth();

  if (!isAuthenticated || !userId) {
    throw new Error("User is not authenticated");
  }

  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("Clerk user not found");
  }

  // --------------------------------------------------
  // 2. RESOLVE PRIMARY EMAIL
  // --------------------------------------------------

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

  const isEmailVerified =
    primaryEmailObj.verification?.status === "verified";

  // --------------------------------------------------
  // 3. SYNC LOCAL USER (upsert)
  // --------------------------------------------------

  let [localUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!localUser) {
    [localUser] = await db
      .insert(users)
      .values({
        clerkUserId: userId,
        email,
        name,
        avatarUrl: clerkUser.imageUrl ?? null,
        status: "active",
        timezone: "UTC",
        locale: "en",
        metadata: {},
        lastLoginAt: new Date(),
        emailVerifiedAt: isEmailVerified ? new Date() : null,
      })
      .returning();
  } else {
    [localUser] = await db
      .update(users)
      .set({
        email,
        name,
        avatarUrl: clerkUser.imageUrl ?? null,
        lastLoginAt: new Date(),
        // Only set emailVerifiedAt when Clerk says verified; never clear it
        // once set so we don't lose historical verification state.
        emailVerifiedAt: isEmailVerified
          ? (localUser.emailVerifiedAt ?? new Date())
          : localUser.emailVerifiedAt,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, userId))
      .returning();
  }

  // --------------------------------------------------
  // 4. RESOLVE ACTIVE ORGANIZATION
  //    A fresh login often has a Clerk user but no session orgId yet.
  //    Fall back to the user's first Clerk membership, then a local membership.
  // --------------------------------------------------

  const clerkMemberships =
    (
      clerkUser as {
        organizationMemberships?: Array<{ organization?: { id?: string } }>;
      }
    ).organizationMemberships ?? [];

  let resolvedOrgId = orgId ?? clerkMemberships[0]?.organization?.id ?? null;

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

  // --------------------------------------------------
  // 5. FETCH CLERK ORGANIZATION
  // --------------------------------------------------

  const client = await clerkClient();

  const clerkOrg = await client.organizations.getOrganization({
    organizationId: resolvedOrgId,
  });

  // --------------------------------------------------
  // 6. FIND OR CREATE LOCAL ORG + OWNER ROLE + MEMBERSHIP
  //    All three writes happen inside a single transaction
  //    so the database never ends up in a half-initialized state.
  // --------------------------------------------------

  const [existingOrg] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, clerkOrg.id))
    .limit(1);

  if (existingOrg) {
    // Org already exists — just ensure the membership exists.
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
        organization: existingOrg,
        membership: existingMembership,
      };
    }

    // Membership missing — ensure Owner role exists then create membership.
    const membership = await db.transaction(async (tx) => {
      let [ownerRole] = await tx
        .select()
        .from(roles)
        .where(eq(roles.name, "Owner"))
        .limit(1);

      if (!ownerRole) {
        [ownerRole] = await tx
          .insert(roles)
          .values({
            name: "Owner",
            description:
              "Full access to the organization and its resources.",
          })
          .returning();
      }

      const [newMembership] = await tx
        .insert(memberships)
        .values({
          organizationId: existingOrg.id,
          userId: localUser.id,
          roleId: ownerRole.id,
          status: "active",
          joinedAt: new Date(),
        })
        .returning();

      return newMembership;
    });

    return {
      user: localUser,
      organization: existingOrg,
      membership,
    };
  }

  // Org does not exist — create org + role + membership atomically.
  const { organization, membership } = await db.transaction(async (tx) => {
    const slug =
      clerkOrg.slug ||
      buildOrgSlug(clerkOrg.name, clerkOrg.id);

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
      .returning();

    let [ownerRole] = await tx
      .select()
      .from(roles)
      .where(eq(roles.name, "Owner"))
      .limit(1);

    if (!ownerRole) {
      [ownerRole] = await tx
        .insert(roles)
        .values({
          name: "Owner",
          description: "Full access to the organization and its resources.",
        })
        .returning();
    }

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
    organization,
    membership,
  };
});

export async function requireDashboardContext(): Promise<BootstrapContext> {
  const context = await bootstrapCurrentContext();
  if (!context.organization || !context.membership) {
    redirect("/create-organization");
  }
  return context;
}
