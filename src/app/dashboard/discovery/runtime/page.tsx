import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { resolveActiveClerkOrgId } from "@/lib/api-auth-helpers";
import { listRuntimeDiscovery } from "@/lib/runtime-discovery";
import { PageHeader } from "@/components/ui/page-header";
import { RuntimeDiscoveryTable } from "@/components/discovery/runtime-discovery-table";

export default async function RuntimeDiscoveryPage({ searchParams }: { searchParams: Promise<{ website?: string }> }) {
  const { userId, orgId: sessionOrgId } = await auth(); if (!userId) return null;
  const clerkOrgId = await resolveActiveClerkOrgId(userId, sessionOrgId); if (!clerkOrgId) return null;
  const [organization] = await db.select({ id: organizations.id }).from(organizations).where(eq(organizations.clerkOrganizationId, clerkOrgId)).limit(1); if (!organization) return null;
  const sites = await db.select({ id: websites.id, name: websites.name, domain: websites.domain }).from(websites).where(eq(websites.organizationId, organization.id)).orderBy(websites.name);
  const { website } = await searchParams; const activeWebsiteId = sites.some((site) => site.id === website) ? website! : "";
  const data = await listRuntimeDiscovery(organization.id, { websiteId: activeWebsiteId || undefined, limit: 150 });
  const observations = data.map(({ observation, trackerName, vendorName, purposeName }) => ({ ...observation, trackerName, vendorName, purposeName }));
  return <div className="page-wrap space-y-6 sm:space-y-8"><PageHeader title="Runtime discovery" description="Live browser evidence from your installed Consent Guru SDK. Request payloads, credentials, cookie values, storage values, query strings, and fragments are never collected." /><RuntimeDiscoveryTable websites={sites} activeWebsiteId={activeWebsiteId} observations={observations} /></div>;
}
