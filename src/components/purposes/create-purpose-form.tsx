"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { PURPOSE_TEMPLATES, type PurposeTemplate } from "@/lib/templates/purpose-templates";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 100);
}

const inputCls = "field-input";

// DPDP Rules 2025 — common data-category labels as suggestions.
const DATA_CATEGORY_SUGGESTIONS = [
  "Email address",
  "Phone number",
  "Full name",
  "Date of birth",
  "IP address",
  "Device identifiers",
  "Location data",
  "Browsing history",
  "Cookie identifiers",
  "Financial information",
  "Government ID",
  "Health data",
  "Biometric data",
  "User preferences",
];

// DPDP-recognised processing grounds.
const LEGAL_BASIS_OPTIONS = [
  { value: "consent",               label: "Consent (DPDP §6)" },
  { value: "legitimate_interest",   label: "Legitimate interest" },
  { value: "legal_obligation",      label: "Legal obligation" },
  { value: "vital_interest",        label: "Vital interests" },
  { value: "public_task",           label: "Public task" },
] as const;

// ---------------------------------------------------------------------------
// DataCategoriesInput — tag-style multi-value input
// ---------------------------------------------------------------------------

function DataCategoriesInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [inputVal, setInputVal] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const remaining = DATA_CATEGORY_SUGGESTIONS.filter(
    (s) => !value.includes(s),
  );

  function add(label: string) {
    const trimmed = label.trim();
    if (!trimmed || value.includes(trimmed) || value.length >= 20) return;
    onChange([...value, trimmed]);
    setInputVal("");
  }

  function remove(label: string) {
    onChange(value.filter((v) => v !== label));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && inputVal.trim()) {
      e.preventDefault();
      add(inputVal);
    }
    if (e.key === "Backspace" && !inputVal && value.length > 0) {
      remove(value[value.length - 1]);
    }
  }

  return (
    <div className="space-y-2.5">
      {/* Tag display + text input */}
      <div
        className="flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/15 transition cursor-text"
        onClick={() => document.getElementById("data-cat-input")?.focus()}
      >
        {value.map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-500/20"
          >
            {cat}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(cat); }}
              className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-700 transition"
              aria-label={`Remove ${cat}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="data-cat-input"
          type="text"
          value={inputVal}
          onChange={(e) => { setInputVal(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? "Type a category and press Enter…" : ""}
          className="min-w-[140px] flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Suggestion chips */}
      {showSuggestions && remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {remaining
            .filter((s) =>
              !inputVal || s.toLowerCase().includes(inputVal.toLowerCase()),
            )
            .slice(0, 10)
            .map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); add(s); }}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600 transition hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700"
              >
                + {s}
              </button>
            ))}
        </div>
      )}

      <p className="text-xs text-slate-400">
        Press <kbd className="rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[10px]">Enter</kbd>{" "}
        or <kbd className="rounded border border-slate-200 bg-slate-100 px-1 font-mono text-[10px]">,</kbd>{" "}
        to add. Click a suggestion to insert it. Max 20 categories.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CreatePurposeForm
// ---------------------------------------------------------------------------

export function CreatePurposeForm() {
  const router = useRouter();

  const [templateKey, setTemplateKey] = useState<string>("custom");
  const [name, setName]               = useState("");
  const [key, setKey]                 = useState("");
  const [keyTouched, setKeyTouched]   = useState(false);
  const [description, setDescription] = useState("");
  const [isRequired, setIsRequired]   = useState(false);
  const [status, setStatus]           = useState<"active" | "inactive">("active");

  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [retentionPeriod, setRetentionPeriod] = useState("");
  const [legalBasis, setLegalBasis]   = useState("consent");

  const { pending: saving, run } = useAsyncAction();
  const [error, setError]     = useState("");

  function applyPurposeTemplate(tpl: PurposeTemplate | null) {
    if (!tpl) {
      setTemplateKey("custom");
      return;
    }
    setTemplateKey(tpl.key);
    setName(tpl.name);
    setKey(tpl.key);
    setKeyTouched(true);
    setDescription(tpl.description);
    setIsRequired(tpl.isRequired);
    setDataCategories([...tpl.dataCategories]);
    setRetentionPeriod(tpl.retentionPeriod);
    setLegalBasis(tpl.legalBasis);
    setStatus("active");
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!keyTouched) setKey(deriveKey(value));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        "/api/purposes",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            key: key.trim() || deriveKey(name),
            description: description.trim() || null,
            isRequired,
            status,
            dataCategories: dataCategories.length > 0 ? dataCategories : null,
            retentionPeriod: retentionPeriod.trim() || null,
            legalBasis,
          }),
        },
        {
          successMessage: "Purpose created successfully",
          errorFallback: "Unable to create purpose. Please try again.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      router.push("/dashboard/purposes");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Start from a template</h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose a common cookie category, then edit the wording before you save.
          </p>
        </div>
        <div className="grid gap-2 p-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => applyPurposeTemplate(null)}
            className={`rounded-2xl border p-3 text-left transition ${
              templateKey === "custom"
                ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-400/30"
                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <p className="text-sm font-semibold text-slate-900">Custom</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Blank purpose — fill in your own details.</p>
          </button>
          {PURPOSE_TEMPLATES.map((tpl) => {
            const active = templateKey === tpl.key;
            return (
              <button
                key={tpl.key}
                type="button"
                onClick={() => applyPurposeTemplate(tpl)}
                className={`rounded-2xl border p-3 text-left transition ${
                  active
                    ? "border-indigo-300 bg-indigo-50 ring-1 ring-indigo-400/30"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{tpl.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{tpl.summary}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Core details ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">Purpose details</h2>
        </div>
        <div className="space-y-5 p-6">

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Name <span className="text-rose-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              maxLength={150}
              placeholder="Analytics"
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Key{" "}
              <span className="font-normal text-slate-400">(unique identifier, auto-generated)</span>
            </label>
            <input
              value={key}
              onChange={(e) => {
                setKeyTouched(true);
                setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 100));
              }}
              required
              maxLength={100}
              placeholder="analytics"
              className={`${inputCls} font-mono`}
            />
            <p className="mt-1 text-xs text-slate-400">
              Lowercase letters, digits, and underscores only. Cannot be changed after creation.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Description{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Explain what this purpose is for — shown to visitors in the consent banner."
              className={inputCls}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
              className={inputCls}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={isRequired}
              onChange={(e) => setIsRequired(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-600"
            />
            <span className="text-sm text-slate-700">
              This purpose is required (visitor cannot decline)
            </span>
          </label>
        </div>
      </div>

      {/* ── DPDP Notice enrichment ────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow">
        <div className="border-b border-[var(--border)] px-6 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold text-slate-900">
              DPDP Notice information
            </h2>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-500/20">
              DPDP Rules 2025 Rule 3
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Required for a compliant consent notice under the Digital Personal Data
            Protection Rules 2025. Shown to visitors in the Preference Center when
            purpose descriptions are enabled.
          </p>
        </div>
        <div className="space-y-5 p-6">

          {/* Data categories */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Personal data categories processed
            </label>
            <DataCategoriesInput
              value={dataCategories}
              onChange={setDataCategories}
            />
          </div>

          {/* Retention period */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Retention period
            </label>
            <input
              value={retentionPeriod}
              onChange={(e) => setRetentionPeriod(e.target.value)}
              maxLength={255}
              placeholder="e.g. 12 months, Until account deletion, 90 days from last visit"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-slate-400">
              How long personal data processed for this purpose is retained.
              This text is shown directly in the consent notice.
            </p>
          </div>

          {/* Legal basis */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
              Legal basis for processing
            </label>
            <select
              value={legalBasis}
              onChange={(e) => setLegalBasis(e.target.value)}
              className={inputCls}
            >
              {LEGAL_BASIS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              For most consent-based purposes, select <strong>Consent (DPDP §6)</strong>.
            </p>
          </div>

        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <svg
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
            fill="none"
            viewBox="0 0 16 16"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="6" />
            <path strokeLinecap="round" d="M8 5v3M8 11h.01" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={saving}>
          {saving ? "Creating purpose..." : "Create purpose"}
        </Button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-2xl border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
