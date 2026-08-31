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
    <div className="px-5 py-8 md:px-8 md:py-10 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">API Keys</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage API keys for programmatic access to the CMP API.{" "}
          {activeCount > 0 && (
            <span className="font-medium text-slate-700">
              {activeCount} active key{activeCount !== 1 ? "s" : ""}.
            </span>
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
          <strong className="font-semibold">Security reminder:</strong>{" "}
          API keys grant access to your organisation&apos;s data. Keep them secret and never
          commit them to source control. Revoke any key that may have been compromised.
        </p>
      </div>

      <ApiKeyManager initialKeys={keyList} />
    </div>
  );
}
