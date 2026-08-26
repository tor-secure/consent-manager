import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";
import { auditLogs } from "@/db/schema/audit-logs";

// Roles that may update organization settings.
const AUTHORIZED_ROLES = ["Owner", "Admin"] as const;

const VALID_LANGUAGES = ["en", "hi", "kn", "fr", "de", "es", "pt", "nl", "it", "pl"] as const;
const VALID_REGIONS = ["IN", "EU", "US", "UK", "AU", "CA", "SG", "AE"] as const;
const VALID_TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Australia/Sydney",
  "Asia/Singapore",
  "Asia/Dubai",
  "Asia/Tokyo",
] as const;

export async function PUT(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    // Resolve local org.
    const [organization] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.clerkOrganizationId, orgId))
      .limit(1);

    if (!organization) {
      return NextResponse.json(
        { success: false, message: "Organization not found" },
        { status: 404 },
      );
    }

    // Resolve local user.
    const [localUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!localUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    // Authorization: check membership + role name.
    const [membership] = await db
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

    const roleName = membership?.roleName ?? "";
    const isAuthorized = (AUTHORIZED_ROLES as readonly string[]).includes(roleName);

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to update organization settings" },
        { status: 403 },
      );
    }

    const body = await request.json();

    // Validate each field individually.
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Organization name is required" },
        { status: 400 },
      );
    }
    if (name.length > 255) {
      return NextResponse.json(
        { success: false, message: "Organization name is too long" },
        { status: 400 },
      );
    }

    const description = body.description
      ? String(body.description).trim() || null
      : null;

    const logoUrl = body.logoUrl
      ? String(body.logoUrl).trim() || null
      : null;

    // Basic URL validation for logoUrl.
    if (logoUrl) {
      try {
        new URL(logoUrl);
      } catch {
        return NextResponse.json(
          { success: false, message: "Logo URL must be a valid URL" },
          { status: 400 },
        );
      }
    }

    const timezone = (VALID_TIMEZONES as readonly string[]).includes(body.timezone)
      ? (body.timezone as string)
      : null;

    if (!timezone) {
      return NextResponse.json(
        { success: false, message: `Timezone must be one of the supported values` },
        { status: 400 },
      );
    }

    const defaultLanguage = (VALID_LANGUAGES as readonly string[]).includes(
      body.defaultLanguage,
    )
      ? (body.defaultLanguage as string)
      : null;

    if (!defaultLanguage) {
      return NextResponse.json(
        { success: false, message: `Default language is not supported` },
        { status: 400 },
      );
    }

    const defaultRegion =
      body.defaultRegion &&
      (VALID_REGIONS as readonly string[]).includes(body.defaultRegion)
        ? (body.defaultRegion as string)
        : null;

    const onboardingCompleted =
      typeof body.onboardingCompleted === "boolean"
        ? body.onboardingCompleted
        : organization.onboardingCompleted;

    // Build a diff of what actually changed for the audit log.
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (organization.name !== name) changes.name = { from: organization.name, to: name };
    if ((organization.description ?? null) !== description)
      changes.description = { from: organization.description, to: description };
    if ((organization.logoUrl ?? null) !== logoUrl)
      changes.logoUrl = { from: organization.logoUrl, to: logoUrl };
    if (organization.timezone !== timezone)
      changes.timezone = { from: organization.timezone, to: timezone };
    if (organization.defaultLanguage !== defaultLanguage)
      changes.defaultLanguage = { from: organization.defaultLanguage, to: defaultLanguage };
    if ((organization.defaultRegion ?? null) !== defaultRegion)
      changes.defaultRegion = { from: organization.defaultRegion, to: defaultRegion };
    if (organization.onboardingCompleted !== onboardingCompleted)
      changes.onboardingCompleted = {
        from: organization.onboardingCompleted,
        to: onboardingCompleted,
      };

    // Only write to DB if something actually changed.
    if (Object.keys(changes).length === 0) {
      return NextResponse.json({ success: true, message: "No changes to save" });
    }

    const [updated] = await db
      .update(organizations)
      .set({
        name,
        description,
        logoUrl,
        timezone,
        defaultLanguage,
        defaultRegion,
        onboardingCompleted,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organization.id))
      .returning();

    // Audit log.
    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: localUser.id,
      action: "organization.settings.updated",
      resourceType: "organization",
      resourceId: organization.id,
      description: `Organization settings updated (${Object.keys(changes).join(", ")})`,
      metadata: { changes },
    });

    return NextResponse.json({ success: true, organization: updated });
  } catch (error) {
    console.error("Organization settings update failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update organization settings" },
      { status: 500 },
    );
  }
}
