import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { apiKeys } from "@/db/schema/api-keys";
import { auditLogs } from "@/db/schema/audit-logs";

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

    const [organization] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkOrganizationId, orgId))
      .limit(1);

    if (!organization) {
      return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });
    }

    const [localUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!localUser) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
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
    console.error("API key revoke failed:", error);
    return NextResponse.json({ success: false, message: "Failed to revoke API key" }, { status: 500 });
  }
}
