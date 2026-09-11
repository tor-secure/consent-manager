"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { Alert } from "@/components/ui/alert";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import type { RegulationKey } from "@/lib/regulations/catalog";
import { REGULATION_CATALOG } from "@/lib/regulations/catalog";
import type { ConsentIntegrations } from "@/lib/signals/consent-integrations";

type PolicyOption = { id: string; name: string; status: string; isDefault: boolean };

type JurisdictionRuleRow = {
  countryCode: string;
  regionCode: string;
  policyId: string;
  regulationKey: string;
};

export function WebsiteRegulationForm({
  websiteId,
  policies,
  defaultRegulationKey,
  integrations,
  rules,
  iabReadiness,
  iabRegistration,
}: {
  websiteId: string;
  policies: PolicyOption[];
  defaultRegulationKey: string | null;
  integrations: ConsentIntegrations;
  rules: JurisdictionRuleRow[];
  iabReadiness: { registered: boolean; gvlVersion: number | null };
  iabRegistration: { cmpId?: number | null; cmpVersion?: number | null } | null;
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const [error, setError] = useState("");
  const [regulation, setRegulation] = useState(defaultRegulationKey ?? "");
  const [googleEnabled, setGoogleEnabled] = useState(integrations.googleConsentMode.enabled);
  const [tcfEnabled, setTcfEnabled] = useState(integrations.iabTcf.enabled);
  const [gppEnabled, setGppEnabled] = useState(integrations.iabGpp.enabled);
  const [purposeMappings, setPurposeMappings] = useState(JSON.stringify(integrations.iabTcf.purposeMappings, null, 2));
  const [vendorMappings, setVendorMappings] = useState(JSON.stringify(integrations.iabTcf.vendorMappings, null, 2));
  const [gppSections, setGppSections] = useState(integrations.iabGpp.sectionIds.join(","));
  const [cmpId, setCmpId] = useState(iabRegistration?.cmpId?.toString() ?? "");
  const [cmpVersion, setCmpVersion] = useState(iabRegistration?.cmpVersion?.toString() ?? "");
  const [unknownTrackerBehavior, setUnknownTrackerBehavior] = useState(
    integrations.trackerEnforcement.unknownTrackerBehavior,
  );
  const [enforcementDebug, setEnforcementDebug] = useState(
    integrations.trackerEnforcement.debugMode,
  );
  const [rows, setRows] = useState<JurisdictionRuleRow[]>(
    rules.length
      ? rules
      : [],
  );

  function addRow() {
    setRows((current) => [
      ...current,
      {
        countryCode: "US",
        regionCode: "",
        policyId: policies.find((policy) => policy.isDefault)?.id ?? policies[0]?.id ?? "",
        regulationKey: (regulation || "gdpr") as RegulationKey,
      },
    ]);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    let parsedPurposeMappings: Record<string, number>;
    let parsedVendorMappings: Record<string, number>;
    try {
      parsedPurposeMappings = JSON.parse(purposeMappings || "{}");
      parsedVendorMappings = JSON.parse(vendorMappings || "{}");
    } catch {
      setError("IAB mappings must be valid JSON objects.");
      return;
    }
    const sectionIds = gppSections.split(",").map((value) => Number(value.trim())).filter(Number.isInteger);
    await run(async () => {
      setError("");
      const integrationsResult = await dashboardFetch(
        `/api/websites/${websiteId}/consent-integrations`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            defaultRegulationKey: regulation || null,
            integrations: {
              googleConsentMode: { ...integrations.googleConsentMode, enabled: googleEnabled },
              iabTcf: { enabled: tcfEnabled, purposeMappings: parsedPurposeMappings, vendorMappings: parsedVendorMappings },
              iabGpp: { enabled: gppEnabled, sectionIds },
              trackerEnforcement: {
                unknownTrackerBehavior,
                debugMode: enforcementDebug,
              },
            },
            iabRegistration: cmpId || cmpVersion
              ? { cmpId: Number(cmpId), cmpVersion: Number(cmpVersion) }
              : null,
          }),
        },
        { successMessage: "Regulation and signals saved", errorFallback: "Unable to save regulation settings.", onValidation: setError },
      );
      if (!integrationsResult.ok) return;
      const rulesResult = await dashboardFetch(
        `/api/websites/${websiteId}/jurisdiction-rules`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rules: rows.filter((row) => row.policyId && row.countryCode) }),
        },
        { successMessage: "Jurisdiction rules saved", errorFallback: "Unable to save jurisdiction rules.", onValidation: setError },
      );
      if (!rulesResult.ok) return;
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {error ? <Alert variant="error" role="alert">{error}</Alert> : null}

      <Card>
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Default regulation</h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Operational profile used when no more specific jurisdiction rule matches. This is not a legal certification.
          </p>
        </div>
        <CardContent className="space-y-3">
          <Field label="Fallback legal profile" htmlFor="default-regulation" hint="Used only when no country or region override matches.">
          <Select id="default-regulation" value={regulation} onChange={(event) => setRegulation(event.target.value)}>
            <option value="">Not configured</option>
            {REGULATION_CATALOG.map((profile) => (
              <option key={profile.key} value={profile.key}>
                {profile.label}
              </option>
            ))}
          </Select>
          </Field>
          <p className="text-xs text-[var(--muted-foreground)]">
            Status: {regulation ? <Badge variant="success">Configured</Badge> : <Badge variant="neutral">Not configured</Badge>}
          </p>
        </CardContent>
      </Card>

      <Card>
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Tracker enforcement</h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Controls dynamically inserted third-party resources that do not match the tracker registry.
          </p>
        </div>
        <CardContent className="space-y-4">
          <Field
            label="Unknown tracker behavior"
            htmlFor="unknown-tracker-behavior"
            hint="BLOCK is recommended for strict configurations. Same-origin application resources are not treated as trackers without a registry match."
          >
            <Select
              id="unknown-tracker-behavior"
              value={unknownTrackerBehavior}
              onChange={(event) =>
                setUnknownTrackerBehavior(
                  event.target.value as "BLOCK" | "ALLOW" | "WARN",
                )
              }
            >
              <option value="BLOCK">Block unknown third-party resources</option>
              <option value="WARN">Allow and record a warning</option>
              <option value="ALLOW">Allow unknown third-party resources</option>
            </Select>
          </Field>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Developer diagnostics
              <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                Keeps a capped in-browser enforcement log without query strings or payloads.
              </span>
            </span>
            <input
              type="checkbox"
              checked={enforcementDebug}
              onChange={(event) => setEnforcementDebug(event.target.checked)}
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">Jurisdiction rules</h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Precedence: matching state/region, then country, then the website default policy. Country codes are ISO 3166-1 alpha-2.
          </p>
        </div>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No jurisdiction overrides. Visitors use the default active policy and fallback legal profile.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((row, index) => (
                <div key={`${row.countryCode}-${row.regionCode}-${index}`} className="grid gap-2 sm:grid-cols-5">
                  <input
                    className="field-input"
                    value={row.countryCode}
                    maxLength={2}
                    aria-label="Country"
                    onChange={(event) => {
                      const value = event.target.value.toUpperCase();
                      setRows((current) => current.map((item, i) => (i === index ? { ...item, countryCode: value } : item)));
                    }}
                  />
                  <input
                    className="field-input"
                    value={row.regionCode}
                    placeholder="State (optional)"
                    maxLength={16}
                    aria-label="Region"
                    onChange={(event) => {
                      const value = event.target.value.toUpperCase();
                      setRows((current) => current.map((item, i) => (i === index ? { ...item, regionCode: value } : item)));
                    }}
                  />
                  <select
                    className="field-input sm:col-span-1"
                    value={row.policyId}
                    aria-label="Policy"
                    onChange={(event) => {
                      const value = event.target.value;
                      setRows((current) => current.map((item, i) => (i === index ? { ...item, policyId: value } : item)));
                    }}
                  >
                    {policies.map((policy) => (
                      <option key={policy.id} value={policy.id}>
                        {policy.name} {policy.isDefault ? "(default)" : ""} {policy.status !== "active" ? `(${policy.status})` : ""}
                      </option>
                    ))}
                  </select>
                  <select
                    className="field-input"
                    value={row.regulationKey}
                    aria-label="Regulation"
                    onChange={(event) => {
                      const value = event.target.value;
                      setRows((current) => current.map((item, i) => (i === index ? { ...item, regulationKey: value } : item)));
                    }}
                  >
                    {REGULATION_CATALOG.map((profile) => (
                      <option key={profile.key} value={profile.key}>
                        {profile.label}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="ghost" onClick={() => setRows((current) => current.filter((_, i) => i !== index))}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" onClick={addRow} disabled={policies.length === 0}>
            Add jurisdiction rule
          </Button>
        </CardContent>
      </Card>

      <Card>
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--foreground)]">External consent signals</h2>
          <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">
            Internal consent remains the source of truth. Signals are published after visitor choices.
          </p>
        </div>
        <CardContent className="space-y-4">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Google Consent Mode
              <span className="ml-2">
                {googleEnabled ? <Badge variant="success">Enabled</Badge> : <Badge variant="neutral">Disabled</Badge>}
              </span>
            </span>
            <input type="checkbox" checked={googleEnabled} onChange={(event) => setGoogleEnabled(event.target.checked)} />
          </label>
          {tcfEnabled && !(iabReadiness.registered && iabReadiness.gvlVersion) ? (
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]">
              IAB TCF is enabled but production strings stay blocked. This app is not IAB-certified.
              Set a registered CMP ID, sync the official GVL, and complete purpose/vendor mappings before treating TCF output as live.
            </div>
          ) : null}
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              IAB TCF
              <span className="ml-2">
                {tcfEnabled
                  ? iabReadiness.registered && iabReadiness.gvlVersion
                    ? <Badge variant="warning">Mapping required</Badge>
                    : <Badge variant="warning">Blocked</Badge>
                  : <Badge variant="neutral">Disabled</Badge>}
              </span>
              <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                CMP registration {iabReadiness.registered ? "configured" : "missing"} · GVL {iabReadiness.gvlVersion ?? "not synced"}.
                Production strings are blocked until registration, GVL, and complete mappings exist.
              </span>
            </span>
            <input type="checkbox" checked={tcfEnabled} onChange={(event) => setTcfEnabled(event.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              IAB GPP
              <span className="ml-2">
                {gppEnabled ? <Badge variant="warning">Foundation</Badge> : <Badge variant="neutral">Disabled</Badge>}
              </span>
              <span className="mt-1 block text-xs text-[var(--muted-foreground)]">GPP 1.1 sections are encoded only when applicable to the resolved legal profile.</span>
            </span>
            <input type="checkbox" checked={gppEnabled} onChange={(event) => setGppEnabled(event.target.checked)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[var(--secondary-foreground)]">
              Registered CMP ID (or use IAB_CMP_ID)
              <input className="field-input mt-1" inputMode="numeric" value={cmpId} onChange={(event) => setCmpId(event.target.value)} />
            </label>
            <label className="text-sm text-[var(--secondary-foreground)]">
              CMP implementation version (or use IAB_CMP_VERSION)
              <input className="field-input mt-1" inputMode="numeric" value={cmpVersion} onChange={(event) => setCmpVersion(event.target.value)} />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-[var(--secondary-foreground)]">
              TCF purpose mappings (entity ID → IAB purpose ID)
              <textarea className="field-input mt-1 min-h-28 font-mono text-xs" value={purposeMappings} onChange={(event) => setPurposeMappings(event.target.value)} />
            </label>
            <label className="text-sm text-[var(--secondary-foreground)]">
              TCF vendor mappings (entity ID → GVL vendor ID)
              <textarea className="field-input mt-1 min-h-28 font-mono text-xs" value={vendorMappings} onChange={(event) => setVendorMappings(event.target.value)} />
            </label>
          </div>
          <label className="block text-sm text-[var(--secondary-foreground)]">
            Allowed GPP section IDs (comma-separated; blank means all legally applicable)
            <input className="field-input mt-1" value={gppSections} onChange={(event) => setGppSections(event.target.value)} placeholder="2, 7, 8" />
          </label>
        </CardContent>
      </Card>

      <Button type="submit" loading={pending}>
        Save regulation settings
      </Button>
    </form>
  );
}
