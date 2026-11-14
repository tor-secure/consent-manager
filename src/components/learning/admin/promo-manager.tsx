"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ShieldLoader } from "@/components/ui/shield-loader";

type Promo = {
  id: string;
  kind: string;
  code: string;
  label: string;
  discountPercent: number;
  maxRedemptions: number | null;
  redemptionCount: number;
  active: boolean;
  expiresAt: string | Date | null;
  note: string | null;
  createdAt: string | Date;
};

export function PromoManager({
  kind,
  initialItems,
}: {
  kind: "voucher" | "coupon";
  initialItems: Promo[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [label, setLabel] = useState("");
  const [discountPercent, setDiscountPercent] = useState(kind === "coupon" ? 20 : 100);
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [createdCode, setCreatedCode] = useState("");

  const title = kind === "voucher" ? "Vouchers" : "Coupons";
  const prefix = kind === "voucher" ? "CGLV-" : "CGLC-";

  async function createPromo(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    setCreatedCode("");
    try {
      const response = await fetch("/api/elearning-admin/promos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          kind,
          label,
          discountPercent: kind === "coupon" ? discountPercent : 100,
          maxRedemptions: maxRedemptions ? Number(maxRedemptions) : null,
          expiresAt: expiresAt || null,
          note: note || null,
        }),
      });
      const body = (await response.json().catch(() => null)) as { item?: Promo; message?: string } | null;
      if (!response.ok || !body?.item) {
        setError(body?.message ?? "Could not create code.");
        return;
      }
      setItems((current) => [body.item!, ...current]);
      setCreatedCode(body.item.code);
      setLabel("");
      setNote("");
      setMaxRedemptions("");
      setExpiresAt("");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    const response = await fetch("/api/elearning-admin/promos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ id, active }),
    });
    if (!response.ok) return;
    const body = (await response.json()) as { item?: Promo };
    if (!body.item) return;
    setItems((current) => current.map((item) => (item.id === id ? body.item! : item)));
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e4eeec] bg-white p-5 shadow-[0_14px_36px_-30px_rgba(11,44,74,0.35)] sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#00A88F]">Create {kind}</p>
        <h1 className="mt-1 text-xl font-bold tracking-tight text-[#0B2C4A] sm:text-2xl">{title}</h1>
        <p className="mt-2 text-sm text-[#4d6570]">
          New codes use the format <span className="font-semibold text-[#0B2C4A]">{prefix}RANDOM</span>.
        </p>
        <form onSubmit={createPromo} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold">Label</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={kind === "voucher" ? "Launch partner access" : "Early bird 20%"}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#D1D5DB] px-3 text-sm outline-none focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/15"
            />
          </label>
          {kind === "coupon" ? (
            <label className="block">
              <span className="text-sm font-semibold">Discount %</span>
              <input
                type="number"
                min={1}
                max={100}
                value={discountPercent}
                onChange={(event) => setDiscountPercent(Number(event.target.value))}
                className="mt-1.5 h-11 w-full rounded-xl border border-[#D1D5DB] px-3 text-sm outline-none focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/15"
              />
            </label>
          ) : (
            <div className="rounded-xl border border-[#E6F9F5] bg-[#E6F9F5]/50 px-3 py-3 text-sm text-[#0B2C4A]">
              Vouchers grant <strong>100%</strong> course access value.
            </div>
          )}
          <label className="block">
            <span className="text-sm font-semibold">Max redemptions</span>
            <input
              type="number"
              min={1}
              value={maxRedemptions}
              onChange={(event) => setMaxRedemptions(event.target.value)}
              placeholder="Unlimited"
              className="mt-1.5 h-11 w-full rounded-xl border border-[#D1D5DB] px-3 text-sm outline-none focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/15"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Expires</span>
            <input
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#D1D5DB] px-3 text-sm outline-none focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/15"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-semibold">Note</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-[#D1D5DB] px-3 text-sm outline-none focus:border-[#0B2C4A] focus:ring-2 focus:ring-[#0B2C4A]/15"
            />
          </label>
          {error ? (
            <p role="alert" className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          ) : null}
          {createdCode ? (
            <p className="sm:col-span-2 rounded-lg border border-[#bfe9e0] bg-[#E6F9F5] px-3 py-2 text-sm font-semibold text-[#0B2C4A]">
              Created {createdCode}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0B2C4A] px-5 text-sm font-semibold text-white hover:bg-[#123d63] disabled:opacity-60 sm:col-span-2 sm:w-fit"
          >
            {pending ? (
              <>
                <ShieldLoader />
                Creating…
              </>
            ) : (
              `Generate ${kind} code`
            )}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <div className="rounded-2xl border border-[#e4eeec] bg-white px-4 py-4 shadow-[0_14px_36px_-30px_rgba(11,44,74,0.35)] sm:px-5">
          <h2 className="text-base font-semibold sm:text-lg">Issued {title.toLowerCase()}</h2>
        </div>

        <div className="space-y-3 md:hidden">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-[#e4eeec] bg-white px-4 py-8 text-center text-sm text-[#4d6570]">
              No {kind}s yet.
            </div>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-[#e4eeec] bg-white p-4 shadow-[0_14px_36px_-30px_rgba(11,44,74,0.35)]"
              >
                <p className="break-all font-mono text-xs font-semibold text-[#0B2C4A]">{item.code}</p>
                <p className="mt-2 text-sm font-semibold text-[#0B2C4A]">{item.label || "—"}</p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4d6570]">
                      Discount
                    </dt>
                    <dd className="mt-1">{item.discountPercent}%</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4d6570]">
                      Uses
                    </dt>
                    <dd className="mt-1 tabular-nums">
                      {item.redemptionCount}
                      {item.maxRedemptions != null ? ` / ${item.maxRedemptions}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4d6570]">
                      Status
                    </dt>
                    <dd className="mt-1">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                          item.active ? "bg-[#E6F9F5] text-[#0B2C4A]" : "bg-[#f3f7f6] text-[#8aa0a8]"
                        }`}
                      >
                        {item.active ? "Active" : "Off"}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#4d6570]">
                      Action
                    </dt>
                    <dd className="mt-1">
                      <button
                        type="button"
                        onClick={() => void toggleActive(item.id, !item.active)}
                        className="text-sm font-semibold text-[#0B2C4A] underline-offset-2 hover:underline"
                      >
                        {item.active ? "Disable" : "Enable"}
                      </button>
                    </dd>
                  </div>
                </dl>
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-[#e4eeec] bg-white shadow-[0_14px_36px_-30px_rgba(11,44,74,0.35)] md:block">
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full text-left text-sm">
              <thead className="bg-[#f7fbfa] text-[11px] font-bold uppercase tracking-[0.12em] text-[#4d6570]">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Discount</th>
                  <th className="px-4 py-3">Uses</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[#4d6570]">
                      No {kind}s yet.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="border-t border-[#eef4f3]">
                      <td className="px-4 py-3 font-mono text-xs font-semibold">{item.code}</td>
                      <td className="px-4 py-3">{item.label || "—"}</td>
                      <td className="px-4 py-3">{item.discountPercent}%</td>
                      <td className="px-4 py-3 tabular-nums">
                        {item.redemptionCount}
                        {item.maxRedemptions != null ? ` / ${item.maxRedemptions}` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
                            item.active ? "bg-[#E6F9F5] text-[#0B2C4A]" : "bg-[#f3f7f6] text-[#8aa0a8]"
                          }`}
                        >
                          {item.active ? "Active" : "Off"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => void toggleActive(item.id, !item.active)}
                          className="text-sm font-semibold text-[#0B2C4A] underline-offset-2 hover:underline"
                        >
                          {item.active ? "Disable" : "Enable"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
