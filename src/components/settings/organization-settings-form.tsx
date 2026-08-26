"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type OrgSettingsData = {
  name: string;
  description: string | null;
  logoUrl: string | null;
  timezone: string;
  defaultLanguage: string;
  defaultRegion: string | null;
  onboardingCompleted: boolean;
};

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
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

export function OrganizationSettingsForm({
  initial,
  readOnly,
}: {
  initial: OrgSettingsData;
  readOnly?: boolean;
}) {
  const router = useRouter();

  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [timezone, setTimezone] = useState(initial.timezone);
  const [defaultLanguage, setDefaultLanguage] = useState(initial.defaultLanguage);
  const [defaultRegion, setDefaultRegion] = useState(initial.defaultRegion ?? "");
  const [onboardingCompleted, setOnboardingCompleted] = useState(
    initial.onboardingCompleted,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (readOnly) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/settings/organization", {
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
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to save settings");
      }

      setSuccess(data.message === "No changes to save" ? "No changes to save." : "Settings saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10 disabled:bg-neutral-50 disabled:text-neutral-400";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {readOnly && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You need Owner or Admin role to edit organization settings.
        </div>
      )}

      {/* General */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">General</h2>

        <div className="space-y-5">
          <Field label="Organization name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              disabled={readOnly}
              className={inputClass}
            />
          </Field>

          <Field
            label="Description"
            hint="A short description visible to your team."
          >
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              disabled={readOnly}
              className={inputClass}
            />
          </Field>

          <Field
            label="Logo URL"
            hint="Direct link to your organization logo (HTTPS recommended)."
          >
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              disabled={readOnly}
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      {/* Locale */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">
          Locale &amp; region
        </h2>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Timezone">
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={readOnly}
              className={inputClass}
            >
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
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value)}
              disabled={readOnly}
              className={inputClass}
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="kn">Kannada</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
              <option value="pt">Portuguese</option>
              <option value="nl">Dutch</option>
              <option value="it">Italian</option>
              <option value="pl">Polish</option>
            </select>
          </Field>

          <Field label="Default region">
            <select
              value={defaultRegion}
              onChange={(e) => setDefaultRegion(e.target.value)}
              disabled={readOnly}
              className={inputClass}
            >
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
      </div>

      {/* Onboarding */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-3 text-base font-semibold text-neutral-900">
          Onboarding
        </h2>

        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={onboardingCompleted}
            onChange={(e) => setOnboardingCompleted(e.target.checked)}
            disabled={readOnly}
            className="h-4 w-4 rounded border-neutral-300"
          />
          <span className="text-sm text-neutral-700">
            Mark onboarding as completed
          </span>
        </label>
      </div>

      {/* Feedback */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Actions */}
      {!readOnly && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
        </div>
      )}
    </form>
  );
}
