import { auth } from "@clerk/nextjs/server";
import { eq, desc } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema/organizations";
import { apiKeys } from "@/db/schema/api-keys";
import { ApiKeyManager, type ApiKeyRow } from "@/components/api-keys/api-key-manager";

// Auth + bootstrap guaranteed by the dashboard layout.
export default async function DevelopersPage() {
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
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
      environment: apiKeys.environment,
      status: apiKeys.status,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, localOrg.id))
    .orderBy(desc(apiKeys.createdAt));

  const keyList: ApiKeyRow[] = rows;

  const activeCount = rows.filter((k) => k.status === "active").length;

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-neutral-900">API Keys</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage API keys for programmatic access to the CMP API.{" "}
          {activeCount > 0 && (
            <span className="text-neutral-700">
              {activeCount} active key{activeCount !== 1 ? "s" : ""}.
            </span>
          )}
        </p>
      </div>

      {/* Security notice */}
      <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>Security:</strong> API keys grant access to your organization&apos;s data. Keep them
        secret and never commit them to source control. Revoke any key that may have been
        compromised.
      </div>

      <ApiKeyManager initialKeys={keyList} />
    </div>
  );
}
