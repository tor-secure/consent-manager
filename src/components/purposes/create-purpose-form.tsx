"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import { PURPOSE_TEMPLATES, type PurposeTemplate } from "@/lib/templates/purpose-templates";

const NAME_MAX = 50;
const KEY_MAX = 50;
const DESCRIPTION_MAX = 300;
const RETENTION_MAX = 255;

const DATA_CATEGORY_SUGGESTIONS = [
  "Browsing data",
  "Device identifiers",
  "Usage data",
  "Email address",
  "Phone number",
  "IP address",
  "Location data",
  "Cookie identifiers",
  "User preferences",
  "Browsing history",
];

type TemplateMeta = {
  key: string;
  name: string;
  summary: string;
  iconBg: string;
  iconColor: string;
  paths: React.ReactNode;
  tpl: PurposeTemplate | null;
};

const TOPIC_ROWS = [
  {
    key: "analytics",
    label: "Analytics & tracking",
    mentions: 8,
    iconBg: "bg-[#EEF2FF]",
    iconColor: "text-[#4338CA]",
    path: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    ),
  },
  {
    key: "necessary",
    label: "Consent banners",
    mentions: 6,
    iconBg: "bg-[#EFF6FF]",
    iconColor: "text-[#2563EB]",
    path: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
      />
    ),
  },
  {
    key: "functional",
    label: "Data retention",
    mentions: 4,
    iconBg: "bg-[#F3F4F6]",
    iconColor: "text-[#4B5563]",
    path: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375"
      />
    ),
  },
  {
    key: "advertising",
    label: "Advertising & remarketing",
    mentions: 4,
    iconBg: "bg-[#FFF7ED]",
    iconColor: "text-[#EA580C]",
    path: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 01-1.44-.23l-3.22-.96A1.125 1.125 0 012.25 13.5v-3a1.125 1.125 0 01.59-1.005l3.22-.96A4.5 4.5 0 017.5 8.25h.75c.704 0 1.402-.03 2.09-.09m0 7.68a15.35 15.35 0 002.454.15C15.482 16 18 14.21 18 12s-2.518-4-5.206-4a15.35 15.35 0 00-2.454.15m0 7.68v-7.68"
      />
    ),
  },
  {
    key: "personalization",
    label: "Personalization",
    mentions: 3,
    iconBg: "bg-[#EFF6FF]",
    iconColor: "text-[#2563EB]",
    path: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
      />
    ),
  },
] as const;

function buildTemplates(): TemplateMeta[] {
  const byKey = Object.fromEntries(PURPOSE_TEMPLATES.map((t) => [t.key, t]));
  return [
    {
      key: "custom",
      name: "Custom",
      summary: "Blank purpose — fill in your own details.",
      iconBg: "bg-[#E6F9F5]",
      iconColor: "text-[#00A88F]",
      paths: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      ),
      tpl: null,
    },
    {
      key: "necessary",
      name: "Necessary",
      summary: "Security, login, and saving this consent choice.",
      iconBg: "bg-[#EFF6FF]",
      iconColor: "text-[#2563EB]",
      paths: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
        />
      ),
      tpl: byKey.necessary ?? null,
    },
    {
      key: "functional",
      name: "Functional",
      summary: "Language, region, and saved site preferences.",
      iconBg: "bg-[#F3F4F6]",
      iconColor: "text-[#4B5563]",
      paths: (
        <>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.37.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </>
      ),
      tpl: byKey.functional ?? null,
    },
    {
      key: "analytics",
      name: "Analytics",
      summary: "How visitors use the site (page views, funnels).",
      iconBg: "bg-[#EEF2FF]",
      iconColor: "text-[#4338CA]",
      paths: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
        />
      ),
      tpl: byKey.analytics ?? null,
    },
    {
      key: "advertising",
      name: "Advertising",
      summary: "Ads, retargeting, and conversion tracking.",
      iconBg: "bg-[#FFF7ED]",
      iconColor: "text-[#EA580C]",
      paths: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 01-1.44-.23l-3.22-.96A1.125 1.125 0 012.25 13.5v-3a1.125 1.125 0 01.59-1.005l3.22-.96A4.5 4.5 0 017.5 8.25h.75c.704 0 1.402-.03 2.09-.09m0 7.68a15.35 15.35 0 002.454.15C15.482 16 18 14.21 18 12s-2.518-4-5.206-4a15.35 15.35 0 00-2.454.15m0 7.68v-7.68"
        />
      ),
      tpl: byKey.advertising ?? null,
    },
    {
      key: "personalization",
      name: "Personalization",
      summary: "Content and product recommendations.",
      iconBg: "bg-[#EFF6FF]",
      iconColor: "text-[#2563EB]",
      paths: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      ),
      tpl: byKey.personalization ?? null,
    },
  ];
}

