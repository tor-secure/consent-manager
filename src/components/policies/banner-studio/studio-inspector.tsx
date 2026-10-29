"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BANNER_BORDER_RADIUS_MAX,
  type BannerConfiguration,
  type ConsentDefault,
} from "@/lib/banner-config";
import { BANNER_PRESETS, findMatchingPreset } from "@/lib/banner-presets";
import { LocaleSelect } from "@/components/i18n/locale-select";
import { Select } from "@/components/ui/select";
import type { StudioTab } from "./studio-shell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StudioInspectorProps {
  config: BannerConfiguration;
  onChange: <K extends keyof BannerConfiguration>(
    key: K,
    value: BannerConfiguration[K],
  ) => void;
  activeTab: StudioTab;
  onTabChange: (tab: StudioTab) => void;
  onOpenTemplatePicker: () => void;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  onSave: () => void;
  onReset: () => void;
  hasVersion: boolean;
  policyId: string;
  websiteId: string | null;
  liveIsBehind: boolean;
  isDirty?: boolean;
}

type AccordionId =
  | "template"
  | "layout"
  | "behavior"
  | "branding"
  | "text"
  | "buttons"
  | "languages"
  | "regions"
  | "compliance"
  | "publish";

const TAB_TO_SECTIONS: Record<StudioTab, AccordionId[]> = {
  presets: ["template"],
  layout: ["layout", "behavior"],
  style: ["branding"],
  text: ["text"],
  content: ["buttons"],
  settings: ["languages", "regions", "compliance", "publish"],
};

const POSITIONS: Array<{
  id: BannerConfiguration["position"];
  label: string;
  col: number;
  row: number;
}> = [
  { id: "top", label: "Top", col: 2, row: 1 },
  { id: "bottom-left", label: "Bottom left", col: 1, row: 3 },
  { id: "bottom", label: "Bottom", col: 2, row: 3 },
  { id: "bottom-right", label: "Bottom right", col: 3, row: 3 },
  { id: "center", label: "Center", col: 2, row: 2 },
];

// ---------------------------------------------------------------------------
// Shared UI
// ---------------------------------------------------------------------------

