import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import crypto from "node:crypto";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { memberships } from "@/db/schema/memberships";
import { users } from "@/db/schema/users";
import { parseStoredLocale } from "@/lib/i18n/locale-registry";
import { resolveActiveClerkOrgId } from "@/lib/api-auth-helpers";

function postgresErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let i = 0; i < 5 && current && typeof current === "object"; i += 1) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === "string" && /^\w{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

function isUniqueConstraintError(error: unknown): boolean {
  return postgresErrorCode(error) === "23505";
}

function isMissingSchemaError(error: unknown): boolean {
  const code = postgresErrorCode(error);
  return code === "42703" || code === "42P01";
}

function normalizeDomain(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

export async function POST(request: Request) {
  try {
    const { isAuthenticated, userId, orgId: sessionOrgId } = await auth();

    if (!isAuthenticated || !userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const orgId = await resolveActiveClerkOrgId(userId, sessionOrgId);

    if (!orgId) {
      return NextResponse.json(
        {
          success: false,
          message: "No active organization selected",
        },
        { status: 400 },
      );
    }

    const body = await request.json();

    const name = String(body.name ?? "").trim();
    const rawDomain = String(body.domain ?? "");
    const domain = normalizeDomain(rawDomain);
    const language = parseStoredLocale(body.language ?? "en") ?? "en";
    const region = String(body.region ?? "IN");

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Website name is required" },
        { status: 400 },
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { success: false, message: "Website name must be 255 characters or fewer" },
        { status: 400 },
      );
    }

    if (!domain) {
      return NextResponse.json(
        { success: false, message: "Website domain is required" },
        { status: 400 },
      );
    }

    if (domain.length > 253) {
      return NextResponse.json(
        { success: false, message: "Domain must be 253 characters or fewer" },
        { status: 400 },
      );
    }

    // Basic hostname format check: must contain at least one dot and no spaces.
    if (!/^[a-z0-9]([a-z0-9\-\.]*[a-z0-9])?$/.test(domain)) {
      return NextResponse.json(
        { success: false, message: "Domain must be a valid hostname" },
        { status: 400 },
      );
    }

    // Resolve the Clerk organization to our local organization.
    const [organization] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.clerkOrganizationId, orgId))
      .limit(1);

    if (!organization) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Organization is not synchronized with the local database.",
        },
        { status: 400 },
      );
    }

    // Resolve the current local user.
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkUserId, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "User is not synchronized with the database.",
        },
        { status: 400 },
      );
    }

    // Verify the user has an active membership in this specific organization.
    const [membership] = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.organizationId, organization.id),
          eq(memberships.userId, user.id),
          eq(memberships.status, "active"),
        ),
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        {
          success: false,
          message: "You do not belong to this organization.",
        },
        { status: 403 },
      );
    }

    const siteKey = `site_${crypto.randomBytes(24).toString("hex")}`;
    // Tenant scope: organizationId: organization.id

    // Insert only columns present on older Neon databases. Drizzle schema
    // defaults would otherwise write consent_integrations / default_regulation_key.
    const inserted = await db.execute(sql`
      INSERT INTO websites (
        organization_id,
        name,
        domain,
        environment,
        status,
        site_key,
        default_language,
        default_region,
        verified
      ) VALUES (
        ${organization.id}::uuid,
        ${name},
        ${domain},
        'production',
        'active',
        ${siteKey},
        ${language},
        ${region},
        false
      )
      RETURNING id, name, domain, site_key, status, default_language, default_region
    `);

    const websiteRow = Array.isArray(inserted)
      ? inserted[0]
      : (inserted as { rows?: Array<Record<string, unknown>> }).rows?.[0];

    if (!websiteRow) {
      throw new Error("Website insert returned no row");
    }

    return NextResponse.json(
      {
        success: true,
        website: {
          id: websiteRow.id,
          name: websiteRow.name,
          domain: websiteRow.domain,
          siteKey: websiteRow.site_key ?? websiteRow.siteKey,
          status: websiteRow.status,
          defaultLanguage: websiteRow.default_language ?? websiteRow.defaultLanguage,
          defaultRegion: websiteRow.default_region ?? websiteRow.defaultRegion,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Website creation failed:", error);

    if (isUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: "A website with this domain already exists in your organization.",
        },
        { status: 409 },
      );
    }

    if (isMissingSchemaError(error)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "The database is missing required website fields. Run scripts/neon-ensure-schema.sql against the Neon database, then try again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create website",
      },
      { status: 500 },
    );
  }
}