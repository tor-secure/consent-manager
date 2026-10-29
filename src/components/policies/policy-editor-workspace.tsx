"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { notify } from "@/components/feedback/notify";
import {
  PolicyPurposesPanel,
  type PurposeSummary,
} from "@/components/policies/policy-purposes-panel";
import {
  PolicyVendorManagerPanel,
  type ManagedVendor,
  type AvailableVendor,
} from "@/components/policies/policy-vendor-manager-panel";
import { PolicyPublishSection } from "@/components/policies/policy-publish-section";
import { PolicyLifecycleControls } from "@/components/policies/policy-lifecycle-controls";
import { PolicySetupChecklist, type SetupCheck } from "@/components/policies/policy-setup-checklist";
import type { BannerConfiguration } from "@/lib/banner-config";
import { LOCALE_OPTIONS } from "@/lib/i18n/locale-registry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PolicyEditorPurpose = PurposeSummary & {
  legalBasis?: string | null;
};

export type PolicyEditorVersion = {
  id: string;
  version: number;
  status: string;
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CookieCategoryRow = {
  key: string;
  label: string;
  description: string;
  count: number;
};

export type ScanSummary = {
  id: string | null;
  status: string | null;
  itemsDetected: number;
  completedAt: string | null;
  href: string;
};

export type PolicyEditorWorkspaceProps = {
  policy: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  };
  website: { id: string; name: string; domain: string } | null;
  versions: PolicyEditorVersion[];
  latestVersionId: string | null;
  latestVersionNumber: number | null;
  isPublished: boolean;
  publishedAt: string | null;
  publishedVersionNumber: number | null;
  hasPurposes: boolean;
  attachedPurposes: PolicyEditorPurpose[];
  availablePurposes: PurposeSummary[];
  attachedVendors: ManagedVendor[];
  availableVendors: AvailableVendor[];
  setupItems: SetupCheck[];
  banner: BannerConfiguration | null;
  cookieCategories: CookieCategoryRow[];
  scan: ScanSummary;
};

type EditorTab = "editor" | "settings" | "integrations" | "history";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function categoryTone(label: string): string {
  const key = label.toLowerCase();
  if (key.includes("essential") || key.includes("necessary")) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (key.includes("analytic")) {
    return "bg-sky-50 text-sky-700 ring-sky-200";
  }
  if (key.includes("market") || key.includes("advertis")) {
    return "bg-violet-50 text-violet-700 ring-violet-200";
  }
  if (key.includes("function")) {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }
  return "bg-slate-50 text-slate-600 ring-slate-200";
}

function purposeCategoryLabel(p: PolicyEditorPurpose) {
  if (p.isRequired) return "Essential";
  const basis = (p.legalBasis ?? "").toLowerCase();
  if (basis.includes("legitimate")) return "Functional";
  if (basis.includes("consent")) return "Marketing";
  return "Optional";
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function IconEye() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconSave() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

function IconSend() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function IconScan() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 012-2h2" />
      <path d="M17 3h2a2 2 0 012 2v2" />
      <path d="M21 17v2a2 2 0 01-2 2h-2" />
      <path d="M7 21H5a2 2 0 01-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

const SECTION_ICONS: Record<string, { bg: string; fg: string; icon: ReactNode }> = {
  identity: {
    bg: "bg-sky-50",
    fg: "text-sky-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  purpose: {
    bg: "bg-emerald-50",
    fg: "text-emerald-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  banner: {
    bg: "bg-violet-50",
    fg: "text-violet-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  legal: {
    bg: "bg-orange-50",
    fg: "text-orange-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  categories: {
    bg: "bg-teal-50",
    fg: "text-teal-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  regions: {
    bg: "bg-blue-50",
    fg: "text-blue-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
      </svg>
    ),
  },
  publish: {
    bg: "bg-cyan-50",
    fg: "text-cyan-600",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    ),
  },
};

// ---------------------------------------------------------------------------
// UI atoms
// ---------------------------------------------------------------------------

