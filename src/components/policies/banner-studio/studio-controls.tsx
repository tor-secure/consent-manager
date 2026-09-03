"use client";

import { useState } from "react";
import {
  defaultBannerConfig,
  type BannerConfiguration,
  type BannerPosition,
  type BannerLayout,
  type ConsentDefault,
} from "@/lib/banner-config";
import { LocaleSelectOptions } from "@/components/i18n/locale-select-options";

// ---------------------------------------------------------------------------
// Preset definitions
// ---------------------------------------------------------------------------

export type PresetName =
  | "bottom-bar"
  | "top-bar"
  | "center-modal"
  | "bottom-sheet"
  | "floating-panel";

type Preset = {
  name: PresetName;
  label: string;
  description: string;
  icon: React.ReactNode;
  overrides: Partial<BannerConfiguration>;
};

const PRESETS: Preset[] = [
  {
    name: "bottom-bar",
    label: "Bottom Bar",
    description: "Full-width bar anchored to the bottom",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
        <rect x="1" y="14" width="18" height="5" rx="1" fill="currentColor" opacity={0.2} />
        <rect x="1" y="14" width="18" height="5" rx="1" />
        <rect x="1" y="1" width="18" height="11" rx="1" opacity={0.06} fill="currentColor" />
      </svg>
    ),
    overrides: { layout: "bar", position: "bottom", borderRadius: 0, overlayEnabled: false, backgroundColor: "#ffffff", primaryColor: "#4f46e5", textColor: "#0f172a" },
  },
  {
    name: "top-bar",
    label: "Top Bar",
    description: "Full-width notice bar at the top",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
        <rect x="1" y="1" width="18" height="5" rx="1" fill="currentColor" opacity={0.2} />
        <rect x="1" y="1" width="18" height="5" rx="1" />
        <rect x="1" y="8" width="18" height="11" rx="1" opacity={0.06} fill="currentColor" />
      </svg>
    ),
    overrides: { layout: "bar", position: "top", borderRadius: 0, overlayEnabled: false, backgroundColor: "#1e1e2e", primaryColor: "#6366f1", textColor: "#ffffff" },
  },
  {
    name: "center-modal",
    label: "Center Modal",
    description: "Centred dialog with overlay backdrop",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
        <rect x="1" y="1" width="18" height="18" rx="1" opacity={0.06} fill="currentColor" />
        <rect x="4" y="5" width="12" height="10" rx="2" fill="currentColor" opacity={0.2} />
        <rect x="4" y="5" width="12" height="10" rx="2" />
      </svg>
    ),
    overrides: { layout: "dialog", position: "center", borderRadius: 16, overlayEnabled: true, backgroundColor: "#ffffff", primaryColor: "#4f46e5", textColor: "#111827", blockPageUntilConsent: true },
  },
  {
    name: "bottom-sheet",
    label: "Bottom Sheet",
    description: "Rises from the bottom — mobile-friendly",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
        <rect x="1" y="1" width="18" height="18" rx="1" opacity={0.06} fill="currentColor" />
        <rect x="1" y="10" width="18" height="9" rx="2" fill="currentColor" opacity={0.2} />
        <rect x="1" y="10" width="18" height="9" rx="2" />
      </svg>
    ),
    overrides: { layout: "box", position: "bottom", borderRadius: 20, overlayEnabled: true, backgroundColor: "#ffffff", primaryColor: "#0ea5e9", textColor: "#0f172a" },
  },
  {
    name: "floating-panel",
    label: "Floating Panel",
    description: "Corner panel — low intrusion",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={1.5}>
        <rect x="1" y="1" width="18" height="18" rx="1" opacity={0.06} fill="currentColor" />
        <rect x="10" y="11" width="8" height="7" rx="2" fill="currentColor" opacity={0.2} />
        <rect x="10" y="11" width="8" height="7" rx="2" />
      </svg>
    ),
    overrides: { layout: "box", position: "bottom-right", borderRadius: 14, overlayEnabled: false, backgroundColor: "#ffffff", primaryColor: "#10b981", textColor: "#064e3b" },
  },
];

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
      {children}
    </p>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span className="text-[13px] text-slate-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-indigo-600" : "bg-slate-200"
        }`}
      >
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${
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
            className="h-8 w-8 cursor-pointer rounded-lg border border-slate-200 p-0.5 shadow-sm"
          />
        </div>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          placeholder="#000000"
          className="flex-1 rounded-xl border border-slate-200 px-2.5 py-1.5 font-mono text-xs shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
        />
      </div>
    </Field>
  );
}

const inputCls = "w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15";
const selectCls = `${inputCls} bg-white`;

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
  onApplyPreset: (overrides: Partial<BannerConfiguration>) => void;
  activePreset: PresetName | null;
  saving: boolean;
  saveError: string | null;
  saveSuccess: boolean;
  onSave: () => void;
  onReset: () => void;
  hasVersion: boolean;
}

export function StudioControls({
  config, onChange, onApplyPreset, activePreset,
  saving, saveError, saveSuccess, onSave, onReset, hasVersion,
}: StudioControlsProps) {
  const [tab, setTab] = useState<TabId>("presets");

  return (
    <div className="flex h-full flex-col bg-white">

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-0.5 border-b border-slate-100 bg-slate-50/80 px-2 py-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all ${
              tab === t.id
                ? "bg-white text-indigo-700 shadow-sm ring-1 ring-slate-200"
                : "text-slate-500 hover:bg-white/60 hover:text-slate-700"
            }`}
          >
            <span className={tab === t.id ? "text-indigo-600" : "text-slate-400"}>
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
              <SectionLabel>Style presets</SectionLabel>
              <div className="space-y-2">
                {PRESETS.map((preset) => {
                  const active = activePreset === preset.name;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => onApplyPreset(preset.overrides)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                        active
                          ? "border-indigo-200 bg-indigo-50 ring-1 ring-indigo-400/30"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                        active
                          ? "border-indigo-200 bg-indigo-100 text-indigo-700"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}>
                        {preset.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-semibold ${active ? "text-indigo-900" : "text-slate-800"}`}>
                          {preset.label}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">{preset.description}</p>
                      </div>
                      {active && (
                        <svg className="h-4 w-4 shrink-0 text-indigo-600" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 4.5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Presets apply a full style bundle. Refine individual settings in the other tabs.
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
                            ? "border-indigo-300 bg-indigo-600 text-white shadow-sm"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
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
                            ? "border-indigo-300 bg-indigo-600 text-white shadow-sm"
                            : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}>
                        <span className="font-semibold">{lay.label}</span>
                        <span className={`text-[10px] ${active ? "text-white/70" : "text-slate-400"}`}>{lay.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <SectionLabel>Overlay</SectionLabel>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2">
                  <Toggle
                    checked={config.overlayEnabled}
                    onChange={(v) => onChange("overlayEnabled", v)}
                    label="Show semi-transparent overlay"
                  />
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
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Square</span><span>Rounded</span>
                  </div>
                </div>
              </div>

              <div>
                <SectionLabel>Buttons</SectionLabel>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-1 divide-y divide-slate-100">
                  <Toggle checked={config.showAcceptAll}  onChange={(v) => onChange("showAcceptAll", v)}  label="Show Accept all"          />
                  <Toggle checked={config.showRejectAll}  onChange={(v) => onChange("showRejectAll", v)}  label="Show Reject all"          />
                  <Toggle checked={config.showCustomize}  onChange={(v) => onChange("showCustomize", v)}  label="Show Customize"           />
                  <Toggle checked={config.showCloseButton} onChange={(v) => onChange("showCloseButton", v)} label="Show close button"      />
                  <Toggle checked={config.showPoweredBy}  onChange={(v) => onChange("showPoweredBy", v)}  label="Show powered-by"          />
                </div>
              </div>

              <div>
                <SectionLabel>Preference center</SectionLabel>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-1 divide-y divide-slate-100">
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
                  <select value={config.defaultConsent} onChange={(e) => onChange("defaultConsent", e.target.value as ConsentDefault)} className={selectCls}>
                    <option value="none">None — wait for explicit choice</option>
                    <option value="opt-in">Opt-in — grant by default</option>
                    <option value="opt-out">Opt-out — deny by default</option>
                  </select>
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
                <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-1 divide-y divide-slate-100">
                  <Toggle checked={config.respectDoNotTrack}    onChange={(v) => onChange("respectDoNotTrack", v)}    label="Respect Do Not Track"       />
                  <Toggle checked={config.closeOnOverlayClick}  onChange={(v) => onChange("closeOnOverlayClick", v)}  label="Close on overlay click"     />
                  <Toggle checked={config.blockPageUntilConsent} onChange={(v) => onChange("blockPageUntilConsent", v)} label="Block page until consent"  />
                  <Toggle checked={config.showOnEveryVisit}     onChange={(v) => onChange("showOnEveryVisit", v)}     label="Show on every visit"        />
                </div>
              </div>

              <div>
                <SectionLabel>Locale</SectionLabel>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Language">
                    <select value={config.language} onChange={(e) => onChange("language", e.target.value)} className={selectCls}>
                      <LocaleSelectOptions includeCurrent={config.language} />
                    </select>
                  </Field>
                  <Field label="Regulation">
                    <select value={config.region} onChange={(e) => onChange("region", e.target.value)} className={selectCls}>
                      <option value="">— None —</option>
                      <option value="EU">EU (GDPR)</option>
                      <option value="IN">India (DPDP)</option>
                      <option value="US">US (CCPA)</option>
                      <option value="UK">UK (UK GDPR)</option>
                      <option value="AU">Australia</option>
                      <option value="CA">Canada (PIPEDA)</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Footer save bar ──────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-100 bg-white p-3 space-y-2">
        {saveError && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}><circle cx="8" cy="8" r="6"/><path strokeLinecap="round" d="M8 5v3M8 11h.01"/></svg>
            {saveError}
          </div>
        )}
        {saveSuccess && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 4.5"/></svg>
            Configuration saved successfully.
          </div>
        )}
        {!hasVersion && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M8 2l6 12H2z"/><path strokeLinecap="round" d="M8 7v3M8 12h.01"/></svg>
            No policy version — cannot save.
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !hasVersion}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/></svg>
                Saving…
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 4.5"/></svg>
                Save configuration
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onReset}
            title="Reset to defaults"
            className="flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M2.5 8A5.5 5.5 0 118 13.5"/><path strokeLinecap="round" d="M2.5 5v3h3"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export { PRESETS };
export type { Preset };
