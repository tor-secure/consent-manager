import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { syncClerkUser } from "@/lib/sync-clerk-user";
import { syncActiveClerkOrganization } from "@/lib/sync-clerk-organization";

export default async function WebsitesPage() {
  const { isAuthenticated, orgId } = await auth();

  if (!isAuthenticated) {
    redirect("/sign-in");
  }

  if (!orgId) {
    redirect("/create-organization");
  }

  try {
    // Sync Clerk user → local users table
    await syncClerkUser();

    // Sync Clerk organization → local organizations + membership
    await syncActiveClerkOrganization();

    // Find the local organization
    const [organization] = await db
      .select()
      .from(organizations)
      .where(
        eq(
          organizations.clerkOrganizationId,
          orgId
        )
      )
      .limit(1);

    if (!organization) {
      throw new Error(
        "Organization was not found in the local database."
      );
    }

    // Get websites belonging to the active organization
    const websiteList = await db
      .select()
      .from(websites)
      .where(
        eq(
          websites.organizationId,
          organization.id
        )
      );

    return (
      <main className="p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold">
              Websites
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Manage the websites connected to your
              Consent Management Platform.
            </p>
          </div>

          <Link
            href="/dashboard/websites/new"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          >
            Add Website
          </Link>
        </div>

        {websiteList.length === 0 ? (
          <div className="mt-8 rounded-lg border p-8 text-center">
            <h2 className="text-lg font-medium">
              No websites yet
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Add your first website to start configuring
              consent management.
            </p>

            <Link
              href="/dashboard/websites/new"
              className="mt-4 inline-block rounded-md border px-4 py-2 text-sm"
            >
              Add your first website
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {websiteList.map((website) => (
              <Link
                key={website.id}
                href={`/dashboard/websites/${website.id}`}
                className="rounded-lg border p-5 transition hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold">
                      {website.name}
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {website.domain}
                    </p>
                  </div>

                  <span className="rounded-full border px-2 py-1 text-xs">
                    {website.status}
                  </span>
                </div>

                <div className="mt-5 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Environment
                    </span>

                    <span>
                      {website.environment}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Verified
                    </span>

                    <span>
                      {website.verified
                        ? "Yes"
                        : "Not verified"}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    );
  } catch (error) {
    console.error(
      "Websites page failed:",
      error
    );

    return (
      <main className="p-8">
        <div className="rounded-lg border p-6">
          <h1 className="text-xl font-semibold">
            Unable to load websites
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't load your organization or websites.
          </p>

          {process.env.NODE_ENV === "development" && (
            <pre className="mt-4 overflow-auto rounded bg-muted p-4 text-xs">
              {error instanceof Error
                ? error.message
                : String(error)}
            </pre>
          )}
        </div>
      </main>
    );
  }
}