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

  const websiteList: WebsiteRow[] = rows;

  return (
    <div className="px-5 py-8 md:px-8 md:py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Websites
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the websites connected to your Consent Management Platform.
          </p>
        </div>

        <Link
          href="/dashboard/websites/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M7 1v12M1 7h12" />
          </svg>
          Add website
        </Link>
      </div>

      <WebsiteList websites={websiteList} />
    </div>
  );
}
