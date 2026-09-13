import "server-only";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { iabGvlCache } from "@/db/schema/iab-gvl-cache";
import { fetchOfficialGvl, OFFICIAL_GVL_URL } from "./iab-gvl";

const GVL_MEMORY_TTL_MS = 60_000;
let currentGvlMemory: { expiresAt: number; row: typeof iabGvlCache.$inferSelect | null } | null = null;

export async function syncOfficialGvl() {
  const gvl = await fetchOfficialGvl();
  await db.transaction(async (tx) => {
    await tx.update(iabGvlCache).set({ status: "superseded" }).where(eq(iabGvlCache.status, "current"));
    await tx.insert(iabGvlCache).values({
      version: gvl.vendorListVersion,
      specificationVersion: gvl.gvlSpecificationVersion,
      tcfPolicyVersion: gvl.tcfPolicyVersion,
      sourceUrl: OFFICIAL_GVL_URL,
      sha256: gvl.sha256,
      payload: gvl.payload,
      status: "current",
      fetchedAt: new Date(),
      validatedAt: new Date(),
    }).onConflictDoUpdate({
      target: iabGvlCache.version,
      set: { payload: gvl.payload, sha256: gvl.sha256, status: "current", fetchedAt: new Date(), validatedAt: new Date() },
    });
  });
  currentGvlMemory = null;
  return { version: gvl.vendorListVersion, vendorCount: Object.keys(gvl.vendors).length, sha256: gvl.sha256 };
}

export async function getCurrentGvl() {
  if (currentGvlMemory && currentGvlMemory.expiresAt > Date.now()) {
    return currentGvlMemory.row;
  }
  const [row] = await db.select().from(iabGvlCache)
    .where(eq(iabGvlCache.status, "current")).orderBy(desc(iabGvlCache.version)).limit(1);
  currentGvlMemory = { expiresAt: Date.now() + GVL_MEMORY_TTL_MS, row: row ?? null };
  return currentGvlMemory.row;
}
