import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { eq } from "drizzle-orm";

export async function syncClerkUser() {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    throw new Error("User is not authenticated");
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress;

  if (!email) {
    throw new Error("Authenticated Clerk user has no email address");
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName]
      .filter(Boolean)
      .join(" ") ||
    clerkUser.username ||
    email;

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, clerkUser.id))
    .limit(1);

  if (existingUser.length > 0) {
    const [updatedUser] = await db
      .update(users)
      .set({
        email,
        name,
        avatarUrl: clerkUser.imageUrl ?? null,
        lastLoginAt: new Date(),
        emailVerifiedAt:
          clerkUser.emailAddresses[0]?.verification?.status === "verified"
            ? new Date()
            : null,
        updatedAt: new Date(),
      })
      .where(eq(users.clerkUserId, clerkUser.id))
      .returning();

    return updatedUser;
  }

  const [newUser] = await db
    .insert(users)
    .values({
      clerkUserId: clerkUser.id,
      email,
      name,
      avatarUrl: clerkUser.imageUrl ?? null,
      status: "active",
      lastLoginAt: new Date(),
      emailVerifiedAt:
        clerkUser.emailAddresses[0]?.verification?.status === "verified"
          ? new Date()
          : null,
      timezone: "UTC",
      locale: "en",
      metadata: {},
    })
    .returning();

  return newUser;
}