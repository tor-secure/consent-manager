import { auth } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { websites } from "@/db/schema/websites";
import { integrations } from "@/db/schema/integrations";
import { websiteIntegrations } from "@/db/schema/website-integrations";
import {
  IntegrationCatalog,
  type IntegrationEntry,
  type WebsiteOption,
} from "@/components/integrations/integration-catalog";

// Auth + bootstrap guaranteed by the dashboard layout.
export default async function IntegrationsPage() {
  const { orgId } = await auth();
  if (!orgId) return null;

  const [localOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.clerkOrganizationId, orgId))
    .limit(1);

  if (!localOrg) return null;

  // Fetch all org websites (used for connect dropdowns and connection labels).
  const orgWebsites = await db
    .select({
      id: websites.id,
      name: websites.name,
      domain: websites.domain,
    })
    .from(websites)
    .where(eq(websites.organizationId, localOrg.id))
    .orderBy(websites.name);

  const websiteIds = orgWebsites.map((w) => w.id);
  const websiteMap = new Map(orgWebsites.map((w) => [w.id, w]));

  // Fetch the full integration catalog (all active integrations).
  const catalogRows = await db
    .select()
    .from(integrations)
    .where(eq(integrations.isActive, true))
    .orderBy(integrations.category, integrations.name);

  // Fetch all existing connections for this org's websites.
  const connectionRows =
    websiteIds.length > 0
      ? await db
          .select({
            id: websiteIntegrations.id,
            websiteId: websiteIntegrations.websiteId,
            integrationId: websiteIntegrations.integrationId,
            status: websiteIntegrations.status,
            enabled: websiteIntegrations.enabled,
            connectedAt: websiteIntegrations.connectedAt,
          })
          .from(websiteIntegrations)
          .where(inArray(websiteIntegrations.websiteId, websiteIds))
      : [];

  // Group connections by integrationId.
  const connectionsByIntegration = new Map<
    string,
    typeof connectionRows
  >();
  for (const conn of connectionRows) {
    const list = connectionsByIntegration.get(conn.integrationId) ?? [];
    list.push(conn);
    connectionsByIntegration.set(conn.integrationId, list);
  }

  // Build the IntegrationEntry[] for the client component.
  const integrationEntries: IntegrationEntry[] = catalogRows.map((row) => {
    const conns = connectionsByIntegration.get(row.id) ?? [];

    return {
      id: row.id,
      key: row.key,
      name: row.name,
      description: row.description,
      category: row.category,
      provider: row.provider,
      iconUrl: row.iconUrl,
      documentationUrl: row.documentationUrl,
      isOfficial: row.isOfficial,
      connections: conns.map((c) => {
        const site = websiteMap.get(c.websiteId);
        return {
          connectionId: c.id,
          websiteId: c.websiteId,
          websiteName: site?.name ?? "Unknown website",
          websiteDomain: site?.domain ?? "",
          status: c.status,
          enabled: c.enabled,
          connectedAt: c.connectedAt,
        };
      }),
    };
  });

  const websiteOptions: WebsiteOption[] = orgWebsites;

  // Summary counts for the page header.
  const totalConnections = connectionRows.length;
  const connectedIntegrationCount = new Set(
    connectionRows.map((c) => c.integrationId),
  ).size;

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-900">Integrations</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Connect third-party tools and tag managers to your websites.
          {catalogRows.length > 0 && (
            <>
              {" "}
              {connectedIntegrationCount} of {catalogRows.length} integration
              {catalogRows.length !== 1 ? "s" : ""} connected
              {totalConnections > 0 && ` (${totalConnections} connection${totalConnections !== 1 ? "s" : ""})`}.
            </>
          )}
        </p>
      </div>

      <IntegrationCatalog
        integrations={integrationEntries}
        websites={websiteOptions}
      />
    </div>
  );
}
