import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";

export default async function WebsitesPage() {
  const { isAuthenticated, orgId } = await auth();

  if (!isAuthenticated) {
    redirect("/sign-in");
  }

  if (!orgId) {
    redirect("/create-organization");
  }

  const [organization] = await db
    .select()
    .from(organizations)
    .where(
      eq(organizations.clerkOrganizationId, orgId)
    )
    .limit(1);

  const allOrganizations = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      clerkOrganizationId: organizations.clerkOrganizationId,
    })
    .from(organizations);

  const allWebsites = await db
    .select({
      id: websites.id,
      name: websites.name,
      domain: websites.domain,
      organizationId: websites.organizationId,
    })
    .from(websites);

  return (
    <main className="p-8 space-y-6">
      <h1 className="text-3xl font-semibold">
        Website Debug
      </h1>

      <div className="rounded-lg border p-5">
        <h2 className="font-semibold">Active Clerk Organization</h2>

        <pre className="mt-3 text-sm">
          {JSON.stringify(
            {
              clerkOrgId: orgId,
              localOrganizationId: organization?.id ?? null,
              organizationName: organization?.name ?? null,
            },
            null,
            2
          )}
        </pre>
      </div>

      <div className="rounded-lg border p-5">
        <h2 className="font-semibold">Organizations in Database</h2>

        <pre className="mt-3 text-sm">
          {JSON.stringify(allOrganizations, null, 2)}
        </pre>
      </div>

      <div className="rounded-lg border p-5">
        <h2 className="font-semibold">Websites in Database</h2>

        <pre className="mt-3 text-sm">
          {JSON.stringify(allWebsites, null, 2)}
        </pre>
      </div>
    </main>
  );
}