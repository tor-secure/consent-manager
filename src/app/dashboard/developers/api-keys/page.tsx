import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { requireDashboardContext } from "@/lib/bootstrap-current-context";
import { apiKeys } from "@/db/schema/api-keys";
import { ApiKeyManager, type ApiKeyRow } from "@/components/api-keys/api-key-manager";
import { DevelopersShell, DevelopersStat } from "@/components/developers/developers-shell";
import { StatusBanner } from "@/components/ui/status-banner";

export default async function DevelopersApiKeysPage() {
  const { organization: localOrg } = await requireDashboardContext();

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
  const liveCount = rows.filter((k) => k.status === "active" && k.environment === "live").length;
  const testCount = rows.filter((k) => k.status === "active" && k.environment === "test").length;
  const revokedCount = rows.filter((k) => k.status === "revoked").length;

  return (
    <DevelopersShell
      pathname="/dashboard/developers/api-keys"
      title="API keys"
      description="Create server-side credentials for Consent Guru. Secrets are shown once at creation and cannot be retrieved later."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DevelopersStat label="Active" value={activeCount} />
        <DevelopersStat label="Live" value={liveCount} />
        <DevelopersStat label="Test" value={testCount} />
        <DevelopersStat label="Revoked" value={revokedCount} />
      </div>

      <StatusBanner variant="warning">
        <p>
          <strong className="font-semibold">Keep keys secret.</strong> Use them only from your
          backend as <code className="rounded bg-[var(--warning-soft)] px-1.5 py-0.5 font-mono text-xs">Authorization: Bearer …</code>.
          Never commit keys to git or embed them in the CMP snippet.
        </p>
      </StatusBanner>

      <ApiKeyManager initialKeys={keyList} />
    </DevelopersShell>
  );
}
