import {
  LOCALE_OPTIONS,
  SUPPORTED_LANGUAGES,
  isRegisteredLocale,
  languageOf,
  localeDirection,
  normalizeLocaleTag,
  type SupportedLanguage,
} from "@/lib/i18n/locale-registry";
import {
  BANNER_TEXT_FIELDS,
  DEFAULT_NOTICE_STRINGS,
  overlayEntityText,
  resolveNotice,
  translationStatus,
  type NoticeStrings,
  type NoticeTranslation,
  type ResolvedNotice,
  type TranslationStatus,
} from "@/lib/i18n/resolve-notice";

export type { SupportedLanguage, NoticeTranslation, TranslationStatus };
export { SUPPORTED_LANGUAGES, LOCALE_OPTIONS, overlayEntityText, translationStatus };

export type BannerPosition = "bottom" | "top" | "bottom-left" | "bottom-right" | "center";
export type BannerLayout = "bar" | "box" | "dialog";
export type ConsentDefault = "opt-in" | "opt-out" | "none";

export type BannerConfiguration = {
  title: string;
  description: string;
  acceptAllLabel: string;
  rejectAllLabel: string;
  customizeLabel: string;
  savePreferencesLabel: string;
  privacyPolicyText: string;
  privacyPolicyUrl: string;
  poweredByText: string;
  closeLabel: string;
  preferenceCenterTitle: string;
  preferenceCenterDescription: string;
  purposesHeading: string;
  vendorsHeading: string;
  requiredLabel: string;

  translations?: Record<string, NoticeTranslation>;
  supportedLocales?: string[];

  showAcceptAll: boolean;
  showRejectAll: boolean;
  showCustomize: boolean;
  showPoweredBy: boolean;
  showCloseButton: boolean;

  showPurposeDescriptions: boolean;
  showVendorList: boolean;
  showLegalBasis: boolean;

  defaultConsent: ConsentDefault;
  closeOnOverlayClick: boolean;
  blockPageUntilConsent: boolean;
  respectDoNotTrack: boolean;
  consentExpireDays: number;
  showOnEveryVisit: boolean;

  language: string;
  region: string;

  position: BannerPosition;
  layout: BannerLayout;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  overlayEnabled: boolean;

  showPreferenceWidget: boolean;
  preferenceWidgetPosition: "bottom-left" | "bottom-right";
};

export function defaultBannerConfig(): BannerConfiguration {
  return {
    title: DEFAULT_NOTICE_STRINGS.title,
    description: DEFAULT_NOTICE_STRINGS.description,
    acceptAllLabel: DEFAULT_NOTICE_STRINGS.acceptAllLabel,
    rejectAllLabel: DEFAULT_NOTICE_STRINGS.rejectAllLabel,
    customizeLabel: DEFAULT_NOTICE_STRINGS.customizeLabel,
    savePreferencesLabel: DEFAULT_NOTICE_STRINGS.savePreferencesLabel,
    privacyPolicyText: DEFAULT_NOTICE_STRINGS.privacyPolicyText,
    privacyPolicyUrl: "",
    poweredByText: "Powered by CMP",
    closeLabel: DEFAULT_NOTICE_STRINGS.closeLabel,
    preferenceCenterTitle: DEFAULT_NOTICE_STRINGS.preferenceCenterTitle,
    preferenceCenterDescription: DEFAULT_NOTICE_STRINGS.preferenceCenterDescription,
    purposesHeading: DEFAULT_NOTICE_STRINGS.purposesHeading,
    vendorsHeading: DEFAULT_NOTICE_STRINGS.vendorsHeading,
    requiredLabel: DEFAULT_NOTICE_STRINGS.requiredLabel,

    translations: {},
    supportedLocales: [],

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

    showPreferenceWidget: true,
    preferenceWidgetPosition: "bottom-left",
  };
}

export function parseBannerConfig(raw: Record<string, unknown>): BannerConfiguration {
  const defaults = defaultBannerConfig();
  const merged = { ...defaults, ...raw } as BannerConfiguration;
  if (!merged.translations || typeof merged.translations !== "object" || Array.isArray(merged.translations)) {
    merged.translations = {};
  }
  if (!Array.isArray(merged.supportedLocales)) {
    merged.supportedLocales = [];
  }
  const language = normalizeLocaleTag(merged.language) ?? "en";
  merged.language = isRegisteredLocale(language) || isRegisteredLocale(languageOf(language))
    ? language
    : "en";

  const layouts: BannerLayout[] = ["bar", "box", "dialog"];
  const positions: BannerPosition[] = ["bottom", "top", "bottom-left", "bottom-right", "center"];
  if (!layouts.includes(merged.layout)) merged.layout = "bar";
  if (!positions.includes(merged.position)) merged.position = "bottom";
  if (merged.layout === "dialog") merged.position = "center";

  const radius = Number(merged.borderRadius);
  merged.borderRadius = Number.isFinite(radius) ? Math.max(0, Math.min(24, radius)) : 8;

  if (typeof merged.showPreferenceWidget !== "boolean") merged.showPreferenceWidget = true;
  merged.preferenceWidgetPosition =
    merged.preferenceWidgetPosition === "bottom-right" ? "bottom-right" : "bottom-left";

  return merged;
}

