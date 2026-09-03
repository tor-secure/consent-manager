"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { LocaleSelectOptions } from "@/components/i18n/locale-select-options";

export type OrgSettingsData = {
  name: string;
  description: string | null;
  logoUrl: string | null;
  timezone: string;
  defaultLanguage: string;
  defaultRegion: string | null;
  onboardingCompleted: boolean;
  // DPDP Rule 3(1)(d)
  dpoName: string | null;
  dpoEmail: string | null;
  grievanceOfficerName: string | null;
  grievanceOfficerEmail: string | null;
  grievancePortalUrl: string | null;
};

// ---------------------------------------------------------------------------
// Shared field wrapper
// ---------------------------------------------------------------------------

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrganizationSettingsForm
// ---------------------------------------------------------------------------

export function OrganizationSettingsForm({
  initial,
  readOnly,
}: {
  initial: OrgSettingsData;
  readOnly?: boolean;
}) {
  const router = useRouter();

  const [name, setName]                         = useState(initial.name);
  const [description, setDescription]           = useState(initial.description ?? "");
  const [logoUrl, setLogoUrl]                   = useState(initial.logoUrl ?? "");
  const [timezone, setTimezone]                 = useState(initial.timezone);
  const [defaultLanguage, setDefaultLanguage]   = useState(initial.defaultLanguage);
  const [defaultRegion, setDefaultRegion]       = useState(initial.defaultRegion ?? "");
  const [onboardingCompleted, setOnboarding]    = useState(initial.onboardingCompleted);
  // DPDP Rule 3(1)(d)
  const [dpoName, setDpoName]                           = useState(initial.dpoName ?? "");
  const [dpoEmail, setDpoEmail]                         = useState(initial.dpoEmail ?? "");
  const [grievanceOfficerName, setGrievanceName]        = useState(initial.grievanceOfficerName ?? "");
  const [grievanceOfficerEmail, setGrievanceEmail]      = useState(initial.grievanceOfficerEmail ?? "");
  const [grievancePortalUrl, setGrievancePortalUrl]     = useState(initial.grievancePortalUrl ?? "");
  const { pending: saving, run } = useAsyncAction();
  const [error, setError]                       = useState("");

  const inputCls = [
    "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none",
    "focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition",
    "disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed",
  ].join(" ");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (readOnly) return;
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        "/api/settings/organization",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            description: description.trim() || null,
            logoUrl: logoUrl.trim() || null,
            timezone,
            defaultLanguage,
            defaultRegion: defaultRegion || null,
            onboardingCompleted,
            dpoName:               dpoName.trim()               || "",
            dpoEmail:              dpoEmail.trim()              || "",
            grievanceOfficerName:  grievanceOfficerName.trim()  || "",
            grievanceOfficerEmail: grievanceOfficerEmail.trim() || "",
            grievancePortalUrl:    grievancePortalUrl.trim()    || "",
          }),
        },
        {
          successMessage: "Organization settings saved successfully",
          errorFallback: "Unable to save organization settings. Please try again.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Read-only notice */}
      {readOnly && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" d="M8 2l6 12H2z" />
            <path strokeLinecap="round" d="M8 7v3M8 12h.01" />
          </svg>
          You need Owner or Admin role to edit organisation settings.
        </div>
      )}

      {/* ── General ─────────────────────────────────────────────────────── */}
      <Card>
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">General</h2>
        </div>
        <div className="space-y-5 p-6">
          <Field label="Organisation name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              disabled={readOnly}
              className={inputCls}
            />
          </Field>

          <Field label="Description" hint="A short description visible to your team.">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              disabled={readOnly}
              className={inputCls}
            />
          </Field>

          <Field
            label="Logo URL"
            hint="Direct link to your organisation logo (HTTPS recommended)."
          >
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              disabled={readOnly}
              className={inputCls}
            />
          </Field>
        </div>
      </Card>

      {/* ── Locale ──────────────────────────────────────────────────────── */}
      <Card>
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Locale &amp; region</h2>
        </div>
        <div className="grid gap-5 p-6 sm:grid-cols-3">
          <Field label="Timezone">
            <select value={timezone} onChange={(e) => setTimezone(e.target.value)}
              disabled={readOnly} className={inputCls}>
              <option value="UTC">UTC</option>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Europe/London">Europe/London (GMT/BST)</option>
              <option value="Europe/Paris">Europe/Paris (CET)</option>
              <option value="Europe/Berlin">Europe/Berlin (CET)</option>
              <option value="America/New_York">America/New_York (ET)</option>
              <option value="America/Chicago">America/Chicago (CT)</option>
              <option value="America/Denver">America/Denver (MT)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
            </select>
          </Field>

          <Field label="Default language">
            <select value={defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)}
              disabled={readOnly} className={inputCls}>
              <LocaleSelectOptions includeCurrent={defaultLanguage} />
            </select>
          </Field>

          <Field label="Default region">
            <select value={defaultRegion} onChange={(e) => setDefaultRegion(e.target.value)}
              disabled={readOnly} className={inputCls}>
              <option value="">— None —</option>
              <option value="IN">India</option>
              <option value="EU">European Union</option>
              <option value="US">United States</option>
              <option value="UK">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="CA">Canada</option>
              <option value="SG">Singapore</option>
              <option value="AE">UAE</option>
            </select>
          </Field>
        </div>
      </Card>

      {/* ── DPO & Grievance Officer (DPDP Rule 3(1)(d)) ────────────────── */}
      <Card>
        <div className="border-b border-slate-100 px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold text-slate-900">
              Data Protection &amp; Grievance Officer
            </h2>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-500/20">
              DPDP Rules 2025 Rule 3(1)(d)
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Contact details shown in the consent notice. Required for DPDP compliance.
          </p>
        </div>
        <div className="space-y-5 p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="DPO name" hint="Data Protection Officer full name.">
              <input
                value={dpoName}
                onChange={(e) => setDpoName(e.target.value)}
                maxLength={255}
                placeholder="Jane Smith"
                disabled={readOnly}
                className={inputCls}
              />
            </Field>
            <Field label="DPO email" hint="Official DPO contact email.">
              <input
                type="email"
                value={dpoEmail}
                onChange={(e) => setDpoEmail(e.target.value)}
                maxLength={320}
                placeholder="dpo@example.com"
                disabled={readOnly}
                className={inputCls}
              />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Grievance Officer name">
              <input
                value={grievanceOfficerName}
                onChange={(e) => setGrievanceName(e.target.value)}
                maxLength={255}
                placeholder="Rahul Sharma"
                disabled={readOnly}
                className={inputCls}
              />
            </Field>
            <Field label="Grievance Officer email">
              <input
                type="email"
                value={grievanceOfficerEmail}
                onChange={(e) => setGrievanceEmail(e.target.value)}
                maxLength={320}
                placeholder="grievance@example.com"
                disabled={readOnly}
                className={inputCls}
              />
            </Field>
          </div>
          <Field
            label="Grievance portal URL"
            hint="Link to your public grievance submission form or portal (optional)."
          >
            <input
              type="url"
              value={grievancePortalUrl}
              onChange={(e) => setGrievancePortalUrl(e.target.value)}
              maxLength={2048}
              placeholder="https://example.com/grievance"
              disabled={readOnly}
              className={inputCls}
            />
          </Field>
        </div>
      </Card>

      {/* ── Onboarding ──────────────────────────────────────────────────── */}
      <Card>
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Onboarding</h2>
        </div>
        <div className="px-6 py-5">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={onboardingCompleted}
              onChange={(e) => setOnboarding(e.target.checked)}
              disabled={readOnly}
              className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
            />
            <span className="text-sm text-slate-700">Mark onboarding as completed</span>
          </label>
        </div>
      </Card>

      {/* ── Feedback ────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <svg className="h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 16 16"
            stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="8" cy="8" r="6" />
            <path strokeLinecap="round" d="M8 5v3M8 11h.01" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      {!readOnly && (
        <div className="flex items-center gap-3">
          <Button type="submit" loading={saving}>
            {saving ? "Saving..." : "Save settings"}
          </Button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  );
}
