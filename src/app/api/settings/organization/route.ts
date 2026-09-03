import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { users } from "@/db/schema/users";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";
import { auditLogs } from "@/db/schema/audit-logs";

import { parseStoredLocale } from "@/lib/i18n/locale-registry";

const AUTHORIZED_ROLES = ["Owner", "Admin"] as const;
const VALID_REGIONS    = ["IN","EU","US","UK","AU","CA","SG","AE"] as const;
const VALID_TIMEZONES  = [
  "UTC","Asia/Kolkata","Europe/London","Europe/Paris","Europe/Berlin",
  "America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "Australia/Sydney","Asia/Singapore","Asia/Dubai","Asia/Tokyo",
] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PUT(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId || !orgId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const [organization] = await db
      .select()
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

    if (!(AUTHORIZED_ROLES as readonly string[]).includes(membership?.roleName ?? "")) {
      return NextResponse.json(
        { success: false, message: "You do not have permission to update organization settings" },
        { status: 403 },
      );
    }

    const body = await request.json();

    // ── Core fields ──────────────────────────────────────────────────────

    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ success: false, message: "Organization name is required" }, { status: 400 });
    }
    if (name.length > 255) {
      return NextResponse.json({ success: false, message: "Organization name is too long" }, { status: 400 });
    }

    const description = body.description ? String(body.description).trim() || null : null;

    const logoUrl = body.logoUrl ? String(body.logoUrl).trim() || null : null;
    if (logoUrl) {
      try { new URL(logoUrl); }
      catch { return NextResponse.json({ success: false, message: "Logo URL must be a valid URL" }, { status: 400 }); }
    }

    const timezone = (VALID_TIMEZONES as readonly string[]).includes(body.timezone)
      ? (body.timezone as string) : null;
    if (!timezone) {
      return NextResponse.json({ success: false, message: "Timezone must be one of the supported values" }, { status: 400 });
    }

    const defaultLanguage = parseStoredLocale(body.defaultLanguage);
    if (!defaultLanguage) {
      return NextResponse.json({ success: false, message: "Default language is not supported" }, { status: 400 });
    }

    const defaultRegion =
      body.defaultRegion && (VALID_REGIONS as readonly string[]).includes(body.defaultRegion)
        ? (body.defaultRegion as string) : null;

    const onboardingCompleted =
      typeof body.onboardingCompleted === "boolean"
        ? body.onboardingCompleted
        : organization.onboardingCompleted;

    // ── DPDP Rule 3(1)(d) — DPO / Grievance Officer fields ──────────────
    //
    // All five are optional (nullable). When supplied:
    //   • name fields    — trimmed, max 255 chars
    //   • email fields   — trimmed, validated format, max 320 chars
    //   • portal URL     — validated as a URL, max 2048 chars
    //
    // An empty string in the body clears the field (sets to null).

    const dpoName = body.dpoName
      ? String(body.dpoName).trim().slice(0, 255) || null
      : body.dpoName === "" ? null : (organization.dpoName ?? null);

    const dpoEmail = (() => {
      if (body.dpoEmail === "") return null;
      if (!body.dpoEmail) return organization.dpoEmail ?? null;
      const v = String(body.dpoEmail).trim().toLowerCase().slice(0, 320);
      if (v && !EMAIL_RE.test(v)) return "INVALID";
      return v || null;
    })();

    if (dpoEmail === "INVALID") {
      return NextResponse.json({ success: false, message: "dpoEmail must be a valid email address" }, { status: 400 });
    }

    const grievanceOfficerName = body.grievanceOfficerName
      ? String(body.grievanceOfficerName).trim().slice(0, 255) || null
      : body.grievanceOfficerName === "" ? null : (organization.grievanceOfficerName ?? null);

    const grievanceOfficerEmail = (() => {
      if (body.grievanceOfficerEmail === "") return null;
      if (!body.grievanceOfficerEmail) return organization.grievanceOfficerEmail ?? null;
      const v = String(body.grievanceOfficerEmail).trim().toLowerCase().slice(0, 320);
      if (v && !EMAIL_RE.test(v)) return "INVALID";
      return v || null;
    })();

    if (grievanceOfficerEmail === "INVALID") {
      return NextResponse.json({ success: false, message: "grievanceOfficerEmail must be a valid email address" }, { status: 400 });
    }

    const grievancePortalUrl = (() => {
      if (body.grievancePortalUrl === "") return null;
      if (!body.grievancePortalUrl) return organization.grievancePortalUrl ?? null;
      const v = String(body.grievancePortalUrl).trim().slice(0, 2048);
      if (!v) return null;
      try { new URL(v); return v; }
      catch { return "INVALID"; }
    })();

    if (grievancePortalUrl === "INVALID") {
      return NextResponse.json({ success: false, message: "grievancePortalUrl must be a valid URL" }, { status: 400 });
    }

    // ── Diff — only write if something changed ───────────────────────────

    const changes: Record<string, { from: unknown; to: unknown }> = {};

    function diff(key: string, from: unknown, to: unknown) {
      if ((from ?? null) !== (to ?? null)) changes[key] = { from, to };
    }

    diff("name",                  organization.name,                  name);
    diff("description",           organization.description,            description);
    diff("logoUrl",               organization.logoUrl,                logoUrl);
    diff("timezone",              organization.timezone,               timezone);
    diff("defaultLanguage",       organization.defaultLanguage,        defaultLanguage);
    diff("defaultRegion",         organization.defaultRegion,          defaultRegion);
    diff("onboardingCompleted",   organization.onboardingCompleted,    onboardingCompleted);
    diff("dpoName",               organization.dpoName,                dpoName);
    diff("dpoEmail",              organization.dpoEmail,               dpoEmail);
    diff("grievanceOfficerName",  organization.grievanceOfficerName,   grievanceOfficerName);
    diff("grievanceOfficerEmail", organization.grievanceOfficerEmail,  grievanceOfficerEmail);
    diff("grievancePortalUrl",    organization.grievancePortalUrl,     grievancePortalUrl);

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
        dpoName,
        dpoEmail,
        grievanceOfficerName,
        grievanceOfficerEmail,
        grievancePortalUrl,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organization.id))
      .returning();

    // Audit log — omit email values from the diff to avoid PII in logs.
    const auditChanges = { ...changes };
    for (const emailKey of ["dpoEmail", "grievanceOfficerEmail"]) {
      if (auditChanges[emailKey]) {
        auditChanges[emailKey] = { from: !!auditChanges[emailKey].from, to: !!auditChanges[emailKey].to };
      }
    }

    await db.insert(auditLogs).values({
      organizationId: organization.id,
      userId: localUser.id,
      action: "organization.settings.updated",
      resourceType: "organization",
      resourceId: organization.id,
      description: `Organization settings updated (${Object.keys(changes).join(", ")})`,
      metadata: { changes: auditChanges },
    });

    return NextResponse.json({ success: true, organization: updated });
  } catch (error) {
    console.error("Organization settings update failed:", error);
    return NextResponse.json({ success: false, message: "Failed to update organization settings" }, { status: 500 });
  }
}
