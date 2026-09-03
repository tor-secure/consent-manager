import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { CreatePageHeader, CreateFormShell } from "@/components/dashboard/create-page-header";
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
    <div className="page-wrap space-y-8">
      <CreatePageHeader
        backHref="/dashboard/policies"
        backLabel="Policies"
        current="New policy"
        title="Create consent policy"
        description="Start from a template or a blank draft. You can still edit purposes and publish later."
      />

      <CreateFormShell>
        {orgWebsites.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] px-6 py-12 text-center card-shadow">
            <p className="text-base font-semibold text-[var(--foreground)]">No websites found</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-[var(--muted-foreground)]">
              You need at least one website before creating a consent policy.
            </p>
            <Link href="/dashboard/websites/new" className="btn btn-primary mt-6">
              Add a website
            </Link>
          </div>
        ) : (
          <CreatePolicyForm
            websites={orgWebsites}
            defaultWebsiteId={defaultWebsiteId}
          />
        )}
      </CreateFormShell>
    </div>
  );
}
