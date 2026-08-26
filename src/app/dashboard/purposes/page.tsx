import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { purposes } from "@/db/schema/purposes";
import { PurposeList, type PurposeRow } from "@/components/purposes/purpose-list";

// Auth + bootstrap guaranteed by the dashboard layout.
export default async function PurposesPage() {
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
      id: purposes.id,
      key: purposes.key,
      name: purposes.name,
      description: purposes.description,
      isRequired: purposes.isRequired,
      status: purposes.status,
      createdAt: purposes.createdAt,
    })
    .from(purposes)
    .where(eq(purposes.organizationId, localOrg.id))
    .orderBy(purposes.name);

  const purposeList: PurposeRow[] = rows;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Purposes</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Consent purposes shared across all policies in your organization.
          </p>
        </div>

        <Link
          href="/dashboard/purposes/new"
          className="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Create purpose
        </Link>
      </div>

      <PurposeList purposes={purposeList} />
    </div>
  );
}
