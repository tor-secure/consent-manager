import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { eq, and, isNull } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import {
  resolveLocalOrganization,
  resolveLocalUser,
  resolveActiveMembership,
} from "@/lib/api-auth-helpers";
import { requireOperatorRole } from "@/lib/org-roles";
import { invalidateSdkConfigForWebsite } from "@/lib/sdk/invalidate-site-config";
import { purgeWebsiteAndRelatedData } from "@/lib/websites/purge-website";

// Allowed environment values — validated server-side, never trusted from body.
import { parseStoredLocale } from "@/lib/i18n/locale-registry";
import { parseWebsiteIcon } from "@/lib/website-icon";

const VALID_ENVIRONMENTS = ["production", "staging", "development"] as const;
const VALID_REGIONS = ["IN", "EU", "US", "UK", "AU", "CA"] as const;

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { success: false, message: "No active organization selected" },
        { status: 400 },
      );
    }

    const localUser = await resolveLocalUser(userId);
    if (!localUser) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 },
      );
    }

    // Resolve local org from Clerk — never trust client-supplied org IDs.
    const organization = await resolveLocalOrganization(orgId);

    if (!organization) {
      return NextResponse.json(
        { success: false, message: "Organization not found" },
        { status: 404 },
      );
    }

    const membership = await resolveActiveMembership(organization.id, localUser.id);
    if (!membership) {
      return NextResponse.json(
        { success: false, message: "You do not belong to this organization." },
        { status: 403 },
      );
    }
    const operatorError = requireOperatorRole(membership.roleName);
    if (operatorError) return operatorError;

    // Verify the website exists AND belongs to this org — tenant isolation.
    const [existing] = await db
      .select({ id: websites.id })
      .from(websites)
      .where(
        and(
          eq(websites.id, id),
          eq(websites.organizationId, organization.id),
          isNull(websites.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404 },
      );
    }

    const body = await request.json();

    if (body && typeof body === "object" && "iconUrl" in body && body.name == null) {
      let iconUrl: string | null;
      try {
        iconUrl = parseWebsiteIcon(body.iconUrl);
      } catch (error) {
        return NextResponse.json(
          { success: false, message: error instanceof Error ? error.message : "Icon is not valid." },
          { status: 400 },
        );
      }
      await db
        .update(websites)
        .set({ iconUrl, updatedAt: new Date() })
        .where(
          and(
            eq(websites.id, id),
            eq(websites.organizationId, organization.id),
            isNull(websites.deletedAt),
          ),
        );
      return NextResponse.json({ success: true, iconUrl });
    }

    // Sanitize and validate each editable field individually.
    const name = String(body.name ?? "").trim();
    if (!name) {
      return NextResponse.json(
        { success: false, message: "Website name is required" },
        { status: 400 },
      );
    }

    const description = body.description
      ? String(body.description).trim()
      : null;

    const environment = VALID_ENVIRONMENTS.includes(body.environment)
      ? (body.environment as (typeof VALID_ENVIRONMENTS)[number])
      : null;

    if (!environment) {
      return NextResponse.json(
        {
          success: false,
          message: `Environment must be one of: ${VALID_ENVIRONMENTS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const defaultLanguage = parseStoredLocale(body.defaultLanguage);

    if (!defaultLanguage) {
      return NextResponse.json(
        {
          success: false,
          message: "Language must be a supported locale",
        },
        { status: 400 },
      );
    }

    const defaultRegion =
      body.defaultRegion && VALID_REGIONS.includes(body.defaultRegion)
        ? (body.defaultRegion as (typeof VALID_REGIONS)[number])
        : null;

    // Apply update — domain and siteKey are intentionally excluded (immutable).
    const [updated] = await db
      .update(websites)
      .set({
        name,
        description,
        environment,
        defaultLanguage,
        defaultRegion,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(websites.id, id),
          eq(websites.organizationId, organization.id),
          isNull(websites.deletedAt),
        ),
      )
      .returning();

    await invalidateSdkConfigForWebsite(id);
    return NextResponse.json({ success: true, website: updated });
  } catch (error) {
    logger.error("Website update failed", { error });
    return NextResponse.json(
      { success: false, message: "Failed to update website" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (!orgId) {
      return NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 });
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
    const operatorError = requireOperatorRole(membership.roleName, "Only Owner or Admin can delete a website");
    if (operatorError) return operatorError;

    const [existing] = await db
      .select({ id: websites.id, domain: websites.domain })
      .from(websites)
      .where(
        and(
          eq(websites.id, id),
          eq(websites.organizationId, organization.id),
          isNull(websites.deletedAt),
        ),
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    await purgeWebsiteAndRelatedData({
      websiteId: existing.id,
      organizationId: organization.id,
      domain: existing.domain,
    });

    await invalidateSdkConfigForWebsite(existing.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Website delete failed", { error });
    return NextResponse.json({ success: false, message: "Failed to delete website" }, { status: 500 });
  }
}
