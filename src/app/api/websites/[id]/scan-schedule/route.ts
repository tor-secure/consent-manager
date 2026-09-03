import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { websiteScanSchedules } from "@/db/schema/website-scan-schedules";
import { organizations } from "@/db/schema/organizations";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import {
  computeNextScanAt,
  isScanFrequency,
  normalizeTimezone,
} from "@/lib/scanner/scan-schedule";

async function requireOwnedWebsite(websiteId: string, organization: { id: string }) {
  const [website] = await db
    .select({
      id: websites.id,
      organizationId: websites.organizationId,
      status: websites.status,
    })
    .from(websites)
    .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organization.id)))
    .limit(1);
  return website ?? null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();
    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const localUser = await resolveLocalUser(userId);
    if (!localUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    const organization = await resolveLocalOrganization(orgId);
    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }
    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "You do not belong to this organization." },
        { status: 403 },
      );
    }

    const { id: websiteId } = await context.params;
    const website = await requireOwnedWebsite(websiteId, organization);
    if (!website) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    const [schedule] = await db
      .select()
      .from(websiteScanSchedules)
      .where(
        and(
          eq(websiteScanSchedules.websiteId, website.id),
          eq(websiteScanSchedules.organizationId, organization.id),
        ),
      )
      .limit(1);

    return NextResponse.json({ success: true, schedule: schedule ?? null });
  } catch (error) {
    logger.error("Scan schedule read failed", { operation: "scanner.schedule.get", error });
    return NextResponse.json({ success: false, message: "Failed to load scan schedule" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();
    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const limit = rateLimit({
      key: `scan-schedule:${orgId}:${userId}:${getClientIp(request)}`,
      limit: 30,
      windowMs: 60 * 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit);

    const localUser = await resolveLocalUser(userId);
    if (!localUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }
    const organization = await resolveLocalOrganization(orgId);
    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }
    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "You do not belong to this organization." },
        { status: 403 },
      );
    }

    const { id: websiteId } = await context.params;
    const website = await requireOwnedWebsite(websiteId, organization);
    if (!website) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    const body = await request.json();
    const enabled = Boolean(body.enabled);
    const frequency = String(body.frequency ?? "weekly");
    if (!isScanFrequency(frequency)) {
      return NextResponse.json(
        { success: false, message: "Frequency must be daily, weekly, or monthly." },
        { status: 400 },
      );
    }

    const [org] = await db
      .select({ timezone: organizations.timezone })
      .from(organizations)
      .where(eq(organizations.id, organization.id))
      .limit(1);

    const timezone = normalizeTimezone(
      typeof body.timezone === "string" ? body.timezone : org?.timezone,
    );
    const now = new Date();
    const nextScanAt = enabled ? computeNextScanAt(now, frequency) : null;

    const [existing] = await db
      .select({ id: websiteScanSchedules.id })
      .from(websiteScanSchedules)
      .where(
        and(
          eq(websiteScanSchedules.websiteId, website.id),
          eq(websiteScanSchedules.organizationId, organization.id),
        ),
      )
      .limit(1);

    const values = {
      organizationId: organization.id,
      websiteId: website.id,
      enabled,
      frequency,
      timezone,
      nextScanAt,
      updatedAt: now,
    };

    const [saved] = existing
      ? await db
          .update(websiteScanSchedules)
          .set(values)
          .where(
            and(
              eq(websiteScanSchedules.id, existing.id),
              eq(websiteScanSchedules.organizationId, organization.id),
            ),
          )
          .returning()
      : await db.insert(websiteScanSchedules).values(values).returning();

    return NextResponse.json({ success: true, schedule: saved });
  } catch (error) {
    logger.error("Scan schedule update failed", { operation: "scanner.schedule.put", error });
    return NextResponse.json({ success: false, message: "Failed to save scan schedule" }, { status: 500 });
  }
}
