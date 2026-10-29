import { auth } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { purposes } from "@/db/schema/purposes";
import { policyPurposes } from "@/db/schema/policy-purposes";
import { consentPolicyVersions } from "@/db/schema/consent-policy-versions";
import { consentPolicies } from "@/db/schema/consent-policies";
import { websites } from "@/db/schema/websites";
import {
  PurposesWorkspace,
  type PurposeWorkspaceRow,
} from "@/components/purposes/purposes-workspace";

export default async function PurposesPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);
  if (!localOrg) return null;

  const [rows, linkRows] = await Promise.all([
    db
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
      .orderBy(purposes.name),
    db
      .select({
        purposeId: policyPurposes.purposeId,
        linkedPolicies: sql<number>`count(distinct ${consentPolicies.id})::int`,
      })
      .from(policyPurposes)
      .innerJoin(
        consentPolicyVersions,
        eq(policyPurposes.policyVersionId, consentPolicyVersions.id),
      )
      .innerJoin(consentPolicies, eq(consentPolicyVersions.policyId, consentPolicies.id))
      .innerJoin(websites, eq(consentPolicies.websiteId, websites.id))
      .where(eq(websites.organizationId, localOrg.id))
      .groupBy(policyPurposes.purposeId),
  ]);

  const linkMap = new Map(linkRows.map((row) => [row.purposeId, Number(row.linkedPolicies)]));

  const purposeList: PurposeWorkspaceRow[] = rows.map((row) => ({
    ...row,
    linkedPolicies: linkMap.get(row.id) ?? 0,
  }));

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">
      <PurposesWorkspace purposes={purposeList} />
    </div>
  );
}
