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
import { DevelopersShell, DevelopersStat } from "@/components/developers/developers-shell";
import { StatusBanner } from "@/components/ui/status-banner";

const DELIVERIES_PER_ENDPOINT = 20;

export default async function WebhooksPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

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

  const deliveriesByEndpoint = new Map<string, typeof deliveryRows>();
  for (const d of deliveryRows) {
    const list = deliveriesByEndpoint.get(d.webhookEndpointId) ?? [];
    if (list.length < DELIVERIES_PER_ENDPOINT) {
      list.push(d);
      deliveriesByEndpoint.set(d.webhookEndpointId, list);
    }
  }

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
  const verifiedCount = endpointRows.filter((e) => e.verified).length;

  return (
    <DevelopersShell
      pathname="/dashboard/developers/webhooks"
      title="Webhooks"
      description="Receive signed consent and rights events at your HTTPS endpoints in real time."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <DevelopersStat label="Endpoints" value={endpointRows.length} />
        <DevelopersStat label="Active" value={activeCount} />
        <DevelopersStat label="Verified" value={verifiedCount} />
      </div>

      <StatusBanner variant="warning">
        <p>
          <strong className="font-semibold">Verify signatures.</strong> Every delivery includes{" "}
          <code className="rounded-md bg-[var(--warning-soft)] px-1.5 py-0.5 font-mono text-xs">
            X-CMP-Signature
          </code>
          . Use the endpoint signing secret to confirm the payload was not modified.
        </p>
      </StatusBanner>

      <WebhookEndpointManager initialEndpoints={endpoints} />
    </DevelopersShell>
  );
}
