import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { and, eq, ilike, or } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { consentPolicies } from "@/db/schema/consent-policies";
import { purposes } from "@/db/schema/purposes";
import { vendors } from "@/db/schema/vendors";
import {
  resolveActiveMembership,
  resolveLocalOrganization,
  resolveLocalUser,
} from "@/lib/api-auth-helpers";
import type { DashboardSearchHit } from "@/lib/dashboard-search";

export async function GET(request: Request) {
  try {
    const { isAuthenticated, userId, orgId } = await auth();

    if (!isAuthenticated || !userId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (!orgId) {
      return NextResponse.json(
        { success: false, message: "No active organization selected" },
        { status: 400 },
      );
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
      return NextResponse.json(
        { success: false, message: "You do not belong to this organization." },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const safe = q.replace(/[%_\\]/g, "");
    if (safe.length < 2) {
      return NextResponse.json({ success: true, results: [] as DashboardSearchHit[] });
    }

    const pattern = `%${safe}%`;

    const [websiteRows, policyRows, purposeRows, vendorRows] = await Promise.all([
      db
        .select({
          id: websites.id,
          name: websites.name,
          domain: websites.domain,
        })
        .from(websites)
        .where(
          and(
            eq(websites.organizationId, organization.id),
            or(ilike(websites.name, pattern), ilike(websites.domain, pattern)),
          ),
        )
        .limit(5),
      db
        .select({
          id: consentPolicies.id,
          name: consentPolicies.name,
          websiteName: websites.name,
        })
        .from(consentPolicies)
        .innerJoin(websites, eq(consentPolicies.websiteId, websites.id))
        .where(
          and(
            eq(websites.organizationId, organization.id),
            ilike(consentPolicies.name, pattern),
          ),
        )
        .limit(5),
      db
        .select({
          id: purposes.id,
          name: purposes.name,
          key: purposes.key,
        })
        .from(purposes)
        .where(
          and(
            eq(purposes.organizationId, organization.id),
            or(ilike(purposes.name, pattern), ilike(purposes.key, pattern)),
          ),
        )
        .limit(5),
      db
        .select({
          id: vendors.id,
          name: vendors.name,
          domain: vendors.domain,
        })
        .from(vendors)
        .where(
          and(
            eq(vendors.organizationId, organization.id),
            or(ilike(vendors.name, pattern), ilike(vendors.domain, pattern)),
          ),
        )
        .limit(5),
    ]);

    const results: DashboardSearchHit[] = [
      ...websiteRows.map((row) => ({
        id: `website:${row.id}`,
        type: "website" as const,
        title: row.name,
        subtitle: row.domain,
        href: `/dashboard/websites/${row.id}`,
      })),
      ...policyRows.map((row) => ({
        id: `policy:${row.id}`,
        type: "policy" as const,
        title: row.name,
        subtitle: row.websiteName,
        href: `/dashboard/policies/${row.id}`,
      })),
      ...purposeRows.map((row) => ({
        id: `purpose:${row.id}`,
        type: "purpose" as const,
        title: row.name,
        subtitle: row.key,
        href: "/dashboard/purposes",
      })),
      ...vendorRows.map((row) => ({
        id: `vendor:${row.id}`,
        type: "vendor" as const,
        title: row.name,
        subtitle: row.domain ?? "Vendor",
        href: "/dashboard/vendors",
      })),
    ];

    return NextResponse.json({ success: true, results });
  } catch {
    return NextResponse.json(
      { success: false, message: "Unable to search right now." },
      { status: 500 },
    );
  }
}
