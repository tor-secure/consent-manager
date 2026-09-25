import "server-only";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import {
  resolveActiveMembership,
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";

export type ToolSession = {
  clerkUserId: string;
  userId: string;
  organizationId: string;
  organizationName: string;
};

export async function requireToolSession(): Promise<{ session: ToolSession } | { response: NextResponse }> {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId) {
    return { response: NextResponse.json({ success: false, message: "Sign in to save this assessment." }, { status: 401 }) };
  }
  if (!orgId) {
    return { response: NextResponse.json({ success: false, message: "Choose an organisation workspace first." }, { status: 400 }) };
  }
  const localUser = await resolveLocalUser(userId);
  if (!localUser) {
    return { response: NextResponse.json({ success: false, message: "User not found" }, { status: 404 }) };
  }
  const organization = await resolveLocalOrganization(orgId);
  if (!organization) {
    return { response: NextResponse.json({ success: false, message: "Organisation not found" }, { status: 404 }) };
  }
  const membership = await resolveActiveMembership(organization.id, localUser.id);
  if (!membership) {
    return { response: NextResponse.json({ success: false, message: "You do not belong to this organisation." }, { status: 403 }) };
  }
  const [named] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organization.id))
    .limit(1);

  return {
    session: {
      clerkUserId: userId,
      userId: localUser.id,
      organizationId: organization.id,
      organizationName: named?.name ?? "Workspace",
    },
  };
}