function SoftCard({
  title,
  children,
  className = "",
  action,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.04)] ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="max-w-[60%] text-right font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function AccordionSection({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: keyof typeof SECTION_ICONS;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const meta = SECTION_ICONS[id];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50/80"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.bg} ${meta.fg}`}>
          {meta.icon}
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-900">{title}</span>
        <IconChevron open={open} />
      </button>
      {open ? <div className="border-t border-slate-100 px-4 py-4">{children}</div> : null}
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-slate-600">{children}</label>;
}

function ReadField({ value, multiline = false }: { value: string; multiline?: boolean }) {
  if (multiline) {
    return (
      <div className="min-h-[96px] rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
        {value || "—"}
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-sm text-slate-800">
      {value || "—"}
    </div>
  );
}

function MiniBannerPreview({ banner }: { banner: BannerConfiguration | null }) {
  const title = banner?.title?.trim() || "We value your privacy";
  const description =
    banner?.description?.trim() ||
    "We use cookies to improve your experience and analyse traffic. You can accept all, reject optional cookies, or customise your choices.";
  const accept = banner?.acceptAllLabel || "Accept All";
  const reject = banner?.rejectAllLabel || "Reject All";
  const customize = banner?.customizeLabel || "Customize";
  const bg = banner?.backgroundColor || "#0f172a";
  const fg = banner?.textColor || "#f8fafc";
  const primary = banner?.primaryColor || "#2563eb";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-inner">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-rose-400/80" />
        <span className="h-2 w-2 rounded-full bg-amber-400/80" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
        <span className="ml-2 truncate text-[10px] text-slate-400">Banner preview</span>
      </div>
      <div className="relative min-h-[168px] bg-[linear-gradient(135deg,#1e293b_0%,#0f172a_55%,#111827_100%)] p-3">
        <div
          className="absolute inset-x-3 bottom-3 rounded-lg p-3 shadow-lg"
          style={{ background: bg, color: fg }}
        >
          <p className="text-xs font-semibold leading-snug">{title}</p>
          <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed opacity-80">{description}</p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {banner?.showCustomize !== false ? (
              <span className="rounded-md border border-white/25 px-2 py-1 text-[10px] font-medium">{customize}</span>
            ) : null}
            {banner?.showRejectAll !== false ? (
              <span className="rounded-md border border-white/25 px-2 py-1 text-[10px] font-medium">{reject}</span>
            ) : null}
            {banner?.showAcceptAll !== false ? (
              <span className="rounded-md px-2 py-1 text-[10px] font-semibold text-white" style={{ background: primary }}>
                {accept}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main workspace
// ---------------------------------------------------------------------------

export function PolicyEditorWorkspace(props: PolicyEditorWorkspaceProps) {
  const router = useRouter();
  const {
    policy,
    website,
    versions,
    latestVersionId,
    latestVersionNumber,
    isPublished,
    publishedAt,
    publishedVersionNumber,
    hasPurposes,
    attachedPurposes,
    availablePurposes,
    attachedVendors,
    availableVendors,
    setupItems,
    banner,
    cookieCategories,
    scan,
  } = props;

  const [tab, setTab] = useState<EditorTab>("editor");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    identity: true,
    purpose: false,
    banner: false,
    legal: false,
    categories: false,
    regions: false,
    publish: false,
  });
  const [openCookieKey, setOpenCookieKey] = useState<string | null>(null);

  const statusVariant: Record<string, "success" | "warning" | "neutral"> = {
    active: "success",
    draft: "neutral",
    archived: "warning",
  };

  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => b.version - a.version),
    [versions],
  );

  const currentVersion = sortedVersions[0] ?? null;
  const defaultLocale = banner?.language || "en";
  const extraLocales = (banner?.supportedLocales ?? []).filter((l) => l !== defaultLocale);
  const localeLabel =
    LOCALE_OPTIONS.find((o) => o.code === defaultLocale)?.label ?? defaultLocale;

  const missingPurposeCopy = attachedPurposes.filter((p) => !p.description?.trim());

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function scrollToPublish() {
    setTab("editor");
    setOpenSections((prev) => ({ ...prev, publish: true }));
    requestAnimationFrame(() => {
      document.getElementById("policy-publish")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function onSaveDraft() {
    // Identity fields have no PATCH API. Purpose/vendor/banner mutations persist
    // on their own actions — never claim a durable write that did not happen.
    router.refresh();
    notify.success(
      "Nothing new to save here. Purpose, vendor, and banner edits already persist when you change them.",
    );
  }

  const tabs: Array<{ id: EditorTab; label: string }> = [
    { id: "editor", label: "Editor" },
    { id: "settings", label: "Settings" },
    { id: "integrations", label: "Integrations" },
    { id: "history", label: "History" },
  ];

  return (
    <div className="page-wrap space-y-5 pb-10">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/dashboard/policies" className="transition hover:text-slate-900">
          Policies
        </Link>
        <span className="text-slate-300" aria-hidden="true">
          ›
        </span>
        <span className="font-medium text-slate-800">Consent Policy Editor</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[1.75rem]">
              {policy.name}
            </h1>
            <Badge variant={statusVariant[policy.status] ?? "neutral"} size="sm" className="capitalize">
              {policy.status}
            </Badge>
            {isPublished ? (
              <Badge variant="success" size="sm">
                Published
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                Draft
              </Badge>
            )}
            {latestVersionNumber != null ? (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                v{latestVersionNumber}
              </span>
            ) : null}
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
            {policy.description?.trim() ||
              "Configure consent purposes, banner appearance, and publishing for this website policy."}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/policies/${policy.id}/preference-center`}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <IconEye />
            Preview
          </Link>
          <button
            type="button"
            onClick={onSaveDraft}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <IconSave />
            Save Draft
          </button>
          <button
            type="button"
            onClick={scrollToPublish}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            <IconSend />
            {isPublished ? "Publish Update" : "Publish"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-6 overflow-x-auto" role="tablist" aria-label="Policy editor sections">
          {tabs.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(item.id)}
                className={`relative -mb-px whitespace-nowrap pb-3 text-sm font-medium transition ${
                  active ? "text-emerald-700" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {item.label}
                {active ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-emerald-500" />
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "settings" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <PolicySetupChecklist items={setupItems} />
          <SoftCard title="Lifecycle">
            <PolicyLifecycleControls
              policyId={policy.id}
              versions={versions.map((row) => ({
                id: row.id,
                version: row.version,
                isPublished: row.isPublished,
                status: row.status,
              }))}
            />
          </SoftCard>
        </div>
      ) : null}

      {tab === "integrations" ? (
        <div id="policy-vendors">
          <PolicyVendorManagerPanel
            policyId={policy.id}
            latestVersionId={latestVersionId}
            attached={attachedVendors}
            available={availableVendors}
            hasPurposes={hasPurposes}
          />
        </div>
      ) : null}

      {tab === "history" ? (
        <div className="grid gap-5 lg:grid-cols-2">
          <SoftCard title="Version history">
            <VersionTimeline versions={sortedVersions} />
          </SoftCard>
          <SoftCard title="Publishing & rollback">
            <div id="policy-publish-history" className="space-y-4">
              <PolicyPublishSection
                policyId={policy.id}
                websiteId={website?.id ?? null}
                latestVersionId={latestVersionId}
                latestVersionNumber={latestVersionNumber}
                isPublished={isPublished}
                publishedAt={publishedAt ? new Date(publishedAt) : null}
                hasPurposes={hasPurposes}
                blockers={setupItems}
              />
              <PolicyLifecycleControls
                policyId={policy.id}
                versions={versions.map((row) => ({
                  id: row.id,
                  version: row.version,
                  isPublished: row.isPublished,
                  status: row.status,
                }))}
              />
            </div>
          </SoftCard>
        </div>
      ) : null}

      {tab === "editor" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.7fr)_minmax(260px,0.7fr)]">
          {/* ── Left column ─────────────────────────────────────────────── */}
          <div className="space-y-4">
            <AccordionSection
              id="identity"
              title="Policy Identity"
              open={openSections.identity}
              onToggle={() => toggleSection("identity")}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Policy name</FieldLabel>
                  <ReadField value={policy.name} />
                </div>
                <div>
                  <FieldLabel>Website</FieldLabel>
                  <ReadField value={website?.domain || website?.name || "—"} />
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel>Internal description</FieldLabel>
                  <ReadField
                    multiline
                    value={
                      policy.description?.trim() ||
                      "No internal description yet. Use this space to document why the policy exists and who owns it."
                    }
                  />
                </div>
              </div>
            </AccordionSection>

            <AccordionSection
              id="purpose"
              title="Purpose Description"
              open={openSections.purpose}
              onToggle={() => toggleSection("purpose")}
            >
              <p className="text-sm text-slate-600">
                Visitor-facing purpose copy should explain why each purpose collects data.
              </p>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                {missingPurposeCopy.length === 0
                  ? "All attached purposes have descriptions."
                  : `${missingPurposeCopy.length} purpose${missingPurposeCopy.length === 1 ? "" : "s"} still need a description.`}
              </div>
              <Link
                href="/dashboard/purposes"
                className="mt-3 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                Manage purpose copy →
              </Link>
            </AccordionSection>

            <AccordionSection
              id="banner"
              title="Banner Text & Appearance"
              open={openSections.banner}
              onToggle={() => toggleSection("banner")}
            >
              <dl className="divide-y divide-slate-100 text-sm">
                <DetailRow label="Title" value={banner?.title?.trim() || "Not set"} />
                <DetailRow
                  label="Description"
                  value={
                    <span className="line-clamp-2 font-normal text-slate-600">
                      {banner?.description?.trim() || "Not set"}
                    </span>
                  }
                />
                <DetailRow label="Layout" value={banner?.layout || "bar"} />
                <DetailRow label="Position" value={banner?.position || "bottom"} />
              </dl>
              <Link
                href={`/dashboard/policies/${policy.id}/studio`}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Open Banner Studio
              </Link>
            </AccordionSection>

            <AccordionSection
              id="legal"
              title="Legal Basis"
              open={openSections.legal}
              onToggle={() => toggleSection("legal")}
            >
              {attachedPurposes.length === 0 ? (
                <p className="text-sm text-slate-500">Attach purposes to review their legal basis.</p>
              ) : (
                <ul className="space-y-2">
                  {attachedPurposes.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                    >
                      <span className="font-medium text-slate-800">{p.name}</span>
                      <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-orange-200">
                        {p.legalBasis || "Not set"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </AccordionSection>

            <AccordionSection
              id="categories"
              title="Categories & Purposes"
              open={openSections.categories}
              onToggle={() => toggleSection("categories")}
            >
              <div id="policy-purposes">
                <PolicyPurposesPanel
                  policyId={policy.id}
                  attached={attachedPurposes}
                  available={availablePurposes}
                  latestVersionId={latestVersionId}
                />
              </div>
            </AccordionSection>

            <AccordionSection
              id="regions"
              title="Regions & Availability"
              open={openSections.regions}
              onToggle={() => toggleSection("regions")}
            >
              <dl className="divide-y divide-slate-100">
                <DetailRow label="Banner region" value={banner?.region || "Global"} />
                <DetailRow
                  label="Default policy"
                  value={policy.isDefault ? "Yes" : "No"}
                />
                <DetailRow
                  label="Website"
                  value={
                    website ? (
                      <Link href={`/dashboard/websites/${website.id}`} className="text-blue-600 hover:underline">
                        {website.domain}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
              </dl>
            </AccordionSection>

            <AccordionSection
              id="publish"
              title="Publish Settings"
              open={openSections.publish}
              onToggle={() => toggleSection("publish")}
            >
              <div id="policy-publish" className="space-y-4">
                <PolicyPublishSection
                  policyId={policy.id}
                  websiteId={website?.id ?? null}
                  latestVersionId={latestVersionId}
                  latestVersionNumber={latestVersionNumber}
                  isPublished={isPublished}
                  publishedAt={publishedAt ? new Date(publishedAt) : null}
                  hasPurposes={hasPurposes}
                  blockers={setupItems}
                />
                <PolicyLifecycleControls
                  policyId={policy.id}
                  versions={versions.map((row) => ({
                    id: row.id,
                    version: row.version,
                    isPublished: row.isPublished,
                    status: row.status,
                  }))}
                />
              </div>
            </AccordionSection>

            {/* Bottom tables */}
            <div className="grid gap-4 lg:grid-cols-2">
              <SoftCard
                title="Purposes"
                action={
                  <Link href="/dashboard/purposes/new" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                    + New
                  </Link>
                }
              >
                {attachedPurposes.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">No purposes attached yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                          <th className="pb-2 pr-2 font-semibold">#</th>
                          <th className="pb-2 pr-2 font-semibold">Purpose</th>
                          <th className="pb-2 pr-2 font-semibold">Category</th>
                          <th className="pb-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attachedPurposes.map((p, index) => {
                          const cat = purposeCategoryLabel(p);
                          return (
                            <tr key={p.id}>
                              <td className="py-2.5 pr-2 text-slate-400">{index + 1}</td>
                              <td className="py-2.5 pr-2">
                                <div className="font-medium text-slate-900">{p.name}</div>
                                <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                                  {p.description || "No description"}
                                </div>
                              </td>
                              <td className="py-2.5 pr-2">
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${categoryTone(cat)}`}>
                                  {cat}
                                </span>
                              </td>
                              <td className="py-2.5 capitalize text-slate-600">{p.status}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SoftCard>

              <SoftCard
                title="Cookies / Categories"
                action={
                  <Link href="/dashboard/trackers" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                    View all
                  </Link>
                }
              >
                {cookieCategories.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500">No trackers categorised yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {cookieCategories.map((row) => {
                      const open = openCookieKey === row.key;
                      return (
                        <li key={row.key}>
                          <button
                            type="button"
                            onClick={() => setOpenCookieKey(open ? null : row.key)}
                            className="flex w-full items-start gap-3 py-3 text-left"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-slate-900">{row.label}</span>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${categoryTone(row.label)}`}>
                                  {row.count} cookie{row.count === 1 ? "" : "s"}
                                </span>
                              </div>
                              {open ? (
                                <p className="mt-1 text-xs leading-relaxed text-slate-500">{row.description}</p>
                              ) : (
                                <p className="mt-1 line-clamp-1 text-xs text-slate-500">{row.description}</p>
                              )}
                            </div>
                            <IconChevron open={open} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </SoftCard>
            </div>
          </div>

          {/* ── Middle column ───────────────────────────────────────────── */}
          <div className="space-y-4">
            <SoftCard title="Policy Details">
              <dl className="divide-y divide-slate-100">
                <DetailRow
                  label="Website"
                  value={
                    website ? (
                      <Link href={`/dashboard/websites/${website.id}`} className="text-blue-600 hover:underline">
                        {website.domain}
                      </Link>
                    ) : (
                      "—"
                    )
                  }
                />
                <DetailRow
                  label="Status"
                  value={
                    <Badge variant={statusVariant[policy.status] ?? "neutral"} size="sm" className="capitalize">
                      {policy.status}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Version"
                  value={latestVersionNumber != null ? `v${latestVersionNumber}` : "—"}
                />
                <DetailRow
                  label="Consent type"
                  value={banner?.defaultConsent === "opt-out" ? "Opt-out" : "Notice and consent"}
                />
                <DetailRow label="Default policy" value={policy.isDefault ? "Yes" : "No"} />
                <DetailRow label="Created" value={formatDate(policy.createdAt)} />
                <DetailRow label="Last updated" value={formatDate(policy.updatedAt)} />
              </dl>
            </SoftCard>

            <SoftCard title="Versions">
              <VersionTimeline versions={sortedVersions} />
            </SoftCard>

            <SoftCard title="Publishing Status">
              <div
                className={`rounded-lg px-3.5 py-3 text-sm ${
                  isPublished
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                {isPublished
                  ? "This policy is published and active."
                  : "This policy is not published yet."}
              </div>
              <dl className="mt-2 divide-y divide-slate-100">
                <DetailRow
                  label="Status"
                  value={isPublished ? "Published" : currentVersion?.status || "Draft"}
                />
                <DetailRow
                  label="Published on"
                  value={formatDateTime(publishedAt)}
                />
                <DetailRow
                  label="Live version"
                  value={publishedVersionNumber != null ? `v${publishedVersionNumber}` : "—"}
                />
                <DetailRow label="Applies to" value={banner?.region || "All regions"} />
                <DetailRow label="Default policy" value={policy.isDefault ? "Yes" : "No"} />
              </dl>
              {website && isPublished ? (
                <Link
                  href={`/dashboard/websites/${website.id}/installation`}
                  className="mt-3 inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Install SDK →
                </Link>
              ) : null}
            </SoftCard>
          </div>

          {/* ── Right column ────────────────────────────────────────────── */}
          <div className="space-y-4">
            <SoftCard title="Quick Actions">
              <ul className="space-y-1">
                <QuickAction
                  href={`/dashboard/policies/${policy.id}/preference-center`}
                  icon={<IconEye />}
                  label="Preview consent banner"
                />
                <QuickAction
                  href={`/dashboard/policies/${policy.id}/studio`}
                  icon={<IconCopy />}
                  label="Open Banner Studio"
                />
                <QuickAction
                  href={website ? `/dashboard/websites/${website.id}/installation` : `/dashboard/policies/${policy.id}/studio`}
                  icon={<IconBook />}
                  label="View implementation guide"
                />
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      const payload = {
                        policyId: policy.id,
                        name: policy.name,
                        websiteId: website?.id ?? null,
                        version: latestVersionNumber,
                        banner,
                      };
                      void navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(
                        () => notify.success("Policy configuration JSON copied to clipboard."),
                        () => notify.error("Unable to copy configuration JSON."),
                      );
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    <span className="text-slate-400">
                      <IconDownload />
                    </span>
                    Export configuration (JSON)
                  </button>
                </li>
              </ul>
            </SoftCard>

            <SoftCard title="Language & Locale">
              <FieldLabel>Default language</FieldLabel>
              <ReadField value={localeLabel} />
              <div className="mt-4">
                <FieldLabel>Additional languages</FieldLabel>
                <div className="mt-1 flex flex-wrap gap-2">
                  {extraLocales.length === 0 ? (
                    <span className="text-sm text-slate-500">None configured</span>
                  ) : (
                    extraLocales.map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                      >
                        {(LOCALE_OPTIONS.find((o) => o.code === code)?.label ?? code).split(" ")[0]}{" "}
                        <span className="ml-1 text-slate-400">({code.toUpperCase()})</span>
                      </span>
                    ))
                  )}
                  <Link
                    href={`/dashboard/policies/${policy.id}/studio`}
                    className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:border-blue-300 hover:text-blue-600"
                  >
                    + Add language
                  </Link>
                </div>
              </div>
            </SoftCard>

            <SoftCard
              title="Banner Preview"
              action={
                <Link
                  href={`/dashboard/policies/${policy.id}/studio`}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Edit
                </Link>
              }
            >
              <MiniBannerPreview banner={banner} />
            </SoftCard>

            <SoftCard title="Scanning Results">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <IconScan />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {scan.id
                      ? scan.itemsDetected > 0
                        ? `${scan.itemsDetected} item${scan.itemsDetected === 1 ? "" : "s"} detected`
                        : "No new cookies found"
                      : "No scan run yet"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {scan.completedAt
                      ? `Last scan ${formatDateTime(scan.completedAt)}`
                      : "Run a scan to inventory cookies and trackers."}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={website ? `/dashboard/scanner?websiteId=${website.id}` : "/dashboard/scanner"}
                  className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Run new scan
                </Link>
                {scan.id ? (
                  <Link
                    href={scan.href}
                    className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    View results
                  </Link>
                ) : null}
              </div>
            </SoftCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function VersionTimeline({ versions }: { versions: PolicyEditorVersion[] }) {
  if (versions.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No versions yet</p>;
  }

  return (
    <ol className="relative space-y-0 pl-1">
      {versions.map((v, index) => {
        const isCurrent = index === 0;
        return (
          <li key={v.id} className="relative flex gap-3 pb-5 last:pb-0">
            {index < versions.length - 1 ? (
              <span className="absolute left-[7px] top-4 h-[calc(100%-8px)] w-px bg-slate-200" aria-hidden="true" />
            ) : null}
            <span
              className={`relative z-[1] mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white ${
                v.isPublished ? "bg-emerald-500" : isCurrent ? "bg-blue-500" : "bg-slate-300"
              }`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">
                  v{v.version}
                  {isCurrent ? " (Current)" : ""}
                </span>
                {v.isPublished ? (
                  <Badge variant="success" size="sm">
                    Published
                  </Badge>
                ) : (
                  <Badge variant="neutral" size="sm" className="capitalize">
                    {v.status}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {v.isPublished && v.publishedAt
                  ? `Published ${formatDate(v.publishedAt)}`
                  : `Updated ${formatDate(v.updatedAt)}`}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
      >
        <span className="text-slate-400">{icon}</span>
        {label}
      </Link>
    </li>
  );
}
