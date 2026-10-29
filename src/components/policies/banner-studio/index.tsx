"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notify } from "@/components/feedback/notify";
import {
  defaultBannerConfig,
  parseBannerConfig,
  type BannerConfiguration,
} from "@/lib/banner-config";
import {
  BANNER_PRESETS,
  findMatchingPreset,
  presetMatchesConfig,
} from "@/lib/banner-presets";
import { StudioTemplates } from "./studio-templates";
import { StudioInspector } from "./studio-inspector";
import { StudioCookiePrefsInspector } from "./studio-cookie-prefs-inspector";
import { StudioPreview } from "./studio-preview";
import {
  STUDIO_TABS,
  StudioTabIcon,
  type StudioTab,
  type StudioViewport,
} from "./studio-shell";

type StudioWorkspace = "banner" | "cookie-prefs";

export interface BannerStudioProps {
  policyId: string;
  policyName: string;
  latestVersionId: string | null;
  initialConfig: BannerConfiguration;
  websiteDomain: string | null;
  websiteId: string | null;
  liveIsBehind: boolean;
}

export function BannerStudio({
  policyId,
  policyName,
  latestVersionId,
  initialConfig,
  websiteDomain,
  websiteId,
  liveIsBehind,
}: BannerStudioProps) {
  const router = useRouter();
  const templatesRef = useRef<HTMLDivElement>(null);

  const [config, setConfig] = useState<BannerConfiguration>(initialConfig);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialConfig));
  const isDirty = JSON.stringify(config) !== savedSnapshot;
  const [pinnedPreset, setPinnedPreset] = useState<string | null>(
    () => findMatchingPreset(initialConfig)?.id ?? null,
  );

  useEffect(() => {
    if (!isDirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);
  const activePreset = useMemo(() => {
    if (pinnedPreset) {
      const preferred = BANNER_PRESETS.find((preset) => preset.id === pinnedPreset);
      if (preferred && presetMatchesConfig(preferred, config)) return pinnedPreset;
    }
    return findMatchingPreset(config)?.id ?? null;
  }, [config, pinnedPreset]);

  const [viewport, setViewport] = useState<StudioViewport>("desktop");
  const [workspace, setWorkspace] = useState<StudioWorkspace>("banner");
  const [activeTab, setActiveTab] = useState<StudioTab>("presets");
  const [requestedSurface, setRequestedSurface] = useState<
    "banner" | "preferences" | "cookie-prefs" | null
  >(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = useCallback(
    <K extends keyof BannerConfiguration>(key: K, value: BannerConfiguration[K]) => {
      setConfig((prev) => {
        const draft: BannerConfiguration = { ...prev, [key]: value };
        if (key === "layout" && value === "dialog") {
          draft.position = "center";
          draft.overlayEnabled = true;
        }
        if (key === "layout" && value === "bar" && prev.position === "center") {
          draft.position = "bottom";
        }
        return key === "layout" || key === "position"
          ? parseBannerConfig(draft as unknown as Record<string, unknown>)
          : draft;
      });
    },
    [],
  );

  const handleApplyPreset = useCallback((presetId: string) => {
    const preset = BANNER_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setConfig((prev) =>
      parseBannerConfig({ ...prev, ...preset.overrides } as Record<string, unknown>),
    );
    setPinnedPreset(presetId);
    if (preset.category === "prefs") {
      setWorkspace("cookie-prefs");
      setRequestedSurface("cookie-prefs");
    } else {
      setWorkspace("banner");
      setActiveTab("presets");
      setRequestedSurface("banner");
    }
  }, []);

  const handleReset = useCallback(() => {
    const next = defaultBannerConfig();
    setConfig(next);
    setPinnedPreset(findMatchingPreset(next)?.id ?? null);
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!latestVersionId || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/policies/${policyId}/banner-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(config),
      });
      const data = (await res.json()) as { success: boolean; message?: string; configuration?: BannerConfiguration };
      if (!data.success) {
        const message = data.message || "Unable to save banner. Please try again.";
        notify.error(message);
        setSaveError(message);
      } else {
        notify.success("Banner draft saved");
        setSaveSuccess(true);
        const nextSaved = data.configuration
          ? parseBannerConfig(data.configuration as unknown as Record<string, unknown>)
          : config;
        setConfig(nextSaved);
        setSavedSnapshot(JSON.stringify(nextSaved));
        router.refresh();
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch {
      notify.error("Unable to connect. Please try again.");
      setSaveError("Unable to connect. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [config, policyId, latestVersionId, router, saving]);

  const previewUrl = websiteDomain
    ? websiteDomain.startsWith("http")
      ? websiteDomain
      : `https://${websiteDomain}`
    : null;

  function focusTemplates() {
    setActiveTab("presets");
    templatesRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[var(--muted)]">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 shadow-sm">
        <Link
          href={`/dashboard/policies/${policyId}`}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] shadow-sm transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label="Back to policy"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 16 16"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 3L5 8l5 5" />
          </svg>
        </Link>

        <div className="flex min-w-0 items-center gap-1.5 text-sm">
          <span className="hidden text-[var(--muted-foreground)] sm:block">Policies</span>
          <span className="hidden text-[var(--border)] sm:block">/</span>
          <span className="max-w-[140px] truncate font-medium text-[var(--muted-foreground)] xl:max-w-xs">
            {policyName}
          </span>
          <span className="text-[var(--border)]">/</span>
          <span className="font-semibold text-[var(--foreground)]">Banner Studio</span>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <div className="hidden items-center gap-1.5 rounded-full bg-[var(--info-soft)] px-3 py-1.5 text-xs font-medium text-[var(--primary)] ring-1 ring-[color-mix(in_srgb,var(--primary)_22%,transparent)] sm:flex">
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 16 16"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8s-2.5 4.5-6.5 4.5S1.5 8 1.5 8z"
              />
              <circle cx="8" cy="8" r="1.75" />
            </svg>
            Studio preview
          </div>
          {liveIsBehind ? (
            <span className="rounded-full bg-[var(--warning-soft)] px-3 py-1 text-xs font-medium text-[var(--warning)] ring-1 ring-[color-mix(in_srgb,var(--warning)_22%,transparent)]">
              Draft — not live yet
            </span>
          ) : latestVersionId ? (
            <span className="rounded-full bg-[var(--success-soft)] px-3 py-1 text-xs font-medium text-[var(--success)] ring-1 ring-[color-mix(in_srgb,var(--success)_22%,transparent)]">
              Matches published
            </span>
          ) : (
            <span className="rounded-full bg-[var(--warning-soft)] px-3 py-1 text-xs font-medium text-[var(--warning)] ring-1 ring-[color-mix(in_srgb,var(--warning)_22%,transparent)]">
              No version
            </span>
          )}
        </div>
      </header>

      {/* ── Workspace: Banner vs Cookie prefs ───────────────────────────── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-3 py-1.5">
        <div className="flex items-center gap-0.5 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-0.5">
          {(
            [
              { id: "banner" as const, label: "Banner" },
              { id: "cookie-prefs" as const, label: "Cookie Preferences" },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => {
                setWorkspace(mode.id);
                setRequestedSurface(mode.id === "cookie-prefs" ? "cookie-prefs" : "banner");
              }}
              aria-pressed={workspace === mode.id}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                workspace === mode.id
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {workspace === "banner" ? (
          <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto">
            {STUDIO_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={active}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-[var(--muted)] text-[var(--primary)] shadow-sm ring-1 ring-[var(--border)]"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/60 hover:text-[var(--foreground)]"
                  }`}
                >
                  <StudioTabIcon name={tab.icon} className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="min-w-0 flex-1 truncate text-xs text-[var(--muted-foreground)]">
            Editing only the post-consent Cookie Preferences panel
          </p>
        )}

        <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-[var(--border)] bg-[var(--muted)] p-0.5">
          {(
            [
              {
                id: "desktop" as const,
                label: "Desktop",
                icon: (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 16 16"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden
                  >
                    <rect x="1" y="2" width="14" height="10" rx="1.5" />
                    <path strokeLinecap="round" d="M5 14h6M8 12v2" />
                  </svg>
                ),
              },
              {
                id: "mobile" as const,
                label: "Mobile",
                icon: (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 16 16"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    aria-hidden
                  >
                    <rect x="4" y="1" width="8" height="14" rx="1.5" />
                    <circle cx="8" cy="13" r="0.75" fill="currentColor" />
                  </svg>
                ),
              },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setViewport(v.id)}
              aria-pressed={viewport === v.id}
              title={`${v.label} preview`}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                viewport === v.id
                  ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {v.icon}
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Three columns ────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div
          ref={templatesRef}
          className={`${
            workspace === "cookie-prefs" || activeTab === "presets" ? "flex" : "hidden md:flex"
          } w-full shrink-0 flex-col md:w-[260px] xl:w-[300px]`}
        >
          <StudioTemplates
            activePreset={activePreset}
            onApplyPreset={handleApplyPreset}
            highlight={workspace === "banner" ? activeTab === "presets" : true}
            lockedCategory={workspace === "cookie-prefs" ? "prefs" : null}
            title={workspace === "cookie-prefs" ? "Cookie prefs templates" : "Templates"}
            subtitle={
              workspace === "cookie-prefs"
                ? "Layouts and copy for the post-consent panel only."
                : "Choose a starting point and customize it."
            }
          />
        </div>

        <main
          className={`min-w-0 flex-1 flex-col overflow-hidden ${
            workspace === "banner" && activeTab === "presets" ? "hidden md:flex" : "flex"
          }`}
        >
          <StudioPreview
            config={config}
            websiteUrl={previewUrl}
            viewport={viewport}
            onViewportChange={setViewport}
            hideDeviceToggle
            requestedSurface={requestedSurface}
            onRequestedSurfaceHandled={() => setRequestedSurface(null)}
          />
        </main>

        <div
          className={`w-full shrink-0 flex-col border-t border-[var(--border)] md:border-t-0 md:border-l md:w-[300px] xl:w-[340px] ${
            workspace === "banner" && activeTab === "presets"
              ? "hidden md:flex"
              : "flex max-h-[46vh] md:max-h-none"
          }`}
        >
          {workspace === "cookie-prefs" ? (
            <StudioCookiePrefsInspector
              config={config}
              onChange={handleChange}
              saving={saving}
              saveError={saveError}
              saveSuccess={saveSuccess}
              onSave={handleSave}
              onReset={handleReset}
              hasVersion={!!latestVersionId}
              policyId={policyId}
              websiteId={websiteId}
              isDirty={isDirty}
            />
          ) : (
            <StudioInspector
              config={config}
              onChange={handleChange}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onOpenTemplatePicker={focusTemplates}
              saving={saving}
              saveError={saveError}
              saveSuccess={saveSuccess}
              onSave={handleSave}
              onReset={handleReset}
              hasVersion={!!latestVersionId}
              policyId={policyId}
              websiteId={websiteId}
              liveIsBehind={liveIsBehind}
              isDirty={isDirty}
            />
          )}
        </div>
      </div>
    </div>
  );
}
