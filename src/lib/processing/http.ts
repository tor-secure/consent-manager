import "server-only";

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { vendors } from "@/db/schema/vendors";
import {
  crossBorderTransfers,
  processingActivities,
  vendorRelationships,
} from "@/db/schema/processing-inventory";
import { websites } from "@/db/schema/websites";
import {
  resolveActiveMembership,
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";
import { requireOperatorRole } from "@/lib/org-roles";
import { isUuid } from "@/lib/trackers/management";

export async function authorizeProcessingOrganization(options?: { operator?: boolean }) {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId) {
    return { error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }
  if (!orgId) {
    return {
      error: NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 }),
    };
  }
  const localUser = await resolveLocalUser(userId);
  if (!localUser) {
    return { error: NextResponse.json({ success: false, message: "User not found" }, { status: 404 }) };
  }
  const organization = await resolveLocalOrganization(orgId);
  if (!organization) {
    return { error: NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 }) };
  }
  const membership = await resolveActiveMembership(organization.id, localUser.id);
  if (!membership) {
    return {
      error: NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 }),
    };
  }
  if (options?.operator) {
    const operatorError = requireOperatorRole(membership.roleName);
    if (operatorError) return { error: operatorError };
  }
  return { localUser, organization, orgId, userId, membership };
}

export async function loadOwnedVendorRecord(organizationId: string, vendorId: string) {
  if (!isUuid(vendorId)) return null;
  const [vendor] = await db
    .select()
    .from(vendors)
    .where(and(eq(vendors.id, vendorId), eq(vendors.organizationId, organizationId)))
    .limit(1);
  return vendor ?? null;
}

export async function loadOwnedWebsiteId(organizationId: string, websiteId: string | null) {
  if (!websiteId) return { ok: true as const, websiteId: null };
  if (!isUuid(websiteId)) return { ok: false as const };
  const [website] = await db
    .select({ id: websites.id })
    .from(websites)
    .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organizationId)))
    .limit(1);
  return website ? { ok: true as const, websiteId: website.id } : { ok: false as const };
}

export async function loadOwnedActivity(organizationId: string, activityId: string) {
  if (!isUuid(activityId)) return null;
  const [row] = await db
    .select()
    .from(processingActivities)
    .where(and(eq(processingActivities.id, activityId), eq(processingActivities.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function loadOwnedTransfer(organizationId: string, transferId: string) {
  if (!isUuid(transferId)) return null;
  const [row] = await db
    .select()
    .from(crossBorderTransfers)
    .where(and(eq(crossBorderTransfers.id, transferId), eq(crossBorderTransfers.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function loadOwnedRelationship(organizationId: string, relationshipId: string) {
  if (!isUuid(relationshipId)) return null;
  const [row] = await db
    .select()
    .from(vendorRelationships)
    .where(and(eq(vendorRelationships.id, relationshipId), eq(vendorRelationships.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}
