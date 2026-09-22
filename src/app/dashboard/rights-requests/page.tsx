import { auth } from "@clerk/nextjs/server";
import { eq, desc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { users } from "@/db/schema/users";
import { dataPrincipalRequests } from "@/db/schema/data-principal-requests";
import {
  RightsRequestManager,
  type RightsRequestRow,
} from "@/components/settings/rights-request-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBanner } from "@/components/ui/status-banner";

// ---------------------------------------------------------------------------
// Page — server component
// All requests scoped to the authenticated user's active organization.
// ---------------------------------------------------------------------------

export default async function RightsRequestsPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  // Fetch all requests for this org, newest first.
  const rows = await db
    .select()
    .from(dataPrincipalRequests)
    .where(eq(dataPrincipalRequests.organizationId, localOrg.id))
    .orderBy(desc(dataPrincipalRequests.receivedAt));

  // Resolve website names in a single bulk query.
  const websiteIds = [...new Set(rows.map((r) => r.websiteId).filter(Boolean) as string[])];
  const websiteRows =
    websiteIds.length > 0
      ? await db
          .select({ id: websites.id, name: websites.name, domain: websites.domain })
          .from(websites)
          .where(inArray(websites.id, websiteIds))
      : [];
  const websiteMap = new Map(websiteRows.map((w) => [w.id, w]));

  const assigneeIds = [...new Set(rows.map((r) => r.assignedTo).filter(Boolean) as string[])];
  const assigneeRows =
    assigneeIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, assigneeIds))
      : [];
  const assigneeMap = new Map(assigneeRows.map((u) => [u.id, u.name]));

  const requests: RightsRequestRow[] = rows.map((r) => {
    const site = r.websiteId ? websiteMap.get(r.websiteId) : undefined;
    return {
      id:              r.id,
      requestType:     r.requestType,
      status:          r.status,
      jurisdiction:    r.jurisdiction,
      requesterReference: r.requesterReference,
      requesterName:   r.requesterName,
      requesterEmail:  r.requesterEmail,
      requesterPhone:  r.requesterPhone,
      verificationStatus: r.verificationStatus,
      consentId:       r.consentId,
      description:     r.description,
      responseNotes:   r.responseNotes,
      acknowledgeBy:   r.acknowledgeBy,
      dueAt:           r.dueAt,
      acknowledgedAt:  r.acknowledgedAt,
      completedAt:     r.completedAt,
      receivedAt:      r.receivedAt,
      assignedToName:  r.assignedTo ? assigneeMap.get(r.assignedTo) ?? null : null,
      websiteName:     site?.name ?? null,
      websiteDomain:   site?.domain ?? null,
    };
  });

  // SLA summary for the header
  const now            = new Date();
  const openCount      = requests.filter((r) => r.status !== "completed" && r.status !== "rejected").length;
  const overdueAck     = requests.filter((r) => r.status === "received" && new Date(r.acknowledgeBy) < now).length;
  const overdueDue     = requests.filter((r) => !["completed", "rejected"].includes(r.status) && new Date(r.dueAt) < now).length;

  return (
    <div className="page-wrap space-y-6 sm:space-y-8">

      <PageHeader
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            Privacy Rights / Requests
            {openCount > 0 && (
              <Badge variant="primary" size="sm">{openCount} open</Badge>
            )}
          </span>
        }
        description="Tenant-scoped DSAR workflow with identity verification, configured jurisdiction targets, and evidence-preserving deletion. Deadlines are configured targets, not a legal-compliance certification."
      />

      {/* SLA breach alerts */}
      {overdueAck > 0 && (
        <StatusBanner variant="danger" role="alert">
          <p>
            <strong className="font-semibold">
              {overdueAck} request{overdueAck !== 1 ? "s" : ""} past the configured acknowledgement target.
            </strong>{" "}
            Open the request and move it into review. These targets are configured SLAs, not a legal-compliance certification.
          </p>
        </StatusBanner>
      )}

      {overdueDue > 0 && (
        <StatusBanner variant="warning" role="alert">
          <p>
            <strong className="font-semibold">
              {overdueDue} request{overdueDue !== 1 ? "s" : ""} past the configured response target.
            </strong>{" "}
            Resolve and mark these completed or rejected as soon as possible. Deadlines are configured targets unless your legal configuration says otherwise.
          </p>
        </StatusBanner>
      )}

      {/* API reference */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Public intake endpoint</p>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Data Principals submit requests to this endpoint from your website or the Data Principal Rights portal.
                No authentication is required. Supply the <code className="rounded-md bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--muted-foreground)]">websiteId</code>{" "}
                or <code className="rounded-md bg-[var(--secondary)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--muted-foreground)]">siteKey</code>{" "}
                of the website they are requesting about. Requesters can track with ticket ID (DPR-XXXXXXXX or GRV-XXXXXXXX) and email.
              </p>
            </div>
            <div className="shrink-0">
              <code className="block rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 font-mono text-xs text-[var(--foreground)]">
                POST /api/rights-request
              </code>
              <code className="mt-1 block rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 font-mono text-xs text-[var(--foreground)]">
                POST /api/rights-request/verify
              </code>
              <code className="mt-1 block rounded-xl border border-[var(--border)] bg-[var(--muted)] px-3 py-2 font-mono text-xs text-[var(--foreground)]">
                GET  /api/rights-request/status?ticket=&email=
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request list */}
      <RightsRequestManager requests={requests} />
    </div>
  );
}
