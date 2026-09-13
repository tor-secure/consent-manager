"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  bannerUsesOverlay,
  type BannerConfiguration,
  type BannerPosition,
  type BannerLayout,
  type ConsentDefault,
} from "@/lib/banner-config";
import {
  BANNER_PRESETS,
  BANNER_PRESET_CATEGORIES,
  type BannerPreset,
  type BannerPresetCategory,
} from "@/lib/banner-presets";
import { LocaleSelect } from "@/components/i18n/locale-select";
import { Select } from "@/components/ui/select";

function PresetThumb({ preset }: { preset: BannerPreset }) {
  const bg = preset.overrides.backgroundColor ?? "#ffffff";
  const primary = preset.overrides.primaryColor ?? "#0B2C4A";
  const text = preset.overrides.textColor ?? "#0f172a";
  const layout = preset.overrides.layout ?? "bar";
  const position = preset.overrides.position ?? "bottom";
  const radius = Math.min(preset.overrides.borderRadius ?? 8, 8);

  const bannerPos: React.CSSProperties =
    layout === "dialog" || position === "center"
      ? { top: "22%", left: "18%", right: "18%", bottom: "28%", borderRadius: radius }
      : layout === "box" && position === "bottom-right"
        ? { right: 4, bottom: 4, width: "42%", height: "38%", borderRadius: radius }
        : layout === "box" && position === "bottom-left"
          ? { left: 4, bottom: 4, width: "42%", height: "38%", borderRadius: radius }
          : layout === "box"
            ? { left: "10%", right: "10%", bottom: 4, height: "36%", borderRadius: radius }
            : position === "top"
              ? { left: 0, right: 0, top: 0, height: "28%" }
              : { left: 0, right: 0, bottom: 0, height: "28%" };

  return (
    <div className="relative h-12 w-full overflow-hidden rounded-lg bg-[var(--muted)] ring-1 ring-[var(--border)]">
      <div className="absolute inset-x-2 top-1.5 h-1 rounded-full bg-[var(--border)]" />
      <div className="absolute inset-x-4 top-3.5 h-1 rounded-full bg-[var(--border)]/70" />
      <div
        className="absolute flex items-end justify-end gap-0.5 p-1"
        style={{ ...bannerPos, background: bg }}
      >
        <span className="h-1.5 w-3 rounded-sm" style={{ background: primary }} />
        <span className="h-1.5 w-2.5 rounded-sm" style={{ background: text, opacity: 0.25 }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
      {children}
    </p>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-[var(--muted-foreground)]">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[var(--muted-foreground)]">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-[13px] text-[var(--foreground)]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-[var(--primary)]" : "bg-[var(--secondary)]"
        }`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-[var(--card)] shadow-sm transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`} />
      </button>
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-8 cursor-pointer rounded-lg border border-[var(--border)] p-0.5 shadow-sm"
          />
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          placeholder="#000000"
          className="field-input is-sm flex-1 font-mono"
        />
      </div>
    </Field>
  );
}

const inputCls = "field-input is-sm";

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabId = "presets" | "layout" | "style" | "text" | "behavior";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: "presets",
    label: "Presets",
    icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.75}><rect x="1" y="1" width="6" height="6" rx="1.5" /><rect x="9" y="1" width="6" height="6" rx="1.5" /><rect x="1" y="9" width="6" height="6" rx="1.5" /><rect x="9" y="9" width="6" height="6" rx="1.5" /></svg>,
  },
  {
    id: "layout",
    label: "Layout",
    icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.75}><rect x="1" y="11" width="14" height="4" rx="1" /><rect x="1" y="1" width="14" height="8" rx="1" /></svg>,
  },
  {
    id: "style",
    label: "Style",
    icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.75}><circle cx="5" cy="5" r="2.5" /><circle cx="11" cy="5" r="2.5" /><circle cx="8" cy="11" r="2.5" /></svg>,
  },
  {
    id: "text",
    label: "Text",
    icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" d="M2 4h12M8 4v8M5 12h6" /></svg>,
  },
  {
    id: "behavior",
    label: "Settings",
    icon: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.75}><circle cx="8" cy="8" r="2" /><path strokeLinecap="round" d="M8 2v1M8 13v1M2 8h1M13 8h1M3.5 3.5l.7.7M11.8 11.8l.7.7M3.5 12.5l.7-.7M11.8 4.2l.7-.7" /></svg>,
  },
];

// ---------------------------------------------------------------------------
// StudioControls
// ---------------------------------------------------------------------------

interface StudioControlsProps {
  config: BannerConfiguration;
  onChange: <K extends keyof BannerConfiguration>(key: K, value: BannerConfiguration[K]) => void;
  onApplyPreset: (presetId: string) => void;
  activePreset: string | null;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  onSave: () => void;
  onReset: () => void;
  hasVersion: boolean;
  policyId: string;
  websiteId: string | null;
  liveIsBehind: boolean;
}

