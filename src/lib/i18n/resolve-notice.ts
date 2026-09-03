import {
  languageOf,
  localeDirection,
  normalizeLocaleTag,
  type TextDirection,
} from "./locale-registry";

export const BANNER_TEXT_FIELDS = [
  "title",
  "description",
  "acceptAllLabel",
  "rejectAllLabel",
  "customizeLabel",
  "savePreferencesLabel",
  "privacyPolicyText",
] as const;

export const PREFERENCE_TEXT_FIELDS = [
  "closeLabel",
  "preferenceCenterTitle",
  "preferenceCenterDescription",
  "purposesHeading",
  "vendorsHeading",
  "requiredLabel",
] as const;

export type BannerTextField = (typeof BANNER_TEXT_FIELDS)[number];
export type PreferenceTextField = (typeof PREFERENCE_TEXT_FIELDS)[number];

export type NoticeStrings = Record<BannerTextField | PreferenceTextField, string>;

export type EntityTranslation = {
  name?: string;
  description?: string;
};

export type NoticeTranslation = Partial<NoticeStrings> & {
  purposes?: Record<string, EntityTranslation>;
  vendors?: Record<string, EntityTranslation>;
};

export type TranslationStatus = "translated" | "partial" | "fallback";

export const DEFAULT_NOTICE_STRINGS: NoticeStrings = {
  title: "We value your privacy",
  description:
    "We use cookies and similar technologies to enhance your browsing experience, serve personalized content, and analyze traffic. By clicking \"Accept all\", you consent to our use of cookies.",
  acceptAllLabel: "Accept all",
  rejectAllLabel: "Reject all",
  customizeLabel: "Customize",
  savePreferencesLabel: "Save preferences",
  privacyPolicyText: "Privacy Policy",
  closeLabel: "Close",
  preferenceCenterTitle: "Manage your preferences",
  preferenceCenterDescription:
    "Customize which purposes and vendors you allow. You can change your choices at any time.",
  purposesHeading: "Purposes",
  vendorsHeading: "Vendors",
  requiredLabel: "Required",
};

function nonEmpty(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export function translationStatus(translation: NoticeTranslation | undefined): TranslationStatus {
  if (!translation) return "fallback";
  const filled = BANNER_TEXT_FIELDS.filter((field) => nonEmpty(translation[field])).length;
  if (filled === 0) return "fallback";
  if (filled >= BANNER_TEXT_FIELDS.length) return "translated";
  return "partial";
}

/**
 * Pick which translations[...] key to use for a requested locale.
 *
 * Exact locale → base language → configured default (only if a different
 * language, never a sibling regional variant) → English root (null key).
 */
export function pickTranslationKey(
  requested: string,
  translationKeys: string[],
  defaultLocale: string,
): string | null {
  const req = normalizeLocaleTag(requested) ?? languageOf(requested);
  const defaultNorm = normalizeLocaleTag(defaultLocale) ?? "en";
  const reqBase = languageOf(req);
  const defaultBase = languageOf(defaultNorm);

  const normalizedToOriginal = new Map<string, string>();
  for (const key of translationKeys) {
    const normalized = normalizeLocaleTag(key) ?? key;
    if (!normalizedToOriginal.has(normalized)) normalizedToOriginal.set(normalized, key);
  }

  const hit = (code: string) => normalizedToOriginal.get(code) ?? null;

  if (hit(req)) return hit(req);
  if (hit(reqBase)) return hit(reqBase);

  // English copy lives on the configuration root, not translations.en.
  // Never overlay another language onto an English request.
  if (reqBase === "en") return null;

  // Requested base language may use the configured default regional of the
  // same language (de → de-DE). A requested regional must not use a sibling
  // (fr-CA must not use fr-FR when fr is missing).
  const reqIsRegional = req.includes("-");
  if (!reqIsRegional && defaultBase === reqBase) {
    if (hit(defaultNorm)) return hit(defaultNorm);
  }

  if (defaultBase !== reqBase) {
    if (hit(defaultNorm)) return hit(defaultNorm);
    if (hit(defaultBase)) return hit(defaultBase);
  }

  return null;
}

export function presentedLocale(requested: string, translationKey: string | null): string {
  const req = normalizeLocaleTag(requested) ?? "en";
  if (!translationKey) {
    return languageOf(req) === "en" ? req : "en";
  }
  const pack = normalizeLocaleTag(translationKey) ?? translationKey;
  if (languageOf(pack) === languageOf(req)) return req;
  return pack;
}

export type ResolvedNotice = NoticeStrings & {
  resolvedLocale: string;
  translationKey: string | null;
  direction: TextDirection;
  status: TranslationStatus;
  purposes: Record<string, EntityTranslation>;
  vendors: Record<string, EntityTranslation>;
};

export function resolveNotice(input: {
  requestedLocale: string;
  defaultLocale: string;
  root: NoticeStrings;
  translations: Record<string, NoticeTranslation>;
}): ResolvedNotice {
  const requested = normalizeLocaleTag(input.requestedLocale) ?? "en";
  const translationKey = pickTranslationKey(
    requested,
    Object.keys(input.translations),
    input.defaultLocale,
  );
  const pack = translationKey ? input.translations[translationKey] : undefined;
  const root = input.root;
  const merged: NoticeStrings = { ...DEFAULT_NOTICE_STRINGS, ...root };

  for (const field of [...BANNER_TEXT_FIELDS, ...PREFERENCE_TEXT_FIELDS]) {
    const localized = pack ? nonEmpty(pack[field]) : undefined;
    const fallback = nonEmpty(merged[field]) ?? DEFAULT_NOTICE_STRINGS[field];
    merged[field] = localized ?? fallback;
  }

  const resolvedLocale = presentedLocale(requested, translationKey);

  return {
    ...merged,
    resolvedLocale,
    translationKey,
    direction: localeDirection(resolvedLocale),
    status: translationStatus(pack),
    purposes: pack?.purposes ?? {},
    vendors: pack?.vendors ?? {},
  };
}

export function overlayEntityText(
  canonical: { key: string; name: string; description?: string | null },
  overlay: Record<string, EntityTranslation>,
): { name: string; description: string | null } {
  const hit = overlay[canonical.key];
  return {
    name: nonEmpty(hit?.name) ?? canonical.name,
    description: nonEmpty(hit?.description) ?? canonical.description ?? null,
  };
}
