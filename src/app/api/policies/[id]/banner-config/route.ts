import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { parseBannerConfig, type BannerConfiguration } from "@/lib/banner-config";

const VALID_POSITIONS = ["bottom", "top", "bottom-left", "bottom-right", "center"] as const;
const VALID_LAYOUTS = ["bar", "box", "dialog"] as const;
const VALID_DEFAULTS = ["opt-in", "opt-out", "none"] as const;
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

// PUT /api/policies/[id]/banner-config
// Validates and saves banner configuration into the latest policy version's
// `configuration` JSONB field. Tenant-safe: scopes policy through org websites.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: policyId } = await params;
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

    // Scope policy through org websites — no direct orgId on consent_policies.
    const orgWebsites = await db
      .select({ id: websites.id })
      .from(websites)
      .where(eq(websites.organizationId, organization.id));

    const websiteIds = orgWebsites.map((w) => w.id);
    if (websiteIds.length === 0) {
      return NextResponse.json({ success: false, message: "Policy not found" }, { status: 404 });
    }

    const [policy] = await db
      .select({ id: consentPolicies.id })
      .from(consentPolicies)
      .where(
        and(
          eq(consentPolicies.id, policyId),
          inArray(consentPolicies.websiteId, websiteIds),
        ),
      )
      .limit(1);

    if (!policy) {
      return NextResponse.json({ success: false, message: "Policy not found" }, { status: 404 });
    }

    // Get latest version.
    const allVersions = await db
      .select({ id: consentPolicyVersions.id, version: consentPolicyVersions.version })
      .from(consentPolicyVersions)
      .where(eq(consentPolicyVersions.policyId, policy.id))
      .orderBy(consentPolicyVersions.version);

    const latestVersion = allVersions[allVersions.length - 1] ?? null;
    if (!latestVersion) {
      return NextResponse.json({ success: false, message: "No policy version found" }, { status: 404 });
    }

    const body = await request.json();

    // Parse body through defaults to fill any missing fields.
    const raw = parseBannerConfig(body as Record<string, unknown>);

    // Validate fields that have constrained values.
    if (!VALID_POSITIONS.includes(raw.position as (typeof VALID_POSITIONS)[number])) {
      return NextResponse.json({ success: false, message: "Invalid banner position" }, { status: 400 });
    }
    if (!VALID_LAYOUTS.includes(raw.layout as (typeof VALID_LAYOUTS)[number])) {
      return NextResponse.json({ success: false, message: "Invalid banner layout" }, { status: 400 });
    }
    if (!VALID_DEFAULTS.includes(raw.defaultConsent as (typeof VALID_DEFAULTS)[number])) {
      return NextResponse.json({ success: false, message: "Invalid default consent value" }, { status: 400 });
    }
    if (!HEX_COLOR.test(raw.primaryColor)) {
      return NextResponse.json({ success: false, message: "primaryColor must be a 6-digit hex colour" }, { status: 400 });
    }
    if (!HEX_COLOR.test(raw.backgroundColor)) {
      return NextResponse.json({ success: false, message: "backgroundColor must be a 6-digit hex colour" }, { status: 400 });
    }
    if (!HEX_COLOR.test(raw.textColor)) {
      return NextResponse.json({ success: false, message: "textColor must be a 6-digit hex colour" }, { status: 400 });
    }

    const consentExpireDays = Math.max(1, Math.min(3650, Number(raw.consentExpireDays) || 365));
    const borderRadius = Math.max(0, Math.min(24, Number(raw.borderRadius) || 8));

    const config: BannerConfiguration = {
      ...raw,
      consentExpireDays,
      borderRadius,
      title: String(raw.title).trim().slice(0, 255),
      description: String(raw.description).trim().slice(0, 2000),
      acceptAllLabel: String(raw.acceptAllLabel).trim().slice(0, 100),
      rejectAllLabel: String(raw.rejectAllLabel).trim().slice(0, 100),
      customizeLabel: String(raw.customizeLabel).trim().slice(0, 100),
      savePreferencesLabel: String(raw.savePreferencesLabel).trim().slice(0, 100),
      privacyPolicyText: String(raw.privacyPolicyText).trim().slice(0, 100),
      privacyPolicyUrl: String(raw.privacyPolicyUrl).trim().slice(0, 500),
      poweredByText: String(raw.poweredByText).trim().slice(0, 100),
    };

    await db
      .update(consentPolicyVersions)
      .set({ configuration: config as unknown as Record<string, unknown>, updatedAt: new Date() })
      .where(eq(consentPolicyVersions.id, latestVersion.id));

    return NextResponse.json({ success: true, configuration: config });
  } catch (error) {
    console.error("Banner config save failed:", error);
    return NextResponse.json({ success: false, message: "Failed to save banner configuration" }, { status: 500 });
  }
}
