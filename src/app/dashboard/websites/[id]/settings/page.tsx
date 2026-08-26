import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import {
  WebsiteSettingsForm,
  type WebsiteSettingsData,
} from "@/components/websites/website-settings-form";

// Auth + bootstrap guaranteed by the parent dashboard layout.
// Tenant isolation: website lookup is scoped to both id AND the org derived
// from the active Clerk session — never trusted from the URL alone.
export default async function WebsiteSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await auth();

  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  const [website] = await db
    .select({
      id: websites.id,
      name: websites.name,
      description: websites.description,
      domain: websites.domain,
      environment: websites.environment,
      defaultLanguage: websites.defaultLanguage,
      defaultRegion: websites.defaultRegion,
      siteKey: websites.siteKey,
    })
    .from(websites)
    .where(
      and(
        eq(websites.id, id),
        eq(websites.organizationId, localOrg.id),
      ),
    )
    .limit(1);

  if (!website) notFound();

  const settingsData: WebsiteSettingsData = {
    id: website.id,
    name: website.name,
    description: website.description,
    domain: website.domain,
    environment: website.environment,
    defaultLanguage: website.defaultLanguage,
    defaultRegion: website.defaultRegion,
    siteKey: website.siteKey,
  };

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-2 text-sm text-neutral-500"
      >
        <Link href="/dashboard/websites" className="hover:text-neutral-900">
          Websites
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          href={`/dashboard/websites/${website.id}`}
          className="hover:text-neutral-900"
        >
          {website.name}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-900">Settings</span>
      </nav>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Website Settings
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Update the configuration for{" "}
          <span className="font-medium text-neutral-700">{website.name}</span>.
        </p>
      </div>

      <div className="max-w-2xl">
        <WebsiteSettingsForm website={settingsData} />
      </div>
    </div>
  );
}
