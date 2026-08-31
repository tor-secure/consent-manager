import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";
import { users } from "@/db/schema/users";
import { auditLogs } from "@/db/schema/audit-logs";
import {
  parseRetentionConfig,
  mergeRetentionConfig,
  MIN_RETENTION_DAYS,
  MAX_RETENTION_DAYS,
  RETENTION_RULES,
} from "@/lib/retention-policy";
import {
  resolveLocalOrganization,
  resolveLocalUser,
  resolveActiveMembership,
} from "@/lib/api-auth-helpers";

const EDIT_ROLES = ["Owner", "Admin"] as const;

// ---------------------------------------------------------------------------
// GET /api/settings/retention
// Returns the organisation's current retention configuration and rules.
// Any active member can read; Owner/Admin only to write.
// ---------------------------------------------------------------------------

export async function GET(_request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();
    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const localUser = await resolveLocalUser(userId);
    if (!localUser) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    const organization = await resolveLocalOrganization(orgId);
    if (!organization) return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });

    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    // Fetch full org row to read settings JSONB.
    const [org] = await db
      .select({ settings: organizations.settings })
      .from(organizations)
      .where(eq(organizations.id, organization.id))
      .limit(1);

    const config = parseRetentionConfig(org?.settings ?? {});

    return NextResponse.json({
      success: true,
      retention: config,
      rules: RETENTION_RULES,
      limits: { min: MIN_RETENTION_DAYS, max: MAX_RETENTION_DAYS },
    });
  } catch (error) {
    console.error("Retention GET failed:", error);
    return NextResponse.json({ success: false, message: "Failed to load retention settings" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/settings/retention
// Update retention configuration. Owner/Admin only.
// Body: { consentRecordRetentionDays?: number, auditLogRetentionDays?: number }
// ---------------------------------------------------------------------------

export async function PATCH(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();
    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const localUser = await resolveLocalUser(userId);
    if (!localUser) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    const organization = await resolveLocalOrganization(orgId);
    if (!organization) return NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 });

    // Owner/Admin only for writes.
    const [callerMembership] = await db
      .select({ roleName: roles.name })
      .from(memberships)
      .innerJoin(roles, eq(memberships.roleId, roles.id))
      .where(
        and(
          eq(memberships.organizationId, organization.id),
          eq(memberships.userId, localUser.id),
          eq(memberships.status, "active"),
        ),
      )
      .limit(1);

    if (!(EDIT_ROLES as readonly string[]).includes(callerMembership?.roleName ?? "")) {
      return NextResponse.json({ success: false, message: "Only Owner or Admin can change retention settings" }, { status: 403 });
    }

    const body = await request.json();

    // Validate and clamp values.
    const updates: Record<string, number> = {};

    if (body.consentRecordRetentionDays !== undefined) {
      const v = Math.round(Number(body.consentRecordRetentionDays));
      if (!Number.isFinite(v) || v < MIN_RETENTION_DAYS || v > MAX_RETENTION_DAYS) {
        return NextResponse.json(
          { success: false, message: `consentRecordRetentionDays must be between ${MIN_RETENTION_DAYS} and ${MAX_RETENTION_DAYS}` },
          { status: 400 },
        );
      }
      updates.consentRecordRetentionDays = v;
    }

    if (body.auditLogRetentionDays !== undefined) {
      const v = Math.round(Number(body.auditLogRetentionDays));
      if (!Number.isFinite(v) || v < MIN_RETENTION_DAYS || v > MAX_RETENTION_DAYS) {
        return NextResponse.json(
          { success: false, message: `auditLogRetentionDays must be between ${MIN_RETENTION_DAYS} and ${MAX_RETENTION_DAYS}` },
          { status: 400 },
        );
      }
      updates.auditLogRetentionDays = v;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ success: false, message: "No valid retention fields provided" }, { status: 400 });
    }

    // Merge into existing settings JSONB.
    const [orgRow] = await db
      .select({ settings: organizations.settings })
      .from(organizations)
      .where(eq(organizations.id, organization.id))
      .limit(1);

    const newSettings = mergeRetentionConfig(orgRow?.settings ?? {}, updates);

    await db
      .update(organizations)
      .set({ settings: newSettings, updatedAt: new Date() })
      .where(eq(organizations.id, organization.id));

    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: localUser.id,
      action: "retention.settings.updated",
      resourceType: "organization",
      description: `Retention settings updated: ${Object.entries(updates).map(([k, v]) => `${k}=${v}`).join(", ")}`,
      metadata: { changes: updates },
    });

    return NextResponse.json({ success: true, retention: parseRetentionConfig(newSettings) });
  } catch (error) {
    console.error("Retention PATCH failed:", error);
    return NextResponse.json({ success: false, message: "Failed to update retention settings" }, { status: 500 });
  }
}
