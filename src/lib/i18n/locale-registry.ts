/**
 * Global locale registry for visitor-facing CMP text.
 * Consent-engine decision logic must not import this file.
 */

export type TextDirection = "ltr" | "rtl";

export type LocaleEntry = {
  code: string;
  label: string;
  language: string;
  region?: string;
};

const BASE_LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish (Español)",
  fr: "French (Français)",
  de: "German (Deutsch)",
  it: "Italian (Italiano)",
  pt: "Portuguese (Português)",
  nl: "Dutch (Nederlands)",
  pl: "Polish (Polski)",
  ru: "Russian (Русский)",
  uk: "Ukrainian (Українська)",
  tr: "Turkish (Türkçe)",
  ar: "Arabic (العربية)",
  he: "Hebrew (עברית)",
  fa: "Persian (فارسی)",
  hi: "Hindi (हिंदी)",
  bn: "Bengali (বাংলা)",
  ur: "Urdu (اردو)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  gu: "Gujarati (ગુજરાતી)",
  mr: "Marathi (मराठी)",
  ta: "Tamil (தமிழ்)",
  te: "Telugu (తెలుగు)",
  kn: "Kannada (ಕನ್ನಡ)",
  ml: "Malayalam (മലയാളം)",
  or: "Odia (ଓଡ଼ିଆ)",
  as: "Assamese (অসমীয়া)",
  ne: "Nepali (नेपाली)",
  id: "Indonesian (Bahasa Indonesia)",
  ms: "Malay (Bahasa Melayu)",
  th: "Thai (ไทย)",
  vi: "Vietnamese (Tiếng Việt)",
  zh: "Chinese (中文)",
  ja: "Japanese (日本語)",
  ko: "Korean (한국어)",
  el: "Greek (Ελληνικά)",
  cs: "Czech (Čeština)",
  sv: "Swedish (Svenska)",
  da: "Danish (Dansk)",
  fi: "Finnish (Suomi)",
  ro: "Romanian (Română)",
  hu: "Hungarian (Magyar)",
  // Existing Eighth-Schedule extras — keep working; not required of every CMP.
  mai: "Maithili (मैथिली)",
  ks: "Kashmiri (کشمیری)",
  sd: "Sindhi (سنڌي)",
  kok: "Konkani (कोंकणी)",
  mni: "Manipuri (মেইতেই)",
  bodo: "Bodo (बड़ो)",
  doi: "Dogri (डोगरी)",
  sa: "Sanskrit (संस्कृतम्)",
  sat: "Santali (ᱥᱟᱱᱛᱟᱲᱤ)",
};

const REGIONAL_LABELS: Record<string, string> = {
  "en-IN": "English (India)",
  "en-US": "English (United States)",
  "en-GB": "English (United Kingdom)",
  "en-AU": "English (Australia)",
  "fr-FR": "French (France)",
  "fr-CA": "French (Canada)",
  "de-DE": "German (Germany)",
  "de-AT": "German (Austria)",
  "de-CH": "German (Switzerland)",
  "es-ES": "Spanish (Spain)",
  "es-MX": "Spanish (Mexico)",
  "es-US": "Spanish (United States)",
  "es-419": "Spanish (Latin America)",
  "pt-BR": "Portuguese (Brazil)",
  "pt-PT": "Portuguese (Portugal)",
  "zh-CN": "Chinese (Simplified, China)",
  "zh-TW": "Chinese (Traditional, Taiwan)",
  "zh-HK": "Chinese (Hong Kong)",
  "ar-SA": "Arabic (Saudi Arabia)",
  "ar-AE": "Arabic (UAE)",
  "ar-EG": "Arabic (Egypt)",
  "hi-IN": "Hindi (India)",
};

const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur"]);

const REGISTERED = new Map<string, LocaleEntry>();

function register(code: string, label: string) {
  const language = code.split("-")[0]!.toLowerCase();
  const region = code.includes("-") ? code.slice(code.indexOf("-") + 1) : undefined;
  REGISTERED.set(code, { code, label, language, region });
}

for (const [code, label] of Object.entries(BASE_LANGUAGE_LABELS)) {
  register(code, label);
}
for (const [code, label] of Object.entries(REGIONAL_LABELS)) {
  register(code, label);
}

export const REGISTERED_LOCALES: LocaleEntry[] = [...REGISTERED.values()];

