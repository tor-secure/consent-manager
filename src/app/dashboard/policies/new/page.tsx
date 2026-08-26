import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import {
  CreatePolicyForm,
  type WebsiteOption,
} from "@/components/policies/create-policy-form";

// Auth + bootstrap guaranteed by the dashboard layout.
export default async function NewPolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ websiteId?: string }>;
}) {
  const { websiteId: defaultWebsiteId } = await searchParams;
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  const orgWebsites: WebsiteOption[] = await db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id))
    .orderBy(websites.name);

  return (
    <div className="p-8">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-2 text-sm text-neutral-500"
      >
        <Link
          href="/dashboard/policies"
          className="hover:text-neutral-900"
        >
          Policies
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-neutral-900">New policy</span>
      </nav>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Create consent policy
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          A new policy starts as a draft. You can configure purposes and publish
          it later.
        </p>
      </div>

      <div className="max-w-2xl">
        {orgWebsites.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm font-medium text-neutral-600">
              No websites found
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              You need at least one website before creating a consent policy.
            </p>
            <Link
              href="/dashboard/websites/new"
              className="mt-5 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            >
              Add a website
            </Link>
          </div>
        ) : (
          <CreatePolicyForm
            websites={orgWebsites}
            defaultWebsiteId={defaultWebsiteId}
          />
        )}
      </div>
    </div>
  );
}
