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
          <button type="button" style={btnGhost} onClick={onCustomize}>
            {text.customizeLabel || "Customize"}
          </button>
        )}
        <a href="/privacy-center/data-principal-request" style={rightsLinkStyle}>
          {ui.dataPrincipalRights}
        </a>
        <label style={{ display: "inline-flex", alignItems: "center" }}>
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

export function PreferenceCenterPreview({ config }: { config: BannerConfiguration }) {
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
      <div className="absolute inset-0" style={{ background: "rgba(15,23,42,0.45)" }} />
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
          {config.showCloseButton !== false && (
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                width: 36,
                height: 36,
                borderRadius: 12,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.55,
              }}
            >
              ×
            </span>
          )}
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
            <span
              style={{
                borderRadius: 12,
                padding: "10px 16px",
                fontSize: 13.5,
                fontWeight: 600,
                border: `1.5px solid ${config.primaryColor}`,
                color: config.primaryColor,
              }}
            >
              {text.rejectAllLabel || "Reject all"}
            </span>
          )}
          <span
            style={{
              borderRadius: 12,
              padding: "10px 16px",
              fontSize: 13.5,
              fontWeight: 600,
              background: config.primaryColor,
              color: "#fff",
            }}
          >
            {text.savePreferencesLabel || "Save preferences"}
          </span>
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
        </div>
      </div>
    </div>
  );
}

export function PreferenceWidgetPreview({ config }: { config: BannerConfiguration }) {
  if (config.showPreferenceWidget === false) return null;
  const right = (config.preferenceWidgetPosition || "bottom-left") === "bottom-right";
  return (
    <div
      aria-hidden="true"
      title="Cookie preferences"
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
        pointerEvents: "none",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 1 0 10 10" />
        <circle cx="8" cy="10" r="1.1" fill="currentColor" />
        <circle cx="15" cy="9" r="1.3" fill="currentColor" />
        <circle cx="12" cy="15" r="1.1" fill="currentColor" />
      </svg>
    </div>
  );
}
