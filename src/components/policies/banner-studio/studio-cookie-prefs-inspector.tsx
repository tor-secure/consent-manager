"use client";

import Link from "next/link";
import {
  BANNER_BORDER_RADIUS_MAX,
  type BannerConfiguration,
  type CookiePrefsButtonStyle,
  type CookiePrefsLayout,
  type CookiePrefsToggleStyle,
} from "@/lib/banner-config";

interface StudioCookiePrefsInspectorProps {
  config: BannerConfiguration;
  onChange: <K extends keyof BannerConfiguration>(
    key: K,
    value: BannerConfiguration[K],
  ) => void;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  onSave: () => void;
  onReset: () => void;
  hasVersion: boolean;
  policyId: string;
  websiteId: string | null;
  isDirty?: boolean;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm text-[var(--foreground)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[var(--primary)]" : "bg-[var(--muted)]"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

function TextField({
  label,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
      />
    </div>
  );
}

function ChoiceGrid<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ id: T; label: string; hint?: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="grid grid-cols-2 gap-1.5">
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              aria-pressed={active}
              className={`rounded-xl border px-2.5 py-2 text-left transition ${
                active
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40"
              }`}
            >
              <span className="block text-xs font-semibold">{opt.label}</span>
              {opt.hint ? (
                <span className="mt-0.5 block text-[10px] opacity-80">{opt.hint}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function StudioCookiePrefsInspector({
  config,
  onChange,
  saving,
  saveError,
  saveSuccess,
  onSave,
  onReset,
  hasVersion,
  policyId,
  websiteId,
  isDirty = false,
}: StudioCookiePrefsInspectorProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-[var(--border)] bg-[var(--card)]">
      <div className="shrink-0 border-b border-[var(--border)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">Cookie Preferences editor</p>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          Edit only the post-consent panel — layouts, buttons, toggles, and copy.
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <ChoiceGrid<CookiePrefsLayout>
          label="Panel layout"
          value={config.cookiePrefsLayout || "corner"}
          onChange={(v) => onChange("cookiePrefsLayout", v)}
          options={[
            { id: "corner", label: "Corner card", hint: "Near widget" },
            { id: "center", label: "Center modal", hint: "Dimmed page" },
            { id: "sheet", label: "Bottom sheet", hint: "Full width" },
            { id: "drawer", label: "Side drawer", hint: "Edge panel" },
          ]}
        />

        <div>
          <FieldLabel>Widget corner</FieldLabel>
          <div className="grid grid-cols-2 gap-1.5">
            {(
              [
                { id: "bottom-left" as const, label: "Bottom left" },
                { id: "bottom-right" as const, label: "Bottom right" },
              ] as const
            ).map((pos) => {
              const active =
                (config.preferenceWidgetPosition || "bottom-left") === pos.id;
              return (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => onChange("preferenceWidgetPosition", pos.id)}
                  className={`rounded-xl border py-2 text-xs font-medium transition ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--muted-foreground)]"
                  }`}
                >
                  {pos.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <FieldLabel>Corner radius</FieldLabel>
            <span className="text-xs tabular-nums text-[var(--muted-foreground)]">
              {config.cookiePrefsBorderRadius ?? 18} px
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={BANNER_BORDER_RADIUS_MAX}
            value={Math.min(config.cookiePrefsBorderRadius ?? 18, BANNER_BORDER_RADIUS_MAX)}
            onChange={(e) => onChange("cookiePrefsBorderRadius", Number(e.target.value))}
            className="w-full accent-[var(--primary)]"
          />
        </div>

        <ChoiceGrid<CookiePrefsButtonStyle>
          label="Button layout"
          value={config.cookiePrefsButtonStyle || "stack"}
          onChange={(v) => onChange("cookiePrefsButtonStyle", v)}
          options={[
            { id: "stack", label: "Stacked", hint: "Full-width buttons" },
            { id: "row", label: "Save + receipt row", hint: "Side by side" },
          ]}
        />

        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2">
          <FieldLabel>Button options</FieldLabel>
          <ToggleRow
            label="Show Download Receipt"
            checked={config.showDownloadReceipt !== false}
            onChange={(v) => onChange("showDownloadReceipt", v)}
          />
          <ToggleRow
            label="Show Revoke Consent"
            checked={config.showRevokeConsent !== false}
            onChange={(v) => onChange("showRevokeConsent", v)}
          />
        </div>

        <ChoiceGrid<CookiePrefsToggleStyle>
          label="Category toggle style"
          value={config.cookiePrefsToggleStyle || "switch"}
          onChange={(v) => onChange("cookiePrefsToggleStyle", v)}
          options={[
            { id: "switch", label: "Switch", hint: "Pill toggles" },
            { id: "checkbox", label: "Checkbox", hint: "Square checks" },
          ]}
        />

        <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2">
          <FieldLabel>Panel options</FieldLabel>
          <ToggleRow
            label="Show preferences icon"
            checked={config.showPreferenceWidget !== false}
            onChange={(v) => onChange("showPreferenceWidget", v)}
          />
          <ToggleRow
            label="Show status / dates"
            checked={config.cookiePrefsShowStatusMeta !== false}
            onChange={(v) => onChange("cookiePrefsShowStatusMeta", v)}
          />
          <ToggleRow
            label="Show consent key"
            checked={config.showConsentReceiptKey !== false}
            onChange={(v) => onChange("showConsentReceiptKey", v)}
          />
          <ToggleRow
            label="Show language control"
            checked={config.cookiePrefsShowLanguage !== false}
            onChange={(v) => onChange("cookiePrefsShowLanguage", v)}
          />
        </div>

        <div className="space-y-3">
          <FieldLabel>Text</FieldLabel>
          <TextField
            label="Panel title"
            value={config.cookiePreferencesTitle}
            onChange={(v) => onChange("cookiePreferencesTitle", v)}
            maxLength={100}
          />
          <TextField
            label="Save button"
            value={config.cookiePrefsSaveLabel}
            onChange={(v) => onChange("cookiePrefsSaveLabel", v)}
            maxLength={100}
          />
          <TextField
            label="Download receipt"
            value={config.downloadReceiptLabel}
            onChange={(v) => onChange("downloadReceiptLabel", v)}
            maxLength={100}
          />
          <TextField
            label="Revoke button"
            value={config.revokeConsentLabel}
            onChange={(v) => onChange("revokeConsentLabel", v)}
            maxLength={160}
          />
          <TextField
            label="Categories label"
            value={config.activeCategoriesLabel}
            onChange={(v) => onChange("activeCategoriesLabel", v)}
            maxLength={100}
          />
          <TextField
            label="Legal note"
            value={config.cookiePrefsLegalNote}
            onChange={(v) => onChange("cookiePrefsLegalNote", v)}
            maxLength={160}
          />
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t border-[var(--border)] p-3">
        {isDirty && !saveSuccess ? (
          <p className="text-[11px] text-[var(--muted-foreground)]">
            Unsaved Cookie Preferences changes.
          </p>
        ) : null}
        {saveError ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
            {saveError}
          </div>
        ) : null}
        {saveSuccess ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--success-soft)] px-3 py-2 text-xs text-[var(--success)]">
            Draft saved.
          </div>
        ) : null}
        {!hasVersion ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning)]">
            No policy version — cannot save.
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !hasVersion}
            className="btn btn-primary flex h-10 flex-1 items-center justify-center text-sm disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <Link
            href={`/dashboard/policies/${policyId}#policy-publish`}
            className="btn btn-outline flex h-10 items-center px-3 text-sm"
          >
            Publish
          </Link>
          {websiteId ? (
            <Link
              href={`/dashboard/websites/${websiteId}/installation`}
              className="btn btn-outline flex h-10 items-center px-3 text-sm"
            >
              Install
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onReset}
            title="Reset to defaults"
            className="btn btn-outline flex h-10 w-10 items-center justify-center p-0"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2} aria-hidden>
              <path strokeLinecap="round" d="M2.5 8A5.5 5.5 0 118 13.5" />
              <path strokeLinecap="round" d="M2.5 5v3h3" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