function publicEntityMap(value: unknown): Record<string, { name?: string; description?: string }> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const out: Record<string, { name?: string; description?: string }> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (!key || key.length > 150 || !entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const row = entry as Record<string, unknown>;
    const item: { name?: string; description?: string } = {};
    if (typeof row.name === "string") item.name = row.name.slice(0, 255);
    if (typeof row.description === "string") item.description = row.description.slice(0, 2000);
    if (item.name || item.description) out[key] = item;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function publicNoticeTranslation(value: unknown): NoticeTranslation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const t = value as Record<string, unknown>;
  const out: NoticeTranslation = {};
  for (const field of [...BANNER_TEXT_FIELDS, "closeLabel", "preferenceCenterTitle", "preferenceCenterDescription", "purposesHeading", "vendorsHeading", "requiredLabel"] as const) {
    if (typeof t[field] === "string") out[field] = t[field] as string;
  }
  const purposes = publicEntityMap(t.purposes);
  const vendors = publicEntityMap(t.vendors);
  if (purposes) out.purposes = purposes;
  if (vendors) out.vendors = vendors;
  return Object.keys(out).length > 0 ? out : null;
}

export function toPublicBannerConfig(config: BannerConfiguration): BannerConfiguration {
  const translations: Record<string, NoticeTranslation> = {};
  for (const [code, value] of Object.entries(config.translations ?? {})) {
    const normalized = normalizeLocaleTag(code);
    if (!normalized || normalized.length > 16) continue;
    const notice = publicNoticeTranslation(value);
    if (notice) translations[normalized] = notice;
  }

  const supportedLocales = (config.supportedLocales ?? [])
    .map((code) => normalizeLocaleTag(code))
    .filter((code): code is string => Boolean(code));

  return {
    ...parseBannerConfig(config as unknown as Record<string, unknown>),
    translations,
    supportedLocales,
  };
}

export type ResolvedNoticeText = NoticeStrings & {
  resolvedLocale: string;
  direction: "ltr" | "rtl";
  status: TranslationStatus;
  purposes: NoticeTranslation["purposes"];
  vendors: NoticeTranslation["vendors"];
};

export function noticeRootFromConfig(config: BannerConfiguration): NoticeStrings {
  return {
    title: config.title,
    description: config.description,
    acceptAllLabel: config.acceptAllLabel,
    rejectAllLabel: config.rejectAllLabel,
    customizeLabel: config.customizeLabel,
    savePreferencesLabel: config.savePreferencesLabel,
    privacyPolicyText: config.privacyPolicyText,
    closeLabel: config.closeLabel || DEFAULT_NOTICE_STRINGS.closeLabel,
    preferenceCenterTitle: config.preferenceCenterTitle || DEFAULT_NOTICE_STRINGS.preferenceCenterTitle,
    preferenceCenterDescription:
      config.preferenceCenterDescription || DEFAULT_NOTICE_STRINGS.preferenceCenterDescription,
    purposesHeading: config.purposesHeading || DEFAULT_NOTICE_STRINGS.purposesHeading,
    vendorsHeading: config.vendorsHeading || DEFAULT_NOTICE_STRINGS.vendorsHeading,
    requiredLabel: config.requiredLabel || DEFAULT_NOTICE_STRINGS.requiredLabel,
  };
}

export function resolveTranslation(
  config: BannerConfiguration,
  lang: string,
): ResolvedNotice {
  return resolveNotice({
    requestedLocale: lang,
    defaultLocale: config.language || "en",
    root: noticeRootFromConfig(config),
    translations: config.translations ?? {},
  });
}

export function applyResolvedNotice(
  config: BannerConfiguration,
  resolved: ResolvedNotice,
): BannerConfiguration {
  return {
    ...config,
    title: resolved.title,
    description: resolved.description,
    acceptAllLabel: resolved.acceptAllLabel,
    rejectAllLabel: resolved.rejectAllLabel,
    customizeLabel: resolved.customizeLabel,
    savePreferencesLabel: resolved.savePreferencesLabel,
    privacyPolicyText: resolved.privacyPolicyText,
    closeLabel: resolved.closeLabel,
    preferenceCenterTitle: resolved.preferenceCenterTitle,
    preferenceCenterDescription: resolved.preferenceCenterDescription,
    purposesHeading: resolved.purposesHeading,
    vendorsHeading: resolved.vendorsHeading,
    requiredLabel: resolved.requiredLabel,
  };
}

export function getTranslation(
  config: BannerConfiguration,
  lang: string,
): NoticeTranslation {
  const key = normalizeLocaleTag(lang) ?? lang;
  return (config.translations ?? {})[key] ?? (config.translations ?? {})[lang] ?? {};
}

export function setTranslation(
  config: BannerConfiguration,
  lang: string,
  patch: NoticeTranslation,
): BannerConfiguration {
  const key = normalizeLocaleTag(lang) ?? lang;
  return {
    ...config,
    translations: {
      ...(config.translations ?? {}),
      [key]: patch,
    },
  };
}

export { localeDirection, normalizeLocaleTag };
