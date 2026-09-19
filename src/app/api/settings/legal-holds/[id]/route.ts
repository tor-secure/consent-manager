import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { legalHolds } from "@/db/schema/legal-holds";
import { auditLogs } from "@/db/schema/audit-logs";
import { RETENTION_AUDIT_ACTIONS, sanitizeRetentionAuditMetadata } from "@/lib/retention/core";
import {
  authorizeRetentionOrganization,
  loadOwnedLegalHold,
  requireRetentionAdmin,
} from "@/lib/retention/http";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await authorizeRetentionOrganization();
    if ("error" in authz) return authz.error;
    const { id } = await params;
    const hold = await loadOwnedLegalHold(authz.organization.id, id);
    if (!hold) {
      return NextResponse.json({ success: false, message: "Legal hold not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, hold });
  } catch (error) {
    logger.error("Legal hold GET failed", { error });
    return NextResponse.json({ success: false, message: "Failed to load legal hold" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authz = await authorizeRetentionOrganization();
    if ("error" in authz) return authz.error;
    const forbidden = requireRetentionAdmin(authz.membership.roleName);
    if (forbidden) return forbidden;

    const { id } = await params;
    const hold = await loadOwnedLegalHold(authz.organization.id, id);
    if (!hold) {
      return NextResponse.json({ success: false, message: "Legal hold not found" }, { status: 404 });
    }
    if (hold.status === "released") {
      return NextResponse.json({ success: false, message: "Legal hold already released" }, { status: 409 });
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (body.action !== "release") {
      return NextResponse.json({ success: false, message: "Unsupported action" }, { status: 400 });
    }

    const now = new Date();
    const [updated] = await db
      .update(legalHolds)
      .set({
        status: "released",
        releasedBy: authz.localUser.id,
        releasedAt: now,
      })
      .where(eq(legalHolds.id, hold.id))
      .returning();

    await db.insert(auditLogs).values({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: RETENTION_AUDIT_ACTIONS.holdReleased,
      resourceType: hold.resourceType,
      resourceId: hold.resourceId,
      description: "Legal hold released",
      metadata: sanitizeRetentionAuditMetadata({
        holdId: hold.id,
        resourceType: hold.resourceType,
      }),
    });

    return NextResponse.json({ success: true, hold: updated });
  } catch (error) {
    logger.error("Legal hold release failed", { error });
    return NextResponse.json({ success: false, message: "Failed to release legal hold" }, { status: 500 });
  }
}
