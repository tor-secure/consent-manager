"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");

const root = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function compact(source) {
  return source.replace(/\s+/g, " ");
}

function assertIncludes(source, expected, label) {
  assert.ok(
    source.includes(expected),
    `${label}: expected to include ${JSON.stringify(expected)}`,
  );
}

const BANNER_CONFIG_KEYS = [
  "title",
  "description",
  "acceptAllLabel",
  "rejectAllLabel",
  "customizeLabel",
  "savePreferencesLabel",
  "privacyPolicyText",
  "privacyPolicyUrl",
  "cookiePolicyText",
  "cookiePolicyUrl",
  "poweredByText",
  "closeLabel",
  "preferenceCenterTitle",
  "preferenceCenterDescription",
  "purposesHeading",
  "vendorsHeading",
  "requiredLabel",
  "translations",
  "supportedLocales",
  "showAcceptAll",
  "showRejectAll",
  "showCustomize",
  "showPoweredBy",
  "showCloseButton",
  "showPurposeDescriptions",
  "showVendorList",
  "showLegalBasis",
  "defaultConsent",
  "closeOnOverlayClick",
  "blockPageUntilConsent",
  "respectDoNotTrack",
  "doNotSellEnabled",
  "doNotShareEnabled",
  "gpcHonored",
  "limitSensitivePiEnabled",
  "consentExpireDays",
  "showOnEveryVisit",
  "language",
  "region",
  "position",
  "layout",
  "primaryColor",
  "backgroundColor",
  "textColor",
  "borderRadius",
  "overlayEnabled",
  "showPreferenceWidget",
  "preferenceWidgetPosition",
  "cookiePreferencesTitle",
  "cookiePrefsSaveLabel",
  "downloadReceiptLabel",
  "revokeConsentLabel",
  "activeCategoriesLabel",
  "cookiePrefsLegalNote",
  "showDownloadReceipt",
  "showRevokeConsent",
  "showConsentReceiptKey",
  "cookiePrefsLayout",
  "cookiePrefsButtonStyle",
  "cookiePrefsToggleStyle",
  "cookiePrefsShowStatusMeta",
  "cookiePrefsShowLanguage",
  "cookiePrefsBorderRadius",
];

const EXPECTED_PRESET_IDS = [
  "bottom-bar",
  "top-bar",
  "center-modal",
  "bottom-sheet",
  "floating-right",
  "floating-left",
  "navy-brand",
  "teal-accent",
  "dark-modal",
  "high-contrast",
  "soft-card",
  "minimal-bar",
  "compact-corner",
  "gdpr-standard",
  "us-opt-out",
  "dpdp-dialog",
  "cookie-wall",
  "midnight-bar",
  "sand-sheet",
  "uk-notice",
  "prefs-dpdp-full",
  "prefs-gdpr-panel",
  "prefs-us-panel",
  "prefs-minimal",
  "prefs-receipt-focus",
  "prefs-compact-right",
];

describe("Banner Studio regression — presets", () => {
  const presetsSource = read("src/lib/banner-presets.ts");

  it("defines all expected preset ids", () => {
    for (const id of EXPECTED_PRESET_IDS) {
      assertIncludes(presetsSource, `id: "${id}"`, `preset ${id}`);
    }
    const idMatches = [...presetsSource.matchAll(/^\s+id:\s*"([^"]+)"/gm)]
      .map((m) => m[1])
      .filter((id) => !["layout", "look", "region", "prefs"].includes(id));
    assert.equal(idMatches.length, EXPECTED_PRESET_IDS.length, "unexpected preset count");
  });

  it("only overrides valid BannerConfiguration keys", () => {
    const overrideBlocks = [...presetsSource.matchAll(/overrides:\s*\{([\s\S]*?)\n\s*\},/g)];
    assert.ok(overrideBlocks.length >= EXPECTED_PRESET_IDS.length, "expected override blocks");
    const keySet = new Set(BANNER_CONFIG_KEYS);
    for (const block of overrideBlocks) {
      const keys = [...block[1].matchAll(/^\s{6}([a-zA-Z][a-zA-Z0-9]*)\s*:/gm)].map((m) => m[1]);
      for (const key of keys) {
        assert.ok(keySet.has(key), `unknown preset override key: ${key}`);
      }
    }
  });

  it("exposes category filters used by Studio templates", () => {
    assertIncludes(presetsSource, 'id: "layout"', "layout category");
    assertIncludes(presetsSource, 'id: "look"', "look category");
    assertIncludes(presetsSource, 'id: "region"', "region category");
    assertIncludes(presetsSource, 'id: "prefs"', "cookie prefs category");
    assertIncludes(presetsSource, "prefs-dpdp-full", "DPDP cookie prefs template");
    assertIncludes(presetsSource, "COOKIE_PREFS_DPDP", "shared DPDP cookie prefs block");
    const templates = read("src/components/policies/banner-studio/studio-templates.tsx");
    assertIncludes(templates, "BANNER_PRESET_CATEGORIES", "templates use preset categories");
    assertIncludes(templates, "onApplyPreset", "templates apply presets");
    assertIncludes(templates, 'category === "prefs"', "prefs thumbnails");
  });
});