export function StudioControls({
  config, onChange, onApplyPreset, activePreset,
  saving, saveError, saveSuccess, onSave, onReset, hasVersion,
  policyId, websiteId, liveIsBehind,
}: StudioControlsProps) {
  const [tab, setTab] = useState<TabId>("presets");
  const [presetCategory, setPresetCategory] = useState<BannerPresetCategory | "all">("all");
  const visiblePresets = useMemo(
    () => BANNER_PRESETS.filter((preset) => presetCategory === "all" || preset.category === presetCategory),
    [presetCategory],
  );

  return (
    <div className="flex h-full flex-col bg-[var(--card)]">

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-0.5 border-b border-[var(--border)] bg-[var(--muted)]/80 px-2 py-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
              tab === t.id
                ? "bg-[var(--card)] text-[var(--primary)] shadow-sm ring-1 ring-[var(--border)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--card)]/60 hover:text-[var(--foreground)]"
            }`}
          >
            <span className={tab === t.id ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}>
              {t.icon}
            </span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Scrollable body ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-5 p-4">

          {/* ════ PRESETS ════ */}
          {tab === "presets" && (
            <div className="space-y-3">
              <SectionLabel>Templates</SectionLabel>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setPresetCategory("all")}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    presetCategory === "all"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  All
                </button>
                {BANNER_PRESET_CATEGORIES.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setPresetCategory(category.id)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                      presetCategory === category.id
                        ? "bg-[var(--primary)] text-white"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {visiblePresets.map((preset) => {
                  const active = activePreset === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onApplyPreset(preset.id)}
                      className={`rounded-2xl border p-2 text-left transition-all ${
                        active
                          ? "border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-[var(--info-soft)] ring-1 ring-[color-mix(in_srgb,var(--primary)_22%,transparent)]"
                          : "border-[var(--border)] hover:bg-[var(--muted)]"
                      }`}
                    >
                      <PresetThumb preset={preset} />
                      <p className={`mt-2 text-xs font-semibold ${active ? "text-[var(--primary)]" : "text-[var(--foreground)]"}`}>
                        {preset.label}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[var(--muted-foreground)]">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                Templates apply layout, colour, and notice copy. The live site uses the last published version — save, then publish, to match Verify installation.
              </p>
            </div>
          )}

          {/* ════ LAYOUT ════ */}
          {tab === "layout" && (
            <div className="space-y-5">
              <div>
                <SectionLabel>Position</SectionLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { value: "bottom",       label: "Bottom",     icon: "↓" },
                      { value: "top",          label: "Top",        icon: "↑" },
                      { value: "bottom-left",  label: "B. Left",    icon: "↙" },
                      { value: "bottom-right", label: "B. Right",   icon: "↘" },
                      { value: "center",       label: "Center",     icon: "⊞" },
                    ] as { value: BannerPosition; label: string; icon: string }[]
                  ).map((pos) => {
                    const active = config.position === pos.value;
                    return (
                      <button key={pos.value} type="button"
                        onClick={() => onChange("position", pos.value)}
                        className={`flex flex-col items-center gap-1 rounded-xl border py-2 text-xs transition-all ${
                          active
                            ? "border-[var(--ring)] bg-[var(--primary)] text-white shadow-sm"
                            : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[var(--muted)]"
                        }`}>
                        <span className="text-base leading-none">{pos.icon}</span>
                        <span className="font-medium">{pos.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <SectionLabel>Layout style</SectionLabel>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { value: "bar",    label: "Bar",    desc: "Full width" },
                      { value: "box",    label: "Box",    desc: "Compact"    },
                      { value: "dialog", label: "Dialog", desc: "Centred"    },
                    ] as { value: BannerLayout; label: string; desc: string }[]
                  ).map((lay) => {
                    const active = config.layout === lay.value;
                    return (
                      <button key={lay.value} type="button"
                        onClick={() => onChange("layout", lay.value)}
                        className={`flex flex-col items-center gap-0.5 rounded-xl border py-2.5 text-xs transition-all ${
                          active
                            ? "border-[var(--ring)] bg-[var(--primary)] text-white shadow-sm"
                            : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[var(--muted)]"
                        }`}>
                        <span className="font-semibold">{lay.label}</span>
                        <span className={`text-[10px] ${active ? "text-white/70" : "text-[var(--muted-foreground)]"}`}>{lay.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <SectionLabel>Overlay</SectionLabel>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-2">
                  <Toggle
                    checked={bannerUsesOverlay(config)}
                    onChange={(v) => onChange("overlayEnabled", v)}
                    label="Show semi-transparent overlay"
                  />
                  {config.layout === "dialog" && (
                    <p className="pb-1 text-[11px] text-[var(--muted-foreground)]">
                      Dialogs always dim the page on the live site, matching this preview.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════ STYLE ════ */}
          {tab === "style" && (
            <div className="space-y-5">
              <div>
                <SectionLabel>Colours</SectionLabel>
                <div className="space-y-3">
                  <ColorField label="Primary (buttons)" value={config.primaryColor} onChange={(v) => onChange("primaryColor", v)} />
                  <ColorField label="Background"        value={config.backgroundColor} onChange={(v) => onChange("backgroundColor", v)} />
                  <ColorField label="Text"              value={config.textColor}       onChange={(v) => onChange("textColor", v)} />
                </div>
              </div>

              <div>
                <SectionLabel>Border radius — {config.borderRadius}px</SectionLabel>
                <div className="space-y-1.5">
                  <input type="range" min={0} max={24} value={config.borderRadius}
                    onChange={(e) => onChange("borderRadius", parseInt(e.target.value, 10))}
                    className="w-full accent-[var(--primary)]"
                  />
                  <div className="flex justify-between text-[10px] text-[var(--muted-foreground)]">
                    <span>Square</span><span>Rounded</span>
                  </div>
                </div>
              </div>

              <div>
                <SectionLabel>Buttons</SectionLabel>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-1 divide-y divide-[var(--border)]">
                  <Toggle checked={config.showAcceptAll}  onChange={(v) => onChange("showAcceptAll", v)}  label="Show Accept all"          />
                  <Toggle checked={config.showRejectAll}  onChange={(v) => onChange("showRejectAll", v)}  label="Show Reject all"          />
                  <Toggle checked={config.showCustomize}  onChange={(v) => onChange("showCustomize", v)}  label="Show Customize"           />
                  <Toggle checked={config.showCloseButton} onChange={(v) => onChange("showCloseButton", v)} label="Show close button"      />
                  <Toggle checked={config.showPoweredBy}  onChange={(v) => onChange("showPoweredBy", v)}  label="Show powered-by"          />
                </div>
              </div>

              <div>
                <SectionLabel>Preference center</SectionLabel>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-1 divide-y divide-[var(--border)]">
                  <Toggle checked={config.showPurposeDescriptions} onChange={(v) => onChange("showPurposeDescriptions", v)} label="Show purpose descriptions" />
                  <Toggle checked={config.showVendorList}           onChange={(v) => onChange("showVendorList", v)}           label="Show vendor list"          />
                  <Toggle checked={config.showLegalBasis}           onChange={(v) => onChange("showLegalBasis", v)}           label="Show legal basis"          />
                </div>
              </div>
            </div>
          )}

          {/* ════ TEXT ════ */}
          {tab === "text" && (
            <div className="space-y-4">
              <SectionLabel>Banner content</SectionLabel>
              <Field label="Title">
                <input value={config.title} onChange={(e) => onChange("title", e.target.value)} maxLength={255} className={inputCls} />
              </Field>
              <Field label="Description">
                <textarea value={config.description} onChange={(e) => onChange("description", e.target.value)} rows={4} maxLength={2000} className={inputCls} />
              </Field>

              <SectionLabel>Button labels</SectionLabel>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Accept all"><input value={config.acceptAllLabel} onChange={(e) => onChange("acceptAllLabel", e.target.value)} maxLength={100} className={inputCls} /></Field>
                <Field label="Reject all"><input value={config.rejectAllLabel} onChange={(e) => onChange("rejectAllLabel", e.target.value)} maxLength={100} className={inputCls} /></Field>
                <Field label="Customize"><input value={config.customizeLabel} onChange={(e) => onChange("customizeLabel", e.target.value)} maxLength={100} className={inputCls} /></Field>
                <Field label="Save prefs"><input value={config.savePreferencesLabel} onChange={(e) => onChange("savePreferencesLabel", e.target.value)} maxLength={100} className={inputCls} /></Field>
              </div>

              <SectionLabel>Privacy policy</SectionLabel>
              <Field label="Link text"><input value={config.privacyPolicyText} onChange={(e) => onChange("privacyPolicyText", e.target.value)} maxLength={100} className={inputCls} /></Field>
              <Field label="URL"><input type="url" value={config.privacyPolicyUrl} onChange={(e) => onChange("privacyPolicyUrl", e.target.value)} placeholder="https://example.com/privacy" className={inputCls} /></Field>
            </div>
          )}

          {/* ════ BEHAVIOR / SETTINGS ════ */}
          {tab === "behavior" && (
            <div className="space-y-5">
              <div>
                <SectionLabel>Consent default</SectionLabel>
                <Field label="Default choice">
                  <Select size="sm" value={config.defaultConsent} onChange={(e) => onChange("defaultConsent", e.target.value as ConsentDefault)}>
                    <option value="none">None — wait for explicit choice</option>
                    <option value="opt-in">Opt-in — grant by default</option>
                    <option value="opt-out">Opt-out — deny by default</option>
                  </Select>
                </Field>
              </div>

              <div>
                <SectionLabel>Expiry</SectionLabel>
                <Field label="Consent expires after (days)" hint="1–3650">
                  <input type="number" min={1} max={3650} value={config.consentExpireDays}
                    onChange={(e) => onChange("consentExpireDays", Math.max(1, Math.min(3650, parseInt(e.target.value, 10) || 365)))}
                    className={inputCls} />
                </Field>
              </div>

              <div>
                <SectionLabel>Behaviour options</SectionLabel>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--muted)]/50 px-3 py-1 divide-y divide-[var(--border)]">
                  <Toggle checked={config.respectDoNotTrack}    onChange={(v) => onChange("respectDoNotTrack", v)}    label="Respect Do Not Track"       />
                  <Toggle checked={config.closeOnOverlayClick}  onChange={(v) => onChange("closeOnOverlayClick", v)}  label="Close on overlay click"     />
                  <Toggle checked={config.blockPageUntilConsent} onChange={(v) => onChange("blockPageUntilConsent", v)} label="Block page until consent"  />
                  <Toggle checked={config.showOnEveryVisit}     onChange={(v) => onChange("showOnEveryVisit", v)}     label="Show on every visit"        />
                  <Toggle checked={config.showPreferenceWidget !== false} onChange={(v) => onChange("showPreferenceWidget", v)} label="Show preferences icon" />
                </div>
              </div>

              {config.showPreferenceWidget !== false && (
                <div>
                  <SectionLabel>Preferences icon position</SectionLabel>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { value: "bottom-left", label: "Bottom left" },
                        { value: "bottom-right", label: "Bottom right" },
                      ] as const
                    ).map((pos) => {
                      const active = (config.preferenceWidgetPosition || "bottom-left") === pos.value;
                      return (
                        <button
                          key={pos.value}
                          type="button"
                          onClick={() => onChange("preferenceWidgetPosition", pos.value)}
                          className={`rounded-xl border py-2 text-xs font-medium transition-all ${
                            active
                              ? "border-[var(--ring)] bg-[var(--primary)] text-white shadow-sm"
                              : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--border)] hover:bg-[var(--muted)]"
                          }`}
                        >
                          {pos.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                    After someone chooses, a small icon stays on the site so they can change purposes later.
                  </p>
                </div>
              )}

              <div>
                <SectionLabel>Locale</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Language">
                    <LocaleSelect
                      value={config.language}
                      onChange={(language) => onChange("language", language)}
                      includeCurrent={config.language}
                      size="sm"
                    />
                  </Field>
                  <Field label="Regulation">
                    <Select size="sm" value={config.region} onChange={(e) => onChange("region", e.target.value)}>
                      <option value="">— None —</option>
                      <option value="EU">EU (GDPR)</option>
                      <option value="IN">India (DPDP)</option>
                      <option value="US">US (CCPA)</option>
                      <option value="UK">UK (UK GDPR)</option>
                      <option value="AU">Australia</option>
                      <option value="CA">Canada (PIPEDA)</option>
                    </Select>
                  </Field>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Footer save bar ──────────────────────────────────────────────── */}
      <div className="shrink-0 space-y-2 border-t border-[var(--border)] bg-[var(--card)] p-3">
        {saveError && (
          <div className="flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-3 py-2 text-xs text-[var(--danger)]">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}><circle cx="8" cy="8" r="6"/><path strokeLinecap="round" d="M8 5v3M8 11h.01"/></svg>
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--success)_28%,transparent)] bg-[var(--success-soft)] px-3 py-2 text-xs text-[var(--success)]">
            Draft saved. Publish the policy to update the live banner and Verify installation.
          </div>
        )}
        {liveIsBehind && !saveSuccess && (
          <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
            This studio edits a draft. The live check still shows the last published version.{" "}
            <Link href={`/dashboard/policies/${policyId}`} className="font-medium text-[var(--primary)] underline-offset-2 hover:underline">
              Publish to go live
            </Link>
            .
          </p>
        )}
        {!hasVersion && (
          <div className="flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--warning)_28%,transparent)] bg-[var(--warning-soft)] px-3 py-2 text-xs text-[var(--warning)]">
            No policy version — cannot save.
          </div>
        )}
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
            <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M2.5 8A5.5 5.5 0 118 13.5"/><path strokeLinecap="round" d="M2.5 5v3h3"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
