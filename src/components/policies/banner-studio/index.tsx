"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notify } from "@/components/feedback/notify";
import {
  defaultBannerConfig,
  type BannerConfiguration,
} from "@/lib/banner-config";
import { StudioControls, PRESETS, type PresetName } from "./studio-controls";
import { StudioPreview } from "./studio-preview";

export interface BannerStudioProps {
  policyId: string;
  policyName: string;
  latestVersionId: string | null;
  initialConfig: BannerConfiguration;
  websiteDomain: string | null;
}

export function BannerStudio({
  policyId,
  policyName,
  latestVersionId,
  initialConfig,
  websiteDomain,
}: BannerStudioProps) {
  const router = useRouter();

  const [config, setConfig]           = useState<BannerConfiguration>(initialConfig);
  const [activePreset, setActivePreset] = useState<PresetName | null>(null);
  const [viewport, setViewport]       = useState<"desktop" | "mobile">("desktop");
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = useCallback(
    <K extends keyof BannerConfiguration>(key: K, value: BannerConfiguration[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
      setActivePreset((prev) => {
        if (!prev) return null;
        const preset = PRESETS.find((p) => p.name === prev);
        if (!preset) return null;
        return (key in (preset.overrides as object)) ? null : prev;
      });
    },
    [],
  );

  const handleApplyPreset = useCallback(
    (overrides: Partial<BannerConfiguration>) => {
      setConfig((prev) => ({ ...prev, ...overrides }));
      const matched = PRESETS.find(
        (p) => JSON.stringify(p.overrides) === JSON.stringify(overrides),
      );
      setActivePreset(matched?.name ?? null);
    },
    [],
  );

  const handleReset = useCallback(() => {
    setConfig(defaultBannerConfig());
    setActivePreset(null);
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
        notify.success("Banner saved successfully");
        setSaveSuccess(true);
        router.refresh();
        setTimeout(() => setSaveSuccess(false), 3000);
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
    <div className="flex h-screen flex-col overflow-hidden" style={{ background: "#f1f5f9" }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-sm shadow-sm">
        {/* Back chevron */}
        <Link
          href={`/dashboard/policies/${policyId}`}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
          aria-label="Back to policy"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 3L5 8l5 5" />
          </svg>
        </Link>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-slate-400 hidden sm:block">Policies</span>
          <span className="text-slate-300 hidden sm:block">/</span>
          <span className="max-w-[140px] truncate font-medium text-slate-600 xl:max-w-xs">
            {policyName}
          </span>
          <span className="text-slate-300">/</span>
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" d="M2 9l2.5-2.5L6 8l4-4" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900">Banner Studio</span>
          </div>
        </div>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2.5">
          {/* Live indicator */}
          <div className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-500/20 sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live preview
          </div>

          {/* Version badge */}
          {latestVersionId ? (
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-indigo-500/20">
              Version ready
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-500/20">
              No version
            </span>
          )}
        </div>
      </header>

      {/* ── Main split ───────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 overflow-hidden">

        {/* Left — controls panel */}
        <aside className="flex w-72 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-sm xl:w-80">
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
          />
        </aside>

        {/* Right — live preview */}
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