export const LOCALE_OPTIONS: Array<{ code: string; label: string; group: "base" | "regional" }> =
  REGISTERED_LOCALES.map((entry) => ({
    code: entry.code,
    label: entry.label,
    group: entry.region ? "regional" : "base",
  }));

/** @deprecated Use LOCALE_OPTIONS. Kept so existing banner admin imports keep working. */
export type SupportedLanguage = string;

export const SUPPORTED_LANGUAGES: Array<{ code: string; label: string }> = LOCALE_OPTIONS.map(
  (entry) => ({ code: entry.code, label: entry.label }),
);

const TAG_RE = /^[A-Za-z]{2,8}(?:[_-][A-Za-z0-9]{1,8}){0,3}$/;

export function normalizeLocaleTag(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().replace(/\s+/g, "").replace(/_/g, "-");
  if (!trimmed || trimmed.length > 35 || !TAG_RE.test(trimmed)) return null;
  const parts = trimmed.split("-").filter(Boolean);
  if (parts.length === 0) return null;
  const language = parts[0]!.toLowerCase();
  const rest = parts.slice(1).map((part, index) => {
    if (part.length === 2 && index === 0) return part.toUpperCase();
    if (part.length === 4) return part[0]!.toUpperCase() + part.slice(1).toLowerCase();
    if (/^[0-9]{3}$/.test(part) || part.toLowerCase() === "419") return part.toLowerCase() === "419" ? "419" : part;
    return part.toUpperCase();
  });
  const code = [language, ...rest].join("-");
  return REGISTERED.has(code) || REGISTERED.has(language) ? code : null;
}

export function languageOf(locale: string): string {
  return locale.split("-")[0]!.toLowerCase();
}

export function isRegisteredLocale(code: string | null | undefined): boolean {
  if (!code) return false;
  return REGISTERED.has(code);
}

export function parseStoredLocale(raw: unknown, fallback = "en"): string | null {
  if (typeof raw !== "string") return null;
  const normalized = normalizeLocaleTag(raw);
  if (!normalized || normalized.length > 10) return null;
  return normalized;
}

export function isRtlLanguage(locale: string | null | undefined): boolean {
  if (!locale) return false;
  return RTL_LANGUAGES.has(languageOf(locale));
}

export function localeDirection(locale: string | null | undefined): TextDirection {
  return isRtlLanguage(locale) ? "rtl" : "ltr";
}

export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return [];
  return header
    .slice(0, 256)
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const qParam = params.find((p) => p.trim().startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.trim().slice(2)) : 1;
      return { tag: tag?.trim() ?? "", q: Number.isFinite(q) ? q : 1 };
    })
    .filter((row) => row.tag)
    .sort((a, b) => b.q - a.q)
    .map((row) => normalizeLocaleTag(row.tag))
    .filter((tag): tag is string => Boolean(tag));
}

export function localeLabel(code: string): string {
  return REGISTERED.get(code)?.label ?? code;
}

export type LocaleResolveInput = {
  explicit?: string | null;
  queryLang?: string | null;
  navigatorLanguage?: string | null;
  navigatorLanguages?: string[] | null;
  acceptLanguage?: string | null;
  websiteDefault?: string | null;
  bannerDefault?: string | null;
  supportedLocales?: string[] | null;
};

function isAllowed(code: string, supported: Set<string> | null): boolean {
  if (!supported || supported.size === 0) return isRegisteredLocale(code) || REGISTERED.has(languageOf(code));
  return supported.has(code) || supported.has(languageOf(code));
}

export function resolveRequestedLocale(input: LocaleResolveInput): string {
  const supported = input.supportedLocales?.length
    ? new Set(input.supportedLocales.map((code) => normalizeLocaleTag(code)).filter((code): code is string => Boolean(code)))
    : null;

  const candidates = [
    input.explicit,
    input.queryLang,
    input.navigatorLanguage,
    ...(input.navigatorLanguages ?? []),
    ...parseAcceptLanguage(input.acceptLanguage),
    input.websiteDefault,
    input.bannerDefault,
    "en",
  ];

  for (const raw of candidates) {
    const normalized = normalizeLocaleTag(raw ?? null);
    if (!normalized) continue;
    if (!isAllowed(normalized, supported)) {
      const base = languageOf(normalized);
      if (isAllowed(base, supported)) return base;
      continue;
    }
    return normalized;
  }
  return "en";
}
