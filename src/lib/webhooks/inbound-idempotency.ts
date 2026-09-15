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
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    if (code === "23505") return { claimed: false };
    throw error;
  }
}

export async function releaseInboundWebhook(provider: string, eventId: string) {
  const { and, eq } = await import("drizzle-orm");
  await db
    .delete(inboundWebhooks)
    .where(and(eq(inboundWebhooks.provider, provider), eq(inboundWebhooks.eventId, eventId)));
}
