"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  defaultBannerConfig,
  type BannerConfiguration,
  type BannerPosition,
  type BannerLayout,
  type ConsentDefault,
} from "@/lib/banner-config";

// ---------------------------------------------------------------------------
// Small shared field wrapper
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
      <label className="mb-1.5 block text-sm font-medium text-neutral-700">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-neutral-300"
      />
      <span className="text-sm text-neutral-700">{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Live preview — renders a miniature banner using the current config state
// ---------------------------------------------------------------------------

function BannerPreview({ config }: { config: BannerConfiguration }) {
  const isBar = config.layout === "bar";
  const isBox = config.layout === "box";

  const radius = `${config.borderRadius}px`;

  const positionClass: Record<BannerPosition, string> = {
    bottom: "bottom-0 left-0 right-0",
    top: "top-0 left-0 right-0",
    "bottom-left": "bottom-0 left-0",
    "bottom-right": "bottom-0 right-0",
    center: "inset-0 flex items-center justify-center",
  };

  return (
    <div
      className="relative h-48 w-full overflow-hidden rounded-lg border bg-neutral-100"
      aria-label="Banner preview"
      role="img"
    >
      {/* Fake page content */}
      <div className="absolute inset-0 p-3 opacity-30">
        <div className="mb-2 h-2 w-3/4 rounded bg-neutral-400" />
        <div className="mb-1.5 h-1.5 rounded bg-neutral-300" />
        <div className="mb-1.5 h-1.5 w-5/6 rounded bg-neutral-300" />
        <div className="mb-1.5 h-1.5 w-4/5 rounded bg-neutral-300" />
      </div>

      {/* Overlay */}
      {config.overlayEnabled && (
        <div className="absolute inset-0 bg-black/30" />
      )}

      {/* Banner */}
      <div
        className={`absolute ${positionClass[config.position]} ${config.position === "center" ? "" : "p-2"}`}
        style={{ zIndex: 10 }}
      >
        <div
          style={{
            backgroundColor: config.backgroundColor,
            color: config.textColor,
            borderRadius: radius,
            border: "1px solid #e5e7eb",
            padding: isBar ? "8px 12px" : "12px",
            maxWidth: isBox || isBar ? (isBox ? "220px" : "100%") : "260px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            fontSize: "9px",
            lineHeight: 1.4,
          }}
        >
          {config.title && (
            <p style={{ fontWeight: 600, marginBottom: 3, fontSize: "10px" }}>
              {config.title}
            </p>
          )}
          {config.description && !isBar && (
            <p style={{ opacity: 0.75, marginBottom: 6, fontSize: "8px" }}>
              {config.description.slice(0, 80)}
              {config.description.length > 80 ? "…" : ""}
            </p>
          )}

          <div
            style={{
              display: "flex",
              gap: 4,
              flexWrap: "wrap",
              marginTop: isBar ? 0 : 4,
            }}
          >
            {config.showAcceptAll && (
              <span
                style={{
                  backgroundColor: config.primaryColor,
                  color: "#fff",
                  borderRadius: Math.max(2, radius === "0px" ? 2 : 4),
                  padding: "2px 6px",
                  fontSize: "8px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                {config.acceptAllLabel || "Accept all"}
              </span>
            )}
            {config.showRejectAll && (
              <span
                style={{
                  border: `1px solid ${config.primaryColor}`,
                  color: config.primaryColor,
                  borderRadius: Math.max(2, radius === "0px" ? 2 : 4),
                  padding: "2px 6px",
                  fontSize: "8px",
                  whiteSpace: "nowrap",
                }}
              >
                {config.rejectAllLabel || "Reject all"}
              </span>
            )}
            {config.showCustomize && (
              <span
                style={{
                  color: config.primaryColor,
                  fontSize: "8px",
                  textDecoration: "underline",
                  whiteSpace: "nowrap",
                }}
              >
                {config.customizeLabel || "Customize"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// BannerConfigForm — the main form component
// ---------------------------------------------------------------------------

export function BannerConfigForm({
  policyId,
  initialConfig,
  latestVersionId,
}: {
  policyId: string;
  initialConfig: BannerConfiguration;
  latestVersionId: string | null;
}) {
  const router = useRouter();
  const [config, setConfig] = useState<BannerConfiguration>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function update<K extends keyof BannerConfiguration>(
    key: K,
    value: BannerConfiguration[K],
  ) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!latestVersionId) return;
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`/api/policies/${policyId}/banner-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Failed to save");
      setSuccess("Draft saved.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setConfig(defaultBannerConfig());
    setSuccess("");
    setError("");
  }

  const inputCls =
    "w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-900/10";

  if (!latestVersionId) {
    return (
      <div className="rounded-md border border-dashed px-4 py-6 text-center">
        <p className="text-sm text-neutral-400">
          No policy version found. A version is required before configuring the banner.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      {/* ── Left: form ── */}
      <form onSubmit={handleSave} className="space-y-6">

        {/* Text */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-neutral-900">Text</h3>
          <div className="space-y-4">
            <Field label="Banner title">
              <input
                value={config.title}
                onChange={(e) => update("title", e.target.value)}
                maxLength={255}
                className={inputCls}
              />
            </Field>
            <Field label="Description">
              <textarea
                value={config.description}
                onChange={(e) => update("description", e.target.value)}
                rows={3}
                maxLength={2000}
                className={inputCls}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Accept all label">
                <input
                  value={config.acceptAllLabel}
                  onChange={(e) => update("acceptAllLabel", e.target.value)}
                  maxLength={100}
                  className={inputCls}
                />
              </Field>
              <Field label="Reject all label">
                <input
                  value={config.rejectAllLabel}
                  onChange={(e) => update("rejectAllLabel", e.target.value)}
                  maxLength={100}
                  className={inputCls}
                />
              </Field>
              <Field label="Customize label">
                <input
                  value={config.customizeLabel}
                  onChange={(e) => update("customizeLabel", e.target.value)}
                  maxLength={100}
                  className={inputCls}
                />
              </Field>
              <Field label="Save preferences label">
                <input
                  value={config.savePreferencesLabel}
                  onChange={(e) => update("savePreferencesLabel", e.target.value)}
                  maxLength={100}
                  className={inputCls}
                />
              </Field>
              <Field label="Privacy policy link text">
                <input
                  value={config.privacyPolicyText}
                  onChange={(e) => update("privacyPolicyText", e.target.value)}
                  maxLength={100}
                  className={inputCls}
                />
              </Field>
              <Field label="Privacy policy URL">
                <input
                  type="url"
                  value={config.privacyPolicyUrl}
                  onChange={(e) => update("privacyPolicyUrl", e.target.value)}
                  placeholder="https://example.com/privacy"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-neutral-900">Controls</h3>
          <div className="space-y-3">
            <Toggle checked={config.showAcceptAll} onChange={(v) => update("showAcceptAll", v)} label="Show Accept all button" />
            <Toggle checked={config.showRejectAll} onChange={(v) => update("showRejectAll", v)} label="Show Reject all button" />
            <Toggle checked={config.showCustomize} onChange={(v) => update("showCustomize", v)} label="Show Customize / Manage preferences link" />
            <Toggle checked={config.showCloseButton} onChange={(v) => update("showCloseButton", v)} label="Show close ✕ button" />
            <Toggle checked={config.showPoweredBy} onChange={(v) => update("showPoweredBy", v)} label="Show powered-by attribution" />
          </div>
        </div>

        {/* Preference center */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-neutral-900">Preference center</h3>
          <div className="space-y-3">
            <Toggle checked={config.showPurposeDescriptions} onChange={(v) => update("showPurposeDescriptions", v)} label="Show purpose descriptions" />
            <Toggle checked={config.showVendorList} onChange={(v) => update("showVendorList", v)} label="Show vendor list" />
            <Toggle checked={config.showLegalBasis} onChange={(v) => update("showLegalBasis", v)} label="Show legal basis for each purpose" />
          </div>
        </div>

        {/* Behavior */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-neutral-900">Behavior</h3>
          <div className="space-y-4">
            <Field label="Default consent">
              <select
                value={config.defaultConsent}
                onChange={(e) => update("defaultConsent", e.target.value as ConsentDefault)}
                className={inputCls}
              >
                <option value="none">None (wait for explicit choice)</option>
                <option value="opt-in">Opt-in (consent granted by default)</option>
                <option value="opt-out">Opt-out (consent denied by default)</option>
              </select>
            </Field>
            <Field label="Consent expires after (days)" hint="1–3650 days.">
              <input
                type="number"
                min={1}
                max={3650}
                value={config.consentExpireDays}
                onChange={(e) => update("consentExpireDays", parseInt(e.target.value, 10) || 365)}
                className={inputCls}
              />
            </Field>
            <div className="space-y-3">
              <Toggle checked={config.respectDoNotTrack} onChange={(v) => update("respectDoNotTrack", v)} label="Respect Do Not Track (DNT) header" />
              <Toggle checked={config.closeOnOverlayClick} onChange={(v) => update("closeOnOverlayClick", v)} label="Close banner on overlay click" />
              <Toggle checked={config.blockPageUntilConsent} onChange={(v) => update("blockPageUntilConsent", v)} label="Block page scrolling until consent given" />
              <Toggle checked={config.showOnEveryVisit} onChange={(v) => update("showOnEveryVisit", v)} label="Show banner on every visit (ignore stored consent)" />
            </div>
          </div>
        </div>

        {/* Locale */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-neutral-900">Locale</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Language">
              <select
                value={config.language}
                onChange={(e) => update("language", e.target.value)}
                className={inputCls}
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
            <Field label="Regulation region" hint="Determines which consent rules apply.">
              <select
                value={config.region}
                onChange={(e) => update("region", e.target.value)}
                className={inputCls}
              >
                <option value="">— None —</option>
                <option value="EU">EU (GDPR)</option>
                <option value="IN">India (DPDP)</option>
                <option value="US">US (CCPA/State laws)</option>
                <option value="UK">UK (UK GDPR)</option>
                <option value="AU">Australia</option>
                <option value="CA">Canada (PIPEDA)</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-neutral-900">Appearance</h3>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Layout">
                <select
                  value={config.layout}
                  onChange={(e) => update("layout", e.target.value as BannerLayout)}
                  className={inputCls}
                >
                  <option value="bar">Bar (full width)</option>
                  <option value="box">Box (compact)</option>
                  <option value="dialog">Dialog (centred modal)</option>
                </select>
              </Field>
              <Field label="Position">
                <select
                  value={config.position}
                  onChange={(e) => update("position", e.target.value as BannerPosition)}
                  className={inputCls}
                >
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                  <option value="bottom-left">Bottom left</option>
                  <option value="bottom-right">Bottom right</option>
                  <option value="center">Centred</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Primary colour">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => update("primaryColor", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border p-0.5"
                  />
                  <input
                    value={config.primaryColor}
                    onChange={(e) => update("primaryColor", e.target.value)}
                    maxLength={7}
                    className="flex-1 rounded-md border px-2 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
                  />
                </div>
              </Field>
              <Field label="Background colour">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.backgroundColor}
                    onChange={(e) => update("backgroundColor", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border p-0.5"
                  />
                  <input
                    value={config.backgroundColor}
                    onChange={(e) => update("backgroundColor", e.target.value)}
                    maxLength={7}
                    className="flex-1 rounded-md border px-2 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
                  />
                </div>
              </Field>
              <Field label="Text colour">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.textColor}
                    onChange={(e) => update("textColor", e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border p-0.5"
                  />
                  <input
                    value={config.textColor}
                    onChange={(e) => update("textColor", e.target.value)}
                    maxLength={7}
                    className="flex-1 rounded-md border px-2 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-neutral-900/10"
                  />
                </div>
              </Field>
            </div>

            <Field label="Border radius (px)" hint="0 = square, 24 = fully rounded.">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={24}
                  value={config.borderRadius}
                  onChange={(e) => update("borderRadius", parseInt(e.target.value, 10))}
                  className="flex-1"
                />
                <span className="w-8 text-center text-sm text-neutral-700">
                  {config.borderRadius}
                </span>
              </div>
            </Field>

            <Toggle
              checked={config.overlayEnabled}
              onChange={(v) => update("overlayEnabled", v)}
              label="Show semi-transparent overlay behind banner"
            />
          </div>
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Reset to defaults
          </button>
        </div>
      </form>

      {/* ── Right: live preview ── */}
      <div className="xl:sticky xl:top-8 xl:self-start">
        <div className="rounded-lg border bg-white p-6">
          <h3 className="mb-3 text-sm font-semibold text-neutral-900">
            Live preview
          </h3>
          <p className="mb-4 text-xs text-neutral-400">
            Preview updates as you change settings. Actual banner rendering
            depends on the SDK.
          </p>
          <BannerPreview config={config} />

          {/* Config summary */}
          <dl className="mt-4 space-y-1 text-xs text-neutral-500">
            <div className="flex justify-between">
              <dt>Layout</dt>
              <dd className="capitalize">{config.layout}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Position</dt>
              <dd>{config.position}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Default consent</dt>
              <dd>{config.defaultConsent}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Expires</dt>
              <dd>{config.consentExpireDays} days</dd>
            </div>
            <div className="flex justify-between">
              <dt>Region</dt>
              <dd>{config.region || "—"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
