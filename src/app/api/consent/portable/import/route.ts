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
import { publicCorsHeaders, publicOptionsResponse, isValidWebsiteId, readPublicJsonObject } from "@/lib/sdk/public-http";
import {
  verifyPortableConsentCryptoProof,
  type PortableConsentClaims,
  type PortableConsentCryptoProof,
} from "@/lib/portable-consent-proof";

const CORS_HEADERS = publicCorsHeaders("POST, OPTIONS");

type PortableImportRequest = {
  targetWebsiteId: string;
  claims: PortableConsentClaims;
  proof: PortableConsentCryptoProof;
};

function normalizeDomain(domain: string | null | undefined): string | null {
  if (!domain) return null;
  const d = domain.trim().toLowerCase();
  return d || null;
}

// POST /api/consent/portable/import
//
// Imports a previously exported portable consent bundle and maps it onto
// the target website's active policy.
export async function POST(request: Request) {
  try {
    const parsed = await readPublicJsonObject(request);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.message },
        { status: parsed.status, headers: CORS_HEADERS },
      );
    }

    const body = parsed.body as Partial<PortableImportRequest>;
    const targetWebsiteId = String(body.targetWebsiteId ?? "").trim();
    const claims = body.claims as PortableConsentClaims | undefined;
    const proof = body.proof as PortableConsentCryptoProof | undefined;

    if (!targetWebsiteId || !isValidWebsiteId(targetWebsiteId) || !claims || !proof) {
      return NextResponse.json(
        { success: false, message: "Invalid request payload" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Verify signature / integrity first.
    const verification = verifyPortableConsentCryptoProof({ claims, proof });
    if (!verification.intact) {
      return NextResponse.json(
        { success: false, message: "Portable consent proof is invalid" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Resolve active policy for target website.
    const [website] = await db
      .select({ id: websites.id, status: websites.status })
      .from(websites)
      .where(eq(websites.id, targetWebsiteId))
      .limit(1);

    if (!website || website.status !== "active") {
      return NextResponse.json(
        { success: false, message: "Website not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const [policy] = await db
      .select({ id: consentPolicies.id, isDefault: consentPolicies.isDefault })
      .from(consentPolicies)
      .where(and(eq(consentPolicies.websiteId, website.id), eq(consentPolicies.status, "active")))
      .orderBy(consentPolicies.isDefault)
      .limit(1);

    if (!policy) {
      return NextResponse.json(
        { success: false, message: "No active policy found for this website" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

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
        { status: 404, headers: CORS_HEADERS },
      );
    }

    // Load target policy purposes.
    const versionPurposeRows = await db
      .select({
        id: purposes.id,
        key: purposes.key,
        isRequired: purposes.isRequired,
      })
      .from(policyPurposes)
      .innerJoin(purposes, eq(policyPurposes.purposeId, purposes.id))
      .where(eq(policyPurposes.policyVersionId, latestVersion.id));

    const purposeByKey = new Map(
      versionPurposeRows.map((p) => [p.key.toLowerCase(), { id: p.id, isRequired: p.isRequired }]),
    );

    // Load target policy vendors (via vendor_purposes for those policy purposes).
    const purposeIds = versionPurposeRows.map((p) => p.id);
    const versionVendorRows =
      purposeIds.length > 0
        ? await db
            .select({
              id: vendors.id,
              domain: vendors.domain,
            })
            .from(vendorPurposes)
            .innerJoin(vendors, eq(vendorPurposes.vendorId, vendors.id))
            .where(inArray(vendorPurposes.purposeId, purposeIds))
        : [];

    const vendorByDomain = new Map(
      versionVendorRows
        .map((v) => ({ id: v.id, domain: normalizeDomain(v.domain) }))
        .filter((v) => v.domain)
        .map((v) => [v.domain as string, { id: v.id }]),
    );

    // Convert exported decisions into target decisions.
    const decisionMap = new Map<string, { purposeId: string | null; vendorId: string | null; granted: boolean }>();

    for (const d of claims.decisions) {
      const purposeKey = d.purposeKey ? d.purposeKey.trim().toLowerCase() : null;
      const vendorDomain = normalizeDomain(d.vendorDomain);

      if (purposeKey && purposeByKey.has(purposeKey)) {
        const p = purposeByKey.get(purposeKey)!;
        const k = `p:${p.id}`;
        decisionMap.set(k, { purposeId: p.id, vendorId: null, granted: Boolean(d.granted) });
      }

      if (vendorDomain && vendorByDomain.has(vendorDomain)) {
        const v = vendorByDomain.get(vendorDomain)!;
        const k = `v:${v.id}`;
        decisionMap.set(k, { purposeId: null, vendorId: v.id, granted: Boolean(d.granted) });
      }
    }

    // Ensure essential purposes are always granted in the target policy.
    for (const p of versionPurposeRows) {
      if (!p.isRequired) continue;
      const k = `p:${p.id}`;
      if (!decisionMap.has(k)) {
        decisionMap.set(k, { purposeId: p.id, vendorId: null, granted: true });
      }
    }

    const decisions = [...decisionMap.values()].map((row) => ({
      purposeId: row.purposeId,
      vendorId: row.vendorId,
      granted: row.granted,
      decision: "granular",
    }));

    return NextResponse.json(
      {
        success: true,
        consentId: claims.consentId,
        expiresAt: claims.expiresAt,
        choice: claims.choice ?? "granular",
        decisions,
      },
      { headers: CORS_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to import portable consent" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

// CORS preflight.
export async function OPTIONS() {
  return publicOptionsResponse("POST, OPTIONS");
}

