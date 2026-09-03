"use client";

import { useEffect, useRef, useState } from "react";
import type { BannerConfiguration } from "@/lib/banner-config";
import { BannerRenderer, PreferenceWidgetPreview } from "./banner-renderer";

type Viewport = "desktop" | "mobile";

interface StudioPreviewProps {
  config: BannerConfiguration;
  websiteUrl: string | null;
  viewport: Viewport;
  onViewportChange: (v: Viewport) => void;
}

// ---------------------------------------------------------------------------
// FallbackMockPage — realistic website skeleton shown when no URL or blocked
// ---------------------------------------------------------------------------

function FallbackMockPage({
  config,
  reason,
}: {
  config: BannerConfiguration;
  reason: "no-url" | "blocked" | "error";
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-white">

      {/* Nav */}
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-6 py-3">
        <div className="h-6 w-6 rounded-lg bg-slate-800" />
        <div className="h-5 w-20 rounded-md bg-slate-200" />
        <div className="flex-1" />
        <div className="h-4 w-10 rounded bg-slate-100" />
        <div className="h-4 w-10 rounded bg-slate-100" />
        <div className="h-4 w-10 rounded bg-slate-100" />
        <div className="h-7 w-18 rounded-full bg-slate-900" />
      </div>

      {/* Hero */}
      <div className="px-8 pt-10 pb-6">
        <div className="mx-auto max-w-xl">
          <div className="mb-2 h-2.5 w-20 rounded-full bg-indigo-200" />
          <div className="mb-3 h-7 w-4/5 rounded-lg bg-slate-200" />
          <div className="mb-1.5 h-3.5 w-full rounded-md bg-slate-100" />
          <div className="mb-1.5 h-3.5 w-5/6 rounded-md bg-slate-100" />
          <div className="mb-6 h-3.5 w-4/5 rounded-md bg-slate-100" />
          <div className="flex gap-3">
            <div className="h-9 w-28 rounded-full bg-slate-900" />
            <div className="h-9 w-28 rounded-full border border-slate-300" />
          </div>
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-3 gap-4 px-8 pb-8">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="mb-3 h-20 rounded-xl bg-slate-200" />
            <div className="mb-2 h-3.5 w-3/4 rounded bg-slate-200" />
            <div className="h-3 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Blocked notice */}
      {reason !== "no-url" && (
        <div className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 shadow-sm whitespace-nowrap">
          {reason === "blocked"
            ? "Site blocks embedding — showing mock preview"
            : "Could not load site — showing mock preview"}
        </div>
      )}

      {/* Overlay */}
      {config.overlayEnabled && (
        <div className="pointer-events-none absolute inset-0 bg-black/40" aria-hidden="true" />
      )}

      {/* Banner */}
      <BannerRenderer config={config} />
      <PreferenceWidgetPreview config={config} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// IframePreview
// ---------------------------------------------------------------------------

function IframePreview({
  url, config, onBlock,
}: {
  url: string;
  config: BannerConfiguration;
  onBlock: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => { if (!loaded) onBlock(); }, 8000);
    return () => clearTimeout(timer);
  }, [url, loaded, onBlock]);

  function handleLoad() {
    setLoaded(true);
    try {
      const loc = iframeRef.current?.contentWindow?.location?.href;
      if (loc === "about:blank") onBlock();
    } catch { /* cross-origin — fine */ }
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <iframe
        ref={iframeRef}
        src={url}
        title="Website preview"
        onLoad={handleLoad}
        onError={onBlock}
        sandbox="allow-scripts allow-same-origin allow-forms"
        className="h-full w-full border-0"
        style={{ display: loaded ? "block" : "none" }}
      />

      {!loaded && (
        <div className="flex h-full w-full items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <svg className="h-8 w-8 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-sm font-medium">Loading preview…</span>
          </div>
        </div>
      )}

      {loaded && (
        <div className="pointer-events-none absolute inset-0">
          {config.overlayEnabled && (
            <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
          )}
          <div className="pointer-events-auto">
            <BannerRenderer config={config} />
          </div>
          <PreferenceWidgetPreview config={config} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StudioPreview
// ---------------------------------------------------------------------------

export function StudioPreview({
  config, websiteUrl, viewport, onViewportChange,
}: StudioPreviewProps) {
  const [iframeBlocked, setIframeBlocked] = useState(false);
  const [urlInput, setUrlInput]           = useState(websiteUrl ?? "");
  const [activeUrl, setActiveUrl]         = useState<string | null>(websiteUrl);

  useEffect(() => { setIframeBlocked(false); }, [activeUrl]);

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    let url = urlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    setActiveUrl(url);
    setIframeBlocked(false);
  }

  const previewWidth = viewport === "mobile" ? "360px" : "720px";
  const previewHeight = viewport === "mobile" ? "580px" : "400px";

  return (
    <div className="flex h-full flex-col">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-200 bg-white px-4 py-2.5">

        {/* URL bar */}
        <form onSubmit={handleUrlSubmit} className="flex flex-1 items-center gap-2 min-w-0">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-sm min-w-0 transition focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/15">
            <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="8" cy="8" r="6" />
              <path strokeLinecap="round" d="M8 2c-1 2-1 8 0 12M2 8h12" />
            </svg>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="Enter website URL to preview…"
              className="flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400 min-w-0"
            />
          </div>
          <button
            type="submit"
            className="shrink-0 rounded-2xl bg-indigo-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            Load
          </button>
        </form>

        {/* Separator */}
        <div className="h-5 w-px bg-slate-200" />

        {/* Viewport toggle */}
        <div className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50 p-0.5 shadow-sm">
          {[
            {
              id: "desktop" as Viewport,
              label: "Desktop",
              icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="1" y="2" width="14" height="10" rx="1.5" />
                  <path strokeLinecap="round" d="M5 14h6M8 12v2" />
                </svg>
              ),
            },
            {
              id: "mobile" as Viewport,
              label: "Mobile",
              icon: (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
                  <rect x="4" y="1" width="8" height="14" rx="1.5" />
                  <circle cx="8" cy="13" r="0.75" fill="currentColor" />
                </svg>
              ),
            },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => onViewportChange(v.id)}
              title={`${v.label} preview`}
              aria-pressed={viewport === v.id}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                viewport === v.id
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {v.icon}
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Canvas ──────────────────────────────────────────────────────── */}
      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-6"
        style={{ background: "repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 10px,#e2e8f0 10px,#e2e8f0 11px)" }}
      >
        <div
          className="relative overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200/80 transition-[width,height] duration-300"
          style={{
            width: previewWidth,
            height: previewHeight,
            maxWidth: "100%",
            maxHeight: "100%",
            background: "white",
          }}
        >
          {/* Mobile notch decoration */}
          {viewport === "mobile" && (
            <div className="absolute left-1/2 top-2.5 z-30 -translate-x-1/2 flex items-center gap-1">
              <div className="h-1.5 w-10 rounded-full bg-slate-900/10" />
            </div>
          )}

          {!activeUrl ? (
            <FallbackMockPage config={config} reason="no-url" />
          ) : iframeBlocked ? (
            <FallbackMockPage config={config} reason="blocked" />
          ) : (
            <IframePreview
              url={activeUrl}
              config={config}
              onBlock={() => setIframeBlocked(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
