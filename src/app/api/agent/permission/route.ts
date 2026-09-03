import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { consentRecords } from "@/db/schema/consent-records";
import { consentDecisions } from "@/db/schema/consent-decisions";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import { vendorPurposes } from "@/db/schema/vendor-purposes";
import { publicCorsHeaders, readPublicJsonObject, isValidConsentId, isValidWebsiteId } from "@/lib/sdk/public-http";

const CORS_HEADERS = publicCorsHeaders("POST, OPTIONS");

type AgentPermissionRequestBody = {
  consentId: string;
  websiteId: string;
  requestedPurposeKeys?: string[]; // purpose.key values
  requestedVendorDomains?: string[]; // vendors.domain values
};

export async function POST(request: Request) {
  try {
    const parsed = await readPublicJsonObject(request);
    if (!parsed.ok) {
      return NextResponse.json(
        { success: false, message: parsed.message },
        { status: parsed.status, headers: CORS_HEADERS },
      );
    }

    const body = parsed.body as Partial<AgentPermissionRequestBody>;
    const consentId = String(body.consentId ?? "").trim();
    const websiteId = String(body.websiteId ?? "").trim();
    const requestedPurposeKeys = Array.isArray(body.requestedPurposeKeys)
      ? body.requestedPurposeKeys.map((x) => String(x).trim()).filter(Boolean)
      : [];
    const requestedVendorDomains = Array.isArray(body.requestedVendorDomains)
      ? body.requestedVendorDomains.map((x) => String(x).trim().toLowerCase()).filter(Boolean)
      : [];

    if (!consentId || !websiteId || !isValidConsentId(consentId) || !isValidWebsiteId(websiteId)) {
      return NextResponse.json(
        { success: false, message: "Invalid consentId/websiteId" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (!requestedPurposeKeys.length && !requestedVendorDomains.length) {
      return NextResponse.json(
        { success: false, message: "Provide requestedPurposeKeys and/or requestedVendorDomains" },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const [record] = await db
      .select({
        id: consentRecords.id,
        organizationId: consentRecords.organizationId,
        status: consentRecords.status,
      })
      .from(consentRecords)
      .where(and(eq(consentRecords.consentId, consentId), eq(consentRecords.websiteId, websiteId)))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { success: false, message: "Consent record not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const decisionRows = await db
      .select({
        purposeId: consentDecisions.purposeId,
        vendorId: consentDecisions.vendorId,
        granted: consentDecisions.granted,
      })
      .from(consentDecisions)
      .where(eq(consentDecisions.consentRecordId, record.id));

    const purposeGranted = new Map<string, boolean>();
    const vendorGranted = new Map<string, boolean>();
    for (const r of decisionRows) {
      if (r.purposeId) purposeGranted.set(r.purposeId, r.granted);
      if (r.vendorId) vendorGranted.set(r.vendorId, r.granted);
    }

    // Resolve requested purposes/vendords to IDs within the org.
    const normalizedPurposeKeys = requestedPurposeKeys.map((k) => k.toLowerCase());

    const purposeRows = normalizedPurposeKeys.length
      ? await db
          .select({
            id: purposes.id,
            key: purposes.key,
            isRequired: purposes.isRequired,
          })
          .from(purposes)
          .where(and(eq(purposes.organizationId, record.organizationId), inArray(purposes.key, normalizedPurposeKeys)))
      : [];

    const purposeByKey = new Map(purposeRows.map((p) => [p.key.toLowerCase(), p]));

    const vendorDomains = requestedVendorDomains;
    const vendorRows = vendorDomains.length
      ? await db
          .select({
            id: vendors.id,
            domain: vendors.domain,
          })
          .from(vendors)
          .where(
            and(
              eq(vendors.organizationId, record.organizationId),
              inArray(vendors.domain, vendorDomains),
            ),
          )
      : [];

    const vendorByDomain = new Map(
      vendorRows
        .map((v) => ({ id: v.id, domain: v.domain ? v.domain.toLowerCase() : null }))
        .filter((v) => v.domain)
        .map((v) => [v.domain as string, { id: v.id }]),
    );

    // Compute "essential-like" vendor allowances via required purposes.
    const vendorIds = vendorRows.map((v) => v.id);
    const requiredVendorPurposes =
      vendorIds.length > 0
        ? await db
            .select({
              vendorId: vendorPurposes.vendorId,
              purposeId: vendorPurposes.purposeId,
            })
            .from(vendorPurposes)
            .innerJoin(purposes, eq(vendorPurposes.purposeId, purposes.id))
            .where(and(inArray(vendorPurposes.vendorId, vendorIds), eq(purposes.isRequired, true)))
        : [];

    const requiredPurposesByVendor = new Map<string, string[]>();
    for (const r of requiredVendorPurposes) {
      const arr = requiredPurposesByVendor.get(r.vendorId) ?? [];
      arr.push(r.purposeId);
      requiredPurposesByVendor.set(r.vendorId, arr);
    }

    const reasons: string[] = [];

    let allowed = true;
    const purposeDetails = normalizedPurposeKeys.map((key) => {
      const p = purposeByKey.get(key);
      if (!p) {
        allowed = false;
        return { key, allowed: false, reason: "Unknown purpose key" };
      }
      if (p.isRequired) return { key, allowed: true, reason: "Essential purpose" };
      const granted = purposeGranted.get(p.id) === true;
      if (!granted) {
        allowed = false;
        reasons.push(`Purpose ${p.key} not granted`);
      }
      return { key, allowed: granted, reason: granted ? "Granted" : "Denied by consent decisions" };
    });

    const vendorDetails = vendorDomains.map((domain) => {
      const v = vendorByDomain.get(domain);
      if (!v) {
        allowed = false;
        return { domain, allowed: false, reason: "Unknown vendor domain" };
      }

      const direct = vendorGranted.get(v.id) === true;
      if (direct) return { domain, allowed: true, reason: "Vendor granted" };

      // Allow if any required purpose linked to this vendor is granted.
      const requiredPurposeIds = requiredPurposesByVendor.get(v.id) ?? [];
      const requiredGranted = requiredPurposeIds.some((pid) => purposeGranted.get(pid) === true);
      if (requiredGranted) return { domain, allowed: true, reason: "Allowed via required purpose" };

      allowed = false;
      reasons.push(`Vendor ${domain} not granted`);
      return { domain, allowed: false, reason: "Denied by consent decisions" };
    });

    return NextResponse.json(
      {
        success: true,
        allowed,
        reasons,
        purposeDetails,
        vendorDetails,
      },
      { headers: CORS_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to evaluate agent permissioning" },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(null, { status: 204, headers: CORS_HEADERS });
}

