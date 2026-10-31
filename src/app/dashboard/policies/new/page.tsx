import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { CreatePageHeader } from "@/components/dashboard/create-page-header";
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
    .where(and(eq(websites.organizationId, localOrg.id), isNull(websites.deletedAt)))
    .orderBy(websites.name);

  return (
    <div className="page-wrap space-y-5 sm:space-y-6 lg:space-y-8">
      <CreatePageHeader
        backHref={
          defaultWebsiteId
            ? `/dashboard/policies?websiteId=${defaultWebsiteId}`
            : "/dashboard/policies"
        }
        backLabel="Policies"
        current="New policy"
        title="Create consent policy"
        description="Start from a template or a blank draft. After you create it, review the checklist and publish."
      />

      {defaultWebsiteId ? (
        <p className="text-sm text-[#6B7280]">
          Next: create a policy for this site.{" "}
          <Link
            href={`/dashboard/websites/${defaultWebsiteId}/installation`}
            className="font-medium text-[#0B2C4A] underline-offset-2 hover:underline"
          >
            Install later
          </Link>
        </p>
      ) : null}

      {orgWebsites.length === 0 ? (
        <div className="mx-auto max-w-[72rem] rounded-2xl border border-dashed border-[#E5E7EB] bg-white px-6 py-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <p className="text-base font-semibold text-[#111827]">No websites found</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-[#6B7280]">
            You need at least one website before creating a consent policy.
          </p>
          <Link href="/dashboard/websites/new" className="btn btn-primary mt-6">
            Add a website
          </Link>
        </div>
      ) : (
        <CreatePolicyForm websites={orgWebsites} defaultWebsiteId={defaultWebsiteId} />
      )}
    </div>
  );
}
