"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { notify } from "@/components/feedback/notify";
import { TRANSFER_MECHANISMS, VENDOR_ROLES } from "@/lib/processing/types";

const inputCls =
  "h-10 w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 text-sm text-[var(--foreground)] outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20";

export function TransferForm({
  vendors,
  websites,
}: {
  vendors: Array<{ id: string; name: string }>;
  websites: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? "");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [destinationRegion, setDestinationRegion] = useState("");
  const [mechanism, setMechanism] = useState("not_configured");
  const [safeguards, setSafeguards] = useState("");
  const [sourceCountry, setSourceCountry] = useState("");
  const [transferPurpose, setTransferPurpose] = useState("");

  return (
    <form
      className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 card-shadow"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const res = await fetch("/api/transfers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vendorId,
              websiteId: websiteId || null,
              sourceCountry: sourceCountry || null,
              destinationCountry: destinationCountry || null,
              destinationRegion: destinationRegion || null,
              mechanism,
              safeguards: safeguards || null,
              transferPurpose: transferPurpose || null,
            }),
          });
          const data = await res.json() as { success: boolean; message?: string };
          if (!data.success) {
            notify.error(data.message ?? "Unable to create transfer");
            return;
          }
          notify.success("Transfer recorded. This is inventory metadata, not a legal adequacy decision.");
          router.refresh();
        });
      }}
    >
      <h2 className="text-base font-semibold text-[var(--foreground)]">Add transfer record</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Vendor
          <select className={`${inputCls} mt-1`} value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
            {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
          </select>
        </label>
        <label className="text-sm">Website
          <select className={`${inputCls} mt-1`} value={websiteId} onChange={(e) => setWebsiteId(e.target.value)}>
            <option value="">Organization-wide</option>
            {websites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
        </label>
        <label className="text-sm">Source country
          <input className={`${inputCls} mt-1`} value={sourceCountry} onChange={(e) => setSourceCountry(e.target.value)} placeholder="DE" />
        </label>
        <label className="text-sm">Destination country
          <input className={`${inputCls} mt-1`} value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} placeholder="US" />
        </label>
        <label className="text-sm">Destination region
          <input className={`${inputCls} mt-1`} value={destinationRegion} onChange={(e) => setDestinationRegion(e.target.value)} placeholder="US" />
        </label>
        <label className="text-sm">Mechanism
          <select className={`${inputCls} mt-1`} value={mechanism} onChange={(e) => setMechanism(e.target.value)}>
            {TRANSFER_MECHANISMS.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </label>
      </div>
      <label className="text-sm">Transfer purpose
        <input className={`${inputCls} mt-1`} value={transferPurpose} onChange={(e) => setTransferPurpose(e.target.value)} />
      </label>
      <label className="text-sm">Safeguards
        <textarea className={`${inputCls} mt-1 h-24 py-2`} value={safeguards} onChange={(e) => setSafeguards(e.target.value)} />
      </label>
      <Button type="submit" disabled={pending || !vendorId}>Save transfer</Button>
    </form>
  );
}

export function ProcessingActivityForm({
  vendors,
  websites,
  purposes,
}: {
  vendors: Array<{ id: string; name: string }>;
  websites: Array<{ id: string; name: string }>;
  purposes: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [vendorId, setVendorId] = useState(vendors[0]?.id ?? "");
  const [websiteId, setWebsiteId] = useState(websites[0]?.id ?? "");
  const [purposeId, setPurposeId] = useState(purposes[0]?.id ?? "");
  const [dataCategories, setDataCategories] = useState("");
  const [processingRole, setProcessingRole] = useState("processor");
  const [transferRequired, setTransferRequired] = useState(false);
  const [processingLocation, setProcessingLocation] = useState("");
  const [description, setDescription] = useState("");
  const [ccpaSale, setCcpaSale] = useState("unknown");
  const [ccpaShare, setCcpaShare] = useState("unknown");
  const [ccpaSensitivePi, setCcpaSensitivePi] = useState("unknown");

  return (
    <form
      className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 card-shadow"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => {
          const res = await fetch("/api/processing-activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vendorId,
              websiteId: websiteId || null,
              purposeId: purposeId || null,
              dataCategories: dataCategories.split(",").map((item) => item.trim()).filter(Boolean),
              processingRole,
              transferRequired,
              processingLocation: processingLocation || null,
              description: description || null,
              ccpaSale,
              ccpaShare,
              ccpaSensitivePi,
            }),
          });
          const data = await res.json() as { success: boolean; message?: string };
          if (!data.success) {
            notify.error(data.message ?? "Unable to create activity");
            return;
          }
          notify.success("Processing activity saved");
          router.refresh();
        });
      }}
    >
      <h2 className="text-base font-semibold text-[var(--foreground)]">Add processing activity</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Vendor
          <select className={`${inputCls} mt-1`} value={vendorId} onChange={(e) => setVendorId(e.target.value)} required>
            {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
          </select>
        </label>
        <label className="text-sm">Website
          <select className={`${inputCls} mt-1`} value={websiteId} onChange={(e) => setWebsiteId(e.target.value)}>
            <option value="">Organization-wide</option>
            {websites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </select>
        </label>
        <label className="text-sm">Purpose
          <select className={`${inputCls} mt-1`} value={purposeId} onChange={(e) => setPurposeId(e.target.value)}>
            <option value="">Select purpose</option>
            {purposes.map((purpose) => <option key={purpose.id} value={purpose.id}>{purpose.name}</option>)}
          </select>
        </label>
        <label className="text-sm">Processing role
          <select className={`${inputCls} mt-1`} value={processingRole} onChange={(e) => setProcessingRole(e.target.value)}>
            {VENDOR_ROLES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
          </select>
        </label>
      </div>
      <label className="text-sm">Data categories
        <input className={`${inputCls} mt-1`} value={dataCategories} onChange={(e) => setDataCategories(e.target.value)} placeholder="Usage data, Device data" />
      </label>
      <label className="text-sm">Processing location
        <input className={`${inputCls} mt-1`} value={processingLocation} onChange={(e) => setProcessingLocation(e.target.value)} />
      </label>
      <Checkbox
        checked={transferRequired}
        onChange={(e) => setTransferRequired(e.target.checked)}
        className="text-sm"
      >
        Transfer required
      </Checkbox>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm">California sale
          <select className={`${inputCls} mt-1`} value={ccpaSale} onChange={(e) => setCcpaSale(e.target.value)}>
            <option value="unknown">Unknown</option>
            <option value="applicable">Applicable</option>
            <option value="not_applicable">Not applicable</option>
          </select>
        </label>
        <label className="text-sm">California sharing
          <select className={`${inputCls} mt-1`} value={ccpaShare} onChange={(e) => setCcpaShare(e.target.value)}>
            <option value="unknown">Unknown</option>
            <option value="applicable">Applicable</option>
            <option value="not_applicable">Not applicable</option>
          </select>
        </label>
        <label className="text-sm">California sensitive PI
          <select className={`${inputCls} mt-1`} value={ccpaSensitivePi} onChange={(e) => setCcpaSensitivePi(e.target.value)}>
            <option value="unknown">Unknown</option>
            <option value="applicable">Applicable</option>
            <option value="not_applicable">Not applicable</option>
          </select>
        </label>
      </div>
      <label className="text-sm">Description
        <textarea className={`${inputCls} mt-1 h-20 py-2`} value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <Button type="submit" disabled={pending || !vendorId}>Save activity</Button>
    </form>
  );
}
