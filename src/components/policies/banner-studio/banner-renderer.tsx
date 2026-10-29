"use client";

import { useMemo, useState } from "react";
import type { BannerConfiguration, BannerPosition } from "@/lib/banner-config";
import { applyResolvedNotice, bannerUsesOverlay, resolveTranslation } from "@/lib/banner-config";
import { DEFAULT_BANNER_LOCALES } from "@/lib/i18n/locale-registry";
import { builtinUiStringsForLocale, nativeLocaleLabel } from "@/lib/i18n/indian-notice-translations";
import { extraUiStringsForLocale, localizePurposeCopy } from "@/lib/i18n/indian-entity-translations";

interface BannerRendererProps {
  config: BannerConfiguration;
  scale?: number;
  onAccept?: () => void;
  onReject?: () => void;
  onCustomize?: () => void;
  /** Studio-only dismiss; never persists consent. */
  onClose?: () => void;
}

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
    maxWidth: 400,
  },
  "bottom-right": {
    position: "absolute",
    bottom: 16,
    right: 16,
    maxWidth: 400,
  },
  center: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    maxWidth: 480,
    width: "calc(100% - 32px)",
  },
};

function resolvedPositionStyle(config: BannerConfiguration): React.CSSProperties {
  if (config.layout === "dialog") {
    return POSITION_STYLES.center;
  }
  if (config.layout === "box") {
    if (config.position === "top") {
      return {
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: 420,
        width: "calc(100% - 32px)",
      };
    }
    if (config.position === "center") return POSITION_STYLES.center;
    if (config.position === "bottom-left") return POSITION_STYLES["bottom-left"];
    if (config.position === "bottom-right") return POSITION_STYLES["bottom-right"];
    return {
      position: "absolute",
      bottom: 16,
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: 420,
      width: "calc(100% - 32px)",
    };
  }
  return POSITION_STYLES[config.position] ?? POSITION_STYLES.bottom;
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "44,74,124";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return "44,74,124";
  return `${r},${g},${b}`;
}

export function CmpScrollStyles({ color }: { color: string }) {
  const rgb = hexToRgb(color);
  return (
    <style>{`
      [data-cmp-scroll] {
        scrollbar-width: thin;
        scrollbar-color: rgba(${rgb}, 0.5) transparent;
      }
      [data-cmp-scroll]::-webkit-scrollbar { width: 8px; height: 8px; }
      [data-cmp-scroll]::-webkit-scrollbar-track {
        background: rgba(15, 23, 42, 0.04);
        border-radius: 999px;
        margin: 8px 2px;
      }
      [data-cmp-scroll]::-webkit-scrollbar-thumb {
        background: rgba(${rgb}, 0.4);
        border-radius: 999px;
        border: 2px solid transparent;
        background-clip: content-box;
      }
      [data-cmp-scroll]::-webkit-scrollbar-thumb:hover {
        background: rgba(${rgb}, 0.72);
        border: 2px solid transparent;
        background-clip: content-box;
      }
    `}</style>
  );
}

export function BannerOverlay({ config }: { config: BannerConfiguration }) {
  if (!bannerUsesOverlay(config)) return null;
  const tint = config.overlayEnabled || config.layout === "dialog";
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ background: tint ? "rgba(15,23,42,0.45)" : "transparent" }}
      aria-hidden="true"
    />
  );
}

