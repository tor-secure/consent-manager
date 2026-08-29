"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ManagedVendor = {
  id: string;
  name: string;
  key: string;
  domain: string | null;
  country: string | null;
  privacyPolicyUrl: string | null;
  source: string;
  status: string;
  purposeNames: string[];
};

export type AvailableVendor = {
  id: string;
  name: string;
  key: string;
  domain: string | null;
  source: string;
  status: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deriveKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 150);
}

function vendorInitialColor(name: string): string {
  const colors = [
    "bg-indigo-100 text-indigo-700",
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-emerald-100 text-emerald-700",
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconVendor() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="12" height="9" rx="1.5" />
      <path d="M5 5V4a3 3 0 016 0v1" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth={1.5} />
      <path d="M9.5 9.5l2.5 2.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M7 2v10M2 7h10" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6l4 4 4-4" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Source badge
// ---------------------------------------------------------------------------

function SourceBadge({ source }: { source: string }) {
  const styles: Record<string, string> = {
    custom: "bg-slate-100 text-slate-600",
    iab:    "bg-violet-50 text-violet-700",
    google: "bg-sky-50   text-sky-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[source] ?? styles.custom}`}>
      {source.toUpperCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// VendorCombobox
// ---------------------------------------------------------------------------

type VendorComboboxProps = {
  available: AvailableVendor[];
  disabled: boolean;
  onAttach: (vendorId: string) => void;
  onCreateAndAttach: (name: string, domain: string) => void;
  addingId: string | null;
  isPending: boolean;
};

function VendorCombobox({ available, disabled, onAttach, onCreateAndAttach, addingId, isPending }: VendorComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newKeyTouched, setNewKeyTouched] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false); setShowCreate(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? available.filter((v) =>
        v.name.toLowerCase().includes(trimmed) ||
        v.key.toLowerCase().includes(trimmed) ||
        (v.domain ?? "").toLowerCase().includes(trimmed))
    : available;
  const noResults = trimmed.length > 0 && filtered.length === 0;

  function handleOpen() {
    if (disabled) return;
    setOpen(true); setShowCreate(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function handleSelect(vendorId: string) {
    setOpen(false); setQuery(""); onAttach(vendorId);
  }

  function openCreate() {
    const prefill = query.trim();
    setNewName(prefill); setNewKey(deriveKey(prefill));
    setNewKeyTouched(false); setNewDomain("");
    setShowCreate(true);
  }

  function handleNewNameChange(v: string) {
    setNewName(v);
    if (!newKeyTouched) setNewKey(deriveKey(v));
  }

  function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setOpen(false); setShowCreate(false); setQuery("");
    onCreateAndAttach(name, newDomain.trim());
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Search and add vendor"
        onClick={handleOpen}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleOpen(); }}
        tabIndex={disabled ? -1 : 0}
        className={`flex h-10 cursor-text items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm shadow-sm transition focus:outline-none focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/15 ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-slate-300"}`}
      >
        <IconSearch />
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Search by name, domain, or key…"
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
          />
        ) : (
          <span className="flex-1 text-slate-400">Search vendors to add…</span>
        )}
        <IconChevron open={open} />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {!showCreate ? (
            <>
              {/* Results */}
              {filtered.length > 0 && (
                <ul role="listbox" className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
                  {filtered.map((v) => (
                    <li key={v.id} role="option" aria-selected={false}>
                      <button
                        type="button"
                        onClick={() => handleSelect(v.id)}
                        disabled={addingId === v.id || isPending}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-50 disabled:opacity-50"
                      >
                        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${vendorInitialColor(v.name)}`}>
                          {v.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-medium text-slate-900 truncate">{v.name}</span>
                            <SourceBadge source={v.source} />
                          </div>
                          {v.domain && <p className="truncate text-xs text-slate-400">{v.domain}</p>}
                        </div>
                        <span className="shrink-0 text-xs font-medium text-indigo-600">
                          {addingId === v.id ? <IconSpinner /> : "+ Add"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {noResults && (
                <div className="px-4 py-3 text-sm text-slate-500">
                  No vendors match{" "}
                  <span className="font-medium text-slate-700">&ldquo;{query.trim()}&rdquo;</span>.
                </div>
              )}

              {/* Footer */}
              <div className={`flex items-center justify-between border-t border-slate-100 px-4 py-2.5 ${noResults ? "bg-slate-50" : ""}`}>
                <button type="button" onClick={openCreate}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900">
                  <span className="flex h-4 w-4 items-center justify-center rounded-md bg-indigo-100 text-indigo-600"><IconPlus /></span>
                  {noResults ? `Create "${query.trim()}" as new vendor` : "Create new vendor"}
                </button>
                <button type="button" onClick={() => { setOpen(false); setQuery(""); }}
                  className="text-xs text-slate-400 hover:text-slate-600">
                  Close
                </button>
              </div>
            </>
          ) : (
            /* Quick-create form */
            <div className="p-4">
              <div className="mb-3 flex items-center gap-2">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M7 2L3 6l4 4" /></svg>
                </button>
                <p className="text-sm font-semibold text-slate-900">Create new vendor</p>
              </div>
              <form onSubmit={handleCreateSubmit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Name <span className="text-rose-500">*</span>
                  </label>
                  <input type="text" value={newName} onChange={(e) => handleNewNameChange(e.target.value)}
                    required maxLength={255} autoFocus placeholder="Google Analytics"
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Key</label>
                  <input type="text" value={newKey}
                    onChange={(e) => { setNewKeyTouched(true); setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 150)); }}
                    maxLength={150} placeholder="google_analytics"
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 font-mono text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15" />
                  <p className="mt-0.5 text-[11px] text-slate-400">Auto-derived. Lowercase, digits, underscores.</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">Domain</label>
                  <input type="text" value={newDomain} onChange={(e) => setNewDomain(e.target.value)}
                    maxLength={255} placeholder="analytics.google.com"
                    className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15" />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button type="submit" disabled={!newName.trim() || isPending}
                    className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50">
                    {isPending ? <IconSpinner /> : <IconPlus />}
                    {isPending ? "Creating…" : "Create & add"}
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                    Cancel
                  </button>
                  <Link href="/dashboard/vendors/new" target="_blank" rel="noopener noreferrer"
                    className="ml-auto text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600">
                    Full form ↗
                  </Link>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PolicyVendorManagerPanel
// ---------------------------------------------------------------------------

export function PolicyVendorManagerPanel({
  policyId,
  latestVersionId,
  attached,
  available,
  hasPurposes,
}: {
  policyId: string;
  latestVersionId: string | null;
  attached: ManagedVendor[];
  available: AvailableVendor[];
  hasPurposes: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [addingId, setAddingId]     = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function flash(msg: string) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  }

  function handleAttach(vendorId: string) {
    setError(null); setAddingId(vendorId);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/policies/${policyId}/vendors`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vendorId }),
        });
        const data = (await res.json()) as { success: boolean; message?: string };
        if (!data.success) setError(data.message ?? "Failed to attach vendor.");
        else { flash("Vendor added."); router.refresh(); }
      } catch { setError("Network error. Please try again."); }
      finally { setAddingId(null); }
    });
  }

  function handleCreateAndAttach(name: string, domain: string) {
    setError(null);
    startTransition(async () => {
      try {
        const createRes = await fetch("/api/vendors", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, domain: domain || null, status: "active", source: "custom" }),
        });
        const createData = (await createRes.json()) as { success: boolean; message?: string; vendor?: { id: string } };
        if (!createData.success || !createData.vendor) { setError(createData.message ?? "Failed to create vendor."); return; }
        const attachRes = await fetch(`/api/policies/${policyId}/vendors`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vendorId: createData.vendor.id }),
        });
        const attachData = (await attachRes.json()) as { success: boolean; message?: string };
        if (!attachData.success) setError(attachData.message ?? "Vendor created but could not be attached.");
        else { flash(`"${name}" created and added.`); router.refresh(); }
      } catch { setError("Network error. Please try again."); }
    });
  }

  function handleDetach(vendorId: string, vendorName: string) {
    setError(null); setRemovingId(vendorId);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/policies/${policyId}/vendors/${vendorId}`, { method: "DELETE" });
        const data = (await res.json()) as { success: boolean; message?: string };
        if (!data.success) setError(data.message ?? "Failed to detach vendor.");
        else { flash(`"${vendorName}" removed.`); router.refresh(); }
      } catch { setError("Network error. Please try again."); }
      finally { setRemovingId(null); }
    });
  }

  const comboboxDisabled = !latestVersionId || !hasPurposes || isPending;

  return (
    <div className="rounded-2xl bg-white card-shadow overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <IconVendor />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Vendors</h2>
            <p className="text-xs text-slate-500">
              Third-party vendors operating under this policy&apos;s purposes.
            </p>
          </div>
        </div>
        <Link href="/dashboard/vendors"
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900">
          Manage all
        </Link>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="p-5 space-y-4">

        {/* Feedback */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-700">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}><circle cx="8" cy="8" r="6"/><path strokeLinecap="round" d="M8 5v3M8 11h.01"/></svg>
            {error}
            <button onClick={() => setError(null)} className="ml-auto shrink-0 text-rose-400 hover:text-rose-600">✕</button>
          </div>
        )}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-700">
            <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2 7l3.5 3.5L12 3.5"/></svg>
            {successMsg}
          </div>
        )}

        {/* No version */}
        {!latestVersionId && (
          <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
            <p className="text-sm text-slate-400">No policy version found.</p>
          </div>
        )}

        {/* No purposes yet */}
        {latestVersionId && !hasPurposes && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" d="M8 2l6 12H2z"/><path strokeLinecap="round" d="M8 7v3M8 12h.01"/></svg>
            <p className="text-sm text-amber-800">
              <strong className="font-semibold">Attach purposes first.</strong>{" "}
              Vendors can only be added once this policy has at least one purpose attached.
            </p>
          </div>
        )}

        {/* Main content */}
        {latestVersionId && hasPurposes && (
          <>
            {/* Combobox */}
            <VendorCombobox
              available={available}
              disabled={comboboxDisabled}
              onAttach={handleAttach}
              onCreateAndAttach={handleCreateAndAttach}
              addingId={addingId}
              isPending={isPending}
            />

            {/* Attached list */}
            {attached.length > 0 ? (
              <div>
                <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                  Linked vendors
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 normal-case tracking-normal">
                    {attached.length}
                  </span>
                </p>
                <ul role="list" className="space-y-2">
                  {attached.map((v) => (
                    <li key={v.id}
                      className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 transition hover:border-slate-300 hover:bg-white">
                      <div className="flex min-w-0 items-start gap-3">
                        {/* Initial avatar */}
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${vendorInitialColor(v.name)}`}>
                          {v.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-semibold text-slate-900">{v.name}</span>
                            <SourceBadge source={v.source} />
                            {v.status === "inactive" && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">Inactive</span>
                            )}
                          </div>
                          {v.domain && <p className="mt-0.5 text-xs text-slate-400">{v.domain}</p>}
                          {v.purposeNames.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {v.purposeNames.map((p) => (
                                <span key={p} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-600">
                                  {p}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {v.privacyPolicyUrl && (
                          <a href={v.privacyPolicyUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-slate-400 underline underline-offset-2 transition hover:text-slate-700">
                            Privacy policy
                          </a>
                        )}
                        <button
                          onClick={() => handleDetach(v.id, v.name)}
                          disabled={removingId === v.id || isPending}
                          aria-label={`Remove ${v.name}`}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                        >
                          {removingId === v.id ? <IconSpinner /> : "Remove"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 py-8 text-center">
                <p className="text-sm text-slate-500">No vendors linked to this policy yet.</p>
                <p className="mt-1 text-xs text-slate-400">
                  Search above to add a vendor, or create a new one.
                </p>
              </div>
            )}

            {/* All vendors already linked */}
            {available.length === 0 && attached.length > 0 && (
              <p className="text-xs text-slate-400">
                All your vendors are linked.{" "}
                <Link href="/dashboard/vendors/new" className="underline underline-offset-2 hover:text-slate-700">
                  Create a new vendor
                </Link>{" "}to add more.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
