// ---------------------------------------------------------------------------
// BannerConfiguration — stored in consent_policy_versions.configuration JSONB
// This is the canonical type. Both the API route and the form component import
// from here to keep the shape in sync.
// ---------------------------------------------------------------------------

export type BannerPosition = "bottom" | "top" | "bottom-left" | "bottom-right" | "center";
export type BannerLayout = "bar" | "box" | "dialog";
export type ConsentDefault = "opt-in" | "opt-out" | "none";

// ---------------------------------------------------------------------------
// Supported languages (English + all 22 Indian Eighth-Schedule languages)
// ---------------------------------------------------------------------------

export type SupportedLanguage =
  | "en"   // English (default / fallback)
  | "as"   // Assamese
  | "bn"   // Bengali
  | "bodo" // Bodo
  | "doi"  // Dogri
  | "gu"   // Gujarati
  | "hi"   // Hindi
  | "kn"   // Kannada
  | "ks"   // Kashmiri
  | "kok"  // Konkani
  | "mai"  // Maithili
  | "ml"   // Malayalam
  | "mni"  // Manipuri (Meitei)
  | "mr"   // Marathi
  | "ne"   // Nepali
  | "or"   // Odia
  | "pa"   // Punjabi
  | "sa"   // Sanskrit
  | "sat"  // Santali
  | "sd"   // Sindhi
  | "ta"   // Tamil
  | "te"   // Telugu
  | "ur";  // Urdu

export const SUPPORTED_LANGUAGES: Array<{ code: SupportedLanguage; label: string }> = [
  { code: "en",   label: "English" },
  { code: "hi",   label: "Hindi (हिंदी)" },
  { code: "bn",   label: "Bengali (বাংলা)" },
  { code: "te",   label: "Telugu (తెలుగు)" },
  { code: "mr",   label: "Marathi (मराठी)" },
  { code: "ta",   label: "Tamil (தமிழ்)" },
  { code: "gu",   label: "Gujarati (ગુજરાતી)" },
  { code: "kn",   label: "Kannada (ಕನ್ನಡ)" },
  { code: "ml",   label: "Malayalam (മലയാളം)" },
  { code: "pa",   label: "Punjabi (ਪੰਜਾਬੀ)" },
  { code: "or",   label: "Odia (ଓଡ଼ିଆ)" },
  { code: "as",   label: "Assamese (অসমীয়া)" },
  { code: "mai",  label: "Maithili (मैथिली)" },
  { code: "ur",   label: "Urdu (اردو)" },
  { code: "ks",   label: "Kashmiri (کشمیری)" },
  { code: "ne",   label: "Nepali (नेपाली)" },
  { code: "sd",   label: "Sindhi (سنڌي)" },
  { code: "kok",  label: "Konkani (कोंकणी)" },
  { code: "mni",  label: "Manipuri (মেইতেই)" },
  { code: "bodo", label: "Bodo (बड़ो)" },
  { code: "doi",  label: "Dogri (डोगरी)" },
  { code: "sa",   label: "Sanskrit (संस्कृतम्)" },
  { code: "sat",  label: "Santali (ᱥᱟᱱᱛᱟᱲᱤ)" },
];

// ---------------------------------------------------------------------------
// NoticeTranslation — the subset of text fields that vary per language.
// All fields are optional; undefined values fall back to the root (English)
// value from BannerConfiguration.
// ---------------------------------------------------------------------------

export type NoticeTranslation = {
  title?: string;
  description?: string;
  acceptAllLabel?: string;
  rejectAllLabel?: string;
  customizeLabel?: string;
  savePreferencesLabel?: string;
  privacyPolicyText?: string;
};

// ---------------------------------------------------------------------------
// BannerConfiguration
// ---------------------------------------------------------------------------

