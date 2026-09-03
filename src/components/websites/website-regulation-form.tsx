"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
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
}: {
  websiteId: string;
  policies: PolicyOption[];
  defaultRegulationKey: string | null;
  integrations: ConsentIntegrations;
  rules: JurisdictionRuleRow[];
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const [error, setError] = useState("");
  const [regulation, setRegulation] = useState(defaultRegulationKey ?? "");
  const [googleEnabled, setGoogleEnabled] = useState(integrations.googleConsentMode.enabled);
  const [tcfEnabled, setTcfEnabled] = useState(integrations.iabTcf.enabled);
  const [gppEnabled, setGppEnabled] = useState(integrations.iabGpp.enabled);
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
              iabTcf: { enabled: tcfEnabled },
              iabGpp: { enabled: gppEnabled },
            },
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
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <Card>
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Default regulation</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Operational profile used when no more specific jurisdiction rule matches. This is not a legal certification.
          </p>
        </div>
        <CardContent className="space-y-3">
          <select className="field-input" value={regulation} onChange={(event) => setRegulation(event.target.value)}>
            <option value="">Not configured</option>
            {REGULATION_CATALOG.map((profile) => (
              <option key={profile.key} value={profile.key}>
                {profile.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Status: {regulation ? <Badge variant="success">Configured</Badge> : <Badge variant="neutral">Not configured</Badge>}
          </p>
        </CardContent>
      </Card>

      <Card>
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Jurisdiction rules</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Precedence: matching state/region, then country, then the website default policy. Country codes are ISO 3166-1 alpha-2.
          </p>
        </div>
        <CardContent className="space-y-3">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-500">No overrides. The default active policy is used.</p>
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
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">External consent signals</h2>
          <p className="mt-0.5 text-sm text-slate-500">
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
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              IAB TCF
              <span className="ml-2">
                {tcfEnabled ? <Badge variant="warning">Foundation</Badge> : <Badge variant="neutral">Disabled</Badge>}
              </span>
              <span className="mt-1 block text-xs text-slate-500">Ping/stub only. No TC string and no CMP ID.</span>
            </span>
            <input type="checkbox" checked={tcfEnabled} onChange={(event) => setTcfEnabled(event.target.checked)} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              IAB GPP
              <span className="ml-2">
                {gppEnabled ? <Badge variant="warning">Foundation</Badge> : <Badge variant="neutral">Disabled</Badge>}
              </span>
              <span className="mt-1 block text-xs text-slate-500">Ping/stub only. No GPP string encoding.</span>
            </span>
            <input type="checkbox" checked={gppEnabled} onChange={(event) => setGppEnabled(event.target.checked)} />
          </label>
        </CardContent>
      </Card>

      <Button type="submit" loading={pending}>
        Save regulation settings
      </Button>
    </form>
  );
}
