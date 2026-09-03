import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { websiteJurisdictionRules } from "@/db/schema/website-jurisdiction-rules";
import { auditLogs } from "@/db/schema/audit-logs";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { isRegulationKey } from "@/lib/regulations/catalog";
import { normalizeCountry, normalizeRegion } from "@/lib/regulations/geo";
import { findConflictingJurisdictionRules } from "@/lib/regulations/policy-selection";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorizeWebsite(websiteId: string) {
  const { isAuthenticated, userId, orgId } = await auth();
  if (!isAuthenticated || !userId) {
    return { error: NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 }) };
  }
  if (!orgId) {
    return { error: NextResponse.json({ success: false, message: "No active organization selected" }, { status: 400 }) };
  }
  const localUser = await resolveLocalUser(userId);
  if (!localUser) {
    return { error: NextResponse.json({ success: false, message: "User not found" }, { status: 404 }) };
  }
  const organization = await resolveLocalOrganization(orgId);
  if (!organization) {
    return { error: NextResponse.json({ success: false, message: "Organization not found" }, { status: 404 }) };
  }
  const membership = await resolveActiveMembership(organization.id, localUser.id);
  if (!membership) {
    return { error: NextResponse.json({ success: false, message: "You do not belong to this organization." }, { status: 403 }) };
  }
  if (!UUID_RE.test(websiteId)) {
    return { error: NextResponse.json({ success: false, message: "Invalid website id" }, { status: 400 }) };
  }
  const [website] = await db
    .select({ id: websites.id })
    .from(websites)
    .where(and(eq(websites.id, websiteId), eq(websites.organizationId, organization.id)))
    .limit(1);
  if (!website) {
    return { error: NextResponse.json({ success: false, message: "Website not found" }, { status: 404 }) };
  }
  return { localUser, organization, website };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const authz = await authorizeWebsite(id);
    if ("error" in authz && authz.error) return authz.error;
    if (!("website" in authz) || !("organization" in authz)) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    const rules = await db
      .select()
      .from(websiteJurisdictionRules)
      .where(
        and(
          eq(websiteJurisdictionRules.websiteId, authz.website.id),
          eq(websiteJurisdictionRules.organizationId, authz.organization.id),
        ),
      );

    return NextResponse.json({ success: true, rules });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to load jurisdiction rules." }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const authz = await authorizeWebsite(id);
    if ("error" in authz && authz.error) return authz.error;
    if (!("website" in authz) || !("organization" in authz) || !("localUser" in authz)) {
      return NextResponse.json({ success: false, message: "Website not found" }, { status: 404 });
    }

    const { orgId, userId } = await auth();
    const limit = rateLimit({
      key: `jurisdiction-rules:${orgId}:${userId}:${getClientIp(request)}`,
      limit: 60,
      windowMs: 60 * 60_000,
    });
    if (!limit.allowed) return rateLimitResponse(limit);

    const body = await request.json();
    const incoming = Array.isArray(body.rules) ? body.rules : null;
    if (!incoming) {
      return NextResponse.json({ success: false, message: "rules array is required" }, { status: 400 });
    }
    if (incoming.length > 50) {
      return NextResponse.json({ success: false, message: "A website can have at most 50 jurisdiction rules" }, { status: 400 });
    }

    const normalized: Array<{ countryCode: string; regionCode: string; policyId: string; regulationKey: string }> = [];
    for (const row of incoming) {
      const countryCode = normalizeCountry(row?.countryCode ?? row?.country);
      const regionCode = normalizeRegion(row?.regionCode ?? row?.region) ?? "";
      const policyId = String(row?.policyId ?? "").trim();
      const regulationKey = String(row?.regulationKey ?? "").trim();
      if (!countryCode) {
        return NextResponse.json({ success: false, message: "Each rule needs a valid ISO country code" }, { status: 400 });
      }
      if (!UUID_RE.test(policyId)) {
        return NextResponse.json({ success: false, message: "Each rule needs a valid policy id" }, { status: 400 });
      }
      if (!isRegulationKey(regulationKey)) {
        return NextResponse.json({ success: false, message: "Each rule needs a supported regulation key" }, { status: 400 });
      }
      normalized.push({ countryCode, regionCode, policyId, regulationKey });
    }

    const conflicts = findConflictingJurisdictionRules(normalized);
    if (conflicts.length > 0) {
      return NextResponse.json(
        { success: false, message: "Duplicate country/region rules are not allowed" },
        { status: 400 },
      );
    }

    const policyIds = [...new Set(normalized.map((row) => row.policyId))];
    if (policyIds.length > 0) {
      const owned = await db
        .select({ id: consentPolicies.id })
        .from(consentPolicies)
        .innerJoin(websites, eq(consentPolicies.websiteId, websites.id))
        .where(
          and(
            eq(consentPolicies.websiteId, authz.website.id),
            eq(websites.organizationId, authz.organization.id),
          ),
        );
      const ownedIds = new Set(owned.map((row) => row.id));
      if (policyIds.some((policyId) => !ownedIds.has(policyId))) {
        return NextResponse.json({ success: false, message: "Policy does not belong to this website" }, { status: 400 });
      }
    }

    await db.transaction(async (tx) => {
      await tx
        .delete(websiteJurisdictionRules)
        .where(
          and(
            eq(websiteJurisdictionRules.websiteId, authz.website.id),
            eq(websiteJurisdictionRules.organizationId, authz.organization.id),
          ),
        );
      if (normalized.length > 0) {
        await tx.insert(websiteJurisdictionRules).values(
          normalized.map((row) => ({
            organizationId: authz.organization.id,
            websiteId: authz.website.id,
            countryCode: row.countryCode,
            regionCode: row.regionCode,
            policyId: row.policyId,
            regulationKey: row.regulationKey,
          })),
        );
      }
    });

    await db.insert(auditLogs).values({
      organizationId: authz.organization.id,
      userId: authz.localUser.id,
      action: "website.jurisdiction_rules.updated",
      resourceType: "website",
      resourceId: authz.website.id,
      description: "Updated website jurisdiction consent rules",
    });

    const rules = await db
      .select()
      .from(websiteJurisdictionRules)
      .where(
        and(
          eq(websiteJurisdictionRules.websiteId, authz.website.id),
          eq(websiteJurisdictionRules.organizationId, authz.organization.id),
        ),
      );

    return NextResponse.json({ success: true, rules });
  } catch {
    return NextResponse.json({ success: false, message: "Unable to save jurisdiction rules." }, { status: 500 });
  }
}
