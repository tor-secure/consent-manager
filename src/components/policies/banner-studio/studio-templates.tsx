"use client";

import { useMemo, useState } from "react";
import {
  BANNER_PRESETS,
  BANNER_PRESET_CATEGORIES,
  type BannerPreset,
  type BannerPresetCategory,
} from "@/lib/banner-presets";

interface StudioTemplatesProps {
  activePreset: string | null;
  onApplyPreset: (presetId: string) => void;
  highlight?: boolean;
  /** Limit templates to one category (e.g. cookie prefs-only workspace). */
  lockedCategory?: BannerPresetCategory | null;
  title?: string;
  subtitle?: string;
}

function PresetThumb({ preset }: { preset: BannerPreset }) {
  const bg = preset.overrides.backgroundColor ?? "#ffffff";
  const primary = preset.overrides.primaryColor ?? "#0B2C4A";
  const text = preset.overrides.textColor ?? "#0f172a";
  const layout = preset.overrides.layout ?? "bar";
  const position = preset.overrides.position ?? "bottom";
  const radius = Math.min(preset.overrides.borderRadius ?? 8, 8);
  const widgetRight =
    (preset.overrides.preferenceWidgetPosition || "bottom-left") === "bottom-right";

  if (preset.category === "prefs") {
    return (
      <div className="relative h-14 w-full overflow-hidden rounded-lg bg-[var(--muted)] ring-1 ring-[var(--border)]">
        <div
          className="absolute bottom-1.5 flex flex-col gap-0.5 rounded-md border border-[var(--border)] bg-white p-1.5 shadow-sm"
          style={{
            [widgetRight ? "right" : "left"]: 4,
            width: "52%",
          }}
        >
          <span className="h-1 w-3/4 rounded-sm bg-[var(--border)]" />
          <span className="h-1 w-full rounded-sm" style={{ background: primary, opacity: 0.85 }} />
          {preset.overrides.showDownloadReceipt !== false ? (
            <span className="h-1 w-full rounded-sm border border-[var(--border)]" />
          ) : null}
          {preset.overrides.showRevokeConsent !== false ? (
            <span className="h-1 w-full rounded-sm bg-red-400/80" />
          ) : null}
        </div>
        <span
          className="absolute bottom-1 h-2.5 w-2.5 rounded-full"
          style={{
            [widgetRight ? "right" : "left"]: 3,
            background: primary,
          }}
        />
      </div>
    );
  }

  const bannerPos: React.CSSProperties =
    layout === "dialog" || position === "center"
      ? { top: "22%", left: "18%", right: "18%", bottom: "28%", borderRadius: radius }
      : layout === "box" && position === "bottom-right"
        ? { right: 4, bottom: 4, width: "42%", height: "38%", borderRadius: radius }
        : layout === "box" && position === "bottom-left"
          ? { left: 4, bottom: 4, width: "42%", height: "38%", borderRadius: radius }
          : layout === "box"
            ? { left: "10%", right: "10%", bottom: 4, height: "36%", borderRadius: radius }
            : position === "top"
              ? { left: 0, right: 0, top: 0, height: "28%" }
              : { left: 0, right: 0, bottom: 0, height: "28%" };

  return (
    <div className="relative h-14 w-full overflow-hidden rounded-lg bg-[var(--muted)] ring-1 ring-[var(--border)]">
      <div className="absolute inset-x-2 top-1.5 h-1 rounded-full bg-[var(--border)]" />
      <div className="absolute inset-x-4 top-3.5 h-1 rounded-full bg-[var(--border)]/70" />
      <div
        className="absolute flex items-end justify-end gap-0.5 p-1"
        style={{ ...bannerPos, background: bg }}
      >
        <span className="h-1.5 w-3 rounded-sm" style={{ background: primary }} />
        <span className="h-1.5 w-2.5 rounded-sm" style={{ background: text, opacity: 0.25 }} />
      </div>
    </div>
  );
}

export function StudioTemplates({
  activePreset,
  onApplyPreset,
  highlight = false,
  lockedCategory = null,
  title = "Templates",
  subtitle = "Choose a starting point and customize it.",
}: StudioTemplatesProps) {
  const [category, setCategory] = useState<BannerPresetCategory | "all">(
    lockedCategory ?? "all",
  );
  const effectiveCategory = lockedCategory ?? category;
  const visible = useMemo(
    () =>
      BANNER_PRESETS.filter(
        (p) => effectiveCategory === "all" || p.category === effectiveCategory,
      ),
    [effectiveCategory],
  );

  return (
    <aside
      className={`flex h-full min-h-0 flex-col border-r border-[var(--border)] bg-[var(--card)] ${
        highlight ? "ring-1 ring-inset ring-[var(--primary)]/30" : ""
      }`}
    >
      <div className="shrink-0 space-y-3 border-b border-[var(--border)] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
            {subtitle}
          </p>
        </div>
        {!lockedCategory ? (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                category === "all"
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              All
            </button>
            {BANNER_PRESET_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                  category === cat.id
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {visible.map((preset) => {
          const active = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onApplyPreset(preset.id)}
              className={`flex w-full gap-3 rounded-2xl border p-2.5 text-left transition ${
                active
                  ? "border-[color-mix(in_srgb,var(--primary)_45%,transparent)] bg-[var(--info-soft)] ring-1 ring-[color-mix(in_srgb,var(--primary)_20%,transparent)]"
                  : "border-[var(--border)] hover:bg-[var(--muted)]/60"
              }`}
            >
              <div className="w-[5.5rem] shrink-0">
                <PresetThumb preset={preset} />
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <p
                  className={`text-xs font-semibold ${
                    active ? "text-[var(--primary)]" : "text-[var(--foreground)]"
                  }`}
                >
                  {preset.label}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-[var(--muted-foreground)]">
                  {preset.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
