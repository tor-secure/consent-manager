"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CountryFlag } from "@/components/dashboard/country-flag";
import { VendorLogo } from "@/components/vendors/vendor-logo";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import {
  VENDOR_CATALOG,
  CATALOG_CATEGORIES,
  searchCatalog,
  type CatalogVendor,
} from "@/lib/vendor-catalog";
import { DPA_STATUSES, VENDOR_ROLES } from "@/lib/processing/types";

const DESCRIPTION_MAX = 500;

const ROLE_LABELS: Record<string, string> = {
  controller: "Controller",
  processor: "Data processor",
  subprocessor: "Sub-processor",
  independent_controller: "Independent controller",
  joint_controller: "Joint controller",
  service_provider: "Service provider",
  third_party: "Third party",
};

const DPA_LABELS: Record<string, string> = {
  not_configured: "Not configured",
  recorded: "Recorded",
  expired: "Expired",
  not_applicable: "Not applicable",
};

function deriveKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 150);
}

function SectionCard({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5 lg:p-6">
      <div className="mb-4 flex items-start gap-3 sm:mb-5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#E6F9F5] text-[#00A88F]">
          {icon}
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 className="text-base font-semibold text-[#111827]">{title}</h2>
          {description ? (
            <p className="mt-0.5 text-sm leading-relaxed text-[#6B7280]">{description}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-[#111827]">{label}</label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-[#6B7280]">{hint}</p> : null}
    </div>
  );
}

function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    custom: "bg-[#F3F4F6] text-[#4B5563]",
    iab: "bg-[#EEF2FF] text-[#4338CA]",
    google: "bg-[#EFF6FF] text-[#2563EB]",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[source] ?? styles.custom}`}>
      {source}
    </span>
  );
}

function CatalogCombobox({
  selectedName,
  onSelect,
}: {
  selectedName: string | null;
  onSelect: (entry: CatalogVendor | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const trimmed = query.trim();
  const results = trimmed ? searchCatalog(trimmed) : VENDOR_CATALOG;
  const displayed = trimmed
    ? results
    : activeCategory
      ? results.filter((v) => v.category === activeCategory)
      : results;

  function handleSelect(entry: CatalogVendor | null) {
    setOpen(false);
    setQuery("");
    setActiveCategory(null);
    onSelect(entry);
  }

  const triggerLabel =
    selectedName === null
      ? "Custom vendor"
      : selectedName || "Search for a vendor (e.g. Google Analytics) or choose Custom…";

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-left text-sm shadow-sm transition hover:border-[#D1D5DB]"
      >
        <svg className="h-4 w-4 shrink-0 text-[#9CA3AF]" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.6} aria-hidden>
          <circle cx="7" cy="7" r="4.5" />
          <path strokeLinecap="round" d="M10.5 10.5 13.5 13.5" />
        </svg>
        <span className={`min-w-0 flex-1 truncate ${selectedName || selectedName === null ? "text-[#111827]" : "text-[#9CA3AF]"}`}>
          {triggerLabel}
        </span>
        <svg className={`h-4 w-4 shrink-0 text-[#9CA3AF] transition ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-xl">
          <div className="border-b border-[#E5E7EB] px-2 py-2">
            <SearchInput
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveCategory(null);
              }}
              onClear={() => {
                setQuery("");
                setActiveCategory(null);
              }}
              placeholder="Search by name, domain, or category…"
              label="Search vendor catalog"
            />
          </div>

          {!trimmed ? (
            <div className="flex flex-wrap gap-1.5 border-b border-[#E5E7EB] px-3 py-2">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                  activeCategory === null ? "bg-[#0B2C4A] text-white" : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                }`}
              >
                All
              </button>
              {CATALOG_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                    activeCategory === cat ? "bg-[#0B2C4A] text-white" : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          ) : null}

          <ul role="listbox" aria-label="Vendor catalog" className="max-h-72 divide-y divide-[#F3F4F6] overflow-y-auto">
            <li role="option" aria-selected={selectedName === null}>
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#F9FAFB] ${
                  selectedName === null ? "bg-[#F0FDF9]" : ""
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6F9F5] text-[#00A88F]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v10M3 8h10" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[#111827]">Custom vendor</p>
                  <p className="mt-0.5 text-xs text-[#6B7280]">Enter all details manually for a vendor not in the catalog.</p>
                </div>
              </button>
            </li>

            {displayed.length === 0 ? (
              <li className="px-4 py-4 text-sm text-[#6B7280]">
                No vendors match &ldquo;{query.trim()}&rdquo;. Use Custom vendor instead.
              </li>
            ) : (
              displayed.map((entry) => (
                <li key={entry.key} role="option" aria-selected={selectedName === entry.name}>
                  <button
                    type="button"
                    onClick={() => handleSelect(entry)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#F9FAFB] ${
                      selectedName === entry.name ? "bg-[#F0FDF9]" : ""
                    }`}
                  >
                    <VendorLogo name={entry.name} domain={entry.domain} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-[#111827]">{entry.name}</span>
                        <SourceBadge source={entry.source} />
                        <span className="rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-semibold text-[#047857]">
                          {entry.category}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#6B7280]">{entry.domain}</p>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          done ? "bg-[#00C4A7] text-white" : "border border-[#D1D5DB] bg-white"
        }`}
      >
        {done ? (
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M2.5 6.2 4.8 8.5 9.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <span className={done ? "text-[#111827]" : "text-[#6B7280]"}>{label}</span>
    </li>
  );
}

export function CreateVendorForm() {
  const router = useRouter();
  const [catalogSelection, setCatalogSelection] = useState<string | null>("");
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [domain, setDomain] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("");
  const [dpaTermsUrl, setDpaTermsUrl] = useState("");
  const [supportUrl, setSupportUrl] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [source, setSource] = useState<"custom" | "iab" | "google">("custom");
  const [role, setRole] = useState("processor");
  const [dpaStatus, setDpaStatus] = useState("not_applicable");
  const [usesCookies, setUsesCookies] = useState(false);
  const [collectsAnalytics, setCollectsAnalytics] = useState(false);
  const [crossBorder, setCrossBorder] = useState(false);
  const [requiresReview, setRequiresReview] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { pending: saving, run } = useAsyncAction();
  const [error, setError] = useState("");

  const isFromCatalog = catalogSelection !== null && catalogSelection !== "";

  function handleCatalogSelect(entry: CatalogVendor | null) {
    if (entry === null) {
      setCatalogSelection(null);
      setCategory("");
      setName("");
      setKey("");
      setKeyTouched(false);
      setDomain("");
      setWebsiteUrl("");
      setPrivacyPolicyUrl("");
      setDpaTermsUrl("");
      setSupportUrl("");
      setCountry("");
      setDescription("");
      setSource("custom");
      setUsesCookies(false);
      setCollectsAnalytics(false);
      setCrossBorder(false);
      setRequiresReview(false);
      setLogoPreview(null);
    } else {
      setCatalogSelection(entry.name);
      setCategory(entry.category);
      setName(entry.name);
      setKey(entry.key);
      setKeyTouched(true);
      setDomain(entry.domain);
      setWebsiteUrl(entry.websiteUrl);
      setPrivacyPolicyUrl(entry.privacyPolicyUrl);
      setCountry(entry.country);
      setDescription(entry.description.slice(0, DESCRIPTION_MAX));
      setSource(entry.source);
      setRole("processor");
      setDpaStatus("not_applicable");
      setUsesCookies(true);
      setCollectsAnalytics(entry.category.toLowerCase().includes("analytics"));
      setCrossBorder(entry.country !== "" && entry.country !== "IN");
      setRequiresReview(false);
      setLogoPreview(null);
      if (entry.source === "google" || /analytics/i.test(entry.name)) {
        setDpaTermsUrl("https://business.safety.google/adsprocessorterms/");
        setSupportUrl("https://support.google.com/analytics");
      } else {
        setDpaTermsUrl("");
        setSupportUrl("");
      }
    }
    setError("");
  }

  function handleNameChange(value: string) {
    setName(value);
    if (isFromCatalog) setCatalogSelection(null);
    if (!keyTouched) setKey(deriveKey(value));
  }

  function handleLogoFile(file: File | null) {
    if (!file) {
      setLogoPreview(null);
      return;
    }
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  const checklist = useMemo(() => {
    const items = [
      { label: "Vendor name and key", done: Boolean(name.trim() && key.trim()) },
      { label: "Domain added", done: Boolean(domain.trim()) },
      { label: "Website URL", done: Boolean(websiteUrl.trim()) },
      { label: "Privacy policy URL", done: Boolean(privacyPolicyUrl.trim()) },
      { label: "Classification", done: Boolean(role && dpaStatus && status) },
      {
        label: "Review attributes",
        done: usesCookies || collectsAnalytics || crossBorder || requiresReview,
      },
    ];
    const doneCount = items.filter((i) => i.done).length;
    return { items, doneCount, total: items.length };
  }, [
    name,
    key,
    domain,
    websiteUrl,
    privacyPolicyUrl,
    role,
    dpaStatus,
    status,
    usesCookies,
    collectsAnalytics,
    crossBorder,
    requiresReview,
  ]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await run(async () => {
      setError("");
      const result = await dashboardFetch(
        "/api/vendors",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            key: key.trim() || deriveKey(name),
            domain: domain.trim() || null,
            websiteUrl: websiteUrl.trim() || null,
            privacyPolicyUrl: privacyPolicyUrl.trim() || null,
            country: country.trim().toUpperCase() || null,
            description: description.trim() || null,
            status,
            source,
            role,
            dpaStatus,
          }),
        },
        {
          successMessage: "Vendor created successfully",
          errorFallback: "Something went wrong while creating the vendor.",
          onValidation: setError,
        },
      );
      if (!result.ok) return;
      router.push("/dashboard/vendors");
      router.refresh();
    });
  }

  const countryCode = country.trim().toUpperCase().slice(0, 2);

  return (
    <form onSubmit={handleSubmit} aria-busy={saving} className="mx-auto w-full max-w-[72rem]">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,20rem)] xl:items-start xl:gap-6">
        <div className="min-w-0 space-y-4 sm:space-y-5">
          <SectionCard
            title="Start from existing"
            description="Search for a vendor (e.g. Google Analytics) or choose Custom to enter details manually."
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden>
                <circle cx="12" cy="12" r="8" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            }
          >
            <CatalogCombobox selectedName={catalogSelection} onSelect={handleCatalogSelect} />
            {isFromCatalog ? (
              <p className="mt-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-3 py-2 text-xs text-[#047857]">
                Fields pre-filled from catalog. You can edit any field before saving.
              </p>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Vendor identity"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            }
          >
            <div className="space-y-4">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F9FAFB]">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="" className="h-full w-full object-contain p-2" />
                  ) : (
                    <VendorLogo name={name || "Vendor"} domain={domain || null} />
                  )}
                </div>
                <div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    className="h-9"
                  >
                    Upload logo
                  </Button>
                  <p className="mt-1.5 text-xs text-[#6B7280]">Optional. Preview only for now.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Name">
                  <input
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    maxLength={255}
                    placeholder="e.g. Google Analytics 4"
                    className="field-input"
                  />
                </Field>
                <Field label="Key" hint="Lowercase letters, digits, and underscores only.">
                  <input
                    value={key}
                    onChange={(e) => {
                      setKeyTouched(true);
                      setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 150));
                    }}
                    required
                    maxLength={150}
                    placeholder="google_analytics_4"
                    className="field-input font-mono"
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Domain" hint="Primary domain the tracker or service operates from.">
                  <input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    maxLength={255}
                    placeholder="google-analytics.com"
                    className="field-input"
                  />
                </Field>
                <Field label="Vendor category (optional)">
                  <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="">Select category</option>
                    {CATALOG_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </Select>
                  {category ? (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1 text-xs font-semibold text-[#047857]">
                      {category}
                      <button type="button" onClick={() => setCategory("")} aria-label="Clear category">
                        ×
                      </button>
                    </span>
                  ) : null}
                </Field>
              </div>

              <Field label="Description (optional)">
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                    rows={3}
                    maxLength={DESCRIPTION_MAX}
                    placeholder="Short description of what this vendor does."
                    className="field-input"
                  />
                  <span className="pointer-events-none absolute bottom-2 right-3 text-[11px] tabular-nums text-[#9CA3AF]">
                    {description.length}/{DESCRIPTION_MAX}
                  </span>
                </div>
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Links"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.364a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L5.5 7.5"
                />
              </svg>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Website URL">
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://analytics.google.com"
                  className="field-input"
                />
              </Field>
              <Field label="Privacy policy URL">
                <input
                  type="url"
                  value={privacyPolicyUrl}
                  onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                  placeholder="https://policies.google.com/privacy"
                  className="field-input"
                />
              </Field>
              <Field label="Data processing terms URL">
                <input
                  type="url"
                  value={dpaTermsUrl}
                  onChange={(e) => setDpaTermsUrl(e.target.value)}
                  placeholder="https://…"
                  className="field-input"
                />
              </Field>
              <Field label="Support / contact URL">
                <input
                  type="url"
                  value={supportUrl}
                  onChange={(e) => setSupportUrl(e.target.value)}
                  placeholder="https://…"
                  className="field-input"
                />
              </Field>
            </div>
          </SectionCard>

          <SectionCard
            title="Classification & compliance"
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            }
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Role">
                <Select
                  value={role}
                  onChange={(e) => {
                    const next = e.target.value;
                    setRole(next);
                    if (next === "processor" || next === "subprocessor") {
                      setDpaStatus((current) => (current === "not_applicable" ? "not_configured" : current));
                    } else if (dpaStatus === "not_configured") {
                      setDpaStatus("not_applicable");
                    }
                  }}
                  required
                >
                  {VENDOR_ROLES.filter((item) => item !== "unknown").map((item) => (
                    <option key={item} value={item}>
                      {ROLE_LABELS[item] ?? item.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="DPA status">
                <Select value={dpaStatus} onChange={(e) => setDpaStatus(e.target.value)}>
                  {DPA_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {DPA_LABELS[item] ?? item.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Country" hint="ISO 3166-1 alpha-2 code.">
                <div className="relative">
                  {countryCode.length === 2 ? (
                    <span className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
                      <CountryFlag code={countryCode} size="sm" />
                    </span>
                  ) : null}
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2))}
                    maxLength={2}
                    placeholder="US"
                    className={`field-input uppercase ${countryCode.length === 2 ? "pl-10" : ""}`}
                  />
                </div>
              </Field>
              <Field label="Source">
                <Select
                  value={source}
                  onChange={(e) => setSource(e.target.value as "custom" | "iab" | "google")}
                >
                  <option value="custom">Custom</option>
                  <option value="iab">IAB</option>
                  <option value="google">Google</option>
                </Select>
              </Field>
              <Field label="Status">
                <Select value={status} onChange={(e) => setStatus(e.target.value as "active" | "inactive")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
            </div>

            <div className="mt-5">
              <p className="mb-2.5 text-sm font-medium text-[#111827]">Additional attributes</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {(
                  [
                    ["Uses cookies", usesCookies, setUsesCookies],
                    ["Collects analytics data", collectsAnalytics, setCollectsAnalytics],
                    ["Cross-border transfer", crossBorder, setCrossBorder],
                    ["Requires review", requiresReview, setRequiresReview],
                  ] as const
                ).map(([label, checked, setChecked]) => (
                  <div key={label} className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-3.5 py-2.5">
                    <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} className="w-full">
                      <span className="text-sm text-[#111827]">{label}</span>
                    </Checkbox>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {error ? (
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--danger)_28%,transparent)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 pt-1 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-start min-[420px]:gap-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {saving ? "Creating vendor…" : "Create vendor"}
            </Button>
          </div>
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="border-b border-[#E5E7EB] px-4 py-3">
              <p className="text-sm font-semibold text-[#111827]">Vendor summary</p>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-[#E5E7EB] bg-[#F9FAFB]">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="" className="h-full w-full object-contain p-1.5" />
                  ) : (
                    <VendorLogo name={name || "Vendor"} domain={domain || null} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111827]">{name.trim() || "Untitled vendor"}</p>
                  {category ? (
                    <span className="mt-1 inline-flex rounded-full bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-semibold text-[#047857]">
                      {category}
                    </span>
                  ) : null}
                  <p className="mt-1 truncate font-mono text-[11px] text-[#6B7280]">{key.trim() || "—"}</p>
                  <p className="truncate text-xs text-[#6B7280]">{domain.trim() || "No domain"}</p>
                </div>
              </div>

              <dl className="space-y-2 border-t border-[#F3F4F6] pt-3 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6B7280]">Role</dt>
                  <dd className="font-medium text-[#111827]">{ROLE_LABELS[role] ?? role}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6B7280]">DPA status</dt>
                  <dd className="font-medium text-[#111827]">{DPA_LABELS[dpaStatus] ?? dpaStatus}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6B7280]">Status</dt>
                  <dd className="inline-flex items-center gap-1.5 font-medium text-[#111827]">
                    <span className={`h-1.5 w-1.5 rounded-full ${status === "active" ? "bg-[#10B981]" : "bg-[#9CA3AF]"}`} />
                    {status === "active" ? "Active" : "Inactive"}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-[#6B7280]">Source</dt>
                  <dd className="font-medium capitalize text-[#111827]">{source}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[#6B7280]">Country</dt>
                  <dd className="inline-flex items-center gap-1.5 font-medium text-[#111827]">
                    {countryCode.length === 2 ? <CountryFlag code={countryCode} size="sm" /> : null}
                    {countryCode || "—"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
              <p className="text-sm font-semibold text-[#111827]">Compliance checklist</p>
              <span className="text-xs font-medium text-[#6B7280]">
                {checklist.doneCount}/{checklist.total}
              </span>
            </div>
            <ul className="space-y-2.5 p-4">
              {checklist.items.map((item) => (
                <ChecklistItem key={item.label} done={item.done} label={item.label} />
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-[#A7F3D0] bg-[#ECFDF5] p-4">
            <p className="text-sm font-semibold text-[#065F46]">Need help?</p>
            <ul className="mt-2.5 space-y-2">
              {[
                ["What is a vendor?", "/faqs"],
                ["When do I need a DPA?", "/privacy-compliance"],
                ["Vendor best practices", "/resources"],
              ].map(([label, href]) => (
                <li key={label}>
                  <a
                    href={href}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#047857] hover:underline"
                  >
                    {label}
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h7v7M13 3 6.5 9.5M3 6v7h7" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </form>
  );
}
