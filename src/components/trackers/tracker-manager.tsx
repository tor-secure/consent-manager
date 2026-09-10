"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { ESSENTIAL_CONFIRMATION_TEXT } from "@/lib/trackers/management";

export type ManagedTracker = {
  id: string;
  websiteId: string;
  name: string;
  type: string;
  domain: string | null;
  identifier: string | null;
  status: string;
  isEssential: boolean;
  category: string | null;
  party: string;
  description: string | null;
  vendorId: string | null;
  purposeId: string | null;
  vendorName: string | null;
  purposeName: string | null;
  cookieNames: string[];
  storageTypes: string[];
  localStorageKeys: string[];
  sessionStorageKeys: string[];
  scriptUrlPatterns: string[];
  iframeUrlPatterns: string[];
  pixelUrlPatterns: string[];
  duration: string | null;
  deletionBehavior: string | null;
  ccpaSale?: string | null;
  ccpaShare?: string | null;
  ccpaSensitivePi?: string | null;
  scannerClassification: string;
  updatedAt: string | Date;
  websiteName?: string;
  websiteDomain?: string;
};

export type UnmappedTracker = {
  id: string;
  name: string;
  type: string;
  domain: string | null;
  identifier: string | null;
  websiteId: string;
  websiteName: string;
  recommendedAction: string | null;
  detectionCount: number;
  firstDetected: string | Date | null;
  lastDetected: string | Date | null;
  pages: string[];
};

type Option = { id: string; name: string };

const emptyForm = {
  websiteId: "",
  name: "",
  description: "",
  type: "script",
  vendorId: "",
  purposeId: "",
  category: "",
  isEssential: false,
  enabled: true,
  domain: "",
  scriptUrlPatterns: "",
  iframeUrlPatterns: "",
  pixelUrlPatterns: "",
  cookieNames: "",
  storageTypes: "cookie",
  storageKeys: "",
  party: "third-party",
  duration: "",
  deletionBehavior: "",
  ccpaSale: "unknown",
  ccpaShare: "unknown",
  ccpaSensitivePi: "unknown",
  confirmEssential: false,
};

