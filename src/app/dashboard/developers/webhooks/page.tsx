import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { eq, desc, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { webhookEndpoints } from "@/db/schema/webhook-endpoints";
import { webhookDeliveries } from "@/db/schema/webhook-deliveries";
import {
  WebhookEndpointManager,
  type WebhookEndpointRow,
} from "@/components/webhooks/webhook-endpoint-manager";

const DELIVERIES_PER_ENDPOINT = 20;

// Auth + bootstrap guaranteed by the dashboard layout.
export default async function WebhooksPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  // Fetch all endpoints for this org, newest first.
  const endpointRows = await db
    .select({
      id: webhookEndpoints.id,
      name: webhookEndpoints.name,
      url: webhookEndpoints.url,
      description: webhookEndpoints.description,
      status: webhookEndpoints.status,
      subscribedEvents: webhookEndpoints.subscribedEvents,
      verified: webhookEndpoints.verified,
      lastDeliveryAt: webhookEndpoints.lastDeliveryAt,
      createdAt: webhookEndpoints.createdAt,
    })
    .from(webhookEndpoints)
    .where(eq(webhookEndpoints.organizationId, localOrg.id))
    .orderBy(desc(webhookEndpoints.createdAt));

  // Fetch recent deliveries for all endpoints in one query.
  const endpointIds = endpointRows.map((e) => e.id);

  const deliveryRows =
    endpointIds.length > 0
      ? await db
          .select({
            id: webhookDeliveries.id,
            webhookEndpointId: webhookDeliveries.webhookEndpointId,
            eventType: webhookDeliveries.eventType,
            status: webhookDeliveries.status,
            attemptNumber: webhookDeliveries.attemptNumber,
            responseStatusCode: webhookDeliveries.responseStatusCode,
            errorMessage: webhookDeliveries.errorMessage,
            sentAt: webhookDeliveries.sentAt,
            completedAt: webhookDeliveries.completedAt,
          })
          .from(webhookDeliveries)
          .where(inArray(webhookDeliveries.webhookEndpointId, endpointIds))
          .orderBy(desc(webhookDeliveries.createdAt))
          .limit(endpointIds.length * DELIVERIES_PER_ENDPOINT)
      : [];

  // Group deliveries by endpoint id.
  const deliveriesByEndpoint = new Map<string, typeof deliveryRows>();
  for (const d of deliveryRows) {
    const list = deliveriesByEndpoint.get(d.webhookEndpointId) ?? [];
    if (list.length < DELIVERIES_PER_ENDPOINT) {
      list.push(d);
      deliveriesByEndpoint.set(d.webhookEndpointId, list);
    }
  }

  // Build typed rows for the client component.
  const endpoints: WebhookEndpointRow[] = endpointRows.map((ep) => ({
    id: ep.id,
    name: ep.name,
    url: ep.url,
    description: ep.description,
    status: ep.status,
    subscribedEvents: ep.subscribedEvents ?? [],
    verified: ep.verified,
    lastDeliveryAt: ep.lastDeliveryAt,
    createdAt: ep.createdAt,
    deliveries: (deliveriesByEndpoint.get(ep.id) ?? []).map((d) => ({
      id: d.id,
      eventType: d.eventType,
      status: d.status,
      attemptNumber: d.attemptNumber,
      responseStatusCode: d.responseStatusCode,
      errorMessage: d.errorMessage,
      sentAt: d.sentAt,
      completedAt: d.completedAt,
    })),
  }));

  const activeCount = endpointRows.filter((e) => e.status === "active").length;

  return (
    <div className="page-wrap space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/developers" className="transition hover:text-slate-900">
          API Keys
        </Link>
        <span className="text-slate-300" aria-hidden="true">/</span>
        <span className="text-slate-900">Webhooks</span>
      </nav>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Webhooks</h1>
        <p className="mt-1 text-sm text-slate-500">
          Receive real-time event notifications at your endpoints.
          {endpointRows.length > 0 && (
            <> {activeCount} active endpoint{activeCount !== 1 ? "s" : ""}.</>
          )}
        </p>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 16 16"
          stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" d="M8 2l6 12H2z" />
          <path strokeLinecap="round" d="M8 7v3M8 12h.01" />
        </svg>
        <p>
          <strong className="font-semibold">Verify signatures:</strong> Every delivery includes a{" "}
          <code className="rounded-md bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
            X-CMP-Signature
          </code>{" "}
          header. Use your endpoint&apos;s signing secret to verify the payload has not been tampered with.
        </p>
      </div>

      <WebhookEndpointManager initialEndpoints={endpoints} />
    </div>
  );
}
