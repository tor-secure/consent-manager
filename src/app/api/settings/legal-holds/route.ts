import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { legalHolds } from "@/db/schema/legal-holds";
import { auditLogs } from "@/db/schema/audit-logs";
import {
  RETENTION_AUDIT_ACTIONS,
  parseLegalHoldInput,
  sanitizeRetentionAuditMetadata,
} from "@/lib/retention/core";
import {
  assertOwnedRetentionResource,
  authorizeRetentionOrganization,
  loadOwnedWebsite,
  requireRetentionAdmin,
} from "@/lib/retention/http";

export async function GET() {
  try {
    const authz = await authorizeRetentionOrganization();
    if ("error" in authz) return authz.error;

    const holds = await db
      .select()
      .from(legalHolds)
      .where(eq(legalHolds.organizationId, authz.organization.id))
      .orderBy(desc(legalHolds.createdAt));

    return NextResponse.json({
      success: true,
      holds: holds.map((hold) => ({
        id: hold.id,
        websiteId: hold.websiteId,
        resourceType: hold.resourceType,
        resourceId: hold.resourceId,
        reason: hold.reason,
        status: hold.status,
        createdAt: hold.createdAt,
        releasedAt: hold.releasedAt,
      })),
    });
  } catch (error) {
    console.error("Legal holds GET failed:", error);
    return NextResponse.json({ success: false, message: "Failed to load legal holds" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authz = await authorizeRetentionOrganization();
    if ("error" in authz) return authz.error;
    const forbidden = requireRetentionAdmin(authz.membership.roleName);
    if (forbidden) return forbidden;

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const parsed = parseLegalHoldInput(body);
    if (!parsed.ok) {
      return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
    }

    const website = await loadOwnedWebsite(authz.organization.id, parsed.value.websiteId);
    if (!website.ok) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    const owned = await assertOwnedRetentionResource({
      organizationId: authz.organization.id,
      resourceType: parsed.value.resourceType,
      resourceId: parsed.value.resourceId,
    });
    if (!owned) {
      return NextResponse.json({ success: false, message: "Resource not found" }, { status: 404 });
    }

    const [hold] = await db
      .insert(legalHolds)
      .values({
        organizationId: authz.organization.id,
        websiteId: parsed.value.websiteId,
        resourceType: parsed.value.resourceType,
        resourceId: parsed.value.resourceId,
        reason: parsed.value.reason,
        createdBy: authz.localUser.id,
        status: "active",
      })
      .returning();

    await db.insert(auditLogs).values({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: RETENTION_AUDIT_ACTIONS.holdCreated,
      resourceType: parsed.value.resourceType,
      resourceId: parsed.value.resourceId,
      description: "Legal hold created",
      metadata: sanitizeRetentionAuditMetadata({
        holdId: hold.id,
        resourceType: parsed.value.resourceType,
        websiteId: parsed.value.websiteId,
      }),
    });

    return NextResponse.json({ success: true, hold }, { status: 201 });
  } catch (error) {
    console.error("Legal hold create failed:", error);
    return NextResponse.json({ success: false, message: "Failed to create legal hold" }, { status: 500 });
  }
}
