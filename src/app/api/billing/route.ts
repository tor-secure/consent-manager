import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";

import { db } from "@/db";
import { invoices } from "@/db/schema/invoices";
import { plans } from "@/db/schema/plans";
import { resolveActiveMembership, resolveLocalOrganization, resolveLocalUser } from "@/lib/api-auth-helpers";
import {
  billingProvider,
  ensureOrganizationSubscription,
  ensureProPlan,
} from "@/lib/billing/entitlements";
import { stripeFormPost, stripePriceId, stripeSecretKey } from "@/lib/billing/stripe";
import { eq } from "drizzle-orm";
import { requireOperatorRole } from "@/lib/org-roles";

export async function GET() {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId || !session.orgId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const [user, organization] = await Promise.all([
    resolveLocalUser(session.userId),
    resolveLocalOrganization(session.orgId),
  ]);
  if (!user || !organization || !(await resolveActiveMembership(organization.id, user.id))) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  const subscription = await ensureOrganizationSubscription(organization.id);
  const [plan] = await db.select().from(plans).where(eq(plans.id, subscription.planId)).limit(1);
  const invoiceRows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      status: invoices.status,
      totalAmount: invoices.totalAmount,
      issuedAt: invoices.issuedAt,
    })
    .from(invoices)
    .where(eq(invoices.organizationId, organization.id));
  const secret = stripeSecretKey();
  return NextResponse.json({
    success: true,
    provider: billingProvider(),
    chargesEnabled: Boolean(secret && stripePriceId("pro", "monthly")),
    checkoutReady: Boolean(secret && stripePriceId("pro", "monthly")),
    portalReady: Boolean(secret && subscription.providerCustomerId),
    subscription: {
      id: subscription.id,
      status: subscription.status,
      interval: subscription.billingInterval,
      provider: subscription.provider,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    },
    plan: plan
      ? {
          key: plan.key,
          name: plan.name,
          maxWebsites: plan.maxWebsites,
          maxScansPerMonth: plan.maxScansPerMonth,
        }
      : null,
    invoices: invoiceRows,
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session.isAuthenticated || !session.userId || !session.orgId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const [user, organization] = await Promise.all([
    resolveLocalUser(session.userId),
    resolveLocalOrganization(session.orgId),
  ]);
  const membership = user && organization ? await resolveActiveMembership(organization.id, user.id) : null;
  if (!user || !organization || !membership) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  const operatorError = requireOperatorRole(membership.roleName);
  if (operatorError) return operatorError;

  const parsed = z
    .object({
      action: z.enum(["checkout", "portal"]),
      interval: z.enum(["monthly", "yearly"]).default("monthly"),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: "Invalid billing request" }, { status: 400 });
  }

  const secret = stripeSecretKey();
  if (!secret) {
    return NextResponse.json(
      {
        success: false,
        message: "Card checkout is disabled until STRIPE_SECRET_KEY is configured. Internal entitlements still apply.",
      },
      { status: 501 },
    );
  }

  const origin = new URL(request.url).origin;
  const subscription = await ensureOrganizationSubscription(organization.id);

  if (parsed.data.action === "portal") {
    if (!subscription.providerCustomerId) {
      return NextResponse.json(
        { success: false, message: "No Stripe customer exists yet. Complete checkout first." },
        { status: 400 },
      );
    }
    const portal = await stripeFormPost<{ url: string }>("billing_portal/sessions", {
      customer: subscription.providerCustomerId,
      return_url: `${origin}/dashboard/settings/organization`,
    });
    return NextResponse.json({ success: true, url: portal.url });
  }

  const priceId = stripePriceId("pro", parsed.data.interval);
  if (!priceId) {
    return NextResponse.json(
      {
        success: false,
        message: `Stripe price is missing. Set STRIPE_PRICE_PRO_${parsed.data.interval === "yearly" ? "YEARLY" : "MONTHLY"}.`,
      },
      { status: 501 },
    );
  }
  await ensureProPlan();
  const checkout = await stripeFormPost<{ id: string; url: string }>("checkout/sessions", {
    mode: "subscription",
    success_url: `${origin}/dashboard/settings/organization?billing=success`,
    cancel_url: `${origin}/dashboard/settings/organization?billing=cancel`,
    client_reference_id: organization.id,
    "metadata[organizationId]": organization.id,
    "metadata[planKey]": "pro",
    "metadata[interval]": parsed.data.interval,
    "subscription_data[metadata][organizationId]": organization.id,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    ...(subscription.providerCustomerId ? { customer: subscription.providerCustomerId } : {}),
  });
  return NextResponse.json({ success: true, url: checkout.url, checkoutId: checkout.id });
}