function fmt(value: string | Date | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function listText(values: string[] | undefined) {
  return (values ?? []).join("\n");
}

export function TrackerManager({
  trackers,
  unmapped,
  websites,
  vendors,
  purposes,
}: {
  trackers: ManagedTracker[];
  unmapped: UnmappedTracker[];
  websites: Option[];
  vendors: Option[];
  purposes: Option[];
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<"none" | "create" | "edit" | "details">("none");
  const [selected, setSelected] = useState<ManagedTracker | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [policyNotice, setPolicyNotice] = useState("");
  const [essentialPrompt, setEssentialPrompt] = useState<ManagedTracker | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trackers.filter((tracker) => {
      if (tracker.status === "archived") return q !== "" && tracker.name.toLowerCase().includes(q);
      if (!q) return true;
      return [
        tracker.name,
        tracker.vendorName,
        tracker.purposeName,
        tracker.domain,
        tracker.category,
      ].some((value) => String(value ?? "").toLowerCase().includes(q));
    });
  }, [query, trackers]);

  function openCreate() {
    setError("");
    setPolicyNotice("");
    setForm({ ...emptyForm, websiteId: websites[0]?.id ?? "" });
    setSelected(null);
    setPanel("create");
  }

  function openEdit(tracker: ManagedTracker) {
    setError("");
    setPolicyNotice("");
    setSelected(tracker);
    setForm({
      websiteId: tracker.websiteId,
      name: tracker.name,
      description: tracker.description ?? "",
      type: tracker.type,
      vendorId: tracker.vendorId ?? "",
      purposeId: tracker.purposeId ?? "",
      category: tracker.category ?? "",
      isEssential: tracker.isEssential,
      enabled: tracker.status === "active",
      domain: tracker.domain ?? "",
      scriptUrlPatterns: listText(tracker.scriptUrlPatterns),
      iframeUrlPatterns: listText(tracker.iframeUrlPatterns),
      pixelUrlPatterns: listText(tracker.pixelUrlPatterns),
      cookieNames: listText(tracker.cookieNames),
      storageTypes: tracker.storageTypes.join(",") || "cookie",
      storageKeys: listText([...(tracker.localStorageKeys ?? []), ...(tracker.sessionStorageKeys ?? [])]),
      party: tracker.party || "unknown",
      duration: tracker.duration ?? "",
      deletionBehavior: tracker.deletionBehavior ?? "",
      ccpaSale: tracker.ccpaSale ?? "unknown",
      ccpaShare: tracker.ccpaShare ?? "unknown",
      ccpaSensitivePi: tracker.ccpaSensitivePi ?? "unknown",
      confirmEssential: false,
    });
    setPanel("edit");
  }

  function payload() {
    return {
      websiteId: form.websiteId,
      name: form.name,
      description: form.description,
      type: form.type,
      vendorId: form.vendorId || null,
      purposeId: form.purposeId || null,
      category: form.category,
      isEssential: form.isEssential,
      enabled: form.enabled,
      domain: form.domain,
      scriptUrlPatterns: form.scriptUrlPatterns,
      iframeUrlPatterns: form.iframeUrlPatterns,
      pixelUrlPatterns: form.pixelUrlPatterns,
      cookieNames: form.cookieNames,
      storageTypes: form.storageTypes,
      storageKeys: form.storageKeys,
      party: form.party,
      duration: form.duration,
      deletionBehavior: form.deletionBehavior,
      ccpaSale: form.ccpaSale,
      ccpaShare: form.ccpaShare,
      ccpaSensitivePi: form.ccpaSensitivePi,
      confirmEssential: form.confirmEssential,
    };
  }

  async function save() {
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        panel === "create" ? "/api/trackers" : `/api/trackers/${selected?.id}`,
        {
          method: panel === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload()),
        },
        {
          successMessage: panel === "create" ? "Tracker created" : "Tracker updated",
          errorFallback: "Unable to save tracker.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      const data = result.data as { policyImpact?: { message?: string | null } };
      setPolicyNotice(data.policyImpact?.message ?? "");
      setPanel("none");
      router.refresh();
    });
  }

  async function classify(tracker: ManagedTracker, classification: string, confirmEssential = false) {
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        `/api/trackers/${tracker.id}/classify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ classification, confirmEssential }),
        },
        {
          successMessage:
            classification === "ignore"
              ? "Hidden from scanner reporting"
              : classification === "essential"
                ? "Marked essential"
                : classification === "disable"
                  ? "Tracker disabled"
                  : "Tracker updated",
          errorFallback: "Unable to update tracker.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      setEssentialPrompt(null);
      router.refresh();
    });
  }

  async function archive(tracker: ManagedTracker) {
    await run(async () => {
      const result = await dashboardFetch(
        `/api/trackers/${tracker.id}`,
        { method: "DELETE" },
        { successMessage: "Tracker archived", errorFallback: "Unable to archive tracker.", onValidation: setError },
      );
      if (!result.ok) return;
      setPanel("none");
      router.refresh();
    });
  }

  async function mapUnmapped(trackerId: string, purposeId: string, vendorId: string) {
    await run(async () => {
      const result = await dashboardFetch(
        `/api/trackers/${trackerId}/map`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ purposeId: purposeId || null, vendorId: vendorId || null }),
        },
        { successMessage: "Tracker mapped", errorFallback: "Unable to map tracker.", onValidation: setError },
      );
      if (!result.ok) return;
      const data = result.data as { policyImpact?: { message?: string | null } };
      setPolicyNotice(data.policyImpact?.message ?? "");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error ? <Alert variant="error" role="alert">{error}</Alert> : null}
      {policyNotice ? <Alert variant="warning">{policyNotice}</Alert> : null}

      {unmapped.length > 0 && (
        <Card>
          <div className="border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-base font-semibold">Unmapped trackers</h2>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
              Detected resources without a vendor and purpose. Ignore hides them from this list; it does not allow execution.
            </p>
          </div>
          <CardContent className="space-y-4">
            {unmapped.map((item) => (
              <UnmappedRow
                key={item.id}
                item={item}
                vendors={vendors}
                purposes={purposes}
                pending={pending}
                onMap={mapUnmapped}
                onIgnore={() => {
                  const tracker = trackers.find((row) => row.id === item.id);
                  if (tracker) void classify(tracker, "ignore");
                }}
                onEssential={() => {
                  const tracker = trackers.find((row) => row.id === item.id);
                  if (tracker) setEssentialPrompt(tracker);
                }}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search tracker, vendor, purpose, or domain"
          className="max-w-sm"
        />
        <Button type="button" onClick={openCreate} disabled={websites.length === 0}>
          Add Tracker
        </Button>
      </div>

      <Card>
        <div className="table-scroll scrollbar-thin">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {["Tracker", "Vendor", "Purpose", "Category", "Essential", "Status", "Domains", "Last Updated", "Actions"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                    No trackers to manage yet.
                  </td>
                </tr>
              ) : visible.map((tracker) => (
                <tr key={tracker.id} className="align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{tracker.name}</p>
                    <p className="text-xs capitalize text-slate-400">{tracker.type}</p>
                  </td>
                  <td className="px-4 py-3">{tracker.vendorName ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3">{tracker.purposeName ?? <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3 capitalize">{tracker.category ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={tracker.isEssential ? "success" : "neutral"} size="sm">
                      {tracker.isEssential ? "Yes" : "No"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={tracker.status === "active" ? "success" : tracker.status === "disabled" ? "warning" : "neutral"}
                      size="sm"
                      className="capitalize"
                    >
                      {tracker.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-slate-500">{tracker.domain || tracker.identifier || "—"}</code>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmt(tracker.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button type="button" size="sm" variant="outline" onClick={() => { setSelected(tracker); setPanel("details"); }}>
                        View Details
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => openEdit(tracker)}>
                        Edit
                      </Button>
                      {tracker.status === "active" ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => void classify(tracker, "disable")}>
                          Disable
                        </Button>
                      ) : tracker.status !== "archived" ? (
                        <Button type="button" size="sm" variant="ghost" onClick={() => void classify(tracker, "enable")}>
                          Enable
                        </Button>
                      ) : null}
                      {tracker.status !== "archived" ? (
                        <Button type="button" size="sm" variant="danger" onClick={() => void archive(tracker)}>
                          Delete
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {panel !== "none" && (
        <Card>
          <div className="border-b border-[var(--border)] px-6 py-4">
            <h2 className="text-base font-semibold">
              {panel === "create" ? "Add tracker" : panel === "edit" ? "Edit tracker" : selected?.name}
            </h2>
          </div>
          <CardContent>
            {panel === "details" && selected ? (
              <div className="space-y-3 text-sm">
                <p><span className="text-slate-500">Vendor:</span> {selected.vendorName ?? "Unmapped"}</p>
                <p><span className="text-slate-500">Purpose:</span> {selected.purposeName ?? "Unmapped"}</p>
                <p><span className="text-slate-500">Enforcement:</span> {selected.isEssential ? "Allowed without optional consent" : selected.purposeName ? `Blocked until ${selected.purposeName} consent` : "Blocked until mapped and consented"}</p>
                <p><span className="text-slate-500">Cookies:</span> {selected.cookieNames.join(", ") || "—"}</p>
                <p><span className="text-slate-500">Script patterns:</span> {selected.scriptUrlPatterns.join(", ") || "—"}</p>
                <p><span className="text-slate-500">Iframe patterns:</span> {selected.iframeUrlPatterns.join(", ") || "—"}</p>
                <p><span className="text-slate-500">Pixel patterns:</span> {selected.pixelUrlPatterns.join(", ") || "—"}</p>
                <p><span className="text-slate-500">Deletion:</span> {selected.deletionBehavior || "—"}</p>
                <Button type="button" variant="outline" onClick={() => setPanel("none")}>Close</Button>
              </div>
            ) : (
              <TrackerForm
                form={form}
                setForm={setForm}
                websites={websites}
                vendors={vendors}
                purposes={purposes}
                pending={pending}
                onCancel={() => setPanel("none")}
                onSave={() => void save()}
              />
            )}
          </CardContent>
        </Card>
      )}

      {essentialPrompt && (
        <Alert variant="warning" role="alert">
          <p className="font-medium">Confirm essential classification for {essentialPrompt.name}</p>
          <p className="mt-1">{ESSENTIAL_CONFIRMATION_TEXT}</p>
          <div className="mt-3 flex gap-2">
            <Button type="button" onClick={() => void classify(essentialPrompt, "essential", true)} loading={pending}>
              Confirm essential
            </Button>
            <Button type="button" variant="outline" onClick={() => setEssentialPrompt(null)}>
              Cancel
            </Button>
          </div>
        </Alert>
      )}
    </div>
  );
}

function UnmappedRow({
  item,
  vendors,
  purposes,
  pending,
  onMap,
  onIgnore,
  onEssential,
}: {
  item: UnmappedTracker;
  vendors: Option[];
  purposes: Option[];
  pending: boolean;
  onMap: (id: string, purposeId: string, vendorId: string) => Promise<void>;
  onIgnore: () => void;
  onEssential: () => void;
}) {
  const [vendorId, setVendorId] = useState("");
  const [purposeId, setPurposeId] = useState("");
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-medium text-slate-900">{item.name}</p>
          <p className="text-xs text-slate-500">
            {item.type} · {item.domain || item.identifier || "unknown"} · {item.detectionCount} detection{item.detectionCount === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            First {fmt(item.firstDetected)} · Last {fmt(item.lastDetected)}
            {item.pages[0] ? ` · ${item.pages[0]}` : ""}
          </p>
          <p className="mt-1 text-xs text-amber-700">{item.recommendedAction}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:w-[420px]">
          <Select value={vendorId} onChange={(event) => setVendorId(event.target.value)}>
            <option value="">Vendor</option>
            {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
          </Select>
          <Select value={purposeId} onChange={(event) => setPurposeId(event.target.value)}>
            <option value="">Purpose</option>
            {purposes.map((purpose) => <option key={purpose.id} value={purpose.id}>{purpose.name}</option>)}
          </Select>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void onMap(item.id, purposeId, vendorId)} disabled={pending || (!purposeId && !vendorId)}>
          Map Tracker
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onIgnore} disabled={pending}>
          Ignore
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onEssential} disabled={pending}>
          Mark Essential
        </Button>
      </div>
    </div>
  );
}

function TrackerForm({
  form,
  setForm,
  websites,
  vendors,
  purposes,
  pending,
  onCancel,
  onSave,
}: {
  form: typeof emptyForm;
  setForm: (value: typeof emptyForm) => void;
  websites: Option[];
  vendors: Option[];
  purposes: Option[];
  pending: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  function update<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm({ ...form, [key]: value });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Website" htmlFor="tracker-website">
          <Select id="tracker-website" value={form.websiteId} onChange={(event) => update("websiteId", event.target.value)}>
            {websites.map((site) => <option key={site.id} value={site.id}>{site.name}</option>)}
          </Select>
        </Field>
        <Field label="Name" htmlFor="tracker-name">
          <Input id="tracker-name" value={form.name} onChange={(event) => update("name", event.target.value)} />
        </Field>
        <Field label="Vendor" htmlFor="tracker-vendor" hint="Must come from the vendor registry.">
          <Select id="tracker-vendor" value={form.vendorId} onChange={(event) => update("vendorId", event.target.value)}>
            <option value="">Unmapped</option>
            {vendors.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
          </Select>
        </Field>
        <Field label="Purpose" htmlFor="tracker-purpose">
          <Select id="tracker-purpose" value={form.purposeId} onChange={(event) => update("purposeId", event.target.value)}>
            <option value="">Unmapped</option>
            {purposes.map((purpose) => <option key={purpose.id} value={purpose.id}>{purpose.name}</option>)}
          </Select>
        </Field>
        <Field label="Category" htmlFor="tracker-category">
          <Input id="tracker-category" value={form.category} onChange={(event) => update("category", event.target.value)} />
        </Field>
        <Field label="Type" htmlFor="tracker-type">
          <Select id="tracker-type" value={form.type} onChange={(event) => update("type", event.target.value)}>
            {["script", "pixel", "iframe", "cookie", "storage", "beacon", "other"].map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Description" htmlFor="tracker-description">
        <Textarea id="tracker-description" value={form.description} onChange={(event) => update("description", event.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Script URL / domain pattern" htmlFor="tracker-scripts">
          <Textarea id="tracker-scripts" value={form.scriptUrlPatterns} onChange={(event) => update("scriptUrlPatterns", event.target.value)} />
        </Field>
        <Field label="Iframe URL / domain pattern" htmlFor="tracker-iframes">
          <Textarea id="tracker-iframes" value={form.iframeUrlPatterns} onChange={(event) => update("iframeUrlPatterns", event.target.value)} />
        </Field>
        <Field label="Pixel URL / domain pattern" htmlFor="tracker-pixels">
          <Textarea id="tracker-pixels" value={form.pixelUrlPatterns} onChange={(event) => update("pixelUrlPatterns", event.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Cookie names" htmlFor="tracker-cookies">
          <Textarea id="tracker-cookies" value={form.cookieNames} onChange={(event) => update("cookieNames", event.target.value)} />
        </Field>
        <Field label="Storage keys" htmlFor="tracker-storage-keys">
          <Textarea id="tracker-storage-keys" value={form.storageKeys} onChange={(event) => update("storageKeys", event.target.value)} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Storage type" htmlFor="tracker-storage-type">
          <Input id="tracker-storage-type" value={form.storageTypes} onChange={(event) => update("storageTypes", event.target.value)} />
        </Field>
        <Field label="First / third party" htmlFor="tracker-party">
          <Select id="tracker-party" value={form.party} onChange={(event) => update("party", event.target.value)}>
            <option value="third-party">Third-party</option>
            <option value="first-party">First-party</option>
            <option value="unknown">Unknown</option>
          </Select>
        </Field>
        <Field label="Duration" htmlFor="tracker-duration">
          <Input id="tracker-duration" value={form.duration} onChange={(event) => update("duration", event.target.value)} />
        </Field>
      </div>
      <Field label="Deletion behavior" htmlFor="tracker-deletion">
        <Textarea id="tracker-deletion" value={form.deletionBehavior} onChange={(event) => update("deletionBehavior", event.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="California sale" htmlFor="tracker-ccpa-sale">
          <Select id="tracker-ccpa-sale" value={form.ccpaSale} onChange={(event) => update("ccpaSale", event.target.value)}>
            <option value="unknown">Unknown</option>
            <option value="applicable">Applicable</option>
            <option value="not_applicable">Not applicable</option>
          </Select>
        </Field>
        <Field label="California sharing" htmlFor="tracker-ccpa-share">
          <Select id="tracker-ccpa-share" value={form.ccpaShare} onChange={(event) => update("ccpaShare", event.target.value)}>
            <option value="unknown">Unknown</option>
            <option value="applicable">Applicable</option>
            <option value="not_applicable">Not applicable</option>
          </Select>
        </Field>
        <Field label="California sensitive PI" htmlFor="tracker-ccpa-spi">
          <Select id="tracker-ccpa-spi" value={form.ccpaSensitivePi} onChange={(event) => update("ccpaSensitivePi", event.target.value)}>
            <option value="unknown">Unknown</option>
            <option value="applicable">Applicable</option>
            <option value="not_applicable">Not applicable</option>
          </Select>
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.enabled} onChange={(event) => update("enabled", event.target.checked)} />
        Enabled
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={form.isEssential} onChange={(event) => update("isEssential", event.target.checked)} />
        <span>
          Essential
          <span className="mt-1 block text-xs text-[var(--muted-foreground)]">{ESSENTIAL_CONFIRMATION_TEXT}</span>
        </span>
      </label>
      {form.isEssential ? (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.confirmEssential} onChange={(event) => update("confirmEssential", event.target.checked)} />
          I confirm this tracker is necessary for the relevant service
        </label>
      ) : null}
      <div className="flex gap-2">
        <Button type="button" onClick={onSave} loading={pending}>Save tracker</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
