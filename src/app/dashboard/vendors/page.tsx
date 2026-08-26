import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { vendors } from "@/db/schema/vendors";
import { VendorList, type VendorRow } from "@/components/vendors/vendor-list";

export default async function VendorsPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  const rows = await db
    .select({
      id: vendors.id,
      key: vendors.key,
      name: vendors.name,
      domain: vendors.domain,
      country: vendors.country,
      status: vendors.status,
      source: vendors.source,
      createdAt: vendors.createdAt,
    })
    .from(vendors)
    .where(eq(vendors.organizationId, localOrg.id))
    .orderBy(vendors.name);

  const vendorList: VendorRow[] = rows;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Vendors</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Third-party vendors and the purposes they serve in your organization.
          </p>
        </div>

        <Link
          href="/dashboard/vendors/new"
          className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Create vendor
        </Link>
      </div>

      <VendorList vendors={vendorList} />
    </div>
  );
}
