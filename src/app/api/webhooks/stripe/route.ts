import { NextResponse } from "next/server";

import { db } from "@/db";
import { invoices } from "@/db/schema/invoices";
import { subscriptions } from "@/db/schema/subscriptions";
import { applyStripeSubscriptionState } from "@/lib/billing/entitlements";
import { planKeyForStripePrice, stripeWebhookSecret, verifyStripeSignature } from "@/lib/billing/stripe";
import { logger } from "@/lib/logger";
import { claimInboundWebhook, releaseInboundWebhook } from "@/lib/webhooks/inbound-idempotency";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

type StripeObject = {
  id?: string;
  object?: string;
  customer?: string | { id?: string };
  subscription?: string | { id?: string };
  client_reference_id?: string;
  metadata?: Record<string, string>;
  status?: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  items?: { data?: Array<{ price?: { id?: string } }> };
  amount_paid?: number;
  number?: string;
  currency?: string;
};

function customerId(value: StripeObject["customer"]): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? null;
}

function subscriptionId(value: StripeObject["subscription"]): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id ?? null;
}

async function organizationIdFromStripe(object: StripeObject): Promise<string | null> {
  const fromMeta = object.metadata?.organizationId || object.client_reference_id;
  if (fromMeta) return fromMeta;
  const customer = customerId(object.customer);
  if (!customer) return null;
  const [row] = await db
    .select({ organizationId: subscriptions.organizationId })
    .from(subscriptions)
    .where(eq(subscriptions.providerCustomerId, customer))
    .limit(1);
  return row?.organizationId ?? null;
}

export async function POST(request: Request) {
  const secret = stripeWebhookSecret();
  if (!secret) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const payload = await request.text();
  const ok = verifyStripeSignature({
    payload,
    header: request.headers.get("stripe-signature"),
    secret,
  });
  if (!ok) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  let event: { id?: string; type?: string; data?: { object?: StripeObject } };
  try {
    event = JSON.parse(payload) as { id?: string; type?: string; data?: { object?: StripeObject } };
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }
  const eventId = event.id?.trim();
  if (!eventId) {
    return NextResponse.json({ success: false, message: "Missing event id" }, { status: 400 });
  }

  const claimed = await claimInboundWebhook({ provider: "stripe", eventId, eventType: event.type });
  if (!claimed.claimed) {
    return NextResponse.json({ success: true, duplicate: true });
  }

  try {
    const object = event.data?.object ?? {};
    if (event.type === "checkout.session.completed" || event.type === "customer.subscription.updated") {
      const organizationId = await organizationIdFromStripe(object);
      const priceId = object.items?.data?.[0]?.price?.id || object.metadata?.priceId;
      const mapped = priceId ? planKeyForStripePrice(priceId) : { planKey: object.metadata?.planKey || "pro", interval: (object.metadata?.interval as "monthly" | "yearly") || "monthly" };
      if (organizationId && mapped) {
        await applyStripeSubscriptionState({
          organizationId,
          planKey: mapped.planKey,
          interval: mapped.interval,
          status: object.status === "active" || event.type === "checkout.session.completed" ? "active" : (object.status || "active"),
          customerId: customerId(object.customer),
          subscriptionId: subscriptionId(object.subscription) || (object.object === "subscription" ? object.id : null),
          cancelAtPeriodEnd: object.cancel_at_period_end === true,
          currentPeriodEnd: object.current_period_end ? new Date(object.current_period_end * 1000) : null,
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const organizationId = await organizationIdFromStripe(object);
      if (organizationId) {
        await applyStripeSubscriptionState({
          organizationId,
          planKey: "internal_starter",
          interval: "monthly",
          status: "canceled",
          customerId: customerId(object.customer),
          subscriptionId: object.id,
        });
      }
    }

    if (event.type === "invoice.paid" && object.id) {
      const organizationId = await organizationIdFromStripe(object);
      if (organizationId) {
        const [sub] = await db
          .select({ id: subscriptions.id })
          .from(subscriptions)
          .where(eq(subscriptions.organizationId, organizationId))
          .limit(1);
        await db
          .insert(invoices)
          .values({
            organizationId,
            subscriptionId: sub?.id,
            invoiceNumber: object.number || object.id,
            provider: "stripe",
            providerInvoiceId: object.id,
            status: "paid",
            currency: (object.currency || "usd").toUpperCase(),
            totalAmount: ((object.amount_paid ?? 0) / 100).toFixed(2),
            paidAt: new Date(),
            issuedAt: new Date(),
            description: "Stripe invoice",
          })
          .onConflictDoNothing();
      }
    }
  } catch (error) {
    await releaseInboundWebhook("stripe", eventId);
    logger.error("Stripe webhook handling failed", { operation: "stripe.webhook", type: event.type, error });
    return NextResponse.json({ success: false, message: "Webhook handling failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
