import { and, count, eq } from "drizzle-orm";

import { db } from "@/db";
import { invoices } from "@/db/schema/invoices";
import { plans } from "@/db/schema/plans";
import { subscriptions } from "@/db/schema/subscriptions";
import { subscriptionUsage } from "@/db/schema/subscription-usage";
import { websites } from "@/db/schema/websites";

export const DEFAULT_PLAN_KEY = "internal_starter";

export type BillingProvider = "none" | "stripe";

export function billingProvider(): BillingProvider {
  return process.env.STRIPE_SECRET_KEY?.trim()?.startsWith("sk_") ? "stripe" : "none";
}

export async function ensureDefaultPlan() {
  const [existing] = await db.select().from(plans).where(eq(plans.key, DEFAULT_PLAN_KEY)).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(plans)
    .values({
      key: DEFAULT_PLAN_KEY,
      name: "Starter (internal)",
      description: "Internal entitlement plan. Card charges are disabled until a payment provider is configured.",
      priceMonthly: "0",
      priceYearly: "0",
      maxWebsites: 25,
      maxMonthlyVisitors: 100000,
      maxConsentEvents: 500000,
      maxApiRequests: 100000,
      maxScansPerMonth: 200,
      dataRetentionDays: 365,
      features: { sdk: true, scans: true, dsar: true },
      isPublic: true,
      isActive: true,
      sortOrder: 0,
    })
    .returning();
  return created;
}

export const PRO_PLAN_KEY = "pro";

export async function ensureProPlan() {
  const [existing] = await db.select().from(plans).where(eq(plans.key, PRO_PLAN_KEY)).limit(1);
  if (existing) return existing;
  const [created] = await db
    .insert(plans)
    .values({
      key: PRO_PLAN_KEY,
      name: "Pro",
      description: "Paid SaaS plan. Checkout uses Stripe price IDs from the environment.",
      priceMonthly: "99.00",
      priceYearly: "990.00",
      maxWebsites: 100,
      maxMonthlyVisitors: 2000000,
      maxConsentEvents: 5000000,
      maxApiRequests: 1000000,
      maxScansPerMonth: 2000,
      dataRetentionDays: 365,
      features: { sdk: true, scans: true, dsar: true, stripe: true },
      isPublic: true,
      isActive: true,
      sortOrder: 10,
    })
    .returning();
  return created;
}

export async function ensureOrganizationSubscription(organizationId: string) {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.organizationId, organizationId))
    .limit(1);
  if (existing) return existing;
  const plan = await ensureDefaultPlan();
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
  const [created] = await db
    .insert(subscriptions)
    .values({
      organizationId,
      planId: plan.id,
      status: "active",
      billingInterval: "monthly",
      provider: billingProvider(),
      currentPeriodStartAt: now,
      currentPeriodEndAt: periodEnd,
      startedAt: now,
    })
    .returning();
  return created;
}

export async function assertWebsiteEntitlement(organizationId: string) {
  const subscription = await ensureOrganizationSubscription(organizationId);
  const [plan] = await db.select().from(plans).where(eq(plans.id, subscription.planId)).limit(1);
  const maxWebsites = plan?.maxWebsites ?? 25;
  const [row] = await db
    .select({ count: count() })
    .from(websites)
    .where(and(eq(websites.organizationId, organizationId), eq(websites.status, "active")));
  const used = Number(row?.count ?? 0);
  if (used >= maxWebsites) {
    return {
      ok: false as const,
      message: `Website limit reached for the current plan (${maxWebsites}).`,
      used,
      limit: maxWebsites,
    };
  }
  return { ok: true as const, used, limit: maxWebsites, subscriptionId: subscription.id };
}

export async function assertScanEntitlement(organizationId: string) {
  const subscription = await ensureOrganizationSubscription(organizationId);
  const [plan] = await db.select().from(plans).where(eq(plans.id, subscription.planId)).limit(1);
  const limit = plan?.maxScansPerMonth ?? 200;
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [usage] = await db
    .select()
    .from(subscriptionUsage)
    .where(
      and(
        eq(subscriptionUsage.subscriptionId, subscription.id),
        eq(subscriptionUsage.metric, "scans"),
        eq(subscriptionUsage.periodStart, periodStart),
      ),
    )
    .limit(1);
  const used = usage?.usedAmount ?? 0;
  if (used >= limit) {
    return {
      ok: false as const,
      message: `Monthly scan limit reached for the current plan (${limit}).`,
      used,
      limit,
    };
  }
  return { ok: true as const, used, limit, subscriptionId: subscription.id };
}

export async function applyStripeSubscriptionState(input: {
  organizationId: string;
  planKey: string;
  interval: "monthly" | "yearly";
  status: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date | null;
}) {
  const plan = input.planKey === PRO_PLAN_KEY ? await ensureProPlan() : await ensureDefaultPlan();
  const existing = await ensureOrganizationSubscription(input.organizationId);
  const [updated] = await db
    .update(subscriptions)
    .set({
      planId: plan.id,
      status: input.status,
      billingInterval: input.interval,
      provider: "stripe",
      providerCustomerId: input.customerId ?? existing.providerCustomerId,
      providerSubscriptionId: input.subscriptionId ?? existing.providerSubscriptionId,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      currentPeriodEndAt: input.currentPeriodEnd ?? existing.currentPeriodEndAt,
      cancelledAt: input.status === "canceled" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, existing.id))
    .returning();
  return updated;
}

export async function recordInternalInvoice(input: {
  organizationId: string;
  subscriptionId: string;
  description: string;
  totalAmount?: string;
}) {
  const invoiceNumber = `INV-${Date.now()}`;
  const [created] = await db
    .insert(invoices)
    .values({
      organizationId: input.organizationId,
      subscriptionId: input.subscriptionId,
      invoiceNumber,
      provider: billingProvider(),
      status: billingProvider() === "none" ? "open" : "draft",
      totalAmount: input.totalAmount ?? "0",
      description: input.description,
      issuedAt: new Date(),
    })
    .returning();
  return created;
}

export async function incrementUsage(subscriptionId: string, metric: string, amount = 1) {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const [existing] = await db
    .select()
    .from(subscriptionUsage)
    .where(
      and(
        eq(subscriptionUsage.subscriptionId, subscriptionId),
        eq(subscriptionUsage.metric, metric),
        eq(subscriptionUsage.periodStart, periodStart),
      ),
    )
    .limit(1);
  if (existing) {
    await db
      .update(subscriptionUsage)
      .set({ usedAmount: existing.usedAmount + amount, updatedAt: now })
      .where(eq(subscriptionUsage.id, existing.id));
    return;
  }
  await db.insert(subscriptionUsage).values({
    subscriptionId,
    metric,
    periodStart,
    periodEnd,
    usedAmount: amount,
  });
}
