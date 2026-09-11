"use client";

import { useState, useCallback, useMemo } from "react";
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
import { StudioControls } from "./studio-controls";
import { StudioPreview } from "./studio-preview";

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

  const [config, setConfig] = useState<BannerConfiguration>(initialConfig);
  const [pinnedPreset, setPinnedPreset] = useState<string | null>(
    () => findMatchingPreset(initialConfig)?.id ?? null,
  );
  const activePreset = useMemo(() => {
    if (pinnedPreset) {
      const preferred = BANNER_PRESETS.find((preset) => preset.id === pinnedPreset);
      if (preferred && presetMatchesConfig(preferred, config)) return pinnedPreset;
    }
    return findMatchingPreset(config)?.id ?? null;
  }, [config, pinnedPreset]);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
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
    setConfig((prev) => parseBannerConfig({ ...prev, ...preset.overrides } as Record<string, unknown>));
    setPinnedPreset(presetId);
  }, []);

  const handleReset = useCallback(() => {
    const next = defaultBannerConfig();
    setConfig(next);
    setPinnedPreset(findMatchingPreset(next)?.id ?? null);
    setSaveError(null);
    setSaveSuccess(false);
  }, []);

  const handleSave = useCallback(async () => {
    if (!latestVersionId) return;
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
      const data = (await res.json()) as { success: boolean; message?: string };
      if (!data.success) {
        notify.error("Unable to save banner. Please try again.");
        setSaveError("Unable to save banner. Please try again.");
      } else {
        notify.success("Banner draft saved");
        setSaveSuccess(true);
        router.refresh();
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch {
      notify.error("Unable to connect. Please try again.");
      setSaveError("Unable to connect. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [config, policyId, latestVersionId, router]);

  const previewUrl = websiteDomain
    ? websiteDomain.startsWith("http") ? websiteDomain : `https://${websiteDomain}`
    : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--muted)]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--card)] px-4 shadow-sm">
        <Link
          href={`/dashboard/policies/${policyId}`}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] shadow-sm transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          aria-label="Back to policy"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
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
          <div className="hidden items-center gap-1.5 rounded-full bg-[var(--info-soft)] px-3 py-1 text-xs font-medium text-[var(--primary)] ring-1 ring-[color-mix(in_srgb,var(--primary)_22%,transparent)] sm:flex">
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-[var(--border)] bg-[var(--card)] shadow-sm xl:w-96">
          <StudioControls
            config={config}
            onChange={handleChange}
            onApplyPreset={handleApplyPreset}
            activePreset={activePreset}
            saving={saving}
            saveError={saveError}
            saveSuccess={saveSuccess}
            onSave={handleSave}
            onReset={handleReset}
            hasVersion={!!latestVersionId}
            policyId={policyId}
            websiteId={websiteId}
            liveIsBehind={liveIsBehind}
          />
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <StudioPreview
            config={config}
            websiteUrl={previewUrl}
            viewport={viewport}
            onViewportChange={setViewport}
          />
        </main>
      </div>
    </div>
  );
}
