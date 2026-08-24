import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema/users";
import { organizations } from "@/db/schema/organizations";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";

export async function bootstrapCurrentContext() {
  const { isAuthenticated, userId, orgId } = await auth();

  if (!isAuthenticated || !userId) {
    throw new Error("User is not authenticated");
  }

  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("Clerk user not found");
  }

  /*
   * ----------------------------------------------------
   * 1. SYNC USER
   * ----------------------------------------------------
   */

  const primaryEmail = clerkUser.emailAddresses.find(
    (email) =>
      email.id === clerkUser.primaryEmailAddressId,
  );

  if (!primaryEmail) {
    throw new Error(
      "Authenticated Clerk user has no primary email",
    );
  }

  const email = primaryEmail.emailAddress;

  const name =
    [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    clerkUser.username ||
    email;

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
        emailVerifiedAt:
          primaryEmail.verification?.status === "verified"
            ? new Date()
            : null,
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
        emailVerifiedAt:
          primaryEmail.verification?.status === "verified"
            ? new Date()
            : localUser.emailVerifiedAt,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, userId))
      .returning();
  }

  /*
   * ----------------------------------------------------
   * 2. NO ACTIVE ORGANIZATION
   * ----------------------------------------------------
   */

  if (!orgId) {
    return {
      user: localUser,
      organization: null,
      membership: null,
    };
  }

  /*
   * ----------------------------------------------------
   * 3. GET CLERK ORGANIZATION
   * ----------------------------------------------------
   */

  const client = await clerkClient();

  const clerkOrganization =
    await client.organizations.getOrganization({
      organizationId: orgId,
    });

  /*
   * ----------------------------------------------------
   * 4. FIND OR CREATE LOCAL ORGANIZATION
   * ----------------------------------------------------
   */

  let [localOrganization] = await db
    .select()
    .from(organizations)
    .where(
      eq(
        organizations.clerkOrganizationId,
        clerkOrganization.id,
      ),
    )
    .limit(1);

  if (!localOrganization) {
    const slugBase =
      clerkOrganization.slug ||
      clerkOrganization.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const slug =
      `${slugBase || "organization"}-${clerkOrganization.id.slice(-8)}`;

    [localOrganization] = await db
      .insert(organizations)
      .values({
        clerkOrganizationId: clerkOrganization.id,
        name: clerkOrganization.name,
        slug,
        status: "active",
        timezone: "UTC",
        defaultLanguage: "en",
        defaultRegion: null,
        settings: {},
        onboardingCompleted: false,
      })
      .returning();
  }

  /*
   * ----------------------------------------------------
   * 5. FIND OWNER ROLE
   * ----------------------------------------------------
   */

  let [ownerRole] = await db
    .select()
    .from(roles)
    .where(eq(roles.name, "Owner"))
    .limit(1);

  if (!ownerRole) {
    [ownerRole] = await db
      .insert(roles)
      .values({
        name: "Owner",
        description:
          "Full access to the organization and CMP resources.",
      })
      .returning();
  }

  /*
   * ----------------------------------------------------
   * 6. FIND OR CREATE MEMBERSHIP
   * ----------------------------------------------------
   */

  let [membership] = await db
    .select()
    .from(memberships)
    .where(
      and(
        eq(
          memberships.organizationId,
          localOrganization.id,
        ),
        eq(memberships.userId, localUser.id),
      ),
    )
    .limit(1);

  if (!membership) {
    [membership] = await db
      .insert(memberships)
      .values({
        organizationId: localOrganization.id,
        userId: localUser.id,
        roleId: ownerRole.id,
        status: "active",
        joinedAt: new Date(),
      })
      .returning();
  }

  return {
    user: localUser,
    organization: localOrganization,
    membership,
  };
}