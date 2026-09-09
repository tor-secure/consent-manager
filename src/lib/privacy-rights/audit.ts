import "server-only";

import { db } from "@/db";
import { auditLogs } from "@/db/schema/audit-logs";

export async function writeRightsAudit(input: {
  organizationId: string;
  userId?: string | null;
  action: string;
  requestId: string;
  websiteId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const metadata = { ...(input.metadata ?? {}) };
  delete metadata.token;
  delete metadata.verificationToken;
  delete metadata.statusToken;
  delete metadata.password;
  delete metadata.apiKey;

  await db.insert(auditLogs).values({
    organizationId: input.organizationId,
    userId: input.userId ?? null,
    action: input.action,
    resourceType: "data_principal_request",
    resourceId: input.requestId,
    description: input.description,
    metadata: {
      ...metadata,
      websiteId: input.websiteId ?? null,
    },
  });
}
