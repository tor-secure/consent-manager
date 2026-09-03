"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { dashboardFetch, useAsyncAction } from "@/components/feedback/use-async-action";
import {
  VENDOR_CATALOG,
  CATALOG_CATEGORIES,
  searchCatalog,
  type CatalogVendor,
} from "@/lib/vendor-catalog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 150);
}

// ---------------------------------------------------------------------------
// Shared field wrapper
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

// ---------------------------------------------------------------------------
// Source badge — used inside the combobox rows
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    custom: "bg-neutral-100 text-neutral-600",
    iab: "bg-purple-50 text-purple-700",
    google: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[source] ?? styles.custom}`}
    >
      {source.toUpperCase()}
    </span>
  );
}

function CategoryPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// CatalogCombobox
//
// Displays a searchable dropdown of catalog vendors. The special sentinel
// value null represents "Custom vendor" (manual entry). Selecting any catalog
// entry fires onSelect(entry); selecting Custom fires onSelect(null).
// ---------------------------------------------------------------------------

type CatalogComboboxProps = {
  selectedName: string | null; // display value shown in the trigger
  onSelect: (entry: CatalogVendor | null) => void;
};

function CatalogCombobox({ selectedName, onSelect }: CatalogComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  function handleOpen() {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  const trimmed = query.trim();
  const results = trimmed ? searchCatalog(trimmed) : VENDOR_CATALOG;

  // When there's no free-text search, apply the category filter.
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

  const isCustom = selectedName === null;
  const triggerLabel = isCustom
    ? "Custom vendor"
    : (selectedName ?? "Select from catalog…");

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm transition hover:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
      >
        <span className={selectedName === null && !isCustom ? "text-neutral-400" : "text-neutral-900"}>
          {isCustom ? (
            <span className="flex items-center gap-2">
              <span className="text-neutral-900">Custom vendor</span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                manual entry
              </span>
            </span>
          ) : selectedName ? (
            triggerLabel
          ) : (
            <span className="text-neutral-400">Select a vendor from the catalog…</span>
          )}
        </span>
        {/* Chevron */}
        <svg
          aria-hidden="true"
          className={`ml-2 h-4 w-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 16 16"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border bg-white shadow-xl">
          {/* Search input */}
          <div className="border-b px-3 py-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveCategory(null);
              }}
              placeholder="Search by name, domain, or category…"
              className="w-full bg-transparent text-sm text-neutral-900 placeholder-neutral-400 outline-none"
            />
          </div>

          {/* Category filter pills — only shown when not free-text searching */}
          {!trimmed && (
            <div className="flex flex-wrap gap-1.5 border-b px-3 py-2">
              <button
                type="button"
                onClick={() => setActiveCategory(null)}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${activeCategory === null ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
              >
                All
              </button>
              {CATALOG_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${activeCategory === cat ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Results */}
          <ul
            role="listbox"
            aria-label="Vendor catalog"
            className="max-h-72 divide-y overflow-y-auto"
          >
            {/* Custom vendor sentinel — always first */}
            <li role="option" aria-selected={isCustom}>
              <button
                type="button"
                onClick={() => handleSelect(null)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-neutral-50 ${isCustom ? "bg-neutral-50" : ""}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500">
                  <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v10M3 8h10" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-neutral-900">Custom vendor</span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                      manual entry
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    Enter all details manually for a vendor not in the catalog.
                  </p>
                </div>
              </button>
            </li>

            {/* Catalog results */}
            {displayed.length === 0 ? (
              <li className="px-4 py-4 text-sm text-neutral-400">
                No vendors match{" "}
                <span className="font-medium text-neutral-600">
                  &ldquo;{query.trim()}&rdquo;
                </span>
                . Use Custom vendor to enter details manually.
              </li>
            ) : (
              displayed.map((entry) => (
                <li key={entry.key} role="option" aria-selected={selectedName === entry.name}>
                  <button
                    type="button"
                    onClick={() => handleSelect(entry)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-neutral-50 ${selectedName === entry.name ? "bg-neutral-50" : ""}`}
                  >
                    {/* Icon tile — first letter */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-sm font-semibold text-neutral-600">
                      {entry.name.charAt(0)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-neutral-900">{entry.name}</span>
                        <SourceBadge source={entry.source} />
                        <CategoryPill label={entry.category} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-neutral-400">
                        {entry.domain}
                      </p>
                    </div>

                    {/* Selected check */}
                    {selectedName === entry.name && (
                      <svg
                        aria-hidden="true"
                        className="mt-1 h-4 w-4 shrink-0 text-neutral-500"
                        fill="none"
                        viewBox="0 0 16 16"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 4.5" />
                      </svg>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* Footer count */}
          <div className="border-t px-4 py-2 text-right text-xs text-neutral-400">
            {displayed.length} vendor{displayed.length !== 1 ? "s" : ""}
            {activeCategory ? ` in ${activeCategory}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CreateVendorForm
// ---------------------------------------------------------------------------

export function CreateVendorForm() {
  const router = useRouter();

  // ── Catalog selection state ───────────────────────────────────────────────
  // null  → user has explicitly chosen "Custom vendor" (manual entry)
  // ""    → initial / no selection yet (shows prompt in trigger)
  // name  → a catalog entry was selected
  const [catalogSelection, setCatalogSelection] = useState<string | null>("");

  // ── Form field state ──────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyTouched, setKeyTouched] = useState(false);
  const [domain, setDomain] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [source, setSource] = useState<"custom" | "iab" | "google">("custom");

  const { pending: saving, run } = useAsyncAction();
  const [error, setError] = useState("");

  // Whether fields are pre-filled from a catalog entry (can still be edited).
  const isFromCatalog = catalogSelection !== null && catalogSelection !== "";
  // Whether fields should be locked to catalog defaults (editable but guided).
  // We never lock — always allow editing even after catalog selection.

  // ── Catalog selection handler ─────────────────────────────────────────────

  function handleCatalogSelect(entry: CatalogVendor | null) {
    if (entry === null) {
      // "Custom vendor" chosen — clear all fields for manual entry.
      setCatalogSelection(null);
      setName("");
      setKey("");
      setKeyTouched(false);
      setDomain("");
      setWebsiteUrl("");
      setPrivacyPolicyUrl("");
      setCountry("");
      setDescription("");
      setSource("custom");
    } else {
      // Catalog entry chosen — populate all fields.
      setCatalogSelection(entry.name);
      setName(entry.name);
      setKey(entry.key);
      setKeyTouched(true); // treat as manually set so edits don't auto-derive
      setDomain(entry.domain);
      setWebsiteUrl(entry.websiteUrl);
      setPrivacyPolicyUrl(entry.privacyPolicyUrl);
      setCountry(entry.country);
      setDescription(entry.description);
      setSource(entry.source);
    }
    setError("");
  }

  // ── Name change in manual mode ────────────────────────────────────────────

  function handleNameChange(value: string) {
    setName(value);
    // If the user typed in the name field and there was a catalog selection,
    // the selection is now stale — mark as custom.
    if (isFromCatalog) setCatalogSelection(null);
    if (!keyTouched) setKey(deriveKey(value));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
            country: country.trim() || null,
            description: description.trim() || null,
            status,
            source,
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ── Catalog selector card ──────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow p-6">
        <h2 className="mb-1.5 text-base font-semibold text-neutral-900">
          Start from catalog
        </h2>
        <p className="mb-4 text-sm text-neutral-500">
          Select a common vendor to pre-fill its details, or choose{" "}
          <strong className="font-medium text-neutral-700">Custom vendor</strong>{" "}
          to enter everything manually.
        </p>

        <CatalogCombobox
          selectedName={catalogSelection}
          onSelect={handleCatalogSelect}
        />

        {/* Catalog selection confirmation */}
        {isFromCatalog && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
            <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l3.5 3.5L13 4.5" />
            </svg>
            <span>
              Fields pre-filled from catalog. You can edit any field below before saving.
            </span>
          </div>
        )}
      </div>

      {/* ── Identity ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">
          Vendor identity
        </h2>

        <div className="space-y-5">
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

          <Field
            label="Key"
            hint="Lowercase letters, digits, and underscores only. Auto-generated from name."
          >
            <input
              value={key}
              onChange={(e) => {
                setKeyTouched(true);
                setKey(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9_]/g, "")
                    .slice(0, 150),
                );
              }}
              required
              maxLength={150}
              placeholder="google_analytics_4"
              className="field-input font-mono"
            />
          </Field>

          <Field label="Domain" hint="Primary domain the tracker or service operates from.">
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              maxLength={255}
              placeholder="google-analytics.com"
              className="field-input"
            />
          </Field>

          <Field label="Description" hint="Optional — visible only to your team.">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={1000}
              className="field-input"
            />
          </Field>
        </div>
      </div>

      {/* ── Links ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">Links</h2>

        <div className="space-y-5">
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
        </div>
      </div>

      {/* ── Classification ────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] card-shadow p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">
          Classification
        </h2>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Country" hint="ISO 3166-1 alpha-2 code.">
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              maxLength={100}
              placeholder="US"
              className="field-input"
            />
          </Field>

          <Field label="Source">
            <select
              value={source}
              onChange={(e) =>
                setSource(e.target.value as "custom" | "iab" | "google")
              }
              className="field-input"
            >
              <option value="custom">Custom</option>
              <option value="iab">IAB</option>
              <option value="google">Google</option>
            </select>
          </Field>

          <Field label="Status">
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "active" | "inactive")
              }
              className="field-input"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
      </div>

      {/* ── Error ─────────────────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>
          {saving ? "Creating vendor..." : "Create vendor"}
        </Button>

        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border px-5 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
