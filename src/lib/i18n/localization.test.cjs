const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const root = path.resolve(__dirname, "../../..");
execSync("npx tsc -p tsconfig.tests.json", { cwd: root, stdio: "pipe" });

function compiled(rel) {
  const candidate = path.join(root, ".tmp/test-libs", rel);
  if (!fs.existsSync(candidate)) {
    throw new Error(`Compiled file not found: ${candidate}`);
  }
  return require(candidate);
}

const {
  normalizeLocaleTag,
  resolveRequestedLocale,
  localeDirection,
  isRtlLanguage,
  languageOf,
} = compiled("lib/i18n/locale-registry.js");

const {
  pickTranslationKey,
  presentedLocale,
  resolveNotice,
  DEFAULT_NOTICE_STRINGS,
} = compiled("lib/i18n/resolve-notice.js");

const rootNotice = { ...DEFAULT_NOTICE_STRINGS };

function notice(requested, translations, defaultLocale = "en") {
  return resolveNotice({
    requestedLocale: requested,
    defaultLocale,
    root: rootNotice,
    translations,
  });
}

assert.equal(normalizeLocaleTag("HI-in"), "hi-IN");
assert.equal(normalizeLocaleTag("en_us"), "en-US");
assert.equal(normalizeLocaleTag("fr-FR"), "fr-FR");
assert.equal(normalizeLocaleTag("  es-mx "), "es-MX");
assert.equal(normalizeLocaleTag("xx-YY"), null);

assert.equal(languageOf("en-IN"), "en");
assert.equal(localeDirection("ar-SA"), "rtl");
assert.equal(localeDirection("he"), "rtl");
assert.equal(localeDirection("fa"), "rtl");
assert.equal(localeDirection("ur"), "rtl");
assert.equal(localeDirection("en"), "ltr");
assert.equal(isRtlLanguage("de"), false);

const packs = {
  es: { title: "Privacidad", description: "Aviso ES", acceptAllLabel: "Aceptar todo", rejectAllLabel: "Rechazar", customizeLabel: "Preferencias", savePreferencesLabel: "Guardar", privacyPolicyText: "Privacidad" },
  fr: { title: "Vie privée", description: "Avis FR", acceptAllLabel: "Tout accepter", rejectAllLabel: "Tout refuser", customizeLabel: "Préférences", savePreferencesLabel: "Enregistrer", privacyPolicyText: "Confidentialité" },
  de: { title: "Datenschutz", description: "Hinweis DE", acceptAllLabel: "Alle akzeptieren", rejectAllLabel: "Ablehnen", customizeLabel: "Einstellungen", savePreferencesLabel: "Speichern", privacyPolicyText: "Datenschutz" },
  pt: { title: "Privacidade", description: "Aviso PT", acceptAllLabel: "Aceitar tudo", rejectAllLabel: "Rejeitar", customizeLabel: "Preferências", savePreferencesLabel: "Guardar", privacyPolicyText: "Privacidade" },
  hi: { title: "गोपनीयता", description: "सूचना HI", acceptAllLabel: "स्वीकार करें", rejectAllLabel: "अस्वीकार", customizeLabel: "सेटिंग्स", savePreferencesLabel: "सहेजें", privacyPolicyText: "नीति" },
  ar: { title: "الخصوصية", description: "إشعار AR", acceptAllLabel: "قبول الكل", rejectAllLabel: "رفض", customizeLabel: "تفضيلات", savePreferencesLabel: "حفظ", privacyPolicyText: "الخصوصية" },
  zh: { title: "隐私", description: "通知 ZH", acceptAllLabel: "全部接受", rejectAllLabel: "拒绝", customizeLabel: "偏好", savePreferencesLabel: "保存", privacyPolicyText: "隐私" },
  ja: { title: "プライバシー", description: "通知 JA", acceptAllLabel: "すべて許可", rejectAllLabel: "拒否", customizeLabel: "設定", savePreferencesLabel: "保存", privacyPolicyText: "プライバシー" },
  "en-US": { title: "US privacy notice" },
  "fr-FR": { title: "France only" },
  "pt-BR": { title: "Brasil" },
  "zh-CN": { title: "简体中文" },
  "ar-SA": { title: "السعودية" },
  "hi-IN": { title: "हिंदी भारत" },
};

assert.equal(notice("en", packs).title, DEFAULT_NOTICE_STRINGS.title);
assert.equal(notice("en-US", packs).title, "US privacy notice");
assert.equal(notice("en-IN", packs).title, DEFAULT_NOTICE_STRINGS.title);
assert.equal(notice("es", packs).title, "Privacidad");
assert.equal(notice("es-MX", packs).acceptAllLabel, "Aceptar todo");
assert.equal(notice("fr-FR", packs).title, "France only");
assert.equal(notice("fr-CA", { "fr-FR": packs["fr-FR"] }).title, DEFAULT_NOTICE_STRINGS.title);
assert.equal(notice("fr-CA", { fr: packs.fr }).title, "Vie privée");
assert.equal(notice("pt-BR", packs).title, "Brasil");
assert.equal(notice("pt-PT", { pt: packs.pt }).title, "Privacidade");
assert.equal(notice("hi-IN", packs).title, "हिंदी भारत");
assert.equal(notice("hi", packs).title, "गोपनीयता");
assert.equal(notice("zh-CN", packs).title, "简体中文");
assert.equal(notice("ja", packs).title, "プライバシー");
assert.equal(notice("ar-SA", packs).title, "السعودية");
assert.equal(notice("ar", packs).direction, "rtl");
assert.equal(notice("de", packs).acceptAllLabel, "Alle akzeptieren");
assert.equal(notice("xx-YY", packs).title, DEFAULT_NOTICE_STRINGS.title);
assert.equal(notice("de", packs, "hi").title, "Datenschutz");
assert.equal(notice("nl", { hi: packs.hi }, "hi").title, "गोपनीयता");
assert.equal(notice("nl", {}, "en").title, DEFAULT_NOTICE_STRINGS.title);

assert.equal(pickTranslationKey("fr-CA", ["fr-FR"], "en"), null);
assert.equal(pickTranslationKey("fr-CA", ["fr"], "en"), "fr");
assert.equal(pickTranslationKey("pt-BR", ["pt"], "en"), "pt");
assert.equal(pickTranslationKey("en-US", ["hi"], "hi"), null);
assert.equal(presentedLocale("fr-CA", null), "en");
assert.equal(presentedLocale("hi-IN", "hi"), "hi-IN");
assert.equal(presentedLocale("nl", "hi"), "hi");

const pc = notice("fr", {
  fr: {
    ...packs.fr,
    preferenceCenterTitle: "Gérer vos préférences",
    purposesHeading: "Finalités",
  },
});
assert.equal(pc.preferenceCenterTitle, "Gérer vos préférences");
assert.equal(pc.purposesHeading, "Finalités");

assert.equal(
  resolveRequestedLocale({ queryLang: "hi", websiteDefault: "en" }),
  "hi",
);
assert.equal(
  resolveRequestedLocale({ queryLang: "fr-FR", websiteDefault: "en" }),
  "fr-FR",
);
assert.equal(
  resolveRequestedLocale({
    explicit: "de",
    queryLang: "hi",
    websiteDefault: "en",
  }),
  "de",
);
assert.equal(
  resolveRequestedLocale({
    acceptLanguage: "pt-BR,pt;q=0.9,en;q=0.8",
    websiteDefault: "en",
  }),
  "pt-BR",
);
assert.equal(
  resolveRequestedLocale({ queryLang: "zz", websiteDefault: "es" }),
  "es",
);

console.log("global localization tests passed");
