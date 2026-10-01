import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { runtimeDiscoveryObservations } from "@/db/schema/runtime-discovery-observations";
import { trackers } from "@/db/schema/trackers";
import { vendors } from "@/db/schema/vendors";
import { purposes } from "@/db/schema/purposes";
import { redactDiscoveryKey, redactDiscoveryPath, sanitizeDiscoveryPageUrl } from "@/lib/discovery-redaction-core";

export const OBSERVATION_TYPES = ["fetch", "xhr", "beacon", "resource", "performance", "cookie", "local_storage", "session_storage"] as const;
const bareHost = z.string().max(253).regex(/^[a-z0-9.-]+(?::\d{1,5})?$/i);
const cleanPath = z.string().max(512).refine((v) => !/[?#]/.test(v), "paths must not contain queries or fragments");
const cleanUrl = z.string().max(512).refine((v) => {
  try { const u = new URL(v); return /^https?:$/.test(u.protocol) && !u.username && !u.password && !u.search && !u.hash; } catch { return false; }
}, "page URL must be a sanitized http URL");

export const runtimeDiscoveryBatchSchema = z.object({
  schemaVersion: z.literal(1),
  observations: z.array(z.object({
    eventId: z.string().uuid(),
    type: z.enum(OBSERVATION_TYPES),
    pageUrl: cleanUrl.transform(sanitizeDiscoveryPageUrl),
    pageOrigin: bareHost,
    destinationHost: bareHost.nullish(),
    resourcePath: cleanPath.nullish().transform((value) => redactDiscoveryPath(value)),
    resourceType: z.string().max(32).nullish(),
    requestMethod: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]).nullish(),
    initiator: cleanPath.nullish().transform((value) => redactDiscoveryPath(value)),
    navigationType: z.string().max(32).nullish(),
    storageKey: z.string().min(1).max(255).nullish().transform((value) => redactDiscoveryKey(value)),
    consentState: z.record(z.string().max(120), z.boolean()).refine((value) => Object.keys(value).length <= 100, "at most 100 consent states").default({}),
    observedAt: z.string().datetime(),
  }).strict()).min(1).max(100),
}).strict();

function domainMatches(host: string | null | undefined, domain: string | null) {
  if (!host || !domain) return false;
  const h = host.toLowerCase().split(":")[0];
  const d = domain.toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0].replace(/^www\./, "");
  return h === d || h.endsWith(`.${d}`);
}

export async function recordRuntimeDiscovery(organizationId: string, websiteId: string, batch: z.infer<typeof runtimeDiscoveryBatchSchema>) {
  const trackerRows = await db.select().from(trackers).where(eq(trackers.websiteId, websiteId));
  let accepted = 0;
  for (const observation of batch.observations) {
    const matched = trackerRows.find((tracker) => domainMatches(observation.destinationHost, tracker.domain)) ?? null;
    const party = observation.destinationHost ? (domainMatches(observation.destinationHost, observation.pageOrigin) ? "first-party" : "third-party") : "unknown";
    const metadata = { schemaVersion: batch.schemaVersion };
    const inserted = await db.insert(runtimeDiscoveryObservations).values({
      organizationId, websiteId, eventId: observation.eventId, observationType: observation.type,
      pageUrl: observation.pageUrl, pageOrigin: observation.pageOrigin, destinationHost: observation.destinationHost ?? null,
      resourcePath: observation.resourcePath ?? null, resourceType: observation.resourceType ?? null,
      requestMethod: observation.requestMethod ?? null, initiator: observation.initiator ?? null,
      navigationType: observation.navigationType ?? null, storageKey: observation.storageKey ?? null,
      consentState: observation.consentState, observedAt: new Date(observation.observedAt), party,
      trackerId: matched?.id ?? null, vendorId: matched?.vendorId ?? null, purposeId: matched?.purposeId ?? null, metadata,
    }).onConflictDoNothing().returning({ id: runtimeDiscoveryObservations.id });
    accepted += inserted.length;
  }
  return { accepted, duplicates: batch.observations.length - accepted };
}

export async function listRuntimeDiscovery(organizationId: string, options: { websiteId?: string; pageUrl?: string; limit?: number } = {}) {
  const conditions = [eq(runtimeDiscoveryObservations.organizationId, organizationId)];
  if (options.websiteId) conditions.push(eq(runtimeDiscoveryObservations.websiteId, options.websiteId));
  if (options.pageUrl) conditions.push(eq(runtimeDiscoveryObservations.pageUrl, options.pageUrl));
  return db.select({ observation: runtimeDiscoveryObservations, trackerName: trackers.name, vendorName: vendors.name, purposeName: purposes.name })
    .from(runtimeDiscoveryObservations).leftJoin(trackers, eq(runtimeDiscoveryObservations.trackerId, trackers.id))
    .leftJoin(vendors, eq(runtimeDiscoveryObservations.vendorId, vendors.id)).leftJoin(purposes, eq(runtimeDiscoveryObservations.purposeId, purposes.id))
    .where(and(...conditions)).orderBy(desc(runtimeDiscoveryObservations.observedAt)).limit(Math.min(Math.max(options.limit ?? 100, 1), 250));
}