function DpdpAgeNotice({
  onUnder18,
  locale,
}: {
  onUnder18: () => void;
  locale: string;
}) {
  const ui = builtinUiStringsForLocale(locale);
  return (
    <p
      data-cmp-dpdp-age=""
      style={{
        margin: 0,
        padding: "10px 12px",
        borderRadius: 10,
        border: "1px solid #F59E0B",
        background: "rgba(245,158,11,0.08)",
        color: "#B45309",
        fontSize: 13,
        lineHeight: 1.5,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {ui.ageConfirmStart}
      <strong>{ui.ageConfirmStrong}</strong>
      {ui.ageConfirmEnd}
      <button
        type="button"
        onClick={onUnder18}
        style={{
          display: "inline",
          background: "none",
          border: "none",
          padding: 0,
          margin: 0,
          font: "inherit",
          color: "#B45309",
          textDecoration: "underline",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {ui.under18}
      </button>
    </p>
  );
}

function ParentalConsentDialog({
  config,
  locale,
  onBack,
  onUnderstand,
}: {
  config: BannerConfiguration;
  locale: string;
  onBack: () => void;
  onUnderstand: () => void;
}) {
  const privacyUrl = config.privacyPolicyUrl?.trim();
  const cookieUrl = config.cookiePolicyUrl?.trim();
  const ui = builtinUiStringsForLocale(locale);
  const extra = extraUiStringsForLocale(locale);
  const outline: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: 10,
    border: "1px solid #CBD5E1",
    background: "#fff",
    color: "#334155",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cmp-parental-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onBack();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
        pointerEvents: "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        background: "rgba(15,23,42,0.45)",
      }}
    >
      <div
        style={{
          width: "min(560px, 100%)",
          background: "#F8FBFF",
          border: "1px solid #BFDBFE",
          borderRadius: 16,
          padding: "20px 20px 16px",
          boxShadow: "0 20px 50px rgba(15,23,42,0.18)",
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          color: "#334155",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#DBEAFE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563EB",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="9" cy="7" r="2.2" />
              <path d="M4.5 17.5c.4-2.6 2.3-4 4.5-4s4.1 1.4 4.5 4" />
              <circle cx="16.5" cy="8" r="2" />
              <path d="M13.2 17.5c.3-2 1.8-3.2 3.3-3.2 1.6 0 3.1 1.2 3.4 3.2" />
            </svg>
          </div>
          <div style={{ minWidth: 0 }}>
            <h2 id="cmp-parental-title" style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
              {ui.parentalTitle}
            </h2>
            <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.55, color: "#64748B" }}>
              {ui.parentalBody}
            </p>
            <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.55, color: "#64748B" }}>
              {extra.parentalBody2}
            </p>
            {(privacyUrl || cookieUrl) && (
              <p style={{ margin: "0 0 10px", fontSize: 13, lineHeight: 1.55 }}>
                {privacyUrl && (
                  <a href={privacyUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "underline" }}>
                    {config.privacyPolicyText || "Privacy Policy"}
                  </a>
                )}
                {privacyUrl && cookieUrl && <span style={{ color: "#94A3B8" }}> · </span>}
                {cookieUrl && (
                  <a href={cookieUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#2563EB", fontWeight: 600, textDecoration: "underline" }}>
                    {config.cookiePolicyText || "Cookie Policy"}
                  </a>
                )}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 12, color: "#64748B" }}>Governed by DPDP Act, 2023</p>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 18 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            style={outline}
          >
            Go Back
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUnderstand();
            }}
            style={outline}
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
}

