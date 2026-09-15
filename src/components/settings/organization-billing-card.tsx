"use client";

import { useEffect, useState } from "react";

type BillingPayload = {
  provider: string;
  chargesEnabled: boolean;
  checkoutReady?: boolean;
  portalReady?: boolean;
  plan?: { name: string; maxWebsites: number | null; maxScansPerMonth?: number | null } | null;
  subscription?: { status: string; cancelAtPeriodEnd?: boolean } | null;
};

export function OrganizationBillingCard() {
  const [data, setData] = useState<BillingPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/billing")
      .then((response) => response.json())
      .then((payload) => {
        if (payload?.success) setData(payload);
      })
      .catch(() => undefined);
  }, []);

  async function start(action: "checkout" | "portal") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, interval: "monthly" }),
      });
      const body = (await response.json()) as { success?: boolean; message?: string; url?: string };
      if (!body.success || !body.url) throw new Error(body.message || "Billing request failed");
      window.location.assign(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  if (!data) return null;
  return (
    <div className="rounded-2xl border border-[var(--border)] p-4 text-sm">
      <p className="font-medium text-[var(--foreground)]">Billing</p>
      <p className="mt-1 text-[var(--muted-foreground)]">
        Plan {data.plan?.name ?? "Starter"} · status {data.subscription?.status ?? "unknown"} ·
        website cap {data.plan?.maxWebsites ?? "n/a"}
        {data.plan?.maxScansPerMonth != null ? ` · scans/month ${data.plan.maxScansPerMonth}` : ""}.
      </p>
      {data.subscription?.cancelAtPeriodEnd ? (
        <p className="mt-1 text-xs text-[var(--warning)]">Cancellation is scheduled at period end.</p>
      ) : null}
      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
        {data.checkoutReady
          ? "Stripe checkout is configured. Completing payment updates this organization through the Stripe webhook."
          : "Internal entitlements only. Card checkout stays disabled until STRIPE_SECRET_KEY and STRIPE_PRICE_PRO_MONTHLY are set. No fake payment success."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-primary btn-sm" disabled={busy || !data.checkoutReady} onClick={() => void start("checkout")}>
          Upgrade to Pro
        </button>
        <button type="button" className="btn btn-outline btn-sm" disabled={busy || !data.portalReady} onClick={() => void start("portal")}>
          Manage billing
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