function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <span className="tabular-nums text-[11px] text-[#9CA3AF]">
      {value.length}/{max}
    </span>
  );
}

function DataCategoriesInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [inputVal, setInputVal] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const remaining = DATA_CATEGORY_SUGGESTIONS.filter((s) => !value.includes(s));

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
    <div className="space-y-2">
      <div
        className="flex min-h-[2.75rem] cursor-text flex-wrap items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2"
        onClick={() => document.getElementById("data-cat-input")?.focus()}
      >
        {value.map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1 rounded-full bg-[#EEF2FF] px-2.5 py-1 text-xs font-medium text-[#4338CA]"
          >
            {cat}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(cat);
              }}
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[#4338CA] transition hover:bg-white/80"
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
          onChange={(e) => {
            setInputVal(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? "Add category…" : ""}
          className="min-w-[7rem] flex-1 bg-transparent text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF]"
        />
      </div>
      {showSuggestions && remaining.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {remaining
            .filter((s) => !inputVal || s.toLowerCase().includes(inputVal.toLowerCase()))
            .slice(0, 8)
            .map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(s);
                }}
                className="rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-0.5 text-xs text-[#6B7280] transition hover:border-[#A7F3D0] hover:bg-[#ECFDF5] hover:text-[#047857]"
              >
                + {s}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}

function deriveKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, KEY_MAX);
}