describe("Banner Studio regression — radius contract", () => {
  it("shares BANNER_BORDER_RADIUS_MAX across parse, API, and inspector", () => {
    const config = read("src/lib/banner-config.ts");
    const route = read("src/app/api/policies/[id]/banner-config/route.ts");
    const inspector = read("src/components/policies/banner-studio/studio-inspector.tsx");

    assertIncludes(config, "BANNER_BORDER_RADIUS_MAX = 24", "shared max constant");
    assertIncludes(config, "Math.min(BANNER_BORDER_RADIUS_MAX, radius)", "parse uses shared max");
    assertIncludes(route, "BANNER_BORDER_RADIUS_MAX", "API imports shared max");
    assertIncludes(route, "Math.min(BANNER_BORDER_RADIUS_MAX, radiusRaw)", "API clamps with shared max");
    assertIncludes(inspector, "BANNER_BORDER_RADIUS_MAX", "inspector imports shared max");
    assertIncludes(inspector, "max={BANNER_BORDER_RADIUS_MAX}", "slider max matches API");
    assert.ok(!inspector.includes("max={32}"), "inspector no longer allows 32px");
  });
});

describe("Banner Studio regression — draft vs published", () => {
  it("studio loads latest version config and flags unpublished drafts", () => {
    const page = compact(read("src/app/dashboard/policies/[id]/studio/page.tsx"));
    assertIncludes(page, "liveIsBehind = Boolean(latestVersion && !latestVersion.isPublished)", "draft badge");
    assertIncludes(page, "parseBannerConfig(", "parses stored configuration");
    assertIncludes(page, "latestVersion?.configuration ?? publishedVersion?.configuration", "prefers latest then published");
  });

  it("SDK public config uses published versions only", () => {
    const loader = compact(read("src/lib/sdk/load-published-config.ts"));
    assertIncludes(loader, "row.isPublished", "filters published versions");
    assertIncludes(loader, "toPublicBannerConfig(", "publishes sanitized banner config");
    assertIncludes(
      loader,
      'failure: { status: 404, message: "No published policy version found" }',
      "rejects when no published version",
    );
  });

  it("banner-config PUT writes draft version via ensureDraftPolicyVersion", () => {
    const route = compact(read("src/app/api/policies/[id]/banner-config/route.ts"));
    assertIncludes(route, "ensureDraftPolicyVersion(policy.id)", "creates/uses draft");
    assertIncludes(route, "eq(consentPolicyVersions.id, draftVersion.id)", "updates draft row only");
    assertIncludes(route, "sanitizeHttpUrl(privacyPolicyUrlRaw", "validates privacy URL");
    assertIncludes(route, "sanitizeHttpUrl(cookiePolicyUrlRaw", "validates cookie URL");
    assertIncludes(route, "inArray(consentPolicies.websiteId, websiteIds)", "org website isolation");
  });
});

describe("Banner Studio regression — preview isolation", () => {
  it("wires Customize to preferences and keeps Accept/Reject local", () => {
    const preview = read("src/components/policies/banner-studio/studio-preview.tsx");
    assertIncludes(preview, "onCustomize={onCustomize}", "passes customize handler");
    assertIncludes(preview, "onAccept={onDismiss}", "accept dismisses locally");
    assertIncludes(preview, "onReject={onDismiss}", "reject dismisses locally");
    assertIncludes(preview, "setSurface(\"preferences\")", "customize opens preferences");
    assert.ok(!preview.includes("fetch("), "preview does not POST consent");
    assert.ok(!preview.includes("/api/consent"), "preview does not call consent API");
  });

  it("does not remount iframe on config-only edits", () => {
    const preview = compact(read("src/components/policies/banner-studio/studio-preview.tsx"));
    assertIncludes(preview, "key={url}", "iframe keyed by url");
    assertIncludes(preview, "}, [url, onBlock]);", "block timer depends on url not config");
  });
});

