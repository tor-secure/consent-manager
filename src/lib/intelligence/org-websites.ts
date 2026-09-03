import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";

export async function loadOrgWebsites(organizationId: string) {
  return db
    .select({ id: websites.id, name: websites.name, domain: websites.domain })
    .from(websites)
    .where(and(eq(websites.organizationId, organizationId), isNull(websites.deletedAt)))
    .orderBy(websites.name);
}

export function pickWebsiteId(
  sites: Array<{ id: string }>,
  requested?: string,
) {
  if (requested && sites.some((site) => site.id === requested)) return requested;
  return sites[0]?.id;
}
