import "server-only";

import { db } from "@/db";
import { inboundWebhooks } from "@/db/schema/inbound-webhooks";

export async function claimInboundWebhook(input: {
  provider: string;
  eventId: string;
  eventType?: string | null;
}): Promise<{ claimed: boolean }> {
  const eventId = input.eventId.trim();
  if (!eventId) return { claimed: false };
  try {
    await db.insert(inboundWebhooks).values({
      provider: input.provider,
      eventId,
      eventType: input.eventType ?? null,
    });
    return { claimed: true };
  } catch (error) {
    if (isUniqueViolation(error)) return { claimed: false };
    throw error;
  }
}

/** Drizzle wraps driver errors in DrizzleQueryError; the Postgres code lives on `cause`. */
function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 3 && typeof current === "object" && current; depth += 1) {
    const code = (current as { code?: unknown }).code;
    if (String(code) === "23505") return true;
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}

export async function releaseInboundWebhook(provider: string, eventId: string) {
  const { and, eq } = await import("drizzle-orm");
  await db
    .delete(inboundWebhooks)
    .where(and(eq(inboundWebhooks.provider, provider), eq(inboundWebhooks.eventId, eventId)));
}
