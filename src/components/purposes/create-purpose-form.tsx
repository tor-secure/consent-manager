"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Field, FormActions, FormCard } from "@/components/ui/field";
import { TemplateTile } from "@/components/dashboard/create-page-header";
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
    <form onSubmit={handleSubmit} className="space-y-5" aria-busy={saving}>
      <FormCard
        title="Start from a template"
        description="Choose a common cookie category, then edit the wording before you save."
      >
        <div className="grid items-stretch gap-3 sm:grid-cols-2">
          <TemplateTile
            active={templateKey === "custom"}
            title="Custom"
            summary="Blank purpose — fill in your own details."
            onClick={() => applyPurposeTemplate(null)}
          />
          {PURPOSE_TEMPLATES.map((tpl) => (
            <TemplateTile
              key={tpl.key}
              active={templateKey === tpl.key}
              title={tpl.name}
              summary={tpl.summary}
              onClick={() => applyPurposeTemplate(tpl)}
            />
          ))}
        </div>
      </FormCard>

      <FormCard title="Purpose details" description="Name and key identify this purpose in policies, banners, and consent records.">
        <Field label="Name" htmlFor="purpose-name">
          <Input
            id="purpose-name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            maxLength={150}
            placeholder="Analytics"
          />
        </Field>
        <Field
          label="Key"
          htmlFor="purpose-key"
          hint="Lowercase letters, digits, and underscores only. Cannot be changed after creation."
        >
          <Input
            id="purpose-key"
            value={key}
            onChange={(e) => {
              setKeyTouched(true);
              setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 100));
            }}
            required
            maxLength={100}
            placeholder="analytics"
            className="font-mono"
          />
        </Field>
        <Field label="Description (optional)" htmlFor="purpose-description">
          <Textarea
            id="purpose-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Explain what this purpose is for — shown to visitors in the consent banner."
          />
        </Field>
        <Field label="Status" htmlFor="purpose-status">
          <Select
            id="purpose-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 px-4 py-3">
          <input
            type="checkbox"
            checked={isRequired}
            onChange={(e) => setIsRequired(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[var(--border)] accent-[var(--primary)]"
          />
          <span className="text-sm text-[var(--secondary-foreground)]">
            This purpose is required (visitor cannot decline)
          </span>
        </label>
      </FormCard>

      <FormCard
        title="DPDP notice information"
        titleExtra={
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-indigo-500/20">
            DPDP Rules 2025 Rule 3
          </span>
        }
        description="Shown in the preference center when purpose descriptions are enabled. Required for a compliant notice under the Digital Personal Data Protection Rules 2025."
      >
        <Field label="Personal data categories processed" htmlFor="data-cat-input">
          <DataCategoriesInput
            value={dataCategories}
            onChange={setDataCategories}
          />
        </Field>
        <Field
          label="Retention period"
          htmlFor="purpose-retention"
          hint="How long personal data processed for this purpose is retained. This text is shown in the consent notice."
        >
          <Input
            id="purpose-retention"
            value={retentionPeriod}
            onChange={(e) => setRetentionPeriod(e.target.value)}
            maxLength={255}
            placeholder="e.g. 12 months, Until account deletion, 90 days from last visit"
          />
        </Field>
        <Field
          label="Legal basis for processing"
          htmlFor="purpose-legal-basis"
          hint="For most consent-based purposes, select Consent (DPDP §6)."
        >
          <Select
            id="purpose-legal-basis"
            value={legalBasis}
            onChange={(e) => setLegalBasis(e.target.value)}
          >
            {LEGAL_BASIS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </Field>
      </FormCard>

      {error ? (
        <Alert variant="error" role="alert">
          {error}
        </Alert>
      ) : null}

      <FormActions>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {saving ? "Creating purpose..." : "Create purpose"}
        </Button>
      </FormActions>
    </form>
  );
}
