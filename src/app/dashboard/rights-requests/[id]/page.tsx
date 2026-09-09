import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { users } from "@/db/schema/users";
import { auditLogs } from "@/db/schema/audit-logs";
import { and, desc, eq } from "drizzle-orm";
import { RightsRequestDetail } from "@/components/settings/rights-request-detail";
import { classifyDeadline } from "@/lib/privacy-rights/deadlines";
import { discoverRightsData } from "@/lib/privacy-rights/service";
import { loadOwnedRightsRequest } from "@/lib/privacy-rights/http";
import { resolveActiveMembership, resolveLocalUser } from "@/lib/api-auth-helpers";

export default async function RightsRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { orgId, userId } = await auth();
  if (!orgId || !userId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);
  if (!localOrg) return null;

  const request = await loadOwnedRightsRequest(localOrg.id, id);
  if (!request) notFound();

  const localUser = await resolveLocalUser(userId);
  const membership = localUser
    ? await resolveActiveMembership(localOrg.id, localUser.id)
    : null;
  const canManage = membership?.roleName === "Owner" || membership?.roleName === "Admin";

  const site = request.websiteId
    ? (await db
        .select({ name: websites.name })
        .from(websites)
        .where(eq(websites.id, request.websiteId))
        .limit(1))[0]
    : null;

  const discovered = await discoverRightsData({
    organizationId: localOrg.id,
    request,
  });

  const assignee = request.assignedTo
    ? (await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, request.assignedTo))
        .limit(1))[0]
    : null;

  const activityRows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      description: auditLogs.description,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(
      and(
        eq(auditLogs.organizationId, localOrg.id),
        eq(auditLogs.resourceType, "data_principal_request"),
        eq(auditLogs.resourceId, request.id),
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  return (
    <div className="page-wrap space-y-6">
      <Link href="/dashboard/rights-requests" className="text-sm text-slate-500 hover:text-slate-800">
        ← Privacy Rights
      </Link>
      <RightsRequestDetail
        request={{
          id: request.id,
          requestType: request.requestType,
          status: request.status,
          jurisdiction: request.jurisdiction,
          requesterReference: request.requesterReference,
          requesterName: request.requesterName,
          requesterEmail: request.requesterEmail,
          requesterPhone: request.requesterPhone,
          requesterKind: request.requesterKind,
          agentAuthorizationNote: request.agentAuthorizationNote,
          consentId: request.consentId,
          description: request.description,
          responseNotes: request.responseNotes,
          verificationStatus: request.verificationStatus,
          verificationMethod: request.verificationMethod,
          verificationExpiresAt: request.verificationExpiresAt,
          verifiedAt: request.verifiedAt,
          acknowledgeBy: request.acknowledgeBy,
          dueAt: request.dueAt,
          acknowledgedAt: request.acknowledgedAt,
          completedAt: request.completedAt,
          receivedAt: request.receivedAt,
          deadlineKind: request.deadlineKind,
          assignedTo: request.assignedTo,
          assignedToName: assignee?.name ?? null,
          websiteName: site?.name ?? null,
          canManage,
        }}
        activity={activityRows.map((row) => ({
          id: row.id,
          action: row.action,
          description: row.description,
          createdAt: row.createdAt,
        }))}
        deadlineState={classifyDeadline({
          dueAt: request.dueAt,
          completedAt: request.completedAt,
          status: request.status,
        })}
        discovery={{
          recordCount: discovered.records.length,
          decisionCount: discovered.decisions.length,
          eventCount: discovered.events.length,
          evidenceCount: discovered.snapshots.length,
          holds: discovered.holds,
          deletionPlan: discovered.deletionPlan,
          records: discovered.records.map((row) => ({
            id: row.id,
            consentId: row.consentId,
            status: row.status,
            websiteId: row.websiteId,
          })),
        }}
      />
    </div>
  );
}
