import { NextResponse } from "next/server";
import { eq, and, inArray } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { purposes } from "@/db/schema/purposes";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { vendors } from "@/db/schema/vendors";
import { parseBannerConfig } from "@/lib/banner-config";

// GET /api/consent/policy?websiteId=<id>
// Public endpoint — returns the active policy configuration for a website,
// including banner config, purposes, and vendors.
// Authentication: verified by websiteId ownership (website must exist and be active).
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get("websiteId")?.trim();

    if (!websiteId) {
      return NextResponse.json(
        { success: false, message: "websiteId is required" },
        { status: 400 },
      );
    }

    // Verify the website exists and is active.
    const [website] = await db
      .select({ id: websites.id, organizationId: websites.organizationId, status: websites.status })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);

    if (!website || website.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404 },
      );
    }

    // Find the default active policy for this website (or the first active one).
    const [policy] = await db
      .select({ id: consentPolicies.id, name: consentPolicies.name, isDefault: consentPolicies.isDefault })
      .from(consentPolicies)
      .where(
        and(
          eq(consentPolicies.websiteId, website.id),
          eq(consentPolicies.status, "active"),
        ),
      )
      .orderBy(consentPolicies.isDefault)
      .limit(1);

    if (!policy) {
      return NextResponse.json(
        { success: false, message: "No active policy found for this website" },
        { status: 404 },
      );
    }

    // Get the latest published version, falling back to latest draft.
    const allVersions = await db
      .select()
      .from(consentPolicyVersions)
      .where(eq(consentPolicyVersions.policyId, policy.id))
      .orderBy(consentPolicyVersions.version);

    const latestVersion =
      allVersions.findLast((v) => v.isPublished) ??
      allVersions[allVersions.length - 1] ??
      null;

    if (!latestVersion) {
      return NextResponse.json(
        { success: false, message: "No policy version found" },
        { status: 404 },
      );
    }

    // Load purposes attached to this version.
    const versionPurposes = await db
      .select({
        id: purposes.id,
        key: purposes.key,
        name: purposes.name,
        description: purposes.description,
        isRequired: purposes.isRequired,
        // DPDP Rule 3 enrichment
        dataCategories:  purposes.dataCategories,
        retentionPeriod: purposes.retentionPeriod,
        legalBasis:      purposes.legalBasis,
      })
      .from(policyPurposes)
      .innerJoin(purposes, eq(policyPurposes.purposeId, purposes.id))
      .where(eq(policyPurposes.policyVersionId, latestVersion.id))
      .orderBy(purposes.name);

    // Load vendors linked to attached purposes.
    const purposeIds = versionPurposes.map((p) => p.id);

    const versionVendors =
      purposeIds.length > 0
        ? await db
            .select({
              id: vendors.id,
              name: vendors.name,
              domain: vendors.domain,
              privacyPolicyUrl: vendors.privacyPolicyUrl,
              purposeId: vendorPurposes.purposeId,
            })
            .from(vendorPurposes)
            .innerJoin(vendors, eq(vendorPurposes.vendorId, vendors.id))
            .where(inArray(vendorPurposes.purposeId, purposeIds))
        : [];

    // Deduplicate vendors (a vendor may serve multiple purposes).
    const vendorMap = new Map<string, (typeof versionVendors)[number]>();
    for (const v of versionVendors) {
      if (!vendorMap.has(v.id)) vendorMap.set(v.id, v);
    }

    const bannerConfig = parseBannerConfig(
      latestVersion.configuration as Record<string, unknown>,
    );

    return NextResponse.json({
      success: true,
      websiteId: website.id,
      policy: {
        id: policy.id,
        name: policy.name,
        versionId: latestVersion.id,
        version: latestVersion.version,
        isPublished: latestVersion.isPublished,
      },
      bannerConfig,
      purposes: versionPurposes,
      vendors: [...vendorMap.values()].map((v) => ({
        id: v.id,
        name: v.name,
        domain: v.domain,
        privacyPolicyUrl: v.privacyPolicyUrl,
      })),
    });
  } catch (error) {
    console.error("Consent policy load failed:", error);
    return NextResponse.json(
      { success: false, message: "Failed to load consent policy" },
      { status: 500 },
    );
  }
}
