import { auth } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { legalHolds } from "@/db/schema/legal-holds";
import { users } from "@/db/schema/users";
import { memberships } from "@/db/schema/memberships";
import { roles } from "@/db/schema/roles";
import { and } from "drizzle-orm";
import { loadOrganizationRetentionConfig } from "@/lib/retention/cleanup";
import {
  DataRetentionPanel,
  type LegalHoldRow,
} from "@/components/settings/data-retention-panel";
import { PageHeader } from "@/components/ui/page-header";

const EDIT_ROLES = ["Owner", "Admin"];

export default async function DataRetentionPage() {
  const { orgId, userId: clerkUserId } = await auth();
  if (!orgId || !clerkUserId) return null;

  const [organization] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);
  if (!organization) return null;

  const [localUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  if (!localUser) return null;

  const [membership] = await db
    .select({ roleName: roles.name })
    .from(memberships)
    .innerJoin(roles, eq(memberships.roleId, roles.id))
    .where(
      and(
        eq(memberships.organizationId, organization.id),
        eq(memberships.userId, localUser.id),
        eq(memberships.status, "active"),
      ),
    )
    .limit(1);

  const canEdit = EDIT_ROLES.includes(membership?.roleName ?? "");
  const config = await loadOrganizationRetentionConfig(organization.id);
  const holds = await db
    .select()
    .from(legalHolds)
    .where(eq(legalHolds.organizationId, organization.id))
    .orderBy(desc(legalHolds.createdAt));

  const holdRows: LegalHoldRow[] = holds.map((hold) => ({
    id: hold.id,
    resourceType: hold.resourceType,
    resourceId: hold.resourceId,
    reason: hold.reason,
    status: hold.status,
    createdAt: hold.createdAt.toISOString(),
    releasedAt: hold.releasedAt?.toISOString() ?? null,
  }));

  return (
    <div className="page-wrap space-y-6">
      <PageHeader
        title="Data retention"
        description={`Configure how long ${organization.name} keeps historical evidence versus current operational data. Retention periods are selected by the organization; this product does not prescribe a legally required period.`}
      />
      <DataRetentionPanel
        canEdit={canEdit}
        initial={{
          consentEvidenceRetentionDays: config.consentEvidence.retentionDays,
          consentEvidenceRetentionEnabled: config.consentEvidence.enabled,
          consentRecordRetentionDays: config.consentRecord.retentionDays,
          consentRecordRetentionEnabled: config.consentRecord.enabled,
          auditLogRetentionDays: config.auditEvent.retentionDays,
          auditLogRetentionEnabled: config.auditEvent.enabled,
          rightsRequestRetentionDays: config.rightsRequest.retentionDays,
          rightsRequestRetentionEnabled: config.rightsRequest.enabled,
        }}
        holds={holdRows}
      />
    </div>
  );
}
