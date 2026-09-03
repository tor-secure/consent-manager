"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import {
  defaultBannerConfig,
  parseBannerConfig,
  getTranslation,
  setTranslation,
  SUPPORTED_LANGUAGES,
  resolveTranslation,
  translationStatus,
  applyResolvedNotice,
  type BannerConfiguration,
  type BannerPosition,
  type BannerLayout,
  type ConsentDefault,
  type NoticeTranslation,
} from "@/lib/banner-config";
import { LocaleSelectOptions } from "@/components/i18n/locale-select-options";
import { localeLabel } from "@/lib/i18n/locale-registry";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition";

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
    <label className="flex cursor-pointer items-center gap-3 py-0.5">
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
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Live preview
// ---------------------------------------------------------------------------

function BannerPreview({ config, locale }: { config: BannerConfiguration; locale?: string }) {
  const isBar = config.layout === "bar";
  const isBox = config.layout === "box";
  const radius = `${config.borderRadius}px`;
  const resolved = resolveTranslation(config, locale || config.language || "en");
  const preview = applyResolvedNotice(config, resolved);

  const positionClass: Record<BannerPosition, string> = {
    bottom: "bottom-0 left-0 right-0",
    top: "top-0 left-0 right-0",
    "bottom-left": "bottom-0 left-0",
    "bottom-right": "bottom-0 right-0",
    center: "inset-0 flex items-center justify-center",
  };

  return (
    <div
      className="relative h-48 w-full overflow-hidden rounded-xl border bg-slate-100"
      aria-label="Banner preview"
      role="img"
    >
      <div className="absolute inset-0 p-3 opacity-20">
        <div className="mb-2 h-2 w-3/4 rounded bg-slate-400" />
        <div className="mb-1.5 h-1.5 rounded bg-slate-300" />
        <div className="mb-1.5 h-1.5 w-5/6 rounded bg-slate-300" />
        <div className="mb-1.5 h-1.5 w-4/5 rounded bg-slate-300" />
      </div>
      {config.overlayEnabled && <div className="absolute inset-0 bg-black/30" />}
      <div className={`absolute ${positionClass[config.position]} ${config.position === "center" ? "" : "p-2"}`} style={{ zIndex: 10 }} dir={resolved.direction} lang={resolved.resolvedLocale}>
        <div style={{
          backgroundColor: config.backgroundColor, color: config.textColor,
          borderRadius: radius, border: "1px solid #e5e7eb",
          padding: isBar ? "8px 12px" : "12px",
          maxWidth: isBox ? "220px" : isBar ? "100%" : "260px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          fontSize: "9px", lineHeight: 1.4, textAlign: "start",
        }}>
          {preview.title && <p style={{ fontWeight: 600, marginBottom: 3, fontSize: "10px" }}>{preview.title}</p>}
          {preview.description && !isBar && (
            <p style={{ opacity: 0.75, marginBottom: 6, fontSize: "8px" }}>
              {preview.description.slice(0, 80)}{preview.description.length > 80 ? "…" : ""}
            </p>
          )}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: isBar ? 0 : 4 }}>
            {config.showAcceptAll && (
              <span style={{ backgroundColor: config.primaryColor, color: "#fff", borderRadius: 4, padding: "2px 6px", fontSize: "8px", fontWeight: 600, whiteSpace: "normal" }}>
                {preview.acceptAllLabel || "Accept all"}
              </span>
            )}
            {config.showRejectAll && (
              <span style={{ border: `1px solid ${config.primaryColor}`, color: config.primaryColor, borderRadius: 4, padding: "2px 6px", fontSize: "8px", whiteSpace: "normal" }}>
                {preview.rejectAllLabel || "Reject all"}
              </span>
            )}
            {config.showCustomize && (
              <span style={{ color: config.primaryColor, fontSize: "8px", textDecoration: "underline", whiteSpace: "normal" }}>
                {preview.customizeLabel || "Customize"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Translation fields for a single language
// ---------------------------------------------------------------------------

function TranslationSection({
  langCode,
  langLabel,
  englishConfig,
  translation,
  onChange,
}: {
  langCode: string;
  langLabel: string;
  englishConfig: BannerConfiguration;
  translation: NoticeTranslation;
  onChange: (t: NoticeTranslation) => void;
}) {
  const fields: { key: Exclude<keyof NoticeTranslation, "purposes" | "vendors">; label: string; multiline?: boolean; placeholder: string }[] = [
    { key: "title",               label: "Title",                 placeholder: englishConfig.title },
    { key: "description",         label: "Description",           multiline: true, placeholder: englishConfig.description },
    { key: "acceptAllLabel",      label: "Accept all label",      placeholder: englishConfig.acceptAllLabel },
    { key: "rejectAllLabel",      label: "Reject all label",      placeholder: englishConfig.rejectAllLabel },
    { key: "customizeLabel",      label: "Manage preferences label", placeholder: englishConfig.customizeLabel },
    { key: "savePreferencesLabel",label: "Save preferences label",placeholder: englishConfig.savePreferencesLabel },
    { key: "privacyPolicyText",   label: "Privacy policy link text", placeholder: englishConfig.privacyPolicyText },
    { key: "closeLabel",          label: "Close label",           placeholder: englishConfig.closeLabel },
    { key: "preferenceCenterTitle", label: "Preference center title", placeholder: englishConfig.preferenceCenterTitle },
    { key: "preferenceCenterDescription", label: "Preference center description", multiline: true, placeholder: englishConfig.preferenceCenterDescription },
    { key: "purposesHeading",     label: "Purposes heading",      placeholder: englishConfig.purposesHeading },
    { key: "vendorsHeading",      label: "Vendors heading",       placeholder: englishConfig.vendorsHeading },
    { key: "requiredLabel",       label: "Required label",        placeholder: englishConfig.requiredLabel },
  ];

  function upd(key: (typeof fields)[number]["key"], val: string) {
    onChange({ ...translation, [key]: val || undefined });
  }

  const status = translationStatus(translation);
  const statusLabel =
    status === "translated" ? "Translated" : status === "partial" ? "Partially translated" : "Using fallback";

  // Count filled fields for the badge
  const filledCount = fields.filter((f) => !!translation[f.key]).length;

  return (
    <details className="group rounded-2xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 select-none">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-900">{langLabel}</span>
          <code className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-500">{langCode}</code>
        </div>
        <div className="flex items-center gap-2">
          {filledCount > 0 && (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-500/20">
              {statusLabel} · {filledCount}/{fields.length}
            </span>
          )}
          <svg
            className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180"
            fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
          </svg>
        </div>
      </summary>

      <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
        <p className="text-xs text-slate-400">
          Leave a field blank to fall back to the English default shown as placeholder text.
        </p>
        {fields.map((f) => (
          <div key={f.key}>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">{f.label}</label>
            {f.multiline ? (
              <textarea
                value={translation[f.key] ?? ""}
                onChange={(e) => upd(f.key, e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder={f.placeholder}
                className={`${inputCls} text-xs`}
              />
            ) : (
              <input
                value={translation[f.key] ?? ""}
                onChange={(e) => upd(f.key, e.target.value)}
                maxLength={255}
                placeholder={f.placeholder}
                className={`${inputCls} text-xs`}
              />
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Tab type
// ---------------------------------------------------------------------------

type TabId = "text" | "controls" | "behavior" | "appearance" | "translations";

const TABS: { id: TabId; label: string }[] = [
  { id: "text",         label: "Text" },
  { id: "controls",     label: "Controls" },
  { id: "behavior",     label: "Behavior" },
  { id: "appearance",   label: "Appearance" },
  { id: "translations", label: "Languages" },
];

// ---------------------------------------------------------------------------
// BannerConfigForm
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
  const [config, setConfig]   = useState<BannerConfiguration>(initialConfig);
  const [activeTab, setTab]   = useState<TabId>("text");
  const { pending: saving, run } = useAsyncAction();
  const [error, setError]     = useState("");

  // Active translation language picker
  const [selectedLang, setSelectedLang] = useState<string>(
    SUPPORTED_LANGUAGES.filter((l) => l.code !== "en")[0]?.code ?? "hi",
  );

  function update<K extends keyof BannerConfiguration>(key: K, value: BannerConfiguration[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function updateTranslation(langCode: string, t: NoticeTranslation) {
    setConfig((prev) => setTranslation(prev, langCode, t));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!latestVersionId) return;
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        `/api/policies/${policyId}/banner-config`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(config),
        },
        {
          successMessage: "Banner saved successfully",
          errorFallback: "Unable to save banner. Please try again.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      router.refresh();
    });
  }

  // Count total translated languages for the tab badge
  const translatedLangs = Object.keys(config.translations ?? {}).filter(
    (k) => Object.values((config.translations ?? {})[k] ?? {}).some(Boolean),
  ).length;

  if (!latestVersionId) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center">
        <p className="text-sm text-slate-400">
          No policy version found. A version is required before configuring the banner.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave}>
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        {/* Left — tabbed form */}
        <div className="min-w-0 space-y-5">
          {/* Tab bar */}
          <div className="flex flex-wrap gap-0.5 rounded-2xl border border-slate-200 bg-slate-50 p-0.5">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition ${
                  activeTab === t.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t.label}
                {t.id === "translations" && translatedLangs > 0 && (
                  <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                    {translatedLangs}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── TEXT ─────────────────────────────────────────────────────── */}
          {activeTab === "text" && (
            <div className="rounded-2xl bg-white card-shadow p-6 space-y-5">
              <Field label="Banner title">
                <input value={config.title} onChange={(e) => update("title", e.target.value)} maxLength={255} className={inputCls} />
              </Field>
              <Field label="Description">
                <textarea value={config.description} onChange={(e) => update("description", e.target.value)} rows={4} maxLength={2000} className={inputCls} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Accept all"><input value={config.acceptAllLabel} onChange={(e) => update("acceptAllLabel", e.target.value)} maxLength={100} className={inputCls} /></Field>
                <Field label="Reject all"><input value={config.rejectAllLabel} onChange={(e) => update("rejectAllLabel", e.target.value)} maxLength={100} className={inputCls} /></Field>
                <Field label="Customize"><input value={config.customizeLabel} onChange={(e) => update("customizeLabel", e.target.value)} maxLength={100} className={inputCls} /></Field>
                <Field label="Save preferences"><input value={config.savePreferencesLabel} onChange={(e) => update("savePreferencesLabel", e.target.value)} maxLength={100} className={inputCls} /></Field>
                <Field label="Privacy policy link text"><input value={config.privacyPolicyText} onChange={(e) => update("privacyPolicyText", e.target.value)} maxLength={100} className={inputCls} /></Field>
                <Field label="Privacy policy URL"><input type="url" value={config.privacyPolicyUrl} onChange={(e) => update("privacyPolicyUrl", e.target.value)} placeholder="https://example.com/privacy" className={inputCls} /></Field>
                <Field label="Close"><input value={config.closeLabel} onChange={(e) => update("closeLabel", e.target.value)} maxLength={100} className={inputCls} /></Field>
                <Field label="Preference center title"><input value={config.preferenceCenterTitle} onChange={(e) => update("preferenceCenterTitle", e.target.value)} maxLength={255} className={inputCls} /></Field>
                <Field label="Purposes heading"><input value={config.purposesHeading} onChange={(e) => update("purposesHeading", e.target.value)} maxLength={100} className={inputCls} /></Field>
                <Field label="Vendors heading"><input value={config.vendorsHeading} onChange={(e) => update("vendorsHeading", e.target.value)} maxLength={100} className={inputCls} /></Field>
                <Field label="Required label"><input value={config.requiredLabel} onChange={(e) => update("requiredLabel", e.target.value)} maxLength={100} className={inputCls} /></Field>
              </div>
              <Field label="Preference center description">
                <textarea value={config.preferenceCenterDescription} onChange={(e) => update("preferenceCenterDescription", e.target.value)} rows={3} maxLength={2000} className={inputCls} />
              </Field>
            </div>
          )}

          {/* ── CONTROLS ─────────────────────────────────────────────────── */}
          {activeTab === "controls" && (
            <div className="rounded-2xl bg-white card-shadow p-6 space-y-4">
              <div className="space-y-3">
                <Toggle checked={config.showAcceptAll} onChange={(v) => update("showAcceptAll", v)} label="Show Accept all button" />
                <Toggle checked={config.showRejectAll} onChange={(v) => update("showRejectAll", v)} label="Show Reject all button" />
                <Toggle checked={config.showCustomize} onChange={(v) => update("showCustomize", v)} label="Show Customize / Manage preferences link" />
                <Toggle checked={config.showCloseButton} onChange={(v) => update("showCloseButton", v)} label="Show close ✕ button" />
                <Toggle checked={config.showPoweredBy} onChange={(v) => update("showPoweredBy", v)} label="Show powered-by attribution" />
              </div>
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preference center</p>
                <Toggle checked={config.showPurposeDescriptions} onChange={(v) => update("showPurposeDescriptions", v)} label="Show purpose descriptions" />
                <Toggle checked={config.showVendorList} onChange={(v) => update("showVendorList", v)} label="Show vendor list" />
                <Toggle checked={config.showLegalBasis} onChange={(v) => update("showLegalBasis", v)} label="Show legal basis for each purpose" />
              </div>
            </div>
          )}

          {/* ── BEHAVIOR ─────────────────────────────────────────────────── */}
          {activeTab === "behavior" && (
            <div className="rounded-2xl bg-white card-shadow p-6 space-y-5">
              <Field label="Default consent">
                <select value={config.defaultConsent} onChange={(e) => update("defaultConsent", e.target.value as ConsentDefault)} className={inputCls}>
                  <option value="none">None (wait for explicit choice)</option>
                  <option value="opt-in">Opt-in (consent granted by default)</option>
                  <option value="opt-out">Opt-out (consent denied by default)</option>
                </select>
              </Field>
              <Field label="Consent expires after (days)" hint="1–3650 days.">
                <input type="number" min={1} max={3650} value={config.consentExpireDays} onChange={(e) => update("consentExpireDays", parseInt(e.target.value, 10) || 365)} className={inputCls} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Regulation region" hint="Determines which rules apply.">
                  <select value={config.region} onChange={(e) => update("region", e.target.value)} className={inputCls}>
                    <option value="">— None —</option>
                    <option value="EU">EU (GDPR)</option>
                    <option value="IN">India (DPDP)</option>
                    <option value="US">US (CCPA)</option>
                    <option value="UK">UK (UK GDPR)</option>
                    <option value="AU">Australia</option>
                    <option value="CA">Canada (PIPEDA)</option>
                  </select>
                </Field>
                <Field label="Default language" hint="Shown when no translation matches.">
                  <select value={config.language} onChange={(e) => update("language", e.target.value)} className={inputCls}>
                    <LocaleSelectOptions includeCurrent={config.language} />
                  </select>
                </Field>
              </div>
              <div className="space-y-3">
                <Toggle checked={config.respectDoNotTrack}    onChange={(v) => update("respectDoNotTrack", v)}    label="Respect Do Not Track (DNT) header" />
                <Toggle checked={config.closeOnOverlayClick}  onChange={(v) => update("closeOnOverlayClick", v)}  label="Close banner on overlay click" />
                <Toggle checked={config.blockPageUntilConsent}onChange={(v) => update("blockPageUntilConsent", v)}label="Block page scrolling until consent given" />
                <Toggle checked={config.showOnEveryVisit}     onChange={(v) => update("showOnEveryVisit", v)}     label="Show banner on every visit" />
              </div>
            </div>
          )}

          {/* ── APPEARANCE ───────────────────────────────────────────────── */}
          {activeTab === "appearance" && (
            <div className="rounded-2xl bg-white card-shadow p-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Layout">
                  <select value={config.layout} onChange={(e) => update("layout", e.target.value as BannerLayout)} className={inputCls}>
                    <option value="bar">Bar (full width)</option>
                    <option value="box">Box (compact)</option>
                    <option value="dialog">Dialog (centred modal)</option>
                  </select>
                </Field>
                <Field label="Position">
                  <select value={config.position} onChange={(e) => update("position", e.target.value as BannerPosition)} className={inputCls}>
                    <option value="bottom">Bottom</option>
                    <option value="top">Top</option>
                    <option value="bottom-left">Bottom left</option>
                    <option value="bottom-right">Bottom right</option>
                    <option value="center">Centred</option>
                  </select>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {(["primaryColor", "backgroundColor", "textColor"] as const).map((key) => (
                  <Field key={key} label={{ primaryColor: "Primary colour", backgroundColor: "Background", textColor: "Text colour" }[key]}>
                    <div className="flex items-center gap-2">
                      <input type="color" value={config[key]} onChange={(e) => update(key, e.target.value)} className="h-9 w-10 cursor-pointer rounded-xl border p-0.5" />
                      <input value={config[key]} onChange={(e) => update(key, e.target.value)} maxLength={7} className="flex-1 rounded-xl border border-slate-200 px-2 py-2 font-mono text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15" />
                    </div>
                  </Field>
                ))}
              </div>
              <Field label={`Border radius — ${config.borderRadius}px`} hint="0 = square, 24 = pill">
                <input type="range" min={0} max={24} value={config.borderRadius} onChange={(e) => update("borderRadius", parseInt(e.target.value, 10))} className="w-full accent-indigo-600" />
              </Field>
              <Toggle checked={config.overlayEnabled} onChange={(v) => update("overlayEnabled", v)} label="Show semi-transparent overlay behind banner" />
            </div>
          )}

          {/* ── TRANSLATIONS ─────────────────────────────────────────────── */}
          {activeTab === "translations" && (
            <div className="space-y-4">
              {/* Header info */}
              <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <circle cx="8" cy="8" r="6" /><path strokeLinecap="round" d="M8 7v4M8 5h.01" />
                </svg>
                <div className="text-sm text-indigo-800">
                  <strong className="font-semibold">DPDP Rules 2025 Rule 3 — multilingual notice.</strong>{" "}
                  Add translations for visitor-facing banner and preference-center text. Leave a field blank to use fallback copy. Languages can be published partially. Locale selection does not change regulation or consent decisions.
                </div>
              </div>

              {/* Language picker */}
              <div className="rounded-2xl bg-white card-shadow p-5">
                <Field
                  label="Supported languages"
                  hint="Optional allowlist for the public banner. Leave empty to accept any registered locale, then fall back as documented."
                >
                  <select
                    multiple
                    size={8}
                    value={config.supportedLocales ?? []}
                    onChange={(e) => {
                      const next = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                      update("supportedLocales", next);
                    }}
                    className={`${inputCls} h-40`}
                  >
                    <LocaleSelectOptions />
                  </select>
                </Field>
                <div className="mb-4 mt-5 flex flex-wrap items-center gap-3">
                  <label className="text-sm font-semibold text-slate-700 shrink-0">Edit translation for:</label>
                  <select
                    value={selectedLang}
                    onChange={(e) => setSelectedLang(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15 transition max-w-xs"
                  >
                    {SUPPORTED_LANGUAGES.filter((l) => l.code !== "en").map((l) => (
                      <option key={l.code} value={l.code}>{l.label}</option>
                    ))}
                  </select>
                </div>

                {/* Fields for the selected language */}
                <TranslationSection
                  key={selectedLang}
                  langCode={selectedLang}
                  langLabel={localeLabel(selectedLang)}
                  englishConfig={config}
                  translation={getTranslation(config, selectedLang)}
                  onChange={(t) => updateTranslation(selectedLang, t)}
                />
              </div>

              {/* Already-translated languages summary */}
              {translatedLangs > 0 && (
                <div className="rounded-2xl bg-white card-shadow p-5">
                  <p className="mb-3 text-sm font-semibold text-slate-700">All translated languages</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(config.translations ?? {})
                      .filter((code) => {
                        const t = (config.translations ?? {})[code];
                        return t && Object.values(t).some(Boolean);
                      })
                      .map((code) => {
                        const lang = SUPPORTED_LANGUAGES.find((l) => l.code === code);
                        const t = (config.translations ?? {})[code] ?? {};
                        const status = translationStatus(t);
                        const statusText =
                          status === "translated" ? "Translated" : status === "partial" ? "Partial" : "Fallback";
                        return (
                          <button
                            key={code}
                            type="button"
                            onClick={() => setSelectedLang(code)}
                            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition ${
                              selectedLang === code
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                            }`}
                          >
                            {lang?.label ?? localeLabel(code)}
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedLang === code ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"}`}>
                              {statusText}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback + actions */}
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <circle cx="8" cy="8" r="6" /><path strokeLinecap="round" d="M8 5v3M8 11h.01" />
              </svg>
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={saving} aria-busy={saving || undefined}
              className="inline-flex items-center rounded-2xl bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
              {saving ? "Saving..." : "Save draft"}
            </button>
            <button type="button" onClick={() => { setConfig(parseBannerConfig({})); setError(""); }}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
              Reset to defaults
            </button>
          </div>
        </div>

        {/* Right — sticky preview */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-2xl bg-white card-shadow p-5">
            <p className="mb-3 text-sm font-semibold text-slate-900">Live preview</p>
            <p className="mb-4 text-xs text-slate-400">Reflects current text, appearance, and the selected preview language.</p>
            <label className="mb-2 block text-xs font-semibold text-slate-600">Preview language</label>
            <select
              value={activeTab === "translations" ? selectedLang : config.language}
              onChange={(e) => {
                setSelectedLang(e.target.value);
                setTab("translations");
              }}
              className={`${inputCls} mb-3 text-xs`}
            >
              <option value="en">English (root)</option>
              <LocaleSelectOptions />
            </select>
            <BannerPreview
              config={config}
              locale={activeTab === "translations" ? selectedLang : config.language}
            />
            <dl className="mt-4 space-y-1 text-xs text-slate-500">
              {[
                ["Layout",    config.layout],
                ["Position",  config.position],
                ["Default",   config.defaultConsent],
                ["Expires",   `${config.consentExpireDays} days`],
                ["Region",    config.region || "—"],
                ["Languages", translatedLangs > 0 ? `EN + ${translatedLangs} translated` : "English only"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt>{k}</dt><dd className="text-slate-700 capitalize">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </form>
  );
}
