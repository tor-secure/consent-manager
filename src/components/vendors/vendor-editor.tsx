"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { notify } from "@/components/feedback/notify";
import { VENDOR_ROLES, DPA_STATUSES, DOWNSTREAM_DSAR_MODES } from "@/lib/processing/types";

export type VendorEditorModel = {
  id: string;
  name: string;
  key: string;
  legalName: string | null;
  domain: string | null;
  websiteUrl: string | null;
  privacyPolicyUrl: string | null;
  country: string | null;
  description: string | null;
  role: string;
  processingCountries: string[] | null;
  dpaStatus: string;
  dpaEffectiveAt: Date | string | null;
  dpaReviewAt: Date | string | null;
  dpaReference: string | null;
  downstreamDsarMode: string;
  ccpaSale: string;
  ccpaShare: string;
  ccpaSensitivePi: string;
  status: string;
};

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15";

function isoDate(value: Date | string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function VendorEditor({ vendor }: { vendor: VendorEditorModel }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(vendor.name);
  const [legalName, setLegalName] = useState(vendor.legalName ?? "");
  const [domain, setDomain] = useState(vendor.domain ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(vendor.websiteUrl ?? "");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState(vendor.privacyPolicyUrl ?? "");
  const [country, setCountry] = useState(vendor.country ?? "");
  const [description, setDescription] = useState(vendor.description ?? "");
  const [role, setRole] = useState(vendor.role);
  const [processingCountries, setProcessingCountries] = useState(
    Array.isArray(vendor.processingCountries) ? vendor.processingCountries.join(", ") : "",
  );
  const [dpaStatus, setDpaStatus] = useState(vendor.dpaStatus);
  const [dpaEffectiveAt, setDpaEffectiveAt] = useState(isoDate(vendor.dpaEffectiveAt));
  const [dpaReviewAt, setDpaReviewAt] = useState(isoDate(vendor.dpaReviewAt));
  const [dpaReference, setDpaReference] = useState(vendor.dpaReference ?? "");
  const [downstreamDsarMode, setDownstreamDsarMode] = useState(vendor.downstreamDsarMode);
  const [ccpaSale, setCcpaSale] = useState(vendor.ccpaSale ?? "unknown");
  const [ccpaShare, setCcpaShare] = useState(vendor.ccpaShare ?? "unknown");
  const [ccpaSensitivePi, setCcpaSensitivePi] = useState(vendor.ccpaSensitivePi ?? "unknown");
  const [status, setStatus] = useState(vendor.status === "archived" ? "archived" : vendor.status);

  async function save(extra: Record<string, unknown> = {}) {
    const res = await fetch(`/api/vendors/${vendor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        legalName: legalName.trim() || null,
        domain: domain.trim() || null,
        websiteUrl: websiteUrl.trim() || null,
        privacyPolicyUrl: privacyPolicyUrl.trim() || null,
        country: country.trim() || null,
        description: description.trim() || null,
        role,
        processingCountries: processingCountries.split(",").map((item) => item.trim()).filter(Boolean),
        dpaStatus,
        dpaEffectiveAt: dpaEffectiveAt || null,
        dpaReviewAt: dpaReviewAt || null,
        dpaReference: dpaReference.trim() || null,
        downstreamDsarMode,
        ccpaSale,
        ccpaShare,
        ccpaSensitivePi,
        status,
        ...extra,
      }),
    });
    const data = await res.json() as { success: boolean; message?: string };
    if (!data.success) {
      notify.error(data.message ?? "Unable to update vendor");
      return;
    }
    notify.success("Vendor updated. Live changes do not rewrite published policy snapshots.");
    router.refresh();
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(() => save());
      }}
    >
      <section className="rounded-2xl border border-slate-200 bg-white p-6 card-shadow space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Identity and role</h2>
        {role === "unknown" ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            This vendor still has role unknown. Set a real role (for example independent controller) and save before you publish a policy that uses it.
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
          <Field label="Legal name"><input className={inputCls} value={legalName} onChange={(e) => setLegalName(e.target.value)} /></Field>
          <Field label="Role" hint="Required before publishing a policy that references this vendor. Unknown blocks publish.">
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} required>
              {VENDOR_ROLES.filter((item) => item !== "unknown" || role === "unknown").map((item) => (
                <option key={item} value={item}>{item.replaceAll("_", " ")}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Key"><input className={inputCls} value={vendor.key} disabled /></Field>
          <Field label="Country / HQ"><input className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)} placeholder="DE" /></Field>
        </div>
        <Field label="Processing countries" hint="Comma-separated ISO codes.">
          <input className={inputCls} value={processingCountries} onChange={(e) => setProcessingCountries(e.target.value)} placeholder="DE, US" />
        </Field>
        <Field label="Description">
          <textarea className={`${inputCls} h-24 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 card-shadow space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Public URLs</h2>
        <Field label="Domain"><input className={inputCls} value={domain} onChange={(e) => setDomain(e.target.value)} /></Field>
        <Field label="Website URL"><input className={inputCls} value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} /></Field>
        <Field label="Privacy policy URL"><input className={inputCls} value={privacyPolicyUrl} onChange={(e) => setPrivacyPolicyUrl(e.target.value)} /></Field>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 card-shadow space-y-4">
        <h2 className="text-base font-semibold text-slate-900">DPA and downstream DSAR</h2>
        <p className="text-xs text-slate-500">Recording a DPA status here is not proof that a DPA exists or is legally sufficient.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="DPA status">
            <select className={inputCls} value={dpaStatus} onChange={(e) => setDpaStatus(e.target.value)}>
              {DPA_STATUSES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </select>
          </Field>
          <Field label="DPA reference"><input className={inputCls} value={dpaReference} onChange={(e) => setDpaReference(e.target.value)} /></Field>
          <Field label="DPA effective"><input type="date" className={inputCls} value={dpaEffectiveAt} onChange={(e) => setDpaEffectiveAt(e.target.value)} /></Field>
          <Field label="DPA review"><input type="date" className={inputCls} value={dpaReviewAt} onChange={(e) => setDpaReviewAt(e.target.value)} /></Field>
          <Field label="Downstream DSAR tracking">
            <select className={inputCls} value={downstreamDsarMode} onChange={(e) => setDownstreamDsarMode(e.target.value)}>
              {DOWNSTREAM_DSAR_MODES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
            </select>
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 card-shadow space-y-4">
        <h2 className="text-base font-semibold text-slate-900">California sale / sharing</h2>
        <p className="text-xs text-slate-500">
          Classify whether this vendor participates in sale, sharing, or sensitive PI processing. Unknown is not treated as a sale.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Sale">
            <select className={inputCls} value={ccpaSale} onChange={(e) => setCcpaSale(e.target.value)}>
              <option value="unknown">Unknown</option>
              <option value="applicable">Applicable</option>
              <option value="not_applicable">Not applicable</option>
            </select>
          </Field>
          <Field label="Sharing">
            <select className={inputCls} value={ccpaShare} onChange={(e) => setCcpaShare(e.target.value)}>
              <option value="unknown">Unknown</option>
              <option value="applicable">Applicable</option>
              <option value="not_applicable">Not applicable</option>
            </select>
          </Field>
          <Field label="Sensitive PI">
            <select className={inputCls} value={ccpaSensitivePi} onChange={(e) => setCcpaSensitivePi(e.target.value)}>
              <option value="unknown">Unknown</option>
              <option value="applicable">Applicable</option>
              <option value="not_applicable">Not applicable</option>
            </select>
          </Field>
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>Save vendor</Button>
        {vendor.status !== "archived" && (
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(() => save({ action: "archive", status: "archived" }))}
          >
            Archive
          </Button>
        )}
      </div>
    </form>
  );
}
