import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { memberships } from "@/db/schema/memberships";
import { ensureNamedRole } from "@/lib/local-membership";
import { OWNER_ROLE } from "@/lib/org-roles";

function createSlug(name: string, clerkId: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${base || "organization"}-${clerkId.slice(-8)}`;
}

export async function syncActiveClerkOrganization() {
  const { isAuthenticated, userId, orgId } = await auth();

  if (!isAuthenticated || !userId) {
    throw new Error("User is not authenticated");
  }

  if (!orgId) {
    throw new Error("No active organization selected");
  }

  const client = await clerkClient();

  const clerkOrganization =
    await client.organizations.getOrganization({
      organizationId: orgId,
    });

  // Find the local user
  const [localUser] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, userId))
    .limit(1);

  if (!localUser) {
    throw new Error(
      "Local user not found. User must be synced first.",
    );
  }

  // Check whether organization already exists locally
  const [existingOrganization] = await db
    .select()
    .from(organizations)
    .where(
      eq(
        organizations.clerkOrganizationId,
        clerkOrganization.id,
      ),
    )
    .limit(1);

  if (existingOrganization) {
    return existingOrganization;
  }

  return await db.transaction(async (tx) => {
    const ownerRole = await ensureNamedRole(
      tx,
      OWNER_ROLE,
      "Full access to the organization and its resources.",
    );

    // Create local organization
    const [organization] = await tx
      .insert(organizations)
      .values({
        clerkOrganizationId: clerkOrganization.id,
        name: clerkOrganization.name,
        slug: createSlug(
          clerkOrganization.name,
          clerkOrganization.id,
        ),
        status: "active",
        timezone: "UTC",
        defaultLanguage: "en",
        defaultRegion: null,
        settings: {},
        onboardingCompleted: false,
      })
      .returning();

    // Create owner membership
    await tx.insert(memberships).values({
      organizationId: organization.id,
      userId: localUser.id,
      roleId: ownerRole.id,
      status: "active",
      joinedAt: new Date(),
    });

    return organization;
  });
}