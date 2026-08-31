import { auth } from "@clerk/nextjs/server";
import { eq, desc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { dataPrincipalRequests } from "@/db/schema/data-principal-requests";
import {
  RightsRequestManager,
  type RightsRequestRow,
} from "@/components/settings/rights-request-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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

  const requests: RightsRequestRow[] = rows.map((r) => {
    const site = r.websiteId ? websiteMap.get(r.websiteId) : undefined;
    return {
      id:              r.id,
      requestType:     r.requestType,
      status:          r.status,
      requesterName:   r.requesterName,
      requesterEmail:  r.requesterEmail,
      requesterPhone:  r.requesterPhone,
      consentId:       r.consentId,
      description:     r.description,
      responseNotes:   r.responseNotes,
      acknowledgeBy:   r.acknowledgeBy,
      dueAt:           r.dueAt,
      acknowledgedAt:  r.acknowledgedAt,
      completedAt:     r.completedAt,
      receivedAt:      r.receivedAt,
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
    <div className="px-5 py-8 md:px-8 md:py-10 space-y-8">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Data Principal Rights Requests
            </h1>
            {openCount > 0 && (
              <Badge variant="primary" size="sm">{openCount} open</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Manage access, correction, erasure, grievance, and nomination requests under
            DPDP 2023 §11–14 + Rules 2025 Rule 12.
            {" "}Acknowledge within <strong>48 hours</strong> · Respond within <strong>30 days</strong>.
          </p>
        </div>
      </div>

      {/* SLA breach alerts */}
      {overdueAck > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M8 2l6 12H2z" />
            <path strokeLinecap="round" d="M8 7v3M8 12h.01" />
          </svg>
          <p>
            <strong className="font-semibold">
              {overdueAck} request{overdueAck !== 1 ? "s" : ""} past the 48-hour acknowledgement deadline.
            </strong>{" "}
            Open the request and click <em>Acknowledge request</em> immediately to avoid a statutory breach.
          </p>
        </div>
      )}

      {overdueDue > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M8 2l6 12H2z" />
            <path strokeLinecap="round" d="M8 7v3M8 12h.01" />
          </svg>
          <p>
            <strong className="font-semibold">
              {overdueDue} request{overdueDue !== 1 ? "s" : ""} past the 30-day response deadline.
            </strong>{" "}
            Resolve and mark these completed or rejected as soon as possible.
          </p>
        </div>
      )}

      {/* API reference */}
      <Card>
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">Public intake endpoint</p>
              <p className="mt-1 text-xs text-slate-500">
                Data Principals submit requests to this endpoint from your website or privacy portal.
                No authentication is required. Supply the <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">websiteId</code>{" "}
                of the website they are requesting about.
              </p>
            </div>
            <div className="shrink-0">
              <code className="block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                POST /api/rights-request
              </code>
              <code className="mt-1 block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                GET  /api/rights-request/[id]
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