function SectionShell({
  step,
  title,
  description,
  action,
  badge,
  children,
}: {
  step: number;
  title: string;
  description: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5 lg:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-[#111827] sm:text-[1.05rem]">
              <span className="text-[#6B7280]">{step}. </span>
              {title}
            </h2>
            {badge}
          </div>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#6B7280]">{description}</p>
        </div>
        {action ? <div className="shrink-0 self-start">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function CreatePurposeForm() {
  const router = useRouter();
  const templates = useMemo(() => buildTemplates(), []);
  const [templateKey, setTemplateKey] = useState("custom");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [dataCategories, setDataCategories] = useState<string[]>([]);
  const [retentionPeriod, setRetentionPeriod] = useState("");
  const [legalBasis, setLegalBasis] = useState("consent");
  const [previewOn, setPreviewOn] = useState(true);
  const { pending: saving, run } = useAsyncAction();
  const [error, setError] = useState("");

  const suggested = useMemo(
    () => PURPOSE_TEMPLATES.find((t) => t.key === "analytics") ?? PURPOSE_TEMPLATES[0],
    [],
  );

  function applyPurposeTemplate(tpl: PurposeTemplate | null, keyOverride?: string) {
    if (!tpl) {
      setTemplateKey(keyOverride ?? "custom");
      setName("");
      setKey("");
      setKeyTouched(false);
      setDescription("");
      setIsRequired(false);
      setDataCategories([]);
      setRetentionPeriod("");
      setLegalBasis("consent");
      setStatus("active");
      setPreviewOn(true);
      return;
    }
    setTemplateKey(tpl.key);
    setName(tpl.name.slice(0, NAME_MAX));
    setKey(tpl.key.slice(0, KEY_MAX));
    setKeyTouched(true);
    setDescription(tpl.description.slice(0, DESCRIPTION_MAX));
    setIsRequired(tpl.isRequired);
    setDataCategories([...tpl.dataCategories]);
    setRetentionPeriod(tpl.retentionPeriod);
    setLegalBasis(tpl.legalBasis);
    setStatus("active");
    setPreviewOn(!tpl.isRequired);
  }

  function handleNameChange(value: string) {
    const next = value.slice(0, NAME_MAX);
    setName(next);
    if (!keyTouched) setKey(deriveKey(next));
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

  const previewTitle = name.trim() || "Analytics";
  const previewBody =
    description.trim() ||
    "These cookies help us understand how visitors use the website so we can improve the experience.";

  return (
    <form onSubmit={handleSubmit} aria-busy={saving} className="relative">
      <div className="mx-auto grid w-full max-w-[72rem] grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(17.5rem,20.5rem)] xl:items-start xl:gap-6">
        {/* ── Main ─────────────────────────────────────────────────────── */}
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <SectionShell
            step={1}
            title="Start from a template"
            description="Choose a common cookie category, then customise the wording for your notice."
          >
            <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
              {templates.map((item) => {
                const active = templateKey === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => applyPurposeTemplate(item.tpl, item.key)}
                    className={`relative flex h-full min-h-[9.25rem] flex-col rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[#00C4A7] bg-[#F0FDF9] shadow-[0_0_0_1px_rgba(0,196,167,0.35)]"
                        : "border-[#E5E7EB] bg-white hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
                    }`}
                  >
                    {active ? (
                      <span className="absolute right-3 top-3 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#00C4A7] text-white">
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
                          <path
                            d="M2.5 6.2 4.8 8.5 9.5 3.5"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.iconBg} ${item.iconColor}`}
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden>
                        {item.paths}
                      </svg>
                    </span>
                    <span className="mt-3 pr-6 text-sm font-semibold text-[#111827]">{item.name}</span>
                    <span className="mt-1.5 text-xs leading-relaxed text-[#6B7280]">{item.summary}</span>
                  </button>
                );
              })}
            </div>
          </SectionShell>

          <SectionShell
            step={2}
            title="Purpose details"
            description="These fields identify the purpose in policies, banners, and consent records."
          >
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="purpose-name" className="text-sm font-medium text-[#111827]">
                    Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <CharCount value={name} max={NAME_MAX} />
                </div>
                <Input
                  id="purpose-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                  maxLength={NAME_MAX}
                  placeholder="Analytics"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="purpose-key" className="text-sm font-medium text-[#111827]">
                    Key <span className="text-[#DC2626]">*</span>
                  </label>
                  <CharCount value={key} max={KEY_MAX} />
                </div>
                <Input
                  id="purpose-key"
                  value={key}
                  onChange={(e) => {
                    setKeyTouched(true);
                    setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, KEY_MAX));
                  }}
                  required
                  maxLength={KEY_MAX}
                  placeholder="analytics"
                  className="font-mono"
                />
                <p className="mt-1.5 text-xs text-[#6B7280]">
                  Lowercase letters, digits, and underscores only. Cannot be changed after creation.
                </p>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <label htmlFor="purpose-description" className="text-sm font-medium text-[#111827]">
                    Description <span className="font-normal text-[#9CA3AF]">(optional)</span>
                  </label>
                  <CharCount value={description} max={DESCRIPTION_MAX} />
                </div>
                <Textarea
                  id="purpose-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                  rows={4}
                  maxLength={DESCRIPTION_MAX}
                  placeholder="Explain what this purpose is for — shown to visitors in the consent banner."
                />
              </div>

              <div>
                <label htmlFor="purpose-status" className="mb-1.5 block text-sm font-medium text-[#111827]">
                  Status
                </label>
                <div className="relative max-w-xs">
                  <span
                    className={`pointer-events-none absolute left-3 top-1/2 z-10 h-2 w-2 -translate-y-1/2 rounded-full ${
                      status === "active" ? "bg-[#10B981]" : "bg-[#9CA3AF]"
                    }`}
                    aria-hidden
                  />
                  <Select
                    id="purpose-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                    className="pl-7"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </div>
              </div>

              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-3 sm:px-4">
                <Checkbox
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  align="start"
                  className="w-full"
                >
                  <span className="inline-flex items-center gap-1.5 text-sm text-[#111827]">
                    This purpose is required (visitor cannot decline)
                    <span
                      className="inline-flex h-4 w-4 text-[#9CA3AF]"
                      title="Required purposes stay on even if the visitor rejects optional categories."
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                        <circle cx="8" cy="8" r="6.25" />
                        <path strokeLinecap="round" d="M8 7.25V11M8 5.25h.01" />
                      </svg>
                    </span>
                  </span>
                </Checkbox>
              </div>
            </div>
          </SectionShell>

          <SectionShell
            step={3}
            title="DPDP notice information"
            description="Shown in the preference center when purpose descriptions are enabled."
            badge={
              <span className="inline-flex items-center rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#1D4ED8] ring-1 ring-[#BFDBFE]">
                DPDP Rules 2025 Rule 3
              </span>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#111827]">
                  Personal data categories processed
                </label>
                <DataCategoriesInput value={dataCategories} onChange={setDataCategories} />
              </div>

              <div>
                <label htmlFor="purpose-retention" className="mb-1.5 block text-sm font-medium text-[#111827]">
                  Retention period
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                      />
                    </svg>
                  </span>
                  <Input
                    id="purpose-retention"
                    value={retentionPeriod}
                    onChange={(e) => setRetentionPeriod(e.target.value.slice(0, RETENTION_MAX))}
                    maxLength={RETENTION_MAX}
                    placeholder="e.g. 12 months, until account deletion…"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
          </SectionShell>

          {error ? (
            <Alert variant="error" role="alert">
              {error}
            </Alert>
          ) : null}
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
          {/* Suggestion */}
          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-start gap-2.5 border-b border-[#E5E7EB] px-4 py-3.5">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F3E8FF] text-[#7C3AED]">
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <path d="M8 1l1.2 3.6L13 6l-3.8 1.4L8 11 6.8 7.4 3 6l3.8-1.4L8 1z" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#111827]">
                  Suggestion from your past conversations{" "}
                  <span className="ml-1 rounded-full bg-[#F3E8FF] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#7C3AED]">
                    Beta
                  </span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-[#6B7280]">
                  Based on patterns from common purpose templates in your workspace.
                </p>
              </div>
            </div>
            <div className="p-4">
              <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-[#111827]">{suggested.name}</p>
                  <button
                    type="button"
                    onClick={() => applyPurposeTemplate(suggested)}
                    className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[#047857] hover:underline"
                  >
                    Use this
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3l5 5-5 5" />
                    </svg>
                  </button>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-[#4B5563]">
                  {suggested.description.slice(0, 120)}
                  {suggested.description.length > 120 ? "…" : ""}
                </p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#1D4ED8] ring-1 ring-[#BFDBFE]">
                  Based on 8 relevant conversations
                </p>
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between gap-2 border-b border-[#E5E7EB] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#F3F4F6] text-[#4B5563]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <p className="text-sm font-semibold text-[#111827]">Live consent notice preview</p>
              </div>
              <span className="rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Preview
              </span>
            </div>
            <div className="p-4">
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#111827]">{previewTitle}</p>
                    <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[#6B7280]">{previewBody}</p>
                    <button type="button" className="mt-2 text-xs font-semibold text-[#0B2C4A] hover:underline">
                      Learn more
                    </button>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={previewOn}
                    onClick={() => setPreviewOn((v) => !v)}
                    className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${
                      previewOn ? "bg-[#00C4A7]" : "bg-[#D1D5DB]"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                        previewOn ? "left-[1.35rem]" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Key topics */}
          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-4 py-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#FEF3C7] text-[#B45309]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"
                  />
                </svg>
              </span>
              <p className="text-sm font-semibold text-[#111827]">Key topics from your conversations</p>
            </div>
            <ul className="divide-y divide-[#F3F4F6]">
              {TOPIC_ROWS.map((topic) => (
                <li key={topic.key}>
                  <button
                    type="button"
                    onClick={() => {
                      const tpl = PURPOSE_TEMPLATES.find((t) => t.key === topic.key);
                      if (tpl) applyPurposeTemplate(tpl);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-[#F9FAFB]"
                  >
                    <span
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${topic.iconBg} ${topic.iconColor}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6} aria-hidden>
                        {topic.path}
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#111827]">{topic.label}</span>
                      <span className="text-[11px] text-[#6B7280]">{topic.mentions} mentions</span>
                    </span>
                    <svg
                      className="h-4 w-4 shrink-0 text-[#9CA3AF]"
                      fill="none"
                      viewBox="0 0 16 16"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3l5 5-5 5" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-1 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-end min-[420px]:gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="inline-flex items-center gap-1.5">
              {saving ? "Creating purpose…" : "Create purpose"}
              {!saving ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              ) : null}
            </Button>
          </div>
        </aside>
      </div>
    </form>
  );
}