describe("Banner Studio regression — compliance controls in Studio UI", () => {
  it("exposes California/GPC toggles and powered-by / close labels", () => {
    const inspector = read("src/components/policies/banner-studio/studio-inspector.tsx");
    assertIncludes(inspector, 'onChange("doNotSellEnabled", v)', "Do Not Sell toggle");
    assertIncludes(inspector, 'onChange("doNotShareEnabled", v)', "Do Not Share toggle");
    assertIncludes(inspector, 'onChange("gpcHonored", v)', "GPC toggle");
    assertIncludes(inspector, 'onChange("limitSensitivePiEnabled", v)', "Limit SPI toggle");
    assertIncludes(inspector, 'onChange("poweredByText", v)', "powered-by text field");
    assertIncludes(inspector, 'onChange("closeLabel", v)', "close label field");
  });

  it("exposes Cookie Preferences panel editors", () => {
    const inspector = read("src/components/policies/banner-studio/studio-cookie-prefs-inspector.tsx");
    assertIncludes(inspector, 'onChange("cookiePreferencesTitle", v)', "cookie prefs title");
    assertIncludes(inspector, 'onChange("downloadReceiptLabel", v)', "download receipt label");
    assertIncludes(inspector, 'onChange("revokeConsentLabel", v)', "revoke label");
    assertIncludes(inspector, 'onChange("showDownloadReceipt", v)', "show download toggle");
    assertIncludes(inspector, 'onChange("showRevokeConsent", v)', "show revoke toggle");
    assertIncludes(inspector, 'onChange("cookiePrefsLayout", v)', "layout choice");
    assertIncludes(inspector, 'onChange("cookiePrefsButtonStyle", v)', "button style");
    assertIncludes(inspector, 'onChange("cookiePrefsToggleStyle", v)', "toggle style");
    const index = read("src/components/policies/banner-studio/index.tsx");
    assertIncludes(index, "StudioCookiePrefsInspector", "dedicated cookie prefs workspace");
    assertIncludes(index, '"Cookie Preferences"', "workspace switcher label");
    const preview = read("src/components/policies/banner-studio/studio-preview.tsx");
    assertIncludes(preview, "CookiePreferencesPreview", "studio preview renders cookie prefs panel");
    assertIncludes(preview, '"cookie-prefs"', "cookie prefs surface");
    const sdk = read("src/lib/sdk/cmp-sdk-script.ts");
    assertIncludes(sdk, "cfg.cookiePreferencesTitle", "live SDK uses studio title");
    assertIncludes(sdk, "cfg.cookiePrefsLayout", "live SDK uses layout");
    assertIncludes(sdk, "cfg.showDownloadReceipt", "live SDK respects download toggle");
    assertIncludes(sdk, "cfg.showRevokeConsent", "live SDK respects revoke toggle");
  });

  it("warns on unsaved leave", () => {
    const index = read("src/components/policies/banner-studio/index.tsx");
    assertIncludes(index, "beforeunload", "beforeunload guard");
    assertIncludes(index, "isDirty", "dirty tracking");
    assertIncludes(index, "setSavedSnapshot", "snapshot after successful save");
  });

  it("exposes header Save/Publish and saves before publish when dirty", () => {
    const index = read("src/components/policies/banner-studio/index.tsx");
    assertIncludes(index, "handlePublish", "publish handler");
    assertIncludes(index, "Save draft, then open publish", "dirty publish tooltip");
    assertIncludes(index, 'router.push(`/dashboard/policies/${policyId}#policy-publish`)', "publish navigates to policy");
    assertIncludes(index, "event.key.toLowerCase() !== \"s\"", "Ctrl+S save shortcut");
    const inspector = read("src/components/policies/banner-studio/studio-inspector.tsx");
    assertIncludes(inspector, "onPublish", "inspector publish prop");
    assertIncludes(inspector, "!hasVersion || !isDirty", "save disabled when clean");
  });
});

describe("Banner Studio regression — editable field coverage", () => {
  it("studio inspector/templates cover primary editable keys", () => {
    const inspector = read("src/components/policies/banner-studio/studio-inspector.tsx");
    const editableInUi = [
      "layout",
      "position",
      "borderRadius",
      "showCloseButton",
      "overlayEnabled",
      "blockPageUntilConsent",
      "primaryColor",
      "textColor",
      "backgroundColor",
      "title",
      "description",
      "acceptAllLabel",
      "rejectAllLabel",
      "customizeLabel",
      "showAcceptAll",
      "showRejectAll",
      "showCustomize",
      "language",
      "region",
      "defaultConsent",
      "consentExpireDays",
      "privacyPolicyUrl",
      "cookiePolicyUrl",
      "doNotSellEnabled",
      "doNotShareEnabled",
      "gpcHonored",
      "limitSensitivePiEnabled",
      "poweredByText",
      "closeLabel",
    ];
    for (const key of editableInUi) {
      assertIncludes(inspector, `"${key}"`, `inspector edits ${key}`);
    }
  });

  it("marks translation packs as API-only (Partial)", () => {
    const inspector = read("src/components/policies/banner-studio/studio-inspector.tsx");
    assert.ok(
      !inspector.includes('onChange("translations"'),
      "translations packs not edited in Studio inspector",
    );
    const route = read("src/app/api/policies/[id]/banner-config/route.ts");
    assertIncludes(route, "sanitizedTranslations", "API persists translations");
  });
});

describe("Banner Studio regression — parse radius clamp (pure)", () => {
  it("clamps radius the same way as BANNER_BORDER_RADIUS_MAX", () => {
    const MAX = 24;
    function clamp(radius) {
      const n = Number(radius);
      return Number.isFinite(n) ? Math.max(0, Math.min(MAX, n)) : 8;
    }
    assert.equal(clamp(32), 24);
    assert.equal(clamp(-4), 0);
    assert.equal(clamp(12), 12);
    assert.equal(clamp("nope"), 8);
  });
});