function Accordion({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: AccordionId;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-[var(--border)]" data-accordion={id}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition hover:bg-[var(--muted)]/50"
      >
        <span className="text-sm font-semibold text-[var(--foreground)]">{title}</span>
        <svg
          className={`h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 16 16"
          stroke="currentColor"
          strokeWidth={1.5}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open ? <div className="space-y-3 px-4 pb-4">{children}</div> : null}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
      {children}
    </label>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-[var(--foreground)]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded-lg border border-[var(--border)] bg-transparent p-0.5"
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          className="w-[5.5rem] rounded-lg border border-[var(--border)] bg-[var(--card)] px-2 py-1.5 font-mono text-xs text-[var(--foreground)] outline-none focus:border-[var(--ring)]"
          spellCheck={false}
        />
      </div>
    </div>
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
  multiline,
  rows = 3,
  type = "text",
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
  rows?: number;
  type?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          maxLength={maxLength}
          placeholder={placeholder}
          className="w-full resize-y rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]/20"
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StudioInspector
// ---------------------------------------------------------------------------

export function StudioInspector({
  config,
  onChange,
  activeTab,
  onTabChange,
  onOpenTemplatePicker,
  saving,
  saveError,
  saveSuccess,
  onSave,
  onReset,
  hasVersion,
  policyId,
  websiteId,
  liveIsBehind,
  isDirty = false,
}: StudioInspectorProps) {
  const [open, setOpen] = useState<Set<AccordionId>>(
    () => new Set(TAB_TO_SECTIONS[activeTab]),
  );

  useEffect(() => {
    setOpen(new Set(TAB_TO_SECTIONS[activeTab]));
  }, [activeTab]);

  function toggle(id: AccordionId) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const matched = findMatchingPreset(config);
  const templateLabel = matched?.label ?? "Custom";

  return (
    <aside className="flex h-full min-h-0 flex-col border-l border-[var(--border)] bg-[var(--card)]">
      <div className="shrink-0 border-b border-[var(--border)] px-4 py-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">Banner settings</p>
        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
          Changes update the live preview instantly.
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Accordion
          id="template"
          title="Template"
          open={open.has("template")}
          onToggle={() => toggle("template")}
        >
          <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">
                {templateLabel}
              </p>
              <p className="text-[11px] text-[var(--muted-foreground)]">
                {config.layout} · {config.position}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onTabChange("presets");
                onOpenTemplatePicker();
              }}
              className="shrink-0 rounded-lg border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-xs font-semibold text-[var(--foreground)] transition hover:bg-[var(--muted)]"
            >
              Change
            </button>
          </div>
          {!matched ? (
            <p className="text-[11px] text-[var(--muted-foreground)]">
              Custom mix — not an exact preset match.{" "}
              {BANNER_PRESETS.length} templates available.
            </p>
          ) : null}
        </Accordion>

        <Accordion
          id="layout"
          title="Layout"
          open={open.has("layout")}
          onToggle={() => toggle("layout")}
        >
          <div>
            <FieldLabel>Banner type</FieldLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: "bar" as const, label: "Bar" },
                  { id: "box" as const, label: "Box" },
                  { id: "dialog" as const, label: "Dialog" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange("layout", opt.id)}
                  aria-pressed={config.layout === opt.id}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                    config.layout === opt.id
                      ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <FieldLabel>Position</FieldLabel>
            <div
              className="mx-auto grid w-fit gap-1.5"
              style={{
                gridTemplateColumns: "repeat(3, 2rem)",
                gridTemplateRows: "repeat(3, 2rem)",
              }}
            >
              {POSITIONS.map((pos) => {
                const active = config.position === pos.id;
                return (
                  <button
                    key={pos.id}
                    type="button"
                    title={pos.label}
                    aria-label={pos.label}
                    aria-pressed={active}
                    onClick={() => onChange("position", pos.id)}
                    style={{ gridColumn: pos.col, gridRow: pos.row }}
                    className={`rounded-md border transition ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary)]/15 shadow-sm"
                        : "border-[var(--border)] bg-[var(--muted)]/50 hover:border-[var(--primary)]/50"
                    }`}
                  >
                    <span
                      className={`mx-auto block h-2 w-2 rounded-sm ${
                        active ? "bg-[var(--primary)]" : "bg-[var(--muted-foreground)]/40"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <FieldLabel>Corner radius</FieldLabel>
              <span className="text-xs font-medium tabular-nums text-[var(--muted-foreground)]">
                {config.borderRadius} px
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={BANNER_BORDER_RADIUS_MAX}
              value={Math.min(config.borderRadius, BANNER_BORDER_RADIUS_MAX)}
              onChange={(e) => onChange("borderRadius", Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
          </div>
        </Accordion>

        <Accordion
          id="behavior"
          title="Behavior"
          open={open.has("behavior")}
          onToggle={() => toggle("behavior")}
        >
          <ToggleRow
            label="Show close button"
            checked={config.showCloseButton}
            onChange={(v) => onChange("showCloseButton", v)}
          />
          <ToggleRow
            label="Enable backdrop (dim page)"
            checked={config.overlayEnabled}
            onChange={(v) => onChange("overlayEnabled", v)}
          />
          <ToggleRow
            label="Disable page scroll"
            checked={config.blockPageUntilConsent}
            onChange={(v) => onChange("blockPageUntilConsent", v)}
          />
          <ToggleRow
            label="Close on overlay click"
            checked={config.closeOnOverlayClick}
            onChange={(v) => onChange("closeOnOverlayClick", v)}
          />
          <ToggleRow
            label="Show on every visit"
            checked={config.showOnEveryVisit}
            onChange={(v) => onChange("showOnEveryVisit", v)}
          />
          <ToggleRow
            label="Show preferences icon"
            checked={config.showPreferenceWidget !== false}
            onChange={(v) => onChange("showPreferenceWidget", v)}
          />
          {config.showPreferenceWidget !== false ? (
            <div>
              <FieldLabel>Preferences icon position</FieldLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { value: "bottom-left" as const, label: "Bottom left" },
                    { value: "bottom-right" as const, label: "Bottom right" },
                  ] as const
                ).map((pos) => {
                  const active =
                    (config.preferenceWidgetPosition || "bottom-left") === pos.value;
                  return (
                    <button
                      key={pos.value}
                      type="button"
                      onClick={() => onChange("preferenceWidgetPosition", pos.value)}
                      className={`rounded-xl border py-2 text-xs font-medium transition ${
                        active
                          ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                          : "border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--muted)]"
                      }`}
                    >
                      {pos.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </Accordion>

        <Accordion
          id="branding"
          title="Branding"
          open={open.has("branding")}
          onToggle={() => toggle("branding")}
        >
          <ColorRow
            label="Primary color"
            value={config.primaryColor}
            onChange={(v) => onChange("primaryColor", v)}
          />
          <ColorRow
            label="Secondary color"
            value={config.textColor}
            onChange={(v) => onChange("textColor", v)}
          />
          <ColorRow
            label="Background color"
            value={config.backgroundColor}
            onChange={(v) => onChange("backgroundColor", v)}
          />
        </Accordion>

        <Accordion
          id="text"
          title="Text content"
          open={open.has("text")}
          onToggle={() => toggle("text")}
        >
          <TextField
            label="Title"
            value={config.title}
            onChange={(v) => onChange("title", v)}
            maxLength={255}
          />
          <TextField
            label="Body"
            value={config.description}
            onChange={(v) => onChange("description", v)}
            multiline
            rows={4}
            maxLength={2000}
          />
          <TextField
            label="Accept all"
            value={config.acceptAllLabel}
            onChange={(v) => onChange("acceptAllLabel", v)}
            maxLength={100}
          />
          <TextField
            label="Reject all"
            value={config.rejectAllLabel}
            onChange={(v) => onChange("rejectAllLabel", v)}
            maxLength={100}
          />
          <TextField
            label="Customize"
            value={config.customizeLabel}
            onChange={(v) => onChange("customizeLabel", v)}
            maxLength={100}
          />
          <TextField
            label="Save preferences"
            value={config.savePreferencesLabel}
            onChange={(v) => onChange("savePreferencesLabel", v)}
            maxLength={100}
          />
        </Accordion>

        <Accordion
          id="buttons"
          title="Buttons"
          open={open.has("buttons")}
          onToggle={() => toggle("buttons")}
        >
          <ToggleRow
            label="Show Accept all"
            checked={config.showAcceptAll}
            onChange={(v) => onChange("showAcceptAll", v)}
          />
          <ToggleRow
            label="Show Reject all"
            checked={config.showRejectAll}
            onChange={(v) => onChange("showRejectAll", v)}
          />
          <ToggleRow
            label="Show Customize"
            checked={config.showCustomize}
            onChange={(v) => onChange("showCustomize", v)}
          />
          <ToggleRow
            label="Show powered-by"
            checked={config.showPoweredBy}
            onChange={(v) => onChange("showPoweredBy", v)}
          />
          {config.showPoweredBy ? (
            <TextField
              label="Powered-by text"
              value={config.poweredByText}
              onChange={(v) => onChange("poweredByText", v)}
              maxLength={100}
            />
          ) : null}
          {config.showCloseButton ? (
            <TextField
              label="Close button label"
              value={config.closeLabel}
              onChange={(v) => onChange("closeLabel", v)}
              maxLength={100}
            />
          ) : null}
          <div className="space-y-3 border-t border-[var(--border)] pt-3">
            <FieldLabel>Preference center</FieldLabel>
            <ToggleRow
              label="Show purpose descriptions"
              checked={config.showPurposeDescriptions}
              onChange={(v) => onChange("showPurposeDescriptions", v)}
            />
            <ToggleRow
              label="Show vendor list"
              checked={config.showVendorList}
              onChange={(v) => onChange("showVendorList", v)}
            />
            <ToggleRow
              label="Show legal basis"
              checked={config.showLegalBasis}
              onChange={(v) => onChange("showLegalBasis", v)}
            />
            <TextField
              label="Preference center title"
              value={config.preferenceCenterTitle}
              onChange={(v) => onChange("preferenceCenterTitle", v)}
            />
            <TextField
              label="Preference center description"
              value={config.preferenceCenterDescription}
              onChange={(v) => onChange("preferenceCenterDescription", v)}
              multiline
            />
          </div>
        </Accordion>

        <Accordion
          id="languages"
          title="Languages"
          open={open.has("languages")}
          onToggle={() => toggle("languages")}
        >
          <div>
            <FieldLabel>Default language</FieldLabel>
            <LocaleSelect
              value={config.language}
              onChange={(language) => onChange("language", language)}
              includeCurrent={config.language}
              size="sm"
            />
          </div>
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
            Visitors can switch language in the banner. Preview uses this default locale.
          </p>
        </Accordion>

        <Accordion
          id="regions"
          title="Regions"
          open={open.has("regions")}
          onToggle={() => toggle("regions")}
        >
          <div>
            <FieldLabel>Regulation</FieldLabel>
            <Select
              size="sm"
              value={config.region}
              onChange={(e) => onChange("region", e.target.value)}
            >
              <option value="">— None —</option>
              <option value="EU">EU (GDPR)</option>
              <option value="IN">India (DPDP)</option>
              <option value="US">US (CCPA)</option>
              <option value="UK">UK (UK GDPR)</option>
              <option value="AU">Australia</option>
              <option value="CA">Canada (PIPEDA)</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Consent default</FieldLabel>
            <Select
              size="sm"
              value={config.defaultConsent}
              onChange={(e) =>
                onChange("defaultConsent", e.target.value as ConsentDefault)
              }
            >
              <option value="none">None — wait for explicit choice</option>
              <option value="opt-in">Opt-in — grant by default</option>
              <option value="opt-out">Opt-out — deny by default</option>
            </Select>
          </div>
          <div>
            <FieldLabel>Consent expires after (days)</FieldLabel>
            <input
              type="number"
              min={1}
              max={3650}
              value={config.consentExpireDays}
              onChange={(e) =>
                onChange(
                  "consentExpireDays",
                  Math.max(1, Math.min(3650, parseInt(e.target.value, 10) || 365)),
                )
              }
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            />
          </div>
          <ToggleRow
            label="Respect Do Not Track"
            checked={config.respectDoNotTrack}
            onChange={(v) => onChange("respectDoNotTrack", v)}
          />
        </Accordion>

        <Accordion
          id="compliance"
          title="Compliance"
          open={open.has("compliance")}
          onToggle={() => toggle("compliance")}
        >
          <TextField
            label="Privacy policy link text"
            value={config.privacyPolicyText}
            onChange={(v) => onChange("privacyPolicyText", v)}
            maxLength={100}
          />
          <TextField
            label="Privacy policy URL"
            value={config.privacyPolicyUrl}
            onChange={(v) => onChange("privacyPolicyUrl", v)}
            type="url"
            placeholder="https://example.com/privacy"
          />
          <TextField
            label="Cookie policy link text"
            value={config.cookiePolicyText ?? ""}
            onChange={(v) => onChange("cookiePolicyText", v)}
            maxLength={100}
          />
          <TextField
            label="Cookie policy URL"
            value={config.cookiePolicyUrl ?? ""}
            onChange={(v) => onChange("cookiePolicyUrl", v)}
            type="url"
            placeholder="https://example.com/cookies"
          />
          <div className="space-y-3 border-t border-[var(--border)] pt-3">
            <FieldLabel>California / GPC</FieldLabel>
            <ToggleRow
              label="Do Not Sell My Personal Information"
              checked={config.doNotSellEnabled}
              onChange={(v) => onChange("doNotSellEnabled", v)}
            />
            <ToggleRow
              label="Do Not Share My Personal Information"
              checked={config.doNotShareEnabled}
              onChange={(v) => onChange("doNotShareEnabled", v)}
            />
            <ToggleRow
              label="Honor Global Privacy Control (GPC)"
              checked={config.gpcHonored}
              onChange={(v) => onChange("gpcHonored", v)}
            />
            <ToggleRow
              label="Limit Use of Sensitive Personal Information"
              checked={config.limitSensitivePiEnabled}
              onChange={(v) => onChange("limitSensitivePiEnabled", v)}
            />
          </div>
        </Accordion>

        <Accordion
          id="publish"
          title="Publish settings"
          open={open.has("publish")}
          onToggle={() => toggle("publish")}
        >
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
            Saving stores a draft banner configuration. Publish the policy to push a live
            version, then install the embed snippet on your site.
          </p>
          {liveIsBehind ? (
            <p className="text-xs leading-relaxed text-[var(--warning)]">
              Live site still shows the last published version.
            </p>
          ) : null}
        </Accordion>
      </div>

      <div className="shrink-0 space-y-2 border-t border-[var(--border)] bg-[var(--card)] p-3">
        {isDirty && !saveSuccess ? (
          <p className="text-[11px] text-[var(--muted-foreground)]">
            Unsaved changes — leave the page and the browser will warn you.
          </p>
        ) : null}
        {saveError ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
            {saveError}
          </div>
        ) : null}
        {saveSuccess ? (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--success-soft)] px-3 py-2 text-xs text-[var(--success)]">
            Draft saved. Publish the policy to update the live banner.
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
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 16 16"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" d="M2.5 8A5.5 5.5 0 118 13.5" />
              <path strokeLinecap="round" d="M2.5 5v3h3" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
