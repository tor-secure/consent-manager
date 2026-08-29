"use client";

import type { BannerConfiguration, BannerPosition } from "@/lib/banner-config";

// ---------------------------------------------------------------------------
// BannerRenderer
//
// Renders a full-fidelity, interactive-looking consent banner from a
// BannerConfiguration. Used both inside the studio live preview (overlaid on
// the iframe / mock page) and as a standalone preview thumbnail.
//
// Props:
//   config      — the current BannerConfiguration
//   scale       — optional CSS scale transform (e.g. 0.85) applied to the
//                 banner wrapper so it fits inside the preview viewport without
//                 clipping. Defaults to 1.
//   onAccept    — optional click handler for the Accept button (preview only)
//   onReject    — optional click handler for the Reject button
//   onCustomize — optional click handler for the Customize link
// ---------------------------------------------------------------------------

interface BannerRendererProps {
  config: BannerConfiguration;
  scale?: number;
  onAccept?: () => void;
  onReject?: () => void;
  onCustomize?: () => void;
}

// Map position → Tailwind absolute-positioning classes for the outer wrapper.
const POSITION_STYLES: Record<BannerPosition, React.CSSProperties> = {
  bottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  top: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  "bottom-left": {
    position: "absolute",
    bottom: 16,
    left: 16,
    maxWidth: 380,
  },
  "bottom-right": {
    position: "absolute",
    bottom: 16,
    right: 16,
    maxWidth: 380,
  },
  center: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    maxWidth: 480,
    width: "90%",
  },
};

export function BannerRenderer({
  config,
  scale = 1,
  onAccept,
  onReject,
  onCustomize,
}: BannerRendererProps) {
  const isBar = config.layout === "bar";
  const isDialog = config.layout === "dialog";
  const isBox = config.layout === "box";

  const posStyle = POSITION_STYLES[config.position] ?? POSITION_STYLES.bottom;

  const bannerStyle: React.CSSProperties = {
    backgroundColor: config.backgroundColor,
    color: config.textColor,
    borderRadius: config.borderRadius,
    padding: isBar ? "12px 20px" : isDialog ? "28px" : "20px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.13), 0 1.5px 6px rgba(0,0,0,0.07)",
    border: `1px solid ${config.backgroundColor === "#ffffff" ? "#e5e7eb" : "transparent"}`,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    lineHeight: 1.55,
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 16px",
    borderRadius: Math.max(4, config.borderRadius - 2),
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
    border: "none",
    transition: "opacity 0.15s",
  };

  const btnPrimary: React.CSSProperties = {
    ...btnBase,
    backgroundColor: config.primaryColor,
    color: "#ffffff",
  };

  const btnOutline: React.CSSProperties = {
    ...btnBase,
    backgroundColor: "transparent",
    border: `1.5px solid ${config.primaryColor}`,
    color: config.primaryColor,
  };

  const btnGhost: React.CSSProperties = {
    ...btnBase,
    backgroundColor: "transparent",
    border: "none",
    color: config.primaryColor,
    textDecoration: "underline",
    padding: "7px 8px",
    fontWeight: 400,
  };

  const scaledWrapper: React.CSSProperties = {
    ...posStyle,
    zIndex: 9999,
    transformOrigin:
      config.position === "bottom" || config.position === "top"
        ? "bottom center"
        : config.position === "bottom-left"
          ? "bottom left"
          : config.position === "bottom-right"
            ? "bottom right"
            : "center",
    transform: [posStyle.transform, scale !== 1 ? `scale(${scale})` : ""]
      .filter(Boolean)
      .join(" "),
  };

  return (
    <div style={scaledWrapper} aria-label="Consent banner preview">
      {/* Overlay (rendered outside the banner box so it covers the whole frame) */}
      {config.overlayEnabled && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.45)",
            zIndex: -1,
            pointerEvents: "none",
          }}
          aria-hidden="true"
        />
      )}

      <div style={bannerStyle}>
        {/* Close button */}
        {config.showCloseButton && (
          <button
            aria-label="Close"
            style={{
              position: "absolute",
              top: 10,
              right: 12,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: config.textColor,
              opacity: 0.5,
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ✕
          </button>
        )}

        {/* Bar layout — horizontal */}
        {isBar ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ flex: 1, minWidth: 160 }}>
              {config.title && (
                <span style={{ fontWeight: 600, marginRight: 6 }}>
                  {config.title}
                </span>
              )}
              <span style={{ opacity: 0.75, fontSize: 13 }}>
                {config.description.length > 120
                  ? config.description.slice(0, 120) + "…"
                  : config.description}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              {config.showAcceptAll && (
                <button style={btnPrimary} onClick={onAccept}>
                  {config.acceptAllLabel || "Accept all"}
                </button>
              )}
              {config.showRejectAll && (
                <button style={btnOutline} onClick={onReject}>
                  {config.rejectAllLabel || "Reject all"}
                </button>
              )}
              {config.showCustomize && (
                <button style={btnGhost} onClick={onCustomize}>
                  {config.customizeLabel || "Customize"}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Box / Dialog layout — vertical */
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {config.title && (
              <p style={{ fontWeight: 700, fontSize: isDialog ? 18 : 15, margin: 0 }}>
                {config.title}
              </p>
            )}
            {config.description && (
              <p style={{ opacity: 0.75, fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                {config.description.length > (isBox ? 180 : 300)
                  ? config.description.slice(0, isBox ? 180 : 300) + "…"
                  : config.description}
              </p>
            )}
            {config.privacyPolicyUrl && config.privacyPolicyText && (
              <a
                href={config.privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: config.primaryColor, fontSize: 12, textDecoration: "underline" }}
              >
                {config.privacyPolicyText}
              </a>
            )}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
                marginTop: 2,
              }}
            >
              {config.showAcceptAll && (
                <button style={btnPrimary} onClick={onAccept}>
                  {config.acceptAllLabel || "Accept all"}
                </button>
              )}
              {config.showRejectAll && (
                <button style={btnOutline} onClick={onReject}>
                  {config.rejectAllLabel || "Reject all"}
                </button>
              )}
              {config.showCustomize && (
                <button style={btnGhost} onClick={onCustomize}>
                  {config.customizeLabel || "Customize"}
                </button>
              )}
            </div>
            {config.showPoweredBy && config.poweredByText && (
              <p
                style={{
                  opacity: 0.35,
                  fontSize: 11,
                  margin: 0,
                  textAlign: "right",
                }}
              >
                {config.poweredByText}
              </p>
            )}
          </div>
        )}

        {/* Bar powered-by */}
        {isBar && config.showPoweredBy && config.poweredByText && (
          <span
            style={{ fontSize: 11, opacity: 0.35, marginLeft: "auto", display: "block", textAlign: "right", marginTop: 4 }}
          >
            {config.poweredByText}
          </span>
        )}
      </div>
    </div>
  );
}
