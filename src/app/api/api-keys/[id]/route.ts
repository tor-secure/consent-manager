import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { apiKeys } from "@/db/schema/api-keys";
import { auditLogs } from "@/db/schema/audit-logs";
import { logger } from "@/lib/logger";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { resolveLocalOrganization, resolveLocalUser, resolveActiveMembership } from "@/lib/api-auth-helpers";

// DELETE /api/api-keys/[id] — revoke a key (sets status=revoked, revokedAt=now).
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
      key: `api-key-revoke:${orgId}:${userId}:${getClientIp(_request)}`,
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

    // Verify key belongs to this org.
    const [existing] = await db
      .select({ id: apiKeys.id, name: apiKeys.name, keyPrefix: apiKeys.keyPrefix, environment: apiKeys.environment, status: apiKeys.status })
      .from(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organization.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ success: false, message: "API key not found" }, { status: 404 });
    }

    if (existing.status === "revoked") {
      return NextResponse.json({ success: false, message: "API key is already revoked" }, { status: 409 });
    }

    await db
      .update(apiKeys)
      .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.organizationId, organization.id)));

    // Write audit log.
    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: localUser.id,
      action: "api_key.revoked",
      resourceType: "api_key",
      resourceId: existing.id,
      description: `API key "${existing.name}" revoked`,
      metadata: { keyPrefix: existing.keyPrefix, environment: existing.environment },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("API key revoke failed", {
      route: "DELETE /api/api-keys/[id]",
      operation: "api-keys.revoke",
      error,
    });
    return NextResponse.json({ success: false, message: "Failed to revoke API key" }, { status: 500 });
  }
}
