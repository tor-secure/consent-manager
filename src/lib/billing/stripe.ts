import { createHmac, timingSafeEqual } from "node:crypto";

export const PRO_PLAN_KEY = "pro";

export type StripeBillingAction = "checkout" | "portal";

export function stripeSecretKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim() || "";
  return key.startsWith("sk_") ? key : null;
}

export function stripeWebhookSecret(): string | null {
  const key = process.env.STRIPE_WEBHOOK_SECRET?.trim() || "";
  return key.startsWith("whsec_") ? key : null;
}

export function stripePriceId(planKey: string, interval: "monthly" | "yearly"): string | null {
  if (planKey !== PRO_PLAN_KEY) return null;
  const envKey = interval === "yearly" ? "STRIPE_PRICE_PRO_YEARLY" : "STRIPE_PRICE_PRO_MONTHLY";
  const value = process.env[envKey]?.trim() || "";
  return value.startsWith("price_") ? value : null;
}

export function planKeyForStripePrice(priceId: string): { planKey: string; interval: "monthly" | "yearly" } | null {
  const monthly = process.env.STRIPE_PRICE_PRO_MONTHLY?.trim();
  const yearly = process.env.STRIPE_PRICE_PRO_YEARLY?.trim();
  if (monthly && priceId === monthly) return { planKey: PRO_PLAN_KEY, interval: "monthly" };
  if (yearly && priceId === yearly) return { planKey: PRO_PLAN_KEY, interval: "yearly" };
  return null;
}

export function verifyStripeSignature(input: {
  payload: string;
  header: string | null;
  secret: string;
  toleranceSeconds?: number;
}): boolean {
  if (!input.header) return false;
  const items = input.header.split(",").map((part) => part.trim());
  const timestamp = items.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = items.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestamp || signatures.length === 0) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const tolerance = input.toleranceSeconds ?? 300;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > tolerance) return false;
  const expected = createHmac("sha256", input.secret).update(`${timestamp}.${input.payload}`).digest("hex");
  return signatures.some((signature) => safeEqualHex(expected, signature));
}

function safeEqualHex(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    if (a.length !== b.length || a.length === 0) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function stripeFormPost<T>(path: string, params: Record<string, string>): Promise<T> {
  const secret = stripeSecretKey();
  if (!secret) throw new Error("Stripe is not configured");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(params),
  });
  const json = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(json.error?.message || "Stripe request failed");
  }
  return json;
}
