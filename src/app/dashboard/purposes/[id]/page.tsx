import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { purposes } from "@/db/schema/purposes";
import { CreatePageHeader, CreateFormShell } from "@/components/dashboard/create-page-header";
import { EditPurposeForm } from "@/components/purposes/edit-purpose-form";

export default async function PurposeDetailPage({
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

  const [purpose] = await db
    .select()
    .from(purposes)
    .where(and(eq(purposes.id, id), eq(purposes.organizationId, localOrg.id)))
    .limit(1);
  if (!purpose) notFound();

  return (
    <div className="page-wrap space-y-8">
      <CreatePageHeader
        backHref="/dashboard/purposes"
        backLabel="Purposes"
        current={purpose.name}
        title={purpose.name}
        description="Edit notice text, lawful basis, and required status. The key stays the same so existing policies keep their mapping."
      />
      <CreateFormShell>
        <EditPurposeForm
          purpose={{
            id: purpose.id,
            key: purpose.key,
            name: purpose.name,
            description: purpose.description,
            isRequired: purpose.isRequired,
            status: purpose.status,
            dataCategories: purpose.dataCategories,
            retentionPeriod: purpose.retentionPeriod,
            legalBasis: purpose.legalBasis,
          }}
        />
      </CreateFormShell>
    </div>
  );
}
