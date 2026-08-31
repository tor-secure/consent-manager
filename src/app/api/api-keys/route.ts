import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { apiKeys } from "@/db/schema/api-keys";
import { auditLogs } from "@/db/schema/audit-logs";
import { generateApiKey } from "@/lib/api-key-utils";
import { resolveLocalOrganization, resolveLocalUser, resolveActiveMembership } from "@/lib/api-auth-helpers";

const VALID_ENVIRONMENTS = ["live", "test"] as const;

export async function POST(request: Request) {
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
      return NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 });
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ success: false, message: "Key name is required" }, { status: 400 });
    }
    if (name.length > 255) {
      return NextResponse.json({ success: false, message: "Key name is too long" }, { status: 400 });
    }

    const environment = VALID_ENVIRONMENTS.includes(body.environment)
      ? (body.environment as (typeof VALID_ENVIRONMENTS)[number])
      : "live";

    // Optional expiry: ISO date string or null.
    let expiresAt: Date | null = null;
    if (body.expiresAt) {
      const parsed = new Date(body.expiresAt);
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ success: false, message: "Invalid expiry date" }, { status: 400 });
      }
      if (parsed <= new Date()) {
        return NextResponse.json({ success: false, message: "Expiry date must be in the future" }, { status: 400 });
      }
      expiresAt = parsed;
    }

    // Generate the key — fullKey is returned once and never stored.
    const { fullKey, keyPrefix, keyHash } = generateApiKey(environment);

    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        organizationId: organization.id,
        createdByUserId: localUser.id,
        name,
        keyPrefix,
        keyHash,
        environment,
        status: "active",
        expiresAt,
      })
      .returning();

    // Write audit log.
    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: localUser.id,
      action: "api_key.created",
      resourceType: "api_key",
      resourceId: apiKey.id,
      description: `API key "${name}" created (${environment})`,
      metadata: { keyPrefix, environment },
    });

    return NextResponse.json(
      {
        success: true,
        // fullKey returned once — caller must show it immediately and never request it again.
        fullKey,
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          environment: apiKey.environment,
          status: apiKey.status,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("API key creation failed:", error);
    return NextResponse.json({ success: false, message: "Failed to create API key" }, { status: 500 });
  }
}
