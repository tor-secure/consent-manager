import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { webhookEndpoints } from "@/db/schema/webhook-endpoints";
import { WEBHOOK_EVENT_TYPES } from "../route";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { resolveLocalOrganization, resolveLocalUser, resolveActiveMembership } from "@/lib/api-auth-helpers";

// PATCH /api/webhooks/endpoints/[id] — update name, description, events, or status.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const limit = rateLimit({
      key: `webhook-update:${orgId}:${userId}:${getClientIp(request)}`,
      limit: 60,
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
      return NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 });
    }

    const [endpoint] = await db
      .select({ id: webhookEndpoints.id, status: webhookEndpoints.status })
      .from(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organization.id)))
      .limit(1);

    if (!endpoint) {
      return NextResponse.json({ success: false, message: "Endpoint not found" }, { status: 404 });
    }

    const body = await request.json();
    const updates: Partial<typeof webhookEndpoints.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (body.status !== undefined) {
      const status = String(body.status);
      if (!["active", "disabled"].includes(status)) {
        return NextResponse.json({ success: false, message: "Status must be active or disabled" }, { status: 400 });
      }
      updates.status = status;
    }

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ success: false, message: "Name is required" }, { status: 400 });
      updates.name = name;
    }

    if (body.description !== undefined) {
      updates.description = body.description ? String(body.description).trim() || null : null;
    }

    if (body.subscribedEvents !== undefined) {
      const validSet = new Set<string>(WEBHOOK_EVENT_TYPES);
      const events = (Array.isArray(body.subscribedEvents) ? body.subscribedEvents : [])
        .map((e: unknown) => String(e))
        .filter((e: string) => validSet.has(e));
      updates.subscribedEvents = events;
    }

    const [updated] = await db
      .update(webhookEndpoints)
      .set(updates)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organization.id)))
      .returning();

    return NextResponse.json({ success: true, endpoint: updated });
  } catch (error) {
    logger.error("Webhook endpoint update failed", {
      operation: "webhook_endpoint.update",
      error,
    });
    return NextResponse.json({ success: false, message: "Failed to update endpoint" }, { status: 500 });
  }
}

// DELETE /api/webhooks/endpoints/[id] — permanently delete.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const limit = rateLimit({
      key: `webhook-delete:${orgId}:${userId}:${getClientIp(_request)}`,
      limit: 60,
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
      return NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 });
    }

    const deleted = await db
      .delete(webhookEndpoints)
      .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.organizationId, organization.id)))
      .returning({ id: webhookEndpoints.id });

    if (deleted.length === 0) {
      return NextResponse.json({ success: false, message: "Endpoint not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Webhook endpoint delete failed", {
      operation: "webhook_endpoint.delete",
      error,
    });
    return NextResponse.json({ success: false, message: "Failed to delete endpoint" }, { status: 500 });
  }
}
