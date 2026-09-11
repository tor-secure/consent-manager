"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FormCard } from "@/components/ui/field";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";

export type RetentionFormData = {
  consentEvidenceRetentionDays: number;
  consentEvidenceRetentionEnabled: boolean;
  consentRecordRetentionDays: number;
  consentRecordRetentionEnabled: boolean;
  auditLogRetentionDays: number;
  auditLogRetentionEnabled: boolean;
  rightsRequestRetentionDays: number;
  rightsRequestRetentionEnabled: boolean;
};

export type LegalHoldRow = {
  id: string;
  resourceType: string;
  resourceId: string;
  reason: string;
  status: string;
  createdAt: string;
  releasedAt: string | null;
};

function NumberField({
  id,
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        type="number"
        min={30}
        max={7300}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm shadow-sm outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20 disabled:bg-[var(--muted)]"
      />
    </Field>
  );
}

function ToggleField({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-[var(--foreground)]">
      <input
        id={id}
        type="checkbox"
        disabled={disabled}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

export function DataRetentionPanel({
  initial,
  holds,
  canEdit,
}: {
  initial: RetentionFormData;
  holds: LegalHoldRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { pending, run } = useAsyncAction();
  const [form, setForm] = useState(initial);
  const [holdForm, setHoldForm] = useState({
    resourceType: "consent_record",
    resourceId: "",
    reason: "",
  });
  const [selectedHold, setSelectedHold] = useState<LegalHoldRow | null>(null);

  function update<K extends keyof RetentionFormData>(key: K, value: RetentionFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="rounded-2xl border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]">
        Historical consent evidence is immutable and independent of current consent state.
        Changing retention configuration does not rewrite existing evidence. Deleting current
        consent state does not delete historical consent evidence. Retention periods are
        configurable and should be selected based on the organization&apos;s applicable legal
        and business requirements.
      </div>

      <FormCard
        title="Historical evidence"
        description="Signed consent snapshots that prove what was shown and decided. Automated cleanup never deletes this layer."
      >
        <div className="space-y-4 p-6">
          <ToggleField
            id="evidence-enabled"
            label="Store an evidence retention period"
            checked={form.consentEvidenceRetentionEnabled}
            disabled={!canEdit}
            onChange={(value) => update("consentEvidenceRetentionEnabled", value)}
          />
          <NumberField
            id="evidence-days"
            label="Evidence retention period (days)"
            hint="Informational unless a privileged legal workflow is later authorized. Evidence is not ordinary CRUD data."
            value={form.consentEvidenceRetentionDays}
            disabled={!canEdit}
            onChange={(value) => update("consentEvidenceRetentionDays", value)}
          />
        </div>
      </FormCard>

      <FormCard
        title="Current operational data"
        description="Mutable records used for evaluation, preference center, and rights-request handling."
      >
        <div className="space-y-4 p-6">
          <ToggleField
            id="record-enabled"
            label="Automatically delete expired current consent records"
            checked={form.consentRecordRetentionEnabled}
            disabled={!canEdit}
            onChange={(value) => update("consentRecordRetentionEnabled", value)}
          />
          <NumberField
            id="record-days"
            label="Current consent retention (days)"
            hint="Deletes current-state records only. Consent events and evidence snapshots remain."
            value={form.consentRecordRetentionDays}
            disabled={!canEdit}
            onChange={(value) => update("consentRecordRetentionDays", value)}
          />
          <ToggleField
            id="audit-enabled"
            label="Automatically delete expired audit logs"
            checked={form.auditLogRetentionEnabled}
            disabled={!canEdit}
            onChange={(value) => update("auditLogRetentionEnabled", value)}
          />
          <NumberField
            id="audit-days"
            label="Audit log retention (days)"
            hint="Off by default. Enable only when the organization has chosen that operational policy."
            value={form.auditLogRetentionDays}
            disabled={!canEdit}
            onChange={(value) => update("auditLogRetentionDays", value)}
          />
          <ToggleField
            id="rights-enabled"
            label="Automatically delete expired rights requests"
            checked={form.rightsRequestRetentionEnabled}
            disabled={!canEdit}
            onChange={(value) => update("rightsRequestRetentionEnabled", value)}
          />
          <NumberField
            id="rights-days"
            label="Rights-request retention (days)"
            hint="Off by default. Does not delete linked historical consent evidence."
            value={form.rightsRequestRetentionDays}
            disabled={!canEdit}
            onChange={(value) => update("rightsRequestRetentionDays", value)}
          />
          {canEdit ? (
            <Button
              loading={pending}
              onClick={() =>
                run(async () => {
                  const result = await dashboardFetch(
                    "/api/settings/retention",
                    {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(form),
                    },
                    {
                      successMessage: "Retention settings saved",
                      errorFallback: "Failed to save retention settings",
                    },
                  );
                  if (result.ok) router.refresh();
                })
              }
            >
              Save retention settings
            </Button>
          ) : null}
        </div>
      </FormCard>

      <FormCard
        title="Legal holds"
        description="Held records are skipped by automated retention cleanup. This is not a case-management system."
      >
        <div className="space-y-4 p-6">
          {canEdit ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Resource type" htmlFor="hold-type">
                <select
                  id="hold-type"
                  value={holdForm.resourceType}
                  onChange={(event) => setHoldForm((current) => ({ ...current, resourceType: event.target.value }))}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                >
                  <option value="consent_evidence">Consent evidence</option>
                  <option value="consent_record">Current consent record</option>
                  <option value="audit_event">Audit event</option>
                  <option value="rights_request">Rights request</option>
                </select>
              </Field>
              <Field label="Resource ID" htmlFor="hold-id">
                <input
                  id="hold-id"
                  value={holdForm.resourceId}
                  onChange={(event) => setHoldForm((current) => ({ ...current, resourceId: event.target.value }))}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm font-mono"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Reason" htmlFor="hold-reason">
                  <input
                    id="hold-reason"
                    value={holdForm.reason}
                    onChange={(event) => setHoldForm((current) => ({ ...current, reason: event.target.value }))}
                    className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
                  />
                </Field>
              </div>
              <Button
                variant="secondary"
                loading={pending}
                onClick={() =>
                  run(async () => {
                    const result = await dashboardFetch(
                      "/api/settings/legal-holds",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(holdForm),
                      },
                      {
                        successMessage: "Legal hold created",
                        errorFallback: "Failed to create legal hold",
                      },
                    );
                    if (result.ok) {
                      setHoldForm({ resourceType: "consent_record", resourceId: "", reason: "" });
                      router.refresh();
                    }
                  })
                }
              >
                Create hold
              </Button>
            </div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                  <th className="py-2 pr-3 font-medium">Resource</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Reason</th>
                  <th className="py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {holds.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-[var(--muted-foreground)]">No legal holds.</td>
                  </tr>
                ) : holds.map((hold) => (
                  <tr key={hold.id} className="border-b border-[var(--border)]">
                    <td className="py-2 pr-3">
                      <div>{hold.resourceType}</div>
                      <code className="text-xs text-[var(--muted-foreground)]">{hold.resourceId}</code>
                    </td>
                    <td className="py-2 pr-3 capitalize">{hold.status}</td>
                    <td className="py-2 pr-3">{hold.reason}</td>
                    <td className="py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedHold(hold)}>
                          View
                        </Button>
                        {canEdit && hold.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            loading={pending}
                            onClick={() =>
                              run(async () => {
                                const result = await dashboardFetch(
                                  `/api/settings/legal-holds/${hold.id}`,
                                  {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ action: "release" }),
                                  },
                                  {
                                    successMessage: "Legal hold released",
                                    errorFallback: "Failed to release legal hold",
                                  },
                                );
                                if (result.ok) router.refresh();
                              })
                            }
                          >
                            Release
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {selectedHold ? (
            <div className="rounded-xl bg-[var(--muted)] p-4 text-sm">
              <p className="font-medium text-[var(--foreground)]">Hold details</p>
              <p className="mt-1 text-[var(--muted-foreground)]">Created {new Date(selectedHold.createdAt).toLocaleString()}</p>
              {selectedHold.releasedAt ? (
                <p className="text-[var(--muted-foreground)]">Released {new Date(selectedHold.releasedAt).toLocaleString()}</p>
              ) : null}
              <p className="mt-2 text-[var(--foreground)]">{selectedHold.reason}</p>
            </div>
          ) : null}
        </div>
      </FormCard>
    </div>
  );
}
