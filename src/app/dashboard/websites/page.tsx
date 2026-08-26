import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import {
  WebsiteList,
  type WebsiteRow,
} from "@/components/websites/website-list";

// Auth + bootstrap guaranteed by the parent dashboard layout.
export default async function WebsitesPage() {
  const { orgId } = await auth();

  if (!orgId) return null;

  const [organization] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!organization) return null;

  const rows = await db
    .select({
      id: websites.id,
      name: websites.name,
      domain: websites.domain,
      environment: websites.environment,
      status: websites.status,
      defaultLanguage: websites.defaultLanguage,
      defaultRegion: websites.defaultRegion,
      verified: websites.verified,
      createdAt: websites.createdAt,
    })
    .from(websites)
    .where(eq(websites.organizationId, organization.id))
    .orderBy(websites.createdAt);

  // Serialize dates — server components pass props to client components through
  // the RSC boundary, which requires plain serializable values.
  const websiteList: WebsiteRow[] = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt,
  }));

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Websites</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage the websites connected to your Consent Management Platform.
          </p>
        </div>

        <Link
          href="/dashboard/websites/new"
          className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Add Website
        </Link>
      </div>

      <WebsiteList websites={websiteList} />
    </div>
  );
}