export type BannerConfiguration = {
  // ------------------------------------------------------------------
  // Text (English / default)
  // ------------------------------------------------------------------
  title: string;
  description: string;
  acceptAllLabel: string;
  rejectAllLabel: string;
  customizeLabel: string;
  savePreferencesLabel: string;
  privacyPolicyText: string;
  privacyPolicyUrl: string;
  poweredByText: string;

  // ------------------------------------------------------------------
  // Multilingual translations (stored in the same JSONB)
  // Key = SupportedLanguage code; value = partial NoticeTranslation.
  // English ("en") fallbacks are always the root fields above.
  // ------------------------------------------------------------------
  translations?: Record<string, NoticeTranslation>;

  // ------------------------------------------------------------------
  // Controls
  // ------------------------------------------------------------------
  showAcceptAll: boolean;
  showRejectAll: boolean;
  showCustomize: boolean;
  showPoweredBy: boolean;
  showCloseButton: boolean;

  // ------------------------------------------------------------------
  // Preference center visibility
  // ------------------------------------------------------------------
  showPurposeDescriptions: boolean;
  showVendorList: boolean;
  showLegalBasis: boolean;

  // ------------------------------------------------------------------
  // Behavior
  // ------------------------------------------------------------------
  defaultConsent: ConsentDefault;
  closeOnOverlayClick: boolean;
  blockPageUntilConsent: boolean;
  respectDoNotTrack: boolean;
  consentExpireDays: number;
  showOnEveryVisit: boolean;

  // ------------------------------------------------------------------
  // Locale
  // ------------------------------------------------------------------
  language: string;
  region: string;

  // ------------------------------------------------------------------
  // Appearance
  // ------------------------------------------------------------------
  position: BannerPosition;
  layout: BannerLayout;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  overlayEnabled: boolean;
};

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export function defaultBannerConfig(): BannerConfiguration {
  return {
    title: "We value your privacy",
    description:
      "We use cookies and similar technologies to enhance your browsing experience, serve personalized content, and analyze traffic. By clicking \"Accept all\", you consent to our use of cookies.",
    acceptAllLabel: "Accept all",
    rejectAllLabel: "Reject all",
    customizeLabel: "Customize",
    savePreferencesLabel: "Save preferences",
    privacyPolicyText: "Privacy Policy",
    privacyPolicyUrl: "",
    poweredByText: "Powered by CMP",

    translations: {},

    showAcceptAll: true,
    showRejectAll: true,
    showCustomize: true,
    showPoweredBy: true,
    showCloseButton: false,

    showPurposeDescriptions: true,
    showVendorList: true,
    showLegalBasis: false,

    defaultConsent: "none",
    closeOnOverlayClick: false,
    blockPageUntilConsent: false,
    respectDoNotTrack: true,
    consentExpireDays: 365,
    showOnEveryVisit: false,

    language: "en",
    region: "",

    position: "bottom",
    layout: "bar",
    primaryColor: "#171717",
    backgroundColor: "#ffffff",
    textColor: "#171717",
    borderRadius: 8,
    overlayEnabled: false,
  };
}

// Merge stored JSONB with defaults so all fields always exist at runtime.
export function parseBannerConfig(raw: Record<string, unknown>): BannerConfiguration {
  const defaults = defaultBannerConfig();
  const merged = { ...defaults, ...raw } as BannerConfiguration;
  // Ensure translations is always an object (never null/undefined).
  if (!merged.translations || typeof merged.translations !== "object") {
    merged.translations = {};
  }
  return merged;
}

// ---------------------------------------------------------------------------
// resolveTranslation
//
// Given a BannerConfiguration and a language code (e.g. "hi", "kn"),
// returns the effective notice text by merging the translation over the
// English (root) fields.
//
// Resolution order:
//   1. Exact language code match (e.g. "hi")
//   2. Base language prefix (e.g. "hi" for "hi-IN")
//   3. English root fields (always present)
//
// This function is pure and has no I/O — safe to call in both server and
// client contexts.
// ---------------------------------------------------------------------------

export type ResolvedNoticeText = {
  title: string;
  description: string;
  acceptAllLabel: string;
  rejectAllLabel: string;
  customizeLabel: string;
  savePreferencesLabel: string;
  privacyPolicyText: string;
};

export function resolveTranslation(
  config: BannerConfiguration,
  lang: string,
): ResolvedNoticeText {
  const base: ResolvedNoticeText = {
    title:               config.title,
    description:         config.description,
    acceptAllLabel:      config.acceptAllLabel,
    rejectAllLabel:      config.rejectAllLabel,
    customizeLabel:      config.customizeLabel,
    savePreferencesLabel: config.savePreferencesLabel,
    privacyPolicyText:   config.privacyPolicyText,
  };

  if (!lang || lang === "en") return base;

  const t = config.translations ?? {};

  // Try exact match first, then base prefix (e.g. "hi" for "hi-IN").
  const translation: NoticeTranslation | undefined =
    t[lang] ?? t[lang.split("-")[0]] ?? undefined;

  if (!translation) return base;

  return {
    title:               translation.title               ?? base.title,
    description:         translation.description         ?? base.description,
    acceptAllLabel:      translation.acceptAllLabel      ?? base.acceptAllLabel,
    rejectAllLabel:      translation.rejectAllLabel      ?? base.rejectAllLabel,
    customizeLabel:      translation.customizeLabel      ?? base.customizeLabel,
    savePreferencesLabel: translation.savePreferencesLabel ?? base.savePreferencesLabel,
    privacyPolicyText:   translation.privacyPolicyText   ?? base.privacyPolicyText,
  };
}

// ---------------------------------------------------------------------------
// getTranslation — helper to get the mutable translation for a language code,
// initialising to an empty object if not yet present.
// ---------------------------------------------------------------------------

export function getTranslation(
  config: BannerConfiguration,
  lang: string,
): NoticeTranslation {
  return (config.translations ?? {})[lang] ?? {};
}

export function setTranslation(
  config: BannerConfiguration,
  lang: string,
  patch: NoticeTranslation,
): BannerConfiguration {
  return {
    ...config,
    translations: {
      ...(config.translations ?? {}),
      [lang]: patch,
    },
  };
}
