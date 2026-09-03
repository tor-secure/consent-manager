import { cache } from "react";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";

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
  verified: boolean;
  createdAt: Date;
};

export const getTenantWebsite = cache(async function getTenantWebsite(
  websiteId: string,
): Promise<TenantWebsite | null> {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [row] = await db
    .select({
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
      defaultRegulationKey: websites.defaultRegulationKey,
      consentIntegrations: websites.consentIntegrations,
      verified: websites.verified,
      createdAt: websites.createdAt,
    })
    .from(websites)
    .innerJoin(organizations, eq(websites.organizationId, organizations.id))
    .where(
      and(
        eq(websites.id, websiteId),
        eq(organizations.clerkOrganizationId, orgId),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    ...row,
    consentIntegrations: row.consentIntegrations ?? {},
  };
});

export async function requireTenantWebsite(websiteId: string): Promise<TenantWebsite> {
  const website = await getTenantWebsite(websiteId);
  if (!website) notFound();
  return website;
}