export function BannerRenderer({
  config,
  scale = 1,
  onAccept,
  onReject,
  onCustomize,
  onClose,
}: BannerRendererProps) {
  const [parentalOpen, setParentalOpen] = useState(false);
  const [lang, setLang] = useState(config.language || "en");
  const text = useMemo(
    () => applyResolvedNotice(config, resolveTranslation(config, lang)),
    [config, lang],
  );
  const ui = builtinUiStringsForLocale(lang);
  const isBar = config.layout === "bar";
  const isDialog = config.layout === "dialog";
  const posStyle = resolvedPositionStyle(config);

  const bannerStyle: React.CSSProperties = {
    backgroundColor: config.backgroundColor,
    color: config.textColor,
    borderRadius: config.borderRadius,
    padding: isBar ? "16px 24px" : isDialog ? "28px" : "20px",
    boxShadow: "0 8px 32px rgba(15,23,42,0.18)",
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: 14,
    lineHeight: 1.55,
    width: "100%",
    boxSizing: "border-box",
    position: "relative",
    display: "flex",
    flexDirection: isBar ? "row" : "column",
    flexWrap: isBar ? "wrap" : undefined,
    alignItems: isBar ? "center" : undefined,
    gap: isBar ? 12 : 14,
    maxHeight: isBar ? undefined : "min(86vh, 640px)",
    overflow: isBar ? undefined : "hidden",
    textAlign: "start",
  };

  const btnBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px 16px",
    borderRadius: Math.max(4, config.borderRadius - 2),
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "normal",
    maxWidth: "100%",
    border: "none",
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
    padding: 8,
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

  const rightsLinkStyle: React.CSSProperties = {
    ...btnGhost,
    textDecoration: "none",
    fontWeight: 600,
    color: config.textColor,
  };

  const linkIconStyle: React.CSSProperties = {
    width: 14,
    height: 14,
    flexShrink: 0,
    opacity: 0.85,
  };

  const actionButtons = (
    <div
      style={{
        display: "flex",
        gap: isBar ? 8 : 12,
        flexWrap: "wrap",
        alignItems: "center",
        width: "100%",
        justifyContent: isBar ? "flex-start" : "space-between",
      }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {config.showCustomize && (
          <button
            type="button"
            style={{ ...btnGhost, display: "inline-flex", alignItems: "center", gap: 6 }}
            onClick={onCustomize}
          >
            <svg style={linkIconStyle} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5} aria-hidden>
              <circle cx="8" cy="8" r="2" />
              <path strokeLinecap="round" d="M8 2.5v1.2M8 12.3v1.2M2.5 8h1.2M12.3 8h1.2M4.2 4.2l.85.85M10.95 10.95l.85.85M11.8 4.2l-.85.85M5.05 10.95l-.85.85" />
            </svg>
            {text.customizeLabel || "Customize"}
          </button>
        )}
        <a
          href="/privacy-center/data-principal-request"
          style={{ ...rightsLinkStyle, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <svg style={linkIconStyle} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 2.5h6l2 2V13.5H4z" />
            <path strokeLinecap="round" d="M6 8.5l1.5 1.5L10.5 7" />
          </svg>
          {ui.dataPrincipalRights}
        </a>
        <a
          href="/privacy-center/grievance"
          style={{ ...rightsLinkStyle, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <svg style={linkIconStyle} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 2.5l5 2v3.5c0 3.2-2.1 5.2-5 6-2.9-.8-5-2.8-5-6V4.5l5-2z" />
          </svg>
          File a grievance
        </a>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <svg style={linkIconStyle} fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <circle cx="8" cy="8" r="5.5" />
            <path strokeLinecap="round" d="M2.5 8h11M8 2.5c1.4 1.8 1.4 9.2 0 11M8 2.5c-1.4 1.8-1.4 9.2 0 11" />
          </svg>
          <select
            aria-label={ui.language}
            value={lang}
            onChange={(event) => setLang(event.target.value)}
            style={{
              fontSize: 12,
              padding: "6px 8px",
              borderRadius: 8,
              border: "1.5px solid rgba(15,23,42,0.18)",
              background: "transparent",
              color: "inherit",
              maxWidth: "14rem",
            }}
          >
            {DEFAULT_BANNER_LOCALES.map((code) => (
              <option key={code} value={code}>
                {nativeLocaleLabel(code)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          marginInlineStart: isBar ? undefined : "auto",
        }}
      >
        {isBar ? (
          <>
            {config.showAcceptAll && (
              <button type="button" style={btnPrimary} onClick={onAccept}>
                {text.acceptAllLabel || "Accept all"}
              </button>
            )}
            {config.showRejectAll && (
              <button type="button" style={btnOutline} onClick={onReject}>
                {text.rejectAllLabel || "Reject all"}
              </button>
            )}
          </>
        ) : (
          <>
            {config.showRejectAll && (
              <button type="button" style={btnOutline} onClick={onReject}>
                {text.rejectAllLabel || "Reject all"}
              </button>
            )}
            {config.showAcceptAll && (
              <button type="button" style={btnPrimary} onClick={onAccept}>
                {text.acceptAllLabel || "Accept all"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div style={scaledWrapper} aria-label="Consent banner preview">
        <div style={bannerStyle}>
        {config.showCloseButton && (
          <button
            type="button"
            aria-label={text.closeLabel || "Close"}
            onClick={onClose}
            style={{
              position: "absolute",
              top: 8,
              right: 10,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              opacity: 0.5,
              fontSize: 20,
              lineHeight: 1,
              padding: 0,
            }}
          >
            ×
          </button>
        )}

        {(text.title || text.description) && (
          <div
            data-cmp-scroll={isBar ? undefined : ""}
            style={{
              flex: isBar ? 1 : "1 1 auto",
              minWidth: isBar ? 200 : 0,
              minHeight: isBar ? undefined : 0,
              overflowY: isBar ? undefined : "auto",
              overscrollBehavior: "contain",
              scrollbarWidth: isBar ? undefined : "thin",
              paddingRight: isBar ? undefined : 4,
            }}
          >
            {text.title && (
              isBar ? (
                <strong style={{ display: "block", margin: "0 0 6px 0", fontWeight: 700, fontSize: 15 }}>
                  {text.title}
                </strong>
              ) : (
                <p style={{ fontWeight: 700, fontSize: isDialog ? 18 : 15, margin: "0 0 6px 0" }}>
                  {text.title}
                </p>
              )
            )}
            {text.description && (
              <span
                style={{
                  opacity: 0.75,
                  fontSize: 13,
                  display: "block",
                  lineHeight: 1.55,
                  overflowWrap: "anywhere",
                }}
              >
                {text.description}
              </span>
            )}
          </div>
        )}

        <DpdpAgeNotice locale={lang} onUnder18={() => setParentalOpen(true)} />

        {(config.privacyPolicyUrl || config.cookiePolicyUrl) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12 }}>
            {config.privacyPolicyUrl && text.privacyPolicyText && (
              <a
                href={config.privacyPolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: config.primaryColor,
                  textDecoration: "underline",
                }}
              >
                {text.privacyPolicyText}
              </a>
            )}
            {config.cookiePolicyUrl && (
              <a
                href={config.cookiePolicyUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: config.primaryColor,
                  textDecoration: "underline",
                }}
              >
                {text.cookiePolicyText || ui.cookiePolicy}
              </a>
            )}
          </div>
        )}

        {actionButtons}

        {config.showPoweredBy && config.poweredByText && (
          <div
            style={{
              fontSize: 11,
              opacity: 0.4,
              textAlign: "end",
              width: isBar ? "100%" : undefined,
            }}
          >
            {config.poweredByText}
          </div>
        )}
      </div>
      </div>
      {parentalOpen && (
        <ParentalConsentDialog
          config={text}
          locale={lang}
          onBack={() => setParentalOpen(false)}
          onUnderstand={() => setParentalOpen(false)}
        />
      )}
    </>
  );
}

const PREVIEW_PURPOSES = [
  { key: "necessary", name: "Necessary", required: true, description: "Required for security, login, and storing this consent choice." },
  { key: "functional", name: "Functional", required: false, description: "Remembers language, region, and other site preferences." },
  { key: "analytics", name: "Analytics", required: false, description: "Helps us understand how visitors use the site so we can improve it." },
  { key: "advertising", name: "Advertising", required: false, description: "Used to show relevant ads and measure campaigns." },
  { key: "personalization", name: "Personalization", required: false, description: "Shows more relevant content and recommendations." },
];

export function PreferenceCenterPreview({
  config,
  onClose,
  onSave,
}: {
  config: BannerConfiguration;
  onClose?: () => void;
  onSave?: () => void;
}) {
  const locale = config.language || "en";
  const text = applyResolvedNotice(config, resolveTranslation(config, locale));
  const ui = builtinUiStringsForLocale(locale);
  const extra = extraUiStringsForLocale(locale);
  const purposes = PREVIEW_PURPOSES.map((purpose) => ({
    ...purpose,
    ...localizePurposeCopy(purpose, locale),
  }));
  return (
    <div className="absolute inset-0 z-20" aria-label="Preference center preview">
      <div
        className="absolute inset-0"
        style={{ background: "rgba(15,23,42,0.45)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(620px, calc(100% - 24px))",
          maxHeight: "min(82%, 720px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: config.backgroundColor,
          color: config.textColor,
          borderRadius: config.borderRadius,
          boxShadow: "0 30px 80px -20px rgba(15,23,42,0.35), 0 10px 30px -10px rgba(15,23,42,0.2)",
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          fontSize: 14,
        }}
      >
        <div
          style={{
            padding: "22px 24px 14px 24px",
            borderBottom: "1px solid rgba(15,23,42,0.08)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {text.preferenceCenterTitle || "Manage your preferences"}
            </h2>
            <p style={{ margin: "6px 0 0 0", fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>
              {text.preferenceCenterDescription ||
                "Customize which purposes and vendors you allow. You can change your choices at any time."}
            </p>
          </div>
          <button
            type="button"
            aria-label={text.closeLabel || "Close"}
            onClick={onClose}
            style={{
              flexShrink: 0,
              width: 36,
              height: 36,
              borderRadius: 12,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.55,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          data-cmp-scroll=""
          style={{
            flex: "1 1 auto",
            minHeight: 0,
            overflowY: "auto",
            padding: "10px 20px 20px 18px",
            scrollbarWidth: "thin",
            overscrollBehavior: "contain",
          }}
        >
          <p
            style={{
              margin: "12px 0 10px 0",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              opacity: 0.6,
            }}
          >
            {text.purposesHeading || "Purposes"}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {purposes.map((purpose) => (
              <div
                key={purpose.name}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid rgba(15,23,42,0.08)",
                  background: "rgba(15,23,42,0.03)",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{purpose.name}</span>
                    {purpose.required && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "rgba(15,23,42,0.08)",
                        }}
                      >
                        {text.requiredLabel || extra.required}
                      </span>
                    )}
                  </div>
                  {config.showPurposeDescriptions && (
                    <p style={{ margin: "4px 0 0 0", fontSize: 12, opacity: 0.7, lineHeight: 1.45 }}>
                      {purpose.description}
                    </p>
                  )}
                </div>
                <span
                  aria-hidden="true"
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 999,
                    background: purpose.required ? config.primaryColor : "rgba(15,23,42,0.18)",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            padding: "14px 24px 22px 24px",
            borderTop: "1px solid rgba(15,23,42,0.08)",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          {config.showRejectAll && (
            <button
              type="button"
              onClick={onClose}
              style={{
                borderRadius: 12,
                padding: "10px 16px",
                fontSize: 13.5,
                fontWeight: 600,
                border: `1.5px solid ${config.primaryColor}`,
                color: config.primaryColor,
                background: "transparent",
                cursor: "pointer",
              }}
            >
              {text.rejectAllLabel || "Reject all"}
            </button>
          )}
          <button
            type="button"
            onClick={onSave ?? onClose}
            style={{
              borderRadius: 12,
              padding: "10px 16px",
              fontSize: 13.5,
              fontWeight: 600,
              background: config.primaryColor,
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            {text.savePreferencesLabel || "Save preferences"}
          </button>
          <a
            href="/privacy-center/data-principal-request"
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: "inherit",
              opacity: 0.7,
              textDecoration: "underline",
              textUnderlineOffset: 2,
              marginLeft: "auto",
            }}
          >
            {ui.dataPrincipalRights}
          </a>
          <a
            href="/privacy-center/grievance"
            style={{
              fontSize: 12.5,
              fontWeight: 500,
              color: "inherit",
              opacity: 0.7,
              textDecoration: "underline",
              textUnderlineOffset: 2,
            }}
          >
            File a grievance
          </a>
        </div>
      </div>
    </div>
  );
}

/** Post-consent Cookie Preferences panel (matches live CMP widget reopen UI). */
export function CookiePreferencesPreview({
  config,
  onClose,
  onSave,
}: {
  config: BannerConfiguration;
  onClose?: () => void;
  onSave?: () => void;
}) {
  const right = (config.preferenceWidgetPosition || "bottom-left") === "bottom-right";
  const primary = config.primaryColor || "#2563EB";
  const layout = config.cookiePrefsLayout || "corner";
  const buttonStyle = config.cookiePrefsButtonStyle || "stack";
  const toggleStyle = config.cookiePrefsToggleStyle || "switch";
  const radius = config.cookiePrefsBorderRadius ?? 18;
  const categories = [
    { name: "Advertising", on: true },
    { name: "Analytics", on: true },
    { name: "Functional", on: true },
    { name: "Necessary", on: true, locked: true },
    { name: "Personalization", on: true },
  ];

  const panelShell: React.CSSProperties =
    layout === "center"
      ? {
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(400px, calc(100% - 32px))",
          maxHeight: "min(86%, 640px)",
          zIndex: 50,
        }
      : layout === "sheet"
        ? {
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            maxHeight: "min(72%, 560px)",
            zIndex: 50,
            borderRadius: `${radius}px ${radius}px 0 0`,
          }
        : layout === "drawer"
          ? {
              position: "absolute",
              top: 0,
              bottom: 0,
              [right ? "right" : "left"]: 0,
              width: "min(380px, 92%)",
              maxHeight: "100%",
              zIndex: 50,
              borderRadius: right ? `${radius}px 0 0 ${radius}px` : `0 ${radius}px ${radius}px 0`,
            }
          : {
              position: "absolute",
              bottom: 16,
              [right ? "right" : "left"]: 16,
              width: "min(360px, calc(100% - 24px))",
              maxHeight: "min(86%, 560px)",
              zIndex: 50,
              borderRadius: radius,
            };

  const btnBase: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  };

  function ToggleControl({ on, locked }: { on: boolean; locked?: boolean }) {
    if (toggleStyle === "checkbox") {
      return (
        <span
          aria-hidden
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            border: `2px solid ${on ? primary : "#CBD5E1"}`,
            background: on ? primary : "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            opacity: locked ? 0.7 : 1,
          }}
        >
          {on ? (
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2">
              <path d="M2 6l3 3 5-5" />
            </svg>
          ) : null}
        </span>
      );
    }
    return (
      <span
        aria-hidden
        style={{
          width: 36,
          height: 20,
          borderRadius: 999,
          background: on ? primary : "rgba(15,23,42,0.18)",
          position: "relative",
          flexShrink: 0,
          opacity: locked ? 0.7 : 1,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            [on ? "right" : "left"]: 2,
            width: 16,
            height: 16,
            borderRadius: 999,
            background: "#fff",
          }}
        />
      </span>
    );
  }

  const actions =
    buttonStyle === "row" ? (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={onSave ?? onClose}
            style={{
              ...btnBase,
              flex: 1,
              border: "none",
              background: primary,
              color: "#fff",
            }}
          >
            {config.cookiePrefsSaveLabel || "Save changes"}
          </button>
          {config.showDownloadReceipt !== false ? (
            <button
              type="button"
              onClick={onClose}
              style={{
                ...btnBase,
                flex: 1,
                border: "1px solid #E2E8F0",
                background: "#fff",
                color: "#0F172A",
                fontWeight: 600,
              }}
            >
              {config.downloadReceiptLabel || "Download Receipt"}
            </button>
          ) : null}
        </div>
        {config.showRevokeConsent !== false ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              ...btnBase,
              width: "100%",
              border: "none",
              background: "#EF4444",
              color: "#fff",
            }}
          >
            {config.revokeConsentLabel || "Revoke Consent (DPDP Section 6(4))"}
          </button>
        ) : null}
      </div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          type="button"
          onClick={onSave ?? onClose}
          style={{
            ...btnBase,
            width: "100%",
            border: "none",
            background: primary,
            color: "#fff",
          }}
        >
          {config.cookiePrefsSaveLabel || "Save changes"}
        </button>
        {config.showDownloadReceipt !== false ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              ...btnBase,
              width: "100%",
              border: "1px solid #E2E8F0",
              background: "#fff",
              color: "#0F172A",
              fontWeight: 600,
            }}
          >
            {config.downloadReceiptLabel || "Download Receipt"}
          </button>
        ) : null}
        {config.showRevokeConsent !== false ? (
          <button
            type="button"
            onClick={onClose}
            style={{
              ...btnBase,
              width: "100%",
              border: "none",
              background: "#EF4444",
              color: "#fff",
            }}
          >
            {config.revokeConsentLabel || "Revoke Consent (DPDP Section 6(4))"}
          </button>
        ) : null}
      </div>
    );

  const panel = (
    <div
      role="dialog"
      aria-label={config.cookiePreferencesTitle || "Cookie Preferences"}
      style={{
        ...panelShell,
        background: "#fff",
        color: "#0F172A",
        boxShadow: "0 18px 50px rgba(15,23,42,0.22)",
        padding: "16px 16px 14px",
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: panelShell.borderRadius ?? radius,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 700,
            fontSize: 15,
            color: "#0B2C4A",
            flex: 1,
            minWidth: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B2C4A" strokeWidth="2" aria-hidden>
            <path d="M12 3l7 3v6c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V6z" />
          </svg>
          <span>{config.cookiePreferencesTitle || "Cookie Preferences"}</span>
        </div>
        {config.cookiePrefsShowLanguage !== false ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, color: "#475569" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
            </svg>
            English
          </span>
        ) : null}
        <button
          type="button"
          aria-label={config.closeLabel || "Close"}
          onClick={onClose}
          style={{
            border: "none",
            background: "none",
            fontSize: 22,
            lineHeight: 1,
            cursor: "pointer",
            color: "#64748B",
            padding: "0 2px",
          }}
        >
          ×
        </button>
      </div>

      <div style={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
        {config.cookiePrefsShowStatusMeta !== false ? (
          <div style={{ fontSize: 12, lineHeight: 1.55, color: "#475569", marginBottom: 10 }}>
            <div>
              <span>Status: </span>
              <span>Full consent</span>
            </div>
            <div>
              <span>Consent given: </span>
              <span>10/15/2026</span>
            </div>
            <div>
              <span>Expires: </span>
              <span>10/15/2027</span>
            </div>
            {config.showConsentReceiptKey !== false ? (
              <div>
                <span>Key: </span>
                <span style={{ wordBreak: "break-all", fontFamily: "ui-monospace, Menlo, monospace" }}>
                  cid_preview-studio-receipt-key
                </span>
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ fontSize: 12, color: "#475569", margin: "4px 0 6px" }}>
          {config.activeCategoriesLabel || "Active categories:"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {categories.map((cat) => (
            <div
              key={cat.name}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                fontSize: 13,
                color: "#0F172A",
              }}
            >
              <span>
                {cat.name}
                {cat.locked ? (
                  <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.55 }}>Required</span>
                ) : null}
              </span>
              <ToggleControl on={cat.on} locked={cat.locked} />
            </div>
          ))}
        </div>

        {actions}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10, fontSize: 12 }}>
          <a href="/privacy-center/data-principal-request" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 600 }}>
            Data Principal Rights
          </a>
          <a href="/privacy-center/grievance" style={{ color: "#2563EB", textDecoration: "none", fontWeight: 600 }}>
            File a grievance
          </a>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: "#64748B" }}>
          {config.cookiePrefsLegalNote || "DPDP Act, 2023"}
        </div>
      </div>
    </div>
  );

  if (layout === "center") {
    return (
      <div className="absolute inset-0 z-40">
        <div className="absolute inset-0" style={{ background: "rgba(15,23,42,0.45)" }} onClick={onClose} aria-hidden />
        {panel}
      </div>
    );
  }

  return panel;
}

export function PreferenceWidgetPreview({
  config,
  onOpen,
}: {
  config: BannerConfiguration;
  onOpen?: () => void;
}) {
  if (config.showPreferenceWidget === false) return null;
  const right = (config.preferenceWidgetPosition || "bottom-left") === "bottom-right";
  return (
    <button
      type="button"
      title="Cookie preferences"
      aria-label="Open cookie preferences"
      onClick={onOpen}
      style={{
        position: "absolute",
        bottom: 16,
        [right ? "right" : "left"]: 16,
        zIndex: 40,
        width: 44,
        height: 44,
        borderRadius: 999,
        background: config.primaryColor,
        color: "#fff",
        boxShadow: "0 8px 24px rgba(15,23,42,0.25)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "none",
        cursor: onOpen ? "pointer" : "default",
        pointerEvents: onOpen ? "auto" : "none",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 2a10 10 0 1 0 10 10" />
        <circle cx="8" cy="10" r="1.1" fill="currentColor" />
        <circle cx="15" cy="9" r="1.3" fill="currentColor" />
        <circle cx="12" cy="15" r="1.1" fill="currentColor" />
      </svg>
    </button>
  );
}
