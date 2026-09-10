import "server-only";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import { trackers } from "@/db/schema/trackers";
import {
  resolveActiveMembership,
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { isUuid } from "./management";

export async function authorizeTrackerOrganization() {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId) {
    return { error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }
  if (!orgId) {
    return { error: NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 }) };
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
    return { error: NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 }) };
  }
  return { localUser, organization, orgId, userId };
}

export function trackerMutationLimit(request: Request, orgId: string, userId: string) {
  const limit = rateLimit({
    key: `trackers:${orgId}:${userId}:${getClientIp(request)}`,
    limit: 120,
    windowMs: 60 * 60_000,
  });
  return limit.allowed ? null : rateLimitResponse(limit);
}

export async function loadOwnedWebsite(organizationId: string, websiteId: string) {
  if (!isUuid(websiteId)) return null;
  const [website] = await db
    .select({
      id: websites.id,
      organizationId: websites.organizationId,
      name: websites.name,
      domain: websites.domain,
    })
    .from(websites)
    .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organizationId)))
    .limit(1);
  return website ?? null;
}

export async function loadOwnedPurpose(organizationId: string, purposeId: string | null) {
  if (!purposeId) return { ok: true as const, purpose: null };
  if (!isUuid(purposeId)) return { ok: false as const };
  const [purpose] = await db
    .select({ id: purposes.id, name: purposes.name, key: purposes.key })
    .from(purposes)
    .where(and(eq(purposes.id, purposeId), eq(purposes.organizationId, organizationId)))
    .limit(1);
  return purpose ? { ok: true as const, purpose } : { ok: false as const };
}

export async function loadOwnedTracker(organizationId: string, trackerId: string) {
  if (!isUuid(trackerId)) return null;
  const [row] = await db
    .select({
      tracker: trackers,
      website: {
        id: websites.id,
        organizationId: websites.organizationId,
        name: websites.name,
        domain: websites.domain,
      },
    })
    .from(trackers)
    .innerJoin(websites, eq(trackers.websiteId, websites.id))
    .where(and(eq(trackers.id, trackerId), eq(websites.organizationId, organizationId)))
    .limit(1);
  return row ?? null;
}

export async function loadOwnedVendor(organizationId: string, vendorId: string | null) {
  if (!vendorId) return { ok: true as const, vendor: null };
  if (!isUuid(vendorId)) return { ok: false as const };
  const [vendor] = await db
    .select({ id: vendors.id, name: vendors.name, status: vendors.status, deletedAt: vendors.deletedAt })
    .from(vendors)
    .where(and(eq(vendors.id, vendorId), eq(vendors.organizationId, organizationId)))
    .limit(1);
  if (!vendor) return { ok: false as const };
  if (vendor.status === "archived" || vendor.status === "inactive" || vendor.deletedAt) {
    return { ok: false as const, inactive: true as const };
  }
  return { ok: true as const, vendor };
}

export function vendorMappingError(vendor: Awaited<ReturnType<typeof loadOwnedVendor>>) {
  if (vendor.ok) return null;
  if ("inactive" in vendor && vendor.inactive) {
    return NextResponse.json(
      { success: false, message: "Archived or inactive vendors cannot be mapped to trackers." },
      { status: 400 },
    );
  }
  return NextResponse.json(
    { success: false, message: "Vendor not found in this organization." },
    { status: 400 },
  );
}
