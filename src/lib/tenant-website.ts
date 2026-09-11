import { cache } from "react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { resolveActiveClerkOrgId } from "@/lib/api-auth-helpers";

export type TenantWebsite = {
  id: string;
  organizationId: string;
  name: string;
  domain: string;
  description: string | null;
  environment: string;
  status: string;
  siteKey: string;
  defaultLanguage: string;
  defaultRegion: string | null;
  defaultRegulationKey: string | null;
  consentIntegrations: Record<string, unknown>;
  iabRegistration: Record<string, unknown> | null;
  verified: boolean;
  verifiedAt: Date | null;
  createdAt: Date;
};

const websiteCoreSelect = {
  id: websites.id,
  organizationId: websites.organizationId,
  name: websites.name,
  domain: websites.domain,
  description: websites.description,
  environment: websites.environment,
  status: websites.status,
  siteKey: websites.siteKey,
  defaultLanguage: websites.defaultLanguage,
  defaultRegion: websites.defaultRegion,
  verified: websites.verified,
  verifiedAt: websites.verifiedAt,
  createdAt: websites.createdAt,
};

export const getTenantWebsite = cache(async function getTenantWebsite(
  websiteId: string,
): Promise<TenantWebsite | null> {
  const { userId, orgId: sessionOrgId } = await auth();
  if (!userId) return null;

  const orgId = await resolveActiveClerkOrgId(userId, sessionOrgId);
  if (!orgId) return null;

  const where = and(
    eq(websites.id, websiteId),
    eq(organizations.clerkOrganizationId, orgId),
  );

  try {
    const [row] = await db
      .select({
        ...websiteCoreSelect,
        defaultRegulationKey: websites.defaultRegulationKey,
        consentIntegrations: websites.consentIntegrations,
        iabRegistration: websites.iabRegistration,
      })
      .from(websites)
      .innerJoin(organizations, eq(websites.organizationId, organizations.id))
      .where(where)
      .limit(1);

    if (!row) return null;
    return {
      ...row,
      consentIntegrations: row.consentIntegrations ?? {},
    };
  } catch {
    const [row] = await db
      .select(websiteCoreSelect)
      .from(websites)
      .innerJoin(organizations, eq(websites.organizationId, organizations.id))
      .where(where)
      .limit(1);

    if (!row) return null;
    return {
      ...row,
      defaultRegulationKey: null,
      consentIntegrations: {},
      iabRegistration: null,
    };
  }
});

export async function requireTenantWebsite(websiteId: string): Promise<TenantWebsite> {
  const website = await getTenantWebsite(websiteId);
  if (!website) notFound();
  return website;
}
