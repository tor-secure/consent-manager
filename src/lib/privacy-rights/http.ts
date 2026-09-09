import "server-only";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { dataPrincipalRequests } from "@/db/schema/data-principal-requests";
import {
  resolveActiveMembership,
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";

export const RIGHTS_VIEW_ROLES = ["Owner", "Admin", "Member"] as const;
export const RIGHTS_MANAGE_ROLES = ["Owner", "Admin"] as const;

export async function authorizeRightsOrganization() {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId) {
    return {
      error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!orgId) {
    return {
      error: NextResponse.json(
        { success: false, message: "No active organization selected" },
        { status: 400 },
      ),
    };
  }
  const localUser = await resolveLocalUser(userId);
  if (!localUser) {
    return {
      error: NextResponse.json({ success: false, message: "User not found" }, { status: 404 }),
    };
  }
  const organization = await resolveLocalOrganization(orgId);
  if (!organization) {
    return {
      error: NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 }),
    };
  }
  const membership = await resolveActiveMembership(organization.id, localUser.id);
  if (!membership || !(RIGHTS_VIEW_ROLES as readonly string[]).includes(membership.roleName)) {
    return {
      error: NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 }),
    };
  }
  return { localUser, organization, membership };
}

export function requireRightsManager(roleName: string) {
  if (!(RIGHTS_MANAGE_ROLES as readonly string[]).includes(roleName)) {
    return NextResponse.json(
      { success: false, message: "Only Owner or Admin can perform this rights action" },
      { status: 403 },
    );
  }
  return null;
}

export async function loadOwnedRightsRequest(
  organizationId: string,
  requestId: string,
) {
  const [row] = await db
    .select()
    .from(dataPrincipalRequests)
    .where(
      and(
        eq(dataPrincipalRequests.id, requestId),
        eq(dataPrincipalRequests.organizationId, organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}
