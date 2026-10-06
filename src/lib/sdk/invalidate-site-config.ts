import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { websites } from "@/db/schema/websites";
import { logger } from "@/lib/logger";
import { invalidateSdkConfigCache } from "@/lib/sdk/config-cache-next";

async function invalidateSiteKeys(siteKeys: string[]): Promise<void> {
  await Promise.all(siteKeys.filter(Boolean).map((siteKey) => invalidateSdkConfigCache(siteKey)));
}

export async function invalidateSdkConfigForWebsite(websiteId: string): Promise<void> {
  try {
    const [row] = await db
      .select({ siteKey: websites.siteKey })
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    if (row?.siteKey) await invalidateSdkConfigCache(row.siteKey);
  } catch (error) {
    logger.warn("SDK config cache invalidation failed", {
      operation: "sdk.config.invalidate",
      websiteId,
      error,
    });
  }
}

export async function invalidateSdkConfigForOrganization(organizationId: string): Promise<void> {
  try {
    const rows = await db
      .select({ siteKey: websites.siteKey })
      .from(websites)
      .where(eq(websites.organizationId, organizationId));
    await invalidateSiteKeys(rows.map((row) => row.siteKey));
  } catch (error) {
    logger.warn("SDK config cache invalidation failed", {
      operation: "sdk.config.invalidate",
      organizationId,
      error,
    });
  }
}

export async function invalidateSdkConfigForEveryWebsite(): Promise<void> {
  try {
    const rows = await db.select({ siteKey: websites.siteKey }).from(websites);
    await invalidateSiteKeys(rows.map((row) => row.siteKey));
  } catch (error) {
    logger.warn("SDK config cache invalidation failed", {
      operation: "sdk.config.invalidate",
      scope: "all-websites",
      error,
    });
  }
}
