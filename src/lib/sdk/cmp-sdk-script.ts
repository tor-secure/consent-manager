// ---------------------------------------------------------------------------
// CMP SDK Script Generator
//
// Generates the self-contained browser JavaScript string that is served from
// a CDN (or embedded inline for testing). The script:
//
//  1. Loads the CMP config from /api/sdk/{siteKey}/config
//  2. Establishes blocked enforcement and checks localStorage for a confirmed
//     consent reference.
//  3. Revalidates stored consent with the server before restoring decisions or
//     activating optional processing.
//  4. If no consent: renders the consent banner, waits for user choice, then
//     applies enforcement and saves the consent record.
//  5. Exposes window.CMP as the public API:
//       window.CMP.openPreferenceCenter()
//       window.CMP.getConsent()          → { consentId, decisions }
//       window.CMP.onConsentChange(fn)   → callback
//
// BLOCKING APPROACH
//  Scripts tagged with  data-cmp-purpose="<purposeKey>"  are given
//  type="text/plain" by default so the browser ignores them. When consent is
//  granted for that purpose, the script type is restored to "text/javascript"
//  and the element is re-inserted so the browser executes it.
//
//  Dynamic scripts and embeds are synchronously quarantined when inserted
//  through patched root DOM insertion methods, with MutationObserver as a
//  fallback. Known first-party cookies/storage are cleaned on denial or
//  withdrawal. Browser JavaScript cannot remove HttpOnly/third-party cookies
//  or reliably stop requests that occurred before this SDK executed.
//  Matching googletagmanager.com URLs pauses the GTM/gtag loader. It does not
//  control tags already configured inside a GTM container; enable Google
//  Consent Mode and GTM consent checks for those tags.
//
// NOTE: This file produces a TypeScript string literal, not a compiled bundle.
// The actual browser script is embedded verbatim via the template literal
// below. A future task will set up a Rollup/esbuild pipeline to compile a
// proper optimised bundle.
// ---------------------------------------------------------------------------

import { HOST_SCROLL_LOCK_RUNTIME } from "@/lib/sdk/scroll-lock";
import { PURPOSE_KEY_FAMILIES } from "@/lib/sdk/purpose-aliases";
import { BUILTIN_TRACKER_CATALOG } from "@/lib/sdk/tracker-catalog";
import { DEFAULT_BANNER_LOCALES } from "@/lib/i18n/locale-registry";
import { DEFAULT_NOTICE_STRINGS } from "@/lib/i18n/resolve-notice";
import {
  DEFAULT_BANNER_UI_STRINGS,
  INDIAN_LOCALE_NATIVE_LABELS,
  INDIAN_NOTICE_PACKS,
  INDIAN_UI_STRINGS,
} from "@/lib/i18n/indian-notice-translations";

export function buildCmpSdkScript(options: {
  siteKey: string;
  apiBase: string;
}): string {
  const { siteKey, apiBase } = options;
  return buildSdkScriptBody(siteKey, apiBase);
}

// ---------------------------------------------------------------------------
// buildGenericCmpSdkScript
// Returns the SDK with RUNTIME detection of siteKey/apiBase.
// Used for the public /api/sdk/script.js endpoint where the script is loaded
// from an external website. siteKey is resolved at load time from:
//   1. <script data-site-key="...">  attribute on the loader tag
//   2. window.__CMP_SITE_KEY  set by the embed snippet
// apiBase is resolved from:
//   1. <script data-api-base="...">  attribute
//   2. window.__CMP_API_BASE
//   3. The origin (protocol+host) of the running script itself
// ---------------------------------------------------------------------------

export function buildGenericCmpSdkScript(): string {
  const runtimeBootstrap = `
  // --- Runtime siteKey / apiBase detection ---
  var _scripts = document.getElementsByTagName('script');
  var _cs = null;
  var i, src, m;
  for (i = 0; i < _scripts.length; i++) {
    src = _scripts[i].src || '';
    if (_scripts[i].getAttribute('data-site-key')) { _cs = _scripts[i]; break; }
    if (src.indexOf('/api/sdk/script') !== -1) { _cs = _scripts[i]; break; }
  }
  if (!_cs) { _cs = document.currentScript || _scripts[_scripts.length - 1] || null; }
  var SITE_KEY = (_cs && _cs.getAttribute('data-site-key')) || window.__CMP_SITE_KEY || '';
  if (!SITE_KEY && _cs && _cs.src) {
    try {
      m = _cs.src.match(/[?&]siteKey=([^&]+)/);
      if (m && m[1]) SITE_KEY = decodeURIComponent(m[1]);
    } catch(e) {}
  }
  var API_BASE = (_cs && _cs.getAttribute('data-api-base')) || window.__CMP_API_BASE || '';
  if (!API_BASE && _cs && _cs.src) {
    try {
      var u = new URL(_cs.src);
      API_BASE = u.protocol + '//' + u.host;
    } catch(e) {}
  }
  if (!SITE_KEY) {
    console.warn('[CMP] siteKey not found. Set data-site-key attribute, ?siteKey= query, or window.__CMP_SITE_KEY.');
    return;
  }
  if (!API_BASE) {
    console.warn('[CMP] apiBase not resolved. Set data-api-base, window.__CMP_API_BASE, or load script via absolute URL.');
    return;
  }
`;
  return buildSdkScriptBody(null, null, runtimeBootstrap);
}

function buildSdkScriptBody(
  bakedSiteKey: string | null,
  bakedApiBase: string | null,
  preamble?: string,
): string {
  const siteKeyLine = bakedSiteKey !== null
    ? `  var SITE_KEY = ${JSON.stringify(bakedSiteKey)};`
    : `  // SITE_KEY set in preamble via runtime detection`;
  const apiBaseLine = bakedApiBase !== null
    ? `  var API_BASE = ${JSON.stringify(bakedApiBase)};`
    : `  // API_BASE set in preamble via runtime detection`;

  return `
(function(window, document) {
  'use strict';
${preamble ?? ""}
${siteKeyLine}
${apiBaseLine}
  var STORAGE_KEY = 'cmp_consent_' + SITE_KEY;
  var EXPIRY_KEY  = 'cmp_expiry_'  + SITE_KEY;
  var POLICY_CONTEXT_KEY = 'cmp_policy_context_' + SITE_KEY;
  var CA_OPT_OUT_KEY = 'cmp_ca_optout_' + SITE_KEY;
  function safeHttpUrl(value) {
    if (!value || typeof value !== 'string') return '';
    try {
      var parsed = new URL(value.trim());
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
      if (parsed.username || parsed.password) return '';
      return parsed.href;
    } catch (err) {
      return '';
    }
  }
  function safeCssColor(value) {
    if (typeof value !== 'string') return '';
    var trimmed = value.trim();
    if (/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(trimmed)) return trimmed;
    if (/^rgba?\(\s*(?:\d{1,3}%?\s*,\s*){2}\d{1,3}%?(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(trimmed)) return trimmed;
    return '';
  }
  var BUILTIN_TRACKER_CATALOG = ${JSON.stringify(BUILTIN_TRACKER_CATALOG)};
  var PURPOSE_KEY_FAMILIES = ${JSON.stringify(PURPOSE_KEY_FAMILIES)};
  var DEFAULT_BANNER_LOCALES = ${JSON.stringify(DEFAULT_BANNER_LOCALES)};
  var DEFAULT_NOTICE_STRINGS = ${JSON.stringify(DEFAULT_NOTICE_STRINGS)};
  var DEFAULT_BANNER_UI_STRINGS = ${JSON.stringify(DEFAULT_BANNER_UI_STRINGS)};
  var INDIAN_NOTICE_PACKS = ${JSON.stringify(INDIAN_NOTICE_PACKS)};
  var INDIAN_UI_STRINGS = ${JSON.stringify(INDIAN_UI_STRINGS)};
  var INDIAN_LOCALE_NATIVE_LABELS = ${JSON.stringify(INDIAN_LOCALE_NATIVE_LABELS)};

  var _config      = null;
  var _policyContext = null;
  var _decisions   = { purposes: {}, vendors: {} };
  var _consentId   = null;
  var _consentState = 'UNKNOWN';
  var _confirmedRevision = 0;
  var _stateVersion = 0;
  var _abVariantId = null;
  var _listeners   = [];
  var _explicitLang = '';
  var _pcLastFocus = null;
  var _reconsentNotice = '';
  var _ackedPurposeIds = {};
  var _ackedVendorIds = {};
  var _hasVendorSnapshot = false;
  var _submitBusy = false;
  var _withdrawBusy = false;
  var _queuedSubmit = null;
  var _choiceUiHeld = false;
  var _retryJob = null;
  var _submitButtons = [];
  var _tcString = null;
  var _gppString = null;
  var _gppSections = {};
  var _iabListeners = {};
  var _iabListenerSeq = 1;
  var _tcfQueue = [];
  var _gppQueue = [];
  var _configRevision = '';
  var _configHash = '';
  var _california = null;
  var _noticeRoot = null;
  var _quarantinedNodes = [];
  var _enforcementObserver = null;
  var _enforcementMutating = false;
  var _enforcementMetrics = {
    bootstrapMs: 0,
    inspected: 0,
    blocked: 0,
    allowed: 0,
    observerBatches: 0,
    inspectionMs: 0
  };
${HOST_SCROLL_LOCK_RUNTIME}
  if (window.__CMP_HOST_SCROLL_LOCK__ && typeof window.__CMP_HOST_SCROLL_LOCK__.teardown === 'function') {
    try { window.__CMP_HOST_SCROLL_LOCK__.teardown(); } catch (eLock) {}
  }
  var _hostScroll = createHostScrollLock(window, document);
  window.__CMP_HOST_SCROLL_LOCK__ = _hostScroll;
  installEnforcementBootstrap();
  applyTrackerEnforcement();

  // Standards require APIs to exist before the asynchronous CMP config loads.
  if (typeof window.__tcfapi !== 'function') {
    window.__tcfapi = function() { _tcfQueue.push(Array.prototype.slice.call(arguments)); };
  }
  if (!window.frames || !window.frames.__tcfapiLocator) {
    try { var tcfLocator = document.createElement('iframe'); tcfLocator.name = '__tcfapiLocator'; tcfLocator.style.display = 'none'; (document.body || document.documentElement).appendChild(tcfLocator); } catch (eLocator) {}
  }
  if (typeof window.__gpp !== 'function') {
    window.__gpp = function() { _gppQueue.push(Array.prototype.slice.call(arguments)); };
  }
  window.__gpp.queue = _gppQueue;

  function log(msg) {
    if (window.__CMP_DEBUG) console.log('[CMP]', msg);
  }

  function warn(msg) {
    if (window.console && typeof window.console.warn === 'function') {
      window.console.warn('[CMP]', msg);
    }
  }

  function newSubmissionId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
    } catch (eCrypto) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(ch) {
      var r = Math.floor(Math.random() * 16);
      var v = ch === 'x' ? r : ((r & 3) | 8);
      return v.toString(16);
    });
  }

  function consentIsServerConfirmed() {
    return _consentState === 'GRANTED' || _consentState === 'DENIED';
  }

  function stateForConfirmedDecisions(decisionsArray) {
    var grantedOptional = false;
    (decisionsArray || []).forEach(function(decision) {
      if (!decision || !decision.granted) return;
      if (decision.vendorId) grantedOptional = true;
      if (decision.purposeId && _config && _config.purposes) {
        for (var i = 0; i < _config.purposes.length; i++) {
          if (_config.purposes[i].id === decision.purposeId && !_config.purposes[i].isRequired) {
            grantedOptional = true;
          }
        }
      }
    });
    return grantedOptional ? 'GRANTED' : 'DENIED';
  }

  function renderSubmissionState(message) {
    for (var i = 0; i < _submitButtons.length; i++) {
      var button = _submitButtons[i];
      if (!button) continue;
      button.disabled = _consentState === 'PENDING';
      button.style.opacity = _consentState === 'PENDING' ? '0.55' : '';
      button.style.cursor = _consentState === 'PENDING' ? 'wait' : 'pointer';
    }
    var ids = ['__cmp_banner_status__', '__cmp_pc_status__', '__cmp_prefs_status__'];
    for (var j = 0; j < ids.length; j++) {
      var status = document.getElementById(ids[j]);
      if (!status) continue;
      status.textContent = message || '';
      status.style.display = message ? 'block' : 'none';
    }
  }

  function blockOptionalProcessing(state, message) {
    _consentState = state;
    _decisions = { purposes: {}, vendors: {} };
    _tcString = null;
    _gppString = null;
    _gppSections = {};
    applyTrackerEnforcement();
    publishExternalSignals();
    renderSubmissionState(message);
  }

  function confirmedResponse(data) {
    return !!(
      data &&
      data.success === true &&
      data.confirmed === true &&
      typeof data.consentId === 'string' &&
      data.consentId.length > 0 &&
      typeof data.confirmedAt === 'string' &&
      Number.isInteger(data.stateVersion) &&
      data.stateVersion > 0 &&
      data.evidenceSnapshotId &&
      Array.isArray(data.decisions) &&
      data.confirmation &&
      data.confirmation.policyContextValidated === true &&
      data.confirmation.persisted === true &&
      data.confirmation.evidenceSnapshotCreated === true
    );
  }

  function afterConfirmation(closeUi) {
    var configured = Number(window.__CMP_CONFIRMATION_DISPLAY_MS);
    var delay = isFinite(configured)
      ? Math.max(0, Math.min(3000, configured))
      : 0;
    if (delay <= 0) {
      closeUi();
      return;
    }
    window.setTimeout(closeUi, delay);
  }

  function holdChoiceUi() {
    _choiceUiHeld = true;
    removeBanner();
    if (typeof removePreferenceCenter === 'function') removePreferenceCenter();
  }

  function restoreChoiceUi() {
    _choiceUiHeld = false;
    showBannerWhenReady();
  }

  function finishChoice(err, closeUi) {
    if (err) {
      restoreChoiceUi();
      return;
    }
    _choiceUiHeld = false;
    if (closeUi) afterConfirmation(closeUi);
  }

  function applyAssignedAbTest(data) {
    _abVariantId = null;
    if (!data || !data.bannerConfig || !data.abTest || !data.abTest.enabled) return data;
    var variants = data.abTest.variants;
    if (!variants || variants.length < 2) return data;
    var storeKey = 'cmp_ab_' + SITE_KEY;
    var id = null;
    var i;
    var selected = null;
    try { id = localStorage.getItem(storeKey) || sessionStorage.getItem(storeKey); } catch (eAb) {}
    for (i = 0; i < variants.length; i++) {
      if (variants[i] && variants[i].id === id) { selected = variants[i]; break; }
    }
    if (!selected) {
      var total = 0;
      for (i = 0; i < variants.length; i++) total += Math.max(0, Number(variants[i].weight) || 0);
      var unit = 0;
      try {
        var seed = SITE_KEY + ':' + (localStorage.getItem('cmp_vid') || '');
        var h = 2166136261;
        for (i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
        unit = (h >>> 0) / 4294967296;
      } catch (eHash) { unit = Math.random(); }
      if (total <= 0) {
        selected = variants[Math.min(variants.length - 1, Math.floor(unit * variants.length))];
      } else {
        var cursor = unit * total;
        for (i = 0; i < variants.length; i++) {
          cursor -= Math.max(0, Number(variants[i].weight) || 0);
          if (cursor <= 0) { selected = variants[i]; break; }
        }
        if (!selected) selected = variants[variants.length - 1];
      }
      try { if (selected && selected.id) { localStorage.setItem(storeKey, selected.id); sessionStorage.setItem(storeKey, selected.id); } } catch (eStore) {}
    }
    if (!selected) return data;
    _abVariantId = selected.id;
    var overrides = selected.overrides || {};
    var keys = ['layout','position','showRejectAll','showAcceptAll','showCustomize','showCloseButton','overlayEnabled','blockPageUntilConsent','title','description'];
    for (i = 0; i < keys.length; i++) {
      if (Object.prototype.hasOwnProperty.call(overrides, keys[i])) {
        data.bannerConfig[keys[i]] = overrides[keys[i]];
      }
    }
    if (data.bannerConfig.layout === 'dialog') data.bannerConfig.position = 'center';
    return data;
  }


  function detectRequestedLang() {
    if (_explicitLang) return _explicitLang;
    var scriptLang = '';
    try {
      var scripts = document.getElementsByTagName('script');
      for (var si = 0; si < scripts.length; si++) {
        var dl = scripts[si].getAttribute('data-lang');
        if (dl) { scriptLang = dl; break; }
      }
    } catch (e1) {}
    var winLang = '';
    try { winLang = window.__CMP_LANG || ''; } catch (e2) {}
    var queryLang = '';
    try {
      if (window.location && window.location.search) {
        queryLang = new URLSearchParams(window.location.search).get('lang') || '';
      }
    } catch (e3) {}
    var navLang = '';
    try { navLang = navigator.language || ''; } catch (e4) {}
    var navList = '';
    try {
      if (navigator.languages && navigator.languages.length) navList = navigator.languages[0] || '';
    } catch (e5) {}
    return scriptLang || winLang || queryLang || navLang || navList || '';
  }

  function configRequestUrl() {
    var configUrl = API_BASE + '/api/sdk/' + SITE_KEY + '/config';
    var qs = [];
    var lang = detectRequestedLang();
    if (lang) qs.push('lang=' + encodeURIComponent(String(lang).slice(0, 35)));
    try {
      var geo = window.__CMP_GEO;
      if (geo && typeof geo === 'object') {
        if (geo.country) qs.push('country=' + encodeURIComponent(String(geo.country).slice(0, 8)));
        if (geo.region) qs.push('region=' + encodeURIComponent(String(geo.region).slice(0, 16)));
      }
    } catch (e) {}
    if (qs.length) configUrl += '?' + qs.join('&');
    return configUrl;
  }

  function rememberPolicyContext(context) {
    _policyContext = context && context.token ? context : null;
    try {
      if (_policyContext) {
        sessionStorage.setItem(POLICY_CONTEXT_KEY, JSON.stringify(_policyContext));
      } else {
        sessionStorage.removeItem(POLICY_CONTEXT_KEY);
      }
    } catch (e) {}
  }

  function presentedPolicyContext(data) {
    if (
      _abVariantId &&
      data &&
      data.policyContexts &&
      data.policyContexts[_abVariantId]
    ) {
      return data.policyContexts[_abVariantId];
    }
    return data && data.policyContext;
  }

  function configRevision(config) {
    if (!config) return '';
    try {
      return JSON.stringify({
        policyVersionId: config.policy && config.policy.versionId,
        bannerConfig: config.bannerConfig,
        purposes: config.purposes,
        vendors: config.vendors,
        trackerRules: config.trackerRules,
        trackerEnforcement: config.trackerEnforcement,
        signals: config.signals,
        negotiation: config.negotiation,
        childProtection: config.childProtection,
        california: config.california
      });
    } catch (e) {
      return String(config.policy && config.policy.versionId || '');
    }
  }

  function noticeDirection() {
    if (_config && _config.locale && _config.locale.direction) return _config.locale.direction;
    var lang = (_config && _config.resolvedLanguage) || '';
    var base = String(lang).split('-')[0].toLowerCase();
    return (base === 'ar' || base === 'he' || base === 'fa' || base === 'ur' || base === 'ks' || base === 'sd') ? 'rtl' : 'ltr';
  }

  function localeBase(lang) {
    var raw = String(lang || 'en').split('-')[0].toLowerCase();
    return raw === 'bodo' ? 'brx' : raw;
  }

  function availableLocales() {
    var supported = (_config && _config.locale && _config.locale.supported) || [];
    var translations = (_config && _config.bannerConfig && _config.bannerConfig.translations) || {};
    var codes = supported.length ? supported.slice() : DEFAULT_BANNER_LOCALES.slice();
    Object.keys(translations).forEach(function(code) {
      if (codes.indexOf(code) === -1) codes.push(code);
    });
    if (codes.indexOf('en') === -1) codes.unshift('en');
    return codes;
  }

  function languageDisplayName(code) {
    var raw = String(code || 'en');
    var base = localeBase(raw);
    if (INDIAN_LOCALE_NATIVE_LABELS[raw]) return INDIAN_LOCALE_NATIVE_LABELS[raw];
    if (INDIAN_LOCALE_NATIVE_LABELS[base]) return INDIAN_LOCALE_NATIVE_LABELS[base];
    try {
      if (typeof Intl !== 'undefined' && Intl.DisplayNames) {
        return new Intl.DisplayNames(['en'], { type: 'language' }).of(base) || raw;
      }
    } catch (eLang) {}
    return raw === 'en' ? 'English' : raw;
  }

  function uiStringsFor(lang) {
    var base = localeBase(lang || (_config && _config.resolvedLanguage) || 'en');
    return INDIAN_UI_STRINGS[base] || DEFAULT_BANNER_UI_STRINGS;
  }

  function applyLocalNotice(lang) {
    if (!_config || !_config.bannerConfig) return;
    var cfg = _config.bannerConfig;
    var base = localeBase(lang);
    var root = _noticeRoot || {};
    var builtin = INDIAN_NOTICE_PACKS[base] || {};
    var operatorPacks = cfg.translations || {};
    var operator = operatorPacks[lang] || operatorPacks[base] || {};
    var fields = [
      'title', 'description', 'acceptAllLabel', 'rejectAllLabel', 'customizeLabel',
      'savePreferencesLabel', 'privacyPolicyText', 'closeLabel', 'preferenceCenterTitle',
      'preferenceCenterDescription', 'purposesHeading', 'vendorsHeading', 'requiredLabel'
    ];
    fields.forEach(function(field) {
      if (operator[field]) {
        cfg[field] = operator[field];
        return;
      }
      var rootVal = root[field] || DEFAULT_NOTICE_STRINGS[field];
      if (builtin[field] && (!rootVal || rootVal === DEFAULT_NOTICE_STRINGS[field])) {
        cfg[field] = builtin[field];
        return;
      }
      cfg[field] = rootVal || DEFAULT_NOTICE_STRINGS[field];
    });
    _config.resolvedLanguage = lang || base;
    if (_config.locale) {
      _config.locale.resolved = _config.resolvedLanguage;
      _config.locale.direction = noticeDirection();
    }
  }

  function googleDefaultState() {
    return {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
      functionality_storage: 'denied',
      personalization_storage: 'denied',
      security_storage: 'granted'
    };
  }

  function ensureGtag() {
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function(){ window.dataLayer.push(arguments); };
    }
  }

  function initExternalSignals() {
    if (!_config || !_config.signals) return;
    var google = _config.signals.googleConsentMode;
    if (google && google.enabled) {
      ensureGtag();
      var def = googleDefaultState();
      def.wait_for_update = google.waitForUpdateMs || 500;
      window.gtag('consent', 'default', def);
      if (google.adsDataRedaction) window.gtag('set', 'ads_data_redaction', true);
      if (google.urlPassthrough) window.gtag('set', 'url_passthrough', true);
    }
    installIabApis();
  }

  function tcfData(eventStatus) {
    var cfg = (_config && _config.signals && _config.signals.iabTcf) || {};
    var pc = {}, vc = {};
    ((_config && _config.purposes) || []).forEach(function(p) {
      if (p.iabTcfPurposeId) pc[p.iabTcfPurposeId] = !!(_decisions.purposes && _decisions.purposes[p.id]);
    });
    ((_config && _config.vendors) || []).forEach(function(v) {
      if (v.iabVendorId) vc[v.iabVendorId] = !!(_decisions.vendors && _decisions.vendors[v.id]);
    });
    return {
      tcString: _tcString, tcfPolicyVersion: 4, cmpId: cfg.cmpId || 0, cmpVersion: cfg.cmpVersion || 0,
      gdprApplies: !!(_config && _config.legalEngine && _config.legalEngine.ux.iabTcf),
      eventStatus: eventStatus || (consentIsServerConfirmed() ? 'useractioncomplete' : 'tcloaded'),
      cmpStatus: cfg.status === 'ready' ? 'loaded' : 'stub',
      listenerId: null, isServiceSpecific: true, useNonStandardStacks: false,
      purpose: { consents: pc, legitimateInterests: {} },
      vendor: { consents: vc, legitimateInterests: {} },
      specialFeatureOptins: {}, publisher: { consents: pc, legitimateInterests: {}, customPurpose: { consents: {}, legitimateInterests: {} }, restrictions: {} }
    };
  }

  function gppPing() {
    var cfg = (_config && _config.signals && _config.signals.iabGpp) || {};
    var sections = cfg.applicableSections || [];
    return {
      gppVersion: '1.1', cmpStatus: cfg.status === 'ready' ? 'loaded' : 'stub',
      cmpDisplayStatus: document.getElementById('__cmp_banner__') || document.getElementById('__cmp_pc__') ? 'visible' : 'hidden',
      signalStatus: _gppString ? 'ready' : 'not ready',
      supportedAPIs: ['2:tcfeuv2','6:uspv1','7:usnat','8:usca','9:usva','10:usco','11:usut','12:usct'],
      sectionList: sections, applicableSections: sections.length ? sections : [-1], gppString: _gppString || ''
    };
  }

  function fireIabEvents(eventName) {
    Object.keys(_iabListeners).forEach(function(id) {
      var entry = _iabListeners[id];
      try {
        if (entry.api === 'tcf') { var data = tcfData(eventName || 'useractioncomplete'); data.listenerId = Number(id); entry.callback(data, true); }
        else entry.callback({ eventName: eventName || 'signalStatus', data: gppPing(), listenerId: Number(id), pingData: gppPing() }, true);
      } catch (eListener) {}
    });
  }

  function installIabApis() {
    var oldTcf = _tcfQueue.slice(); _tcfQueue = [];
    window.__tcfapi = function(command, version, callback, parameter) {
      if (typeof callback !== 'function') return;
      var cfg = (_config && _config.signals && _config.signals.iabTcf) || {};
      if (command === 'ping') return callback({
        gdprApplies: !!(_config && _config.legalEngine && _config.legalEngine.ux.iabTcf),
        cmpLoaded: cfg.status === 'ready', cmpStatus: cfg.status === 'ready' ? 'loaded' : 'stub',
        displayStatus: document.getElementById('__cmp_banner__') ? 'visible' : 'hidden',
        apiVersion: '2.2', cmpId: cfg.cmpId || 0, cmpVersion: cfg.cmpVersion || 0,
        tcfPolicyVersion: 4, gvlVersion: cfg.gvlVersion || 0
      }, true);
      if (command === 'getTCData') return callback(tcfData(), cfg.status === 'ready');
      if (command === 'addEventListener') {
        var id = _iabListenerSeq++; _iabListeners[id] = { api: 'tcf', callback: callback };
        var data = tcfData(); data.listenerId = id; return callback(data, true);
      }
      if (command === 'removeEventListener') {
        var removed = !!_iabListeners[parameter]; delete _iabListeners[parameter]; return callback(removed, removed);
      }
      if (command === 'getVendorList') {
        if (!cfg.gvlVersion) return callback(null, false);
        fetch(API_BASE + '/api/sdk/gvl', { cache: 'force-cache' })
          .then(function(response) { if (!response.ok) throw new Error('GVL unavailable'); return response.json(); })
          .then(function(gvl) { callback(gvl, true); })
          .catch(function() { callback(null, false); });
        return;
      }
      callback(null, false);
    };
    oldTcf.forEach(function(args) { window.__tcfapi.apply(window, args); });

    var oldGpp = _gppQueue.slice(); _gppQueue = [];
    window.__gpp = function(command, callback, parameter) {
      var result = null, success = true, ping = gppPing();
      var sectionNames = { 2: 'tcfeuv2', 6: 'uspv1', 7: 'usnat', 8: 'usca', 9: 'usva', 10: 'usco', 11: 'usut', 12: 'usct' };
      if (command === 'ping') result = ping;
      else if (command === 'getGPPData') result = { gppString: _gppString || '', applicableSections: ping.applicableSections, parsedSections: _gppSections };
      else if (command === 'getGPPString') result = _gppString || '';
      else if (command === 'getApplicableSections' || command === 'listSections') result = ping.sectionList.slice();
      else if (command === 'hasSection') {
        var hasName = sectionNames[Number(parameter)] || String(parameter || '').toLowerCase();
        result = ping.sectionList.indexOf(Number(parameter)) !== -1 || !!_gppSections[hasName];
      }
      else if (command === 'getSection') {
        var requestedName = sectionNames[Number(parameter)] || parameter;
        result = _gppSections[requestedName] || null;
      }
      else if (command === 'getField' || command === 'getFieldValue') {
        var fieldPath = String(parameter || '').split('.');
        var section = _gppSections[fieldPath.shift()] || {};
        result = fieldPath.reduce(function(value, key) { return value == null ? null : value[key]; }, section);
      }
      else if (command === 'addEventListener') {
        var id = _iabListenerSeq++; _iabListeners[id] = { api: 'gpp', callback: callback };
        result = { eventName: 'listenerRegistered', listenerId: id, data: ping, pingData: ping };
      } else if (command === 'removeEventListener') {
        result = !!_iabListeners[parameter]; delete _iabListeners[parameter];
      } else success = false;
      if (typeof callback === 'function') callback(result, success);
      return result;
    };
    window.__gpp.queue = _gppQueue;
    oldGpp.forEach(function(args) { window.__gpp.apply(window, args); });
  }

  function publishExternalSignals() {
    if (!_config || !_config.signals) return;
    var google = _config.signals.googleConsentMode;
    if (google && google.enabled) {
      ensureGtag();
      var state = googleDefaultState();
      var map = google.purposeSignals || {};
      var purposes = _config.purposes || [];
      purposes.forEach(function(p) {
        var granted = !!(p.isRequired || (_decisions.purposes && _decisions.purposes[p.id]));
        if (!granted) return;
        var family = purposeKeyFamily(p.key);
        var signals = map[p.key] || (family && map[family]) || [];
        signals.forEach(function(signal) { state[signal] = 'granted'; });
      });
      state.security_storage = 'granted';
      window.gtag('consent', 'update', state);
    }
    window.dispatchEvent(new CustomEvent('cmp:signals', {
      detail: {
        consentId: _consentId,
        decisions: _decisions,
        googleConsentMode: google && google.enabled ? true : false,
        iabTcf: !!( _config.signals.iabTcf && _config.signals.iabTcf.enabled),
        iabGpp: !!( _config.signals.iabGpp && _config.signals.iabGpp.enabled)
      }
    }));
  }

  function domainMatches(src, blockedDomain) {
    try {
      var host = (new URL(src)).hostname.toLowerCase();
      var d = blockedDomain.toLowerCase();
      return host === d || host.slice(-d.length - 1) === ('.' + d);
    } catch(e) {
      return src.toLowerCase().indexOf(blockedDomain.toLowerCase()) !== -1;
    }
  }

  function purposeKeyFamily(key) {
    var normalized = String(key || '').trim().toLowerCase();
    return PURPOSE_KEY_FAMILIES[normalized] || null;
  }

  function resolvePurposeForTrackerKey(purposeKey) {
    var key = String(purposeKey || '').trim();
    if (!key || !_config) return null;
    var purposes = _config.purposes || [];
    var i;
    for (i = 0; i < purposes.length; i++) {
      if (purposes[i].key === key || String(purposes[i].key).toLowerCase() === key.toLowerCase()) {
        return purposes[i];
      }
    }
    var family = purposeKeyFamily(key);
    if (!family || family === 'essential') return null;
    for (i = 0; i < purposes.length; i++) {
      if (!purposes[i].isRequired && purposeKeyFamily(purposes[i].key) === family) {
        return purposes[i];
      }
    }
    return null;
  }

  function bindTrackerRule(rule) {
    if (!rule) return rule;
    if (rule.purposeId) {
      var mapped = ((_config && _config.purposes) || []).find
        ? ((_config && _config.purposes) || []).filter(function(p) { return p.id === rule.purposeId; })[0]
        : null;
      if (mapped) {
        var boundMapped = {};
        for (var mappedKey in rule) boundMapped[mappedKey] = rule[mappedKey];
        boundMapped.purposeKey = mapped.key;
        return boundMapped;
      }
      return rule;
    }
    if (rule.isEssential) return rule;
    var resolved = resolvePurposeForTrackerKey(rule.purposeKey);
    if (!resolved) return rule;
    var bound = {};
    for (var ruleKey in rule) bound[ruleKey] = rule[ruleKey];
    bound.purposeId = resolved.id;
    bound.purposeKey = resolved.key;
    return bound;
  }

  function allTrackerRules() {
    var configured = (_config && _config.trackerRules) || [];
    var rules = configured.map(bindTrackerRule);
    var seen = {};
    rules.forEach(function(rule) {
      if (rule.id) seen[rule.id] = true;
      if (rule.domain) seen[String(rule.domain).toLowerCase()] = true;
    });
    BUILTIN_TRACKER_CATALOG.forEach(function(rule) {
      if (seen[rule.id] || (rule.domain && seen[String(rule.domain).toLowerCase()])) return;
      rules.push(bindTrackerRule(rule));
    });
    return rules;
  }

  function unknownTrackerBehavior() {
    if (!_config) return 'BLOCK';
    var value = _config.trackerEnforcement &&
      _config.trackerEnforcement.unknownTrackerBehavior;
    return value === 'ALLOW' || value === 'WARN' ? value : 'BLOCK';
  }

  function purposeGrantedByKey(key) {
    if (!key || !consentIsServerConfirmed() || !_config) return false;
    var purposes = _config.purposes || [];
    var i;
    for (i = 0; i < purposes.length; i++) {
      if (
        purposes[i].key === key &&
        _decisions.purposes &&
        _decisions.purposes[purposes[i].id] === true
      ) return true;
    }
    var family = purposeKeyFamily(key);
    if (!family) return false;
    for (i = 0; i < purposes.length; i++) {
      if (
        purposeKeyFamily(purposes[i].key) === family &&
        _decisions.purposes &&
        _decisions.purposes[purposes[i].id] === true
      ) return true;
    }
    return false;
  }

  function childProtectionState() {
    return (_config && _config.childProtection) || {};
  }

  function childRestrictedProcessingAllowed() {
    var child = childProtectionState();
    if (!child.enabled) return true;
    return child.restrictedProcessingAllowed === true;
  }

  function purposeKeyIsChildRestricted(purposeKey) {
    var child = childProtectionState();
    var key = String(purposeKey || '').trim().toLowerCase();
    var keys = child.restrictedPurposeKeys || [];
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i]).toLowerCase() === key) return true;
    }
    return false;
  }

  function purposeIsChildRestricted(purpose) {
    if (!purpose || purpose.isRequired) return false;
    return purposeKeyIsChildRestricted(purpose.key);
  }

  function applyChildRestrictions() {
    var child = childProtectionState();
    _decisions.childRestrictedPurposeIds = [];
    if (!_config || !_config.purposes) return;
    if (childRestrictedProcessingAllowed()) return;
    for (var i = 0; i < _config.purposes.length; i++) {
      var purpose = _config.purposes[i];
      if (!purposeIsChildRestricted(purpose)) continue;
      _decisions.purposes[purpose.id] = false;
      _decisions.childRestrictedPurposeIds.push(purpose.id);
    }
  }

  function childNoticeText() {
    var child = childProtectionState();
    if (!child.enabled) return '';
    if (child.notice) return child.notice;
    if (child.ageStatus === 'unknown' || child.ageStatus === 'expired') {
      return 'Some optional features require age verification.';
    }
    if (child.guardianRequired && child.guardianStatus !== 'verified') {
      return 'A parent or guardian must approve these optional features.';
    }
    return '';
  }

  function navigatorGpc() {
    try {
      return window.navigator && window.navigator.globalPrivacyControl === true;
    } catch (e) {
      return false;
    }
  }

  function californiaEnabled() {
    return !!( _config && _config.california && _config.california.enabled );
  }

  function persistCalifornia(state) {
    _california = state || null;
    try {
      if (_california) localStorage.setItem(CA_OPT_OUT_KEY, JSON.stringify(_california));
      else localStorage.removeItem(CA_OPT_OUT_KEY);
    } catch (e) {}
  }

  function loadStoredCalifornia() {
    try {
      var raw = localStorage.getItem(CA_OPT_OUT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function californiaBlocksRule(rule) {
    var ca = _california;
    if (!ca || ca.applicable === false) {
      if (californiaEnabled() && (navigatorGpc() || (_config.california && _config.california.gpcRecognized))) {
        ca = { applicable: true, saleOptOut: true, shareOptOut: true, sensitivePiLimit: !!(_config.california && _config.california.limitSensitivePiEnabled) };
      } else {
        return false;
      }
    }
    if (ca.saleOptOut && rule.ccpaSale === 'applicable') return true;
    if (ca.shareOptOut && rule.ccpaShare === 'applicable') return true;
    if (ca.sensitivePiLimit && rule.ccpaSensitivePi === 'applicable') return true;
    return false;
  }

  function syncCaliforniaOptOut(extra, callback) {
    extra = extra || {};
    if (!californiaEnabled()) {
      persistCalifornia(null);
      if (callback) callback(null);
      return;
    }
    var payload = {
      consentId: _consentId || extra.consentId || undefined,
      gpc: navigatorGpc() ? true : undefined,
      doNotSell: extra.doNotSell,
      doNotShare: extra.doNotShare,
      limitSensitive: extra.limitSensitive,
      withdrawn: extra.withdrawn === true
    };
    fetch(API_BASE + '/api/sdk/' + encodeURIComponent(SITE_KEY) + '/opt-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store'
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data && data.success && data.california) persistCalifornia(data.california);
        applyTrackerEnforcement();
        if (callback) callback(data && data.california);
      })
      .catch(function() {
        if (navigatorGpc() || (_config.california && _config.california.gpcRecognized)) {
          persistCalifornia({
            applicable: true,
            state: 'gpc_opted_out',
            source: 'gpc',
            gpcRecognized: true,
            saleOptOut: true,
            shareOptOut: true,
            sensitivePiLimit: !!(_config.california && _config.california.limitSensitivePiEnabled),
            ui: { gpcDetected: true, optOutActive: true, managedByBrowserSignal: true, manualOptOutActive: false, label: 'Opt-out managed by browser privacy signal' }
          });
        }
        applyTrackerEnforcement();
        if (callback) callback(_california);
      });
  }

  function isBlocked(rule) {
    if (rule.status !== 'active') return false;
    if (californiaBlocksRule(rule)) return true;
    if (rule.isEssential) return false;
    if (!consentIsServerConfirmed()) return true;
    if (window.childMode === true) {
      // Client childMode is never a security boundary.
    }
    if (rule.purposeId && _decisions.childRestrictedPurposeIds && _decisions.childRestrictedPurposeIds.indexOf(rule.purposeId) !== -1) {
      return true;
    }
    if (!childRestrictedProcessingAllowed() && purposeKeyIsChildRestricted(rule.purposeKey)) {
      return true;
    }
    if (rule.purposeId) {
      if (!_decisions.purposes || !_decisions.purposes[rule.purposeId]) return true;
    } else if (rule.purposeKey) {
      if (!purposeGrantedByKey(rule.purposeKey)) return true;
    }
    if (rule.vendorId) {
      if (!_decisions.vendors || !_decisions.vendors[rule.vendorId]) return true;
    }
    if (!rule.purposeId && !rule.purposeKey && !rule.vendorId) return true;
    return false;
  }

  function valueMatchesPattern(value, pattern) {
    if (!value || !pattern) return false;
    var normalizedValue = String(value).toLowerCase();
    var normalizedPattern = String(pattern).toLowerCase();
    if (normalizedPattern.indexOf('*') === -1) {
      return normalizedValue === normalizedPattern ||
        normalizedValue.indexOf(normalizedPattern) !== -1;
    }
    var parts = normalizedPattern.split('*');
    var cursor = 0;
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i]) continue;
      var index = normalizedValue.indexOf(parts[i], cursor);
      if (index === -1) return false;
      cursor = index + parts[i].length;
    }
    return true;
  }

  function matchesAny(value, patterns) {
    for (var i = 0; i < (patterns || []).length; i++) {
      if (valueMatchesPattern(value, patterns[i])) return true;
    }
    return false;
  }

  function ruleMatchesResource(rule, url, kind) {
    if (!rule || rule.status !== 'active' || !url) return false;
    if (rule.domain && domainMatches(url, rule.domain)) return true;
    if (rule.identifier && valueMatchesPattern(url, rule.identifier)) return true;
    if (kind === 'script' && matchesAny(url, rule.scriptUrlPatterns)) return true;
    if (kind === 'iframe' && matchesAny(url, rule.iframeUrlPatterns)) return true;
    if (kind === 'pixel' && matchesAny(url, rule.pixelUrlPatterns)) return true;
    return false;
  }

  function findTrackerRule(url, kind) {
    var rules = allTrackerRules();
    for (var i = 0; i < rules.length; i++) {
      if (ruleMatchesResource(rules[i], url, kind)) return rules[i];
    }
    return null;
  }

  function safeResourceLabel(url) {
    try {
      var parsed = new URL(url, window.location && window.location.href);
      return (parsed.origin + parsed.pathname).slice(0, 300);
    } catch (e) {
      return String(url || '').slice(0, 120);
    }
  }

  function enforcementDebugEnabled() {
    return !!(
      window.__CMP_DEBUG ||
      (_config && _config.trackerEnforcement && _config.trackerEnforcement.debugMode)
    );
  }

  function recordEnforcement(action, rule, kind, url, reason) {
    if (!enforcementDebugEnabled()) return;
    var entry = {
      action: action,
      tracker: rule && rule.name || 'Unknown tracker',
      vendorId: rule && rule.vendorId || null,
      purpose: rule && rule.purposeKey || rule && rule.purposeId || null,
      resourceType: kind,
      resource: safeResourceLabel(url),
      reason: reason,
      consentState: _consentState,
      at: new Date().toISOString()
    };
    window.__CMP_ENFORCEMENT_LOG__ = window.__CMP_ENFORCEMENT_LOG__ || [];
    window.__CMP_ENFORCEMENT_LOG__.push(entry);
    if (window.__CMP_ENFORCEMENT_LOG__.length > 100) {
      window.__CMP_ENFORCEMENT_LOG__.shift();
    }
    if (window.console && typeof window.console.debug === 'function') {
      window.console.debug('[CMP enforcement]', entry);
    }
  }

  function isCmpInternalResource(url) {
    if (!url) return false;
    try {
      var candidate = new URL(url, window.location && window.location.href);
      var api = new URL(API_BASE, window.location && window.location.href);
      return candidate.origin === api.origin &&
        candidate.pathname.indexOf('/api/') === 0;
    } catch (e) {
      return false;
    }
  }

  function isThirdPartyResource(url) {
    try {
      var candidate = new URL(url, window.location && window.location.href);
      return !!(
        candidate.hostname &&
        window.location &&
        candidate.hostname !== window.location.hostname
      );
    } catch (e) {
      return false;
    }
  }

  function nodeResource(node) {
    if (!node || !node.tagName) return null;
    var tag = String(node.tagName).toLowerCase();
    if (tag !== 'script' && tag !== 'iframe' && tag !== 'img') return null;
    if (tag === 'iframe' && (node.name === '__tcfapiLocator' || node.getAttribute('name') === '__tcfapiLocator')) {
      return null;
    }
    var src = node.__cmpOriginalSrc ||
      (node.getAttribute && node.getAttribute('src')) ||
      node.src ||
      '';
    return { kind: tag === 'img' ? 'pixel' : tag, url: String(src || '') };
  }

  function looksLikeTrackingPixel(node, url) {
    var width = Number(node && (node.getAttribute && node.getAttribute('width') || node.width));
    var height = Number(node && (node.getAttribute && node.getAttribute('height') || node.height));
    if ((width > 0 && width <= 2) || (height > 0 && height <= 2)) return true;
    return /(?:pixel|track|collect|beacon|conversion|analytics)/i.test(String(url || ''));
  }

  function decisionForNode(node) {
    var resource = nodeResource(node);
    if (!resource) return { action: 'ignore', resource: null, rule: null, reason: 'not-managed' };
    if (isCmpInternalResource(resource.url)) {
      return { action: 'allow', resource: resource, rule: null, reason: 'cmp-internal' };
    }
    var purposeKey = node.getAttribute && node.getAttribute('data-cmp-purpose');
    if (purposeKey) {
      var declaredRule = {
        id: 'declared-' + purposeKey,
        name: node.getAttribute('data-cmp-tracker') || 'Declared ' + resource.kind,
        purposeKey: purposeKey,
        purposeId: null,
        vendorId: null,
        isEssential: false,
        status: 'active'
      };
      return {
        action: isBlocked(declaredRule) ? 'block' : 'allow',
        resource: resource,
        rule: declaredRule,
        reason: isBlocked(declaredRule) ? 'purpose-not-confirmed' : 'confirmed-purpose'
      };
    }
    var rule = findTrackerRule(resource.url, resource.kind);
    if (rule) {
      return {
        action: isBlocked(rule) ? 'block' : 'allow',
        resource: resource,
        rule: rule,
        reason: isBlocked(rule) ? 'consent-not-granted' : 'confirmed-consent'
      };
    }
    if (!resource.url || !isThirdPartyResource(resource.url)) {
      return { action: 'allow', resource: resource, rule: null, reason: 'application-resource' };
    }
    if (resource.kind === 'pixel' && !looksLikeTrackingPixel(node, resource.url)) {
      return { action: 'allow', resource: resource, rule: null, reason: 'non-tracking-image' };
    }
    var behavior = unknownTrackerBehavior();
    return {
      action: behavior === 'BLOCK' ? 'block' : 'allow',
      resource: resource,
      rule: null,
      reason: behavior === 'BLOCK' ? 'unknown-tracker-fail-closed' : 'unknown-tracker-' + behavior.toLowerCase()
    };
  }

  function rememberQuarantined(node) {
    if (_quarantinedNodes.indexOf(node) === -1) _quarantinedNodes.push(node);
  }

  function quarantineNode(node, decision) {
    if (!node || !decision || !decision.resource) return;
    var resource = decision.resource;
    if (node.__cmpQuarantined) return;
    _enforcementMutating = true;
    try {
      node.__cmpQuarantined = true;
      node.__cmpOriginalSrc = resource.url;
      node.__cmpOriginalType = node.getAttribute && node.getAttribute('type');
      if (
        node.__cmpOriginalType === 'text/plain' &&
        node.getAttribute &&
        node.getAttribute('data-cmp-purpose')
      ) {
        node.__cmpOriginalType = 'text/javascript';
      }
      if (node.setAttribute) {
        node.setAttribute('data-cmp-blocked', 'true');
        node.setAttribute('data-cmp-block-reason', decision.reason);
      }
      if (resource.kind === 'script') {
        if (node.removeAttribute) node.removeAttribute('src');
        if (node.setAttribute) node.setAttribute('type', 'text/plain');
      } else if (resource.kind === 'iframe') {
        if (node.setAttribute) {
          node.setAttribute('src', 'about:blank');
          node.setAttribute('title', node.getAttribute('title') || 'Content blocked until consent');
        }
      } else if (resource.kind === 'pixel') {
        if (node.setAttribute) {
          node.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=');
        }
      }
      rememberQuarantined(node);
      _enforcementMetrics.blocked += 1;
      recordEnforcement('BLOCKED', decision.rule, resource.kind, resource.url, decision.reason);
    } finally {
      _enforcementMutating = false;
    }
  }

  function restoreQuarantinedNode(node, decision) {
    if (!node || !node.__cmpQuarantined || !decision || decision.action !== 'allow') return;
    var originalSrc = node.__cmpOriginalSrc || '';
    var kind = decision.resource && decision.resource.kind;
    _enforcementMutating = true;
    try {
      node.__cmpQuarantined = false;
      if (node.removeAttribute) {
        node.removeAttribute('data-cmp-blocked');
        node.removeAttribute('data-cmp-block-reason');
      }
      if (kind === 'script') {
        var parent = node.parentNode;
        if (parent) {
          var clone = document.createElement('script');
          Array.prototype.slice.call(node.attributes || []).forEach(function(attr) {
            if (attr.name !== 'type' && attr.name !== 'src') clone.setAttribute(attr.name, attr.value);
          });
          if (node.__cmpOriginalType) clone.setAttribute('type', node.__cmpOriginalType);
          if (originalSrc) clone.setAttribute('src', originalSrc);
          if (node.textContent) clone.textContent = node.textContent;
          parent.replaceChild(clone, node);
        }
      } else if (originalSrc && node.setAttribute) {
        node.setAttribute('src', originalSrc);
      }
      _enforcementMetrics.allowed += 1;
      recordEnforcement('ALLOWED', decision.rule, kind, originalSrc, decision.reason);
    } finally {
      _enforcementMutating = false;
    }
  }

  function inspectEnforcementNode(node) {
    if (!node || _enforcementMutating) return;
    var started = window.performance && window.performance.now ? window.performance.now() : Date.now();
    _enforcementMetrics.inspected += 1;
    var decision = decisionForNode(node);
    if (decision.action === 'block') quarantineNode(node, decision);
    else if (decision.action === 'allow') {
      if (node.__cmpQuarantined) restoreQuarantinedNode(node, decision);
      else if (decision.resource) {
        _enforcementMetrics.allowed += 1;
        recordEnforcement('ALLOWED', decision.rule, decision.resource.kind, decision.resource.url, decision.reason);
      }
    }
    var ended = window.performance && window.performance.now ? window.performance.now() : Date.now();
    _enforcementMetrics.inspectionMs += Math.max(0, ended - started);
  }

  function inspectNodeTree(node) {
    inspectEnforcementNode(node);
    if (!node || typeof node.querySelectorAll !== 'function') return;
    var descendants = node.querySelectorAll('script,iframe,img');
    for (var i = 0; i < descendants.length; i++) inspectEnforcementNode(descendants[i]);
  }

  function patchInsertionTarget(target) {
    if (!target || target.__cmpInsertionPatched || typeof target.appendChild !== 'function') return;
    target.__cmpInsertionPatched = true;
    var nativeAppend = target.appendChild;
    target.appendChild = function(node) {
      inspectNodeTree(node);
      return nativeAppend.call(this, node);
    };
    if (typeof target.insertBefore === 'function') {
      var nativeInsertBefore = target.insertBefore;
      target.insertBefore = function(node, reference) {
        inspectNodeTree(node);
        return nativeInsertBefore.call(this, node, reference);
      };
    }
    if (typeof target.replaceChild === 'function') {
      var nativeReplaceChild = target.replaceChild;
      target.replaceChild = function(node, previous) {
        inspectNodeTree(node);
        return nativeReplaceChild.call(this, node, previous);
      };
    }
  }

  function patchKnownStorage(storage, storageKind) {
    if (!storage || storage.__cmpStoragePatched || typeof storage.setItem !== 'function') return;
    try {
      var nativeSetItem = storage.setItem.bind(storage);
      storage.setItem = function(key, value) {
        var stringKey = String(key);
        if (
          stringKey.indexOf('cmp_') === 0 ||
          stringKey.indexOf('__cmp_') === 0
        ) return nativeSetItem(key, value);
        var rules = allTrackerRules();
        for (var i = 0; i < rules.length; i++) {
          var patterns = storageKind === 'localStorage'
            ? rules[i].localStorageKeys
            : rules[i].sessionStorageKeys;
          if (matchesAny(stringKey, patterns) && isBlocked(rules[i])) {
            recordEnforcement('BLOCKED', rules[i], storageKind, stringKey, 'storage-consent-not-granted');
            return;
          }
        }
        return nativeSetItem(key, value);
      };
      storage.__cmpStoragePatched = true;
    } catch (eStoragePatch) {
      log('Storage interception unavailable');
    }
  }

  function shouldBlockNetworkUrl(url, kind) {
    if (isCmpInternalResource(url)) return false;
    var rule = findTrackerRule(url, kind === 'fetch' ? 'pixel' : kind);
    if (rule) return isBlocked(rule);
    if (!isThirdPartyResource(url)) return false;
    return unknownTrackerBehavior() === 'BLOCK';
  }

  function installNetworkGuard() {
    if (window.__cmpNetworkPatched) return;
    window.__cmpNetworkPatched = true;
    if (typeof window.fetch === 'function') {
      var nativeFetch = window.fetch.bind(window);
      window.fetch = function(input, init) {
        var url = '';
        try {
          url = typeof input === 'string' ? input : (input && input.url) || '';
        } catch (eUrl) {}
        if (shouldBlockNetworkUrl(url, 'fetch')) {
          recordEnforcement('BLOCKED', findTrackerRule(url, 'pixel'), 'fetch', url, 'network-consent-not-granted');
          return Promise.reject(new TypeError('CMP blocked fetch'));
        }
        return nativeFetch(input, init);
      };
    }
    if (window.XMLHttpRequest && window.XMLHttpRequest.prototype) {
      var nativeOpen = window.XMLHttpRequest.prototype.open;
      window.XMLHttpRequest.prototype.open = function(method, url) {
        this.__cmpUrl = String(url || '');
        if (shouldBlockNetworkUrl(this.__cmpUrl, 'fetch')) {
          recordEnforcement('BLOCKED', findTrackerRule(this.__cmpUrl, 'pixel'), 'xhr', this.__cmpUrl, 'network-consent-not-granted');
          this.__cmpBlocked = true;
        }
        return nativeOpen.apply(this, arguments);
      };
      var nativeSend = window.XMLHttpRequest.prototype.send;
      window.XMLHttpRequest.prototype.send = function() {
        if (this.__cmpBlocked) {
          try { this.abort(); } catch (eAbort) {}
          return;
        }
        return nativeSend.apply(this, arguments);
      };
    }
    if (typeof navigator !== 'undefined' && navigator && typeof navigator.sendBeacon === 'function') {
      var nativeBeacon = navigator.sendBeacon.bind(navigator);
      navigator.sendBeacon = function(url, data) {
        if (shouldBlockNetworkUrl(String(url || ''), 'beacon')) {
          recordEnforcement('BLOCKED', findTrackerRule(String(url || ''), 'pixel'), 'beacon', String(url || ''), 'network-consent-not-granted');
          return false;
        }
        return nativeBeacon(url, data);
      };
    }
  }

  function installCookieGuard() {
    try {
      // Walk the prototype chain. In Chromium/Electron, cookie accessors often
      // live on Document.prototype while Object.getPrototypeOf(document) is an
      // intermediate HTMLDocument that has no own 'cookie' descriptor.
      var owner = document;
      var descriptor = null;
      while (owner) {
        descriptor = Object.getOwnPropertyDescriptor(owner, 'cookie');
        if (descriptor && descriptor.get && descriptor.set) break;
        owner = Object.getPrototypeOf(owner);
        descriptor = null;
      }
      if (!descriptor || !descriptor.get || !descriptor.set) return;
      Object.defineProperty(document, 'cookie', {
        configurable: true,
        get: function() { return descriptor.get.call(document); },
        set: function(value) {
          var serialized = String(value || '');
          var name = serialized.split('=')[0].trim();
          var deleting = /max-age\s*=\s*0/i.test(serialized) ||
            /expires\s*=\s*thu,\s*01\s+jan\s+1970/i.test(serialized);
          if (deleting) {
            descriptor.set.call(document, value);
            return value;
          }
          var rules = allTrackerRules();
          for (var i = 0; i < rules.length; i++) {
            if (matchesAny(name, rules[i].cookieNames) && isBlocked(rules[i])) {
              recordEnforcement('BLOCKED', rules[i], 'cookie', name, 'cookie-consent-not-granted');
              return value;
            }
          }
          descriptor.set.call(document, value);
          return value;
        }
      });
    } catch (eCookieGuard) {
      log('Cookie setter interception unavailable');
    }
  }

  function installEnforcementBootstrap() {
    var started = window.performance && window.performance.now ? window.performance.now() : Date.now();
    patchInsertionTarget(document.head);
    patchInsertionTarget(document.body);
    patchInsertionTarget(document.documentElement);
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        patchInsertionTarget(document.body);
      });
    }
    patchKnownStorage(window.localStorage, 'localStorage');
    patchKnownStorage(window.sessionStorage, 'sessionStorage');
    installCookieGuard();
    installNetworkGuard();
    if (window.MutationObserver) {
      _enforcementObserver = new window.MutationObserver(function(mutations) {
        if (_enforcementMutating) return;
        _enforcementMetrics.observerBatches += 1;
        for (var i = 0; i < mutations.length; i++) {
          var added = mutations[i].addedNodes || [];
          for (var j = 0; j < added.length; j++) inspectNodeTree(added[j]);
        }
      });
      try {
        _enforcementObserver.observe(document.documentElement, { childList: true, subtree: true });
      } catch (eObserver) {}
    }
    var ended = window.performance && window.performance.now ? window.performance.now() : Date.now();
    _enforcementMetrics.bootstrapMs = Math.max(0, ended - started);
  }

  function deleteAccessibleCookie(name) {
    if (!name) return;
    var expires = '=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
    try { document.cookie = name + expires; } catch (eCookie) {}
    try {
      var host = window.location && window.location.hostname;
      if (host) document.cookie = name + expires + '; domain=.' + host;
    } catch (eDomainCookie) {}
  }

  function clearKnownTrackerData() {
    var rules = allTrackerRules();
    var visibleCookies = [];
    try {
      visibleCookies = String(document.cookie || '').split(';').map(function(row) {
        return row.split('=')[0].trim();
      }).filter(Boolean);
    } catch (eReadCookies) {}
    rules.forEach(function(rule) {
      if (!isBlocked(rule)) return;
      visibleCookies.forEach(function(name) {
        if (matchesAny(name, rule.cookieNames)) {
          deleteAccessibleCookie(name);
          recordEnforcement('BLOCKED', rule, 'cookie', name, 'cookie-cleanup');
        }
      });
      (rule.localStorageKeys || []).forEach(function(pattern) {
        try {
          for (var i = window.localStorage.length - 1; i >= 0; i--) {
            var key = window.localStorage.key(i);
            if (matchesAny(key, [pattern])) window.localStorage.removeItem(key);
          }
        } catch (eLocalCleanup) {}
      });
      (rule.sessionStorageKeys || []).forEach(function(pattern) {
        try {
          for (var i = window.sessionStorage.length - 1; i >= 0; i--) {
            var key = window.sessionStorage.key(i);
            if (matchesAny(key, [pattern])) window.sessionStorage.removeItem(key);
          }
        } catch (eSessionCleanup) {}
      });
      (rule.indexedDbNames || []).forEach(function(name) {
        try {
          if (window.indexedDB && typeof window.indexedDB.deleteDatabase === 'function') {
            window.indexedDB.deleteDatabase(name);
          }
        } catch (eIndexedDbCleanup) {}
      });
    });
  }

  function applyTrackerEnforcement() {
    enforceScriptTags();
    var nodes = document.querySelectorAll('script,iframe,img');
    for (var i = 0; i < nodes.length; i++) inspectEnforcementNode(nodes[i]);
    for (var j = 0; j < _quarantinedNodes.length; j++) {
      inspectEnforcementNode(_quarantinedNodes[j]);
    }
    clearKnownTrackerData();
  }

  function buildBlockedDomains() {
    var domains = [];
    var identifiers = [];
    if (!_config || !_config.trackerRules) return { domains: domains, identifiers: identifiers };
    _config.trackerRules.forEach(function(rule) {
      if (isBlocked(rule)) {
        if (rule.domain)     domains.push(rule.domain.toLowerCase());
        if (rule.identifier) identifiers.push(rule.identifier);
      }
    });
    return { domains: domains, identifiers: identifiers };
  }

  function enforceScriptTags() {
    var tags = document.querySelectorAll('script[data-cmp-purpose]');
    tags.forEach(function(el) {
      if (el.__cmpQuarantined) {
        inspectEnforcementNode(el);
        return;
      }
      var purposeKey = el.getAttribute('data-cmp-purpose');
      var granted = false;

      granted = purposeGrantedByKey(purposeKey);

      if (granted && el.getAttribute('type') === 'text/plain') {
        el.removeAttribute('type');
        var clone = document.createElement('script');
        Array.prototype.slice.call(el.attributes).forEach(function(attr) {
          clone.setAttribute(attr.name, attr.value);
        });
        if (el.textContent) clone.textContent = el.textContent;
        el.parentNode.replaceChild(clone, el);
        log('Restored script for purpose: ' + purposeKey);
      } else if (!granted && el.getAttribute('type') !== 'text/plain') {
        el.setAttribute('type', 'text/plain');
        log('Paused script for purpose: ' + purposeKey);
      }
    });
  }

  function applyDecisions(decisionsArray) {
    _decisions = { purposes: {}, vendors: {}, childRestrictedPurposeIds: [] };
    if (decisionsArray) {
      decisionsArray.forEach(function(d) {
        if (d.purposeId) _decisions.purposes[d.purposeId] = d.granted;
        if (d.vendorId)  _decisions.vendors[d.vendorId]   = d.granted;
      });
    }
    applyChildRestrictions();
  }

  function storedChoiceIsReject(stored) {
    if (!stored) return false;
    if (stored.choice === 'reject-all') return true;
    var decisions = stored.decisions || [];
    if (!decisions.length) return false;
    var anyGranted = false;
    decisions.forEach(function(d) {
      if (d && d.granted) anyGranted = true;
    });
    return !anyGranted;
  }

  function hasMissingRequiredPurpose(stored, cfg) {
    if (!stored || !cfg || !Array.isArray(cfg.purposes)) return false;
    var grants = {};
    (stored.decisions || []).forEach(function(d) {
      if (d && d.purposeId) grants[d.purposeId] = d.granted === true;
    });
    for (var i = 0; i < cfg.purposes.length; i++) {
      var purpose = cfg.purposes[i];
      if (purpose && purpose.isRequired && grants[purpose.id] !== true) return true;
    }
    return false;
  }

  function shouldReshowBanner(stored, cfg) {
    if (cfg && cfg.showOnEveryVisit) return true;
    // Reject All is a valid recorded decision. Do not reopen the banner
    // merely because optional purposes were denied.
    return hasMissingRequiredPurpose(stored, _config);
  }

  function currentScopeSnapshot(config) {
    return {
      policyVersionId: (config && config.policy && config.policy.versionId) || '',
      purposeIds: ((config && config.purposes) || []).map(function(p) { return p.id; }),
      vendorIds: ((config && config.vendors) || []).map(function(v) { return v.id; })
    };
  }

  function consentScopeChanged(stored, config) {
    if (!stored || !config) return false;
    var current = currentScopeSnapshot(config);
    if (stored.policyVersionId && current.policyVersionId && stored.policyVersionId !== current.policyVersionId) {
      return true;
    }
    var storedPurposes = Array.isArray(stored.purposeIds) ? stored.purposeIds.slice() : [];
    if (!storedPurposes.length) {
      (stored.decisions || []).forEach(function(d) {
        if (d && d.purposeId) storedPurposes.push(d.purposeId);
      });
    }
    var knownP = {};
    storedPurposes.forEach(function(id) { knownP[id] = true; });
    var i;
    if (storedPurposes.length) {
      for (i = 0; i < current.purposeIds.length; i++) {
        if (!knownP[current.purposeIds[i]]) return true;
      }
    }
    // Only compare vendors when this browser has a snapshot from a later SDK
    // save. Older stored consent often has purpose decisions only, which would
    // otherwise look like every vendor was newly added.
    if (Array.isArray(stored.vendorIds)) {
      var knownV = {};
      stored.vendorIds.forEach(function(id) { knownV[id] = true; });
      for (i = 0; i < current.vendorIds.length; i++) {
        if (!knownV[current.vendorIds[i]]) return true;
      }
    }
    return false;
  }

  function rememberAckedScope(stored) {
    _ackedPurposeIds = {};
    _ackedVendorIds = {};
    _hasVendorSnapshot = false;
    if (!stored) return;
    var purposeIds = stored.purposeIds;
    if (!purposeIds) {
      purposeIds = [];
      (stored.decisions || []).forEach(function(d) {
        if (d && d.purposeId) purposeIds.push(d.purposeId);
      });
    }
    var vendorIds = stored.vendorIds;
    _hasVendorSnapshot = Array.isArray(vendorIds);
    if (!vendorIds) {
      vendorIds = [];
      (stored.decisions || []).forEach(function(d) {
        if (d && d.vendorId) vendorIds.push(d.vendorId);
      });
    }
    purposeIds.forEach(function(id) { _ackedPurposeIds[id] = true; });
    vendorIds.forEach(function(id) { _ackedVendorIds[id] = true; });
  }

  function appendNewTag(parent) {
    var tag = document.createElement('span');
    tag.textContent = 'New';
    tag.setAttribute('style',
      'font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;'
      + 'background:rgba(245,158,11,0.18);color:#b45309;'
    );
    parent.appendChild(tag);
  }

  function appendReconsentNotice(parent, compact) {
    if (!_reconsentNotice || !parent) return;
    var note = document.createElement('div');
    note.setAttribute('role', 'status');
    note.textContent = _reconsentNotice;
    note.style.cssText = compact
      ? 'width:100%;margin:0 0 8px 0;padding:8px 10px;border-radius:10px;background:rgba(245,158,11,0.14);color:inherit;font-size:12px;line-height:1.45;font-weight:600;'
      : 'margin:0 0 12px 0;padding:10px 12px;border-radius:12px;background:rgba(245,158,11,0.14);color:inherit;font-size:13px;line-height:1.5;font-weight:600;';
    parent.appendChild(note);
  }

  function cmpMountRoot() {
    return document.body || document.documentElement;
  }

  function showPreferenceCenterWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { renderPreferenceCenter(); });
    } else {
      renderPreferenceCenter();
    }
  }

  function showBannerWhenReady() {
    function paint() {
      renderBanner();
    }
    if (document.body) {
      paint();
      return;
    }
    document.addEventListener('DOMContentLoaded', paint);
    var started = Date.now();
    (function waitBody() {
      if (document.getElementById('__cmp_banner__')) return;
      if (document.body) {
        paint();
        return;
      }
      if (Date.now() - started >= 1000) {
        paint();
        return;
      }
      if (window.requestAnimationFrame) window.requestAnimationFrame(waitBody);
      else window.setTimeout(waitBody, 16);
    })();
  }

  function loadStoredConsent() {
    try {
      var raw    = localStorage.getItem(STORAGE_KEY);
      var expiry = localStorage.getItem(EXPIRY_KEY);
      if (!raw) return null;
      if (expiry && Date.now() > parseInt(expiry, 10)) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(EXPIRY_KEY);
        return null;
      }
      return JSON.parse(raw);
    } catch(e) { return null; }
  }

  function saveConsent(
    consentId,
    decisionsArray,
    expiresAt,
    choice,
    signals,
    confirmedAt,
    submissionId,
    stateVersion
  ) {
    try {
      var revision = Date.parse(confirmedAt || '') || Date.now();
      var incomingStateVersion = Number(stateVersion) || 0;
      var currentRaw = localStorage.getItem(STORAGE_KEY);
      var current = currentRaw ? JSON.parse(currentRaw) : null;
      var currentRevision = current && Number(current.revision) || 0;
      var currentStateVersion = current && Number(current.stateVersion) || 0;
      if (
        current &&
        current.submissionId !== submissionId &&
        (
          currentStateVersion > incomingStateVersion ||
          (
            current.status === 'withdrawn' &&
            currentStateVersion >= incomingStateVersion
          ) ||
          (
            currentStateVersion === incomingStateVersion &&
            currentRevision > revision
          )
        )
      ) {
        log('Ignored stale consent confirmation');
        return false;
      }
      _consentId = consentId;
      applyDecisions(decisionsArray);
      _consentState = stateForConfirmedDecisions(decisionsArray);
      _confirmedRevision = revision;
      _stateVersion = incomingStateVersion;
      var scope = currentScopeSnapshot(_config);
      _tcString = signals && signals.tcString || null;
      _gppString = signals && signals.gppString || null;
      _gppSections = signals && signals.parsedSections || {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        status: 'confirmed',
        serverConfirmed: true,
        consentId: consentId,
        submissionId: submissionId || '',
        revision: revision,
        consentedAt: confirmedAt || new Date().toISOString(),
        expiresAt: expiresAt || null,
        stateVersion: incomingStateVersion,
        decisions: decisionsArray,
        choice: choice || '',
        policyVersionId: scope.policyVersionId,
        purposeIds: scope.purposeIds,
        vendorIds: scope.vendorIds,
        tcString: _tcString,
        gppString: _gppString,
        gppSections: _gppSections
      }));
      _reconsentNotice = '';
      rememberAckedScope({ purposeIds: scope.purposeIds, vendorIds: scope.vendorIds });
      if (expiresAt) {
        localStorage.setItem(EXPIRY_KEY, String(new Date(expiresAt).getTime()));
      }
      applyTrackerEnforcement();
      publishExternalSignals();
      fireIabEvents('useractioncomplete');
      _listeners.forEach(function(fn) { try { fn(getConsent()); } catch(e) {} });
      if (document.getElementById('__cmp_prefs__')) renderCookiePreferencesPanel();
      else syncPreferenceWidget();
      renderSubmissionState('Consent confirmed');
      return true;
    } catch(e) {
      log('Failed to save consent: ' + e);
      blockOptionalProcessing('FAILED', 'Consent could not be confirmed. Please retry.');
      return false;
    }
  }

  function persistUnconfirmedState(state, job, message) {
    blockOptionalProcessing(state, message);
    try {
      var currentRaw = localStorage.getItem(STORAGE_KEY);
      var current = currentRaw ? JSON.parse(currentRaw) : null;
      if (
        current &&
        current.submissionId !== (job && job.submissionId) &&
        Number(current.revision || 0) >= Number(job && job.startedAt || 0) &&
        (current.status === 'confirmed' || current.status === 'withdrawn')
      ) {
        if (current.status === 'withdrawn') {
          _consentId = null;
          blockOptionalProcessing('DENIED', '');
        } else {
          verifyStoredConsent(current);
        }
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        status: state.toLowerCase(),
        serverConfirmed: false,
        consentId: _consentId || '',
        submissionId: job && job.submissionId || '',
        signature: job && job.signature || '',
        choice: job && job.choice || '',
        purposeDecisions: job && job.purposeDecisions || [],
        vendorDecisions: job && job.vendorDecisions || [],
        revision: Date.now(),
        startedAt: job && job.startedAt || Date.now(),
        stateVersion: _stateVersion
      }));
    } catch (ePersist) {
      log('Failed to persist unconfirmed state: ' + ePersist);
    }
  }

  function flushConsentSubmit() {
    if (_submitBusy || !_queuedSubmit || !_config) return;
    if (!_config.websiteId || !_policyContext || !_policyContext.token) return;
    var job = _queuedSubmit;
    _queuedSubmit = null;
    _submitBusy = true;
    persistUnconfirmedState('PENDING', job, 'Submitting… Optional processing remains blocked.');

    var body = {
      websiteId: _config.websiteId,
      consentId: _consentId || undefined,
      expectedStateVersion: _consentId ? _stateVersion : 0,
      submissionId: job.submissionId,
      policyContext: _policyContext,
      language: (_config && _config.resolvedLanguage) || detectRequestedLang() || 'en',
      abVariant: _abVariantId || undefined,
      gpc: navigatorGpc() ? true : undefined,
      submission: {
        choice: job.choice,
        purposeDecisions: job.purposeDecisions || [],
        vendorDecisions: job.vendorDecisions || []
      }
    };
    var controller = null;
    var timeoutId = null;
    try {
      if (window.AbortController) controller = new window.AbortController();
    } catch (eAbort) {}
    var requestedTimeout = Number(window.__CMP_SUBMIT_TIMEOUT_MS);
    var timeoutMs = isFinite(requestedTimeout)
      ? Math.max(250, Math.min(60000, requestedTimeout))
      : 10000;
    if (controller) {
      timeoutId = window.setTimeout(function() { controller.abort(); }, timeoutMs);
    }

    function failedConsentMessage(data) {
      var detail = data && typeof data.message === 'string' ? data.message.trim() : '';
      if (detail) {
        return detail + (detail.indexOf('Optional processing remains blocked') === -1
          ? ' Optional processing remains blocked. Please retry.'
          : '');
      }
      return 'Consent could not be confirmed. Optional processing remains blocked. Please retry.';
    }

    function postConsentRecord() {
      return fetch(API_BASE + '/api/consent/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller ? controller.signal : undefined
      }).then(function(r) {
        return r.json().then(function(data) {
          return { ok: r.ok, status: r.status, data: data };
        });
      });
    }

    function applyConfirmedConsent(data) {
      if (timeoutId) window.clearTimeout(timeoutId);
      _retryJob = null;
      var applied = saveConsent(
        data.consentId,
        data.decisions,
        data.expiresAt,
        job.choice,
        data.signals,
        data.confirmedAt,
        job.submissionId,
        data.stateVersion
      );
      if (data.california) persistCalifornia(data.california);
      if (job.callback) {
        if (applied) job.callback(null, data.consentId);
        else job.callback(new Error('A newer consent state is already active'));
      }
    }

    postConsentRecord()
    .then(function(result) {
      var data = result.data;
      if (result.ok && confirmedResponse(data)) {
        applyConfirmedConsent(data);
        return;
      }
      if (
        !job.contextRetry &&
        data &&
        data.code === 'POLICY_CONTEXT_EXPIRED'
      ) {
        return fetchConfigJson().then(function(next) {
          if (next && next.unchanged) throw new Error(failedConsentMessage(data));
          if (!next || !next.success) throw new Error(failedConsentMessage(data));
          _config = applyAssignedAbTest(next);
          rememberPolicyContext(presentedPolicyContext(next));
          if (!_policyContext || !_policyContext.token) throw new Error(failedConsentMessage(data));
          body.policyContext = _policyContext;
          body.language = (_config && _config.resolvedLanguage) || body.language;
          job.contextRetry = true;
          return postConsentRecord().then(function(retryResult) {
            var retryData = retryResult.data;
            if (!retryResult.ok || !confirmedResponse(retryData)) {
              throw new Error(failedConsentMessage(retryData));
            }
            applyConfirmedConsent(retryData);
          });
        });
      }
      throw new Error(failedConsentMessage(data));
    })
    .catch(function(err) {
      if (timeoutId) window.clearTimeout(timeoutId);
      log('Submit consent failed: ' + err);
      _retryJob = job;
      persistUnconfirmedState(
        'FAILED',
        job,
        err && err.message ? String(err.message) : failedConsentMessage(null)
      );
      if (job.callback) job.callback(new Error('Consent could not be saved. Please retry.'));
    })
    .then(function() {
      _submitBusy = false;
      if (_consentState === 'GRANTED' || _consentState === 'DENIED') {
        renderSubmissionState('Consent confirmed');
      }
    });
  }

  function submitConsent(choice, purposeDecisions, vendorDecisions, callback) {
    if (_submitBusy || _queuedSubmit) {
      if (callback) callback(new Error('A consent request is already being submitted'));
      return false;
    }
    var retrySignature = JSON.stringify({
      choice: choice,
      purposes: purposeDecisions || [],
      vendors: vendorDecisions || []
    });
    var submissionId =
      _retryJob && _retryJob.signature === retrySignature
        ? _retryJob.submissionId
        : newSubmissionId();
    _queuedSubmit = {
      choice: choice,
      purposeDecisions: purposeDecisions || [],
      vendorDecisions: vendorDecisions || [],
      callback: callback,
      submissionId: submissionId,
      signature: retrySignature,
      startedAt: Date.now()
    };
    flushConsentSubmit();
    return true;
  }

  function bannerPositionStyle(layout, position) {
    if (layout === 'dialog' || position === 'center') {
      return 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(480px,calc(100vw - 32px));';
    }
    if (layout === 'box') {
      if (position === 'top') {
        return 'position:fixed;top:16px;left:50%;transform:translateX(-50%);width:min(420px,calc(100vw - 32px));';
      }
      if (position === 'bottom-left') {
        return 'position:fixed;bottom:16px;left:16px;width:min(400px,calc(100vw - 32px));';
      }
      if (position === 'bottom-right') {
        return 'position:fixed;bottom:16px;right:16px;width:min(400px,calc(100vw - 32px));';
      }
      return 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);width:min(420px,calc(100vw - 32px));';
    }
    if (position === 'top') return 'position:fixed;top:0;left:0;right:0;';
    if (position === 'bottom-left') return 'position:fixed;bottom:16px;left:16px;width:min(400px,calc(100vw - 32px));';
    if (position === 'bottom-right') return 'position:fixed;bottom:16px;right:16px;width:min(400px,calc(100vw - 32px));';
    return 'position:fixed;bottom:0;left:0;right:0;';
  }

  function removePreferenceWidget() {
    var el = document.getElementById('__cmp_reopen__');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function syncPreferenceWidget() {
    removePreferenceWidget();
    if (!_config) return;
    var cfg = _config.bannerConfig || {};
    if (cfg.showPreferenceWidget === false) return;
    if (document.getElementById('__cmp_banner__') || document.getElementById('__cmp_pc__') || document.getElementById('__cmp_prefs__')) return;
    if (!_consentId) return;

    var btn = document.createElement('button');
    btn.id = '__cmp_reopen__';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Cookie preferences');
    btn.title = 'Cookie preferences';
    var corner = cfg.preferenceWidgetPosition === 'bottom-right' ? 'right:16px;' : 'left:16px;';
    btn.setAttribute('style',
      'position:fixed;bottom:16px;' + corner + 'z-index:2147483645;'
      + 'width:44px;height:44px;border-radius:999px;border:none;cursor:pointer;'
      + 'background:' + (cfg.primaryColor || '#0B2C4A') + ';color:#fff;'
      + 'box-shadow:0 8px 24px rgba(15,23,42,0.25);'
      + 'display:flex;align-items:center;justify-content:center;padding:0;'
    );
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10"/><circle cx="8" cy="10" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="12" cy="15" r="1.1" fill="currentColor"/></svg>';
    btn.addEventListener('click', function() {
      renderCookiePreferencesPanel();
    });
    if (document.body) document.body.appendChild(btn);
  }

  function removeCookiePreferencesPanel() {
    var el = document.getElementById('__cmp_prefs__');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function formatReceiptDate(value) {
    if (!value) return 'N/A';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) {
      var n = parseInt(value, 10);
      if (!n) return 'N/A';
      d = new Date(n);
    }
    if (isNaN(d.getTime())) return 'N/A';
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
  }

  function currentReceiptStatusLabel() {
    var child = childProtectionState();
    if (child && (child.ageStatus === 'under' || child.ageStatus === 'minor' || child.ageStatus === 'child' || child.ageStatus === 'age_restricted')) {
      return 'Essential only';
    }
    var purposes = (_config && _config.purposes) || [];
    var optional = 0;
    var grantedOpt = 0;
    for (var i = 0; i < purposes.length; i++) {
      if (purposes[i].isRequired) continue;
      optional += 1;
      if (currentPurposeGranted(purposes[i].id)) grantedOpt += 1;
    }
    if (!optional || grantedOpt === 0) return 'Essential only';
    if (grantedOpt === optional) return 'Full consent';
    return 'Custom';
  }

  function storedConsentMeta() {
    var stored = loadStoredConsent() || {};
    var expiryRaw = null;
    try { expiryRaw = localStorage.getItem(EXPIRY_KEY); } catch (eExp) {}
    return {
      consentId: _consentId || stored.consentId || '',
      consentedAt: stored.consentedAt || stored.revision || null,
      expiresAt: stored.expiresAt || (expiryRaw ? parseInt(expiryRaw, 10) : null)
    };
  }

  function downloadConsentReceipt() {
    if (!_consentId || !_config) return;
    var query = 'consentId=' + encodeURIComponent(_consentId)
      + '&websiteId=' + encodeURIComponent(_config.websiteId || '')
      + '&siteKey=' + encodeURIComponent(SITE_KEY)
      + '&download=1';
    fetch(API_BASE + '/api/consent/receipt?' + query, { cache: 'no-store' })
      .then(function(r) {
        if (!r.ok) throw new Error('Receipt download failed');
        return r.blob();
      })
      .then(function(blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'consent-receipt-' + _consentId + '.pdf';
        document.body.appendChild(a);
        a.click();
        if (a.parentNode) a.parentNode.removeChild(a);
        setTimeout(function() { try { URL.revokeObjectURL(a.href); } catch (eRev) {} }, 1000);
      })
      .catch(function() {
        renderSubmissionState('Receipt could not be downloaded. Please retry.');
      });
  }

  function saveCookiePreferenceToggles() {
    if (!_config || !_consentId) return;
    var purposeDecisions = ((_config.purposes) || []).map(function(p) {
      return { purposeId: p.id, granted: !!(p.isRequired || currentPurposeGranted(p.id)) };
    });
    var vendorDecisions = ((_config.vendors) || []).map(function(v) {
      return { vendorId: v.id, granted: currentVendorGranted(v.id) };
    });
    submitConsent('granular', purposeDecisions, vendorDecisions, function(err) {
      _choiceUiHeld = false;
      if (err) {
        renderCookiePreferencesPanel();
        renderSubmissionState('Preferences could not be saved. Please retry.');
      }
    });
  }

  function renderToggle(on, locked, onChange) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', on ? 'true' : 'false');
    if (locked) btn.disabled = true;
    btn.style.cssText = 'flex-shrink:0;width:42px;height:24px;border-radius:999px;border:none;padding:2px;cursor:'
      + (locked ? 'not-allowed' : 'pointer') + ';background:' + (on ? '#2563EB' : '#CBD5E1') + ';';
    var knob = document.createElement('span');
    knob.style.cssText = 'display:block;width:20px;height:20px;border-radius:999px;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,0.2);margin-'
      + (on ? 'left:auto' : 'right:auto') + ';';
    btn.appendChild(knob);
    if (!locked) {
      btn.addEventListener('click', function() {
        onChange(!on);
      });
    }
    return btn;
  }

  function renderCookiePreferencesPanel() {
    if (!_config || !_consentId) return;
    removeCookiePreferencesPanel();
    removePreferenceWidget();
    _submitButtons = [];
    var cfg = _config.bannerConfig || {};
    var g = _config.grievance || {};
    var meta = storedConsentMeta();
    var corner = cfg.preferenceWidgetPosition === 'bottom-right'
      ? 'right:16px;left:auto;'
      : 'left:16px;right:auto;';

    var panel = document.createElement('div');
    panel.id = '__cmp_prefs__';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Cookie Preferences');
    panel.setAttribute('dir', noticeDirection());
    panel.style.cssText = 'position:fixed;bottom:16px;' + corner
      + 'z-index:2147483646;width:min(360px,calc(100vw - 24px));background:#fff;color:#0F172A;'
      + 'border-radius:18px;box-shadow:0 18px 50px rgba(15,23,42,0.22);padding:16px 16px 14px;'
      + 'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;';

    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;';
    var title = document.createElement('div');
    title.style.cssText = 'display:flex;align-items:center;gap:8px;font-weight:700;font-size:15px;color:#0B2C4A;flex:1;min-width:0;';
    title.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0B2C4A" stroke-width="2" aria-hidden="true"><path d="M12 3l7 3v6c0 5-3.5 8.5-7 9-3.5-.5-7-4-7-9V6z"/></svg>';
    var titleText = document.createElement('span');
    titleText.textContent = 'Cookie Preferences';
    title.appendChild(titleText);

    var locales = availableLocales();
    if (locales.length) {
      var langWrap = document.createElement('label');
      langWrap.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:12px;color:#475569;';
      langWrap.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>';
      var langSelect = document.createElement('select');
      langSelect.setAttribute('aria-label', 'Language');
      langSelect.style.cssText = 'border:none;background:transparent;font:inherit;color:inherit;max-width:7rem;';
      locales.forEach(function(code) {
        var opt = document.createElement('option');
        opt.value = code;
        opt.textContent = languageDisplayName(code);
        if (code === (_config.resolvedLanguage || 'en')) opt.selected = true;
        langSelect.appendChild(opt);
      });
      langSelect.addEventListener('change', function() {
        window.CMP.setLanguage(langSelect.value);
      });
      langWrap.appendChild(langSelect);
      header.appendChild(title);
      header.appendChild(langWrap);
    } else {
      header.appendChild(title);
    }

    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    close.style.cssText = 'border:none;background:none;font-size:22px;line-height:1;cursor:pointer;color:#64748B;padding:0 2px;';
    close.addEventListener('click', function() {
      removeCookiePreferencesPanel();
      syncPreferenceWidget();
    });
    header.appendChild(close);
    panel.appendChild(header);

    var metaBox = document.createElement('div');
    metaBox.style.cssText = 'font-size:12px;line-height:1.55;color:#475569;margin-bottom:10px;';
    function metaLine(label, value) {
      var p = document.createElement('div');
      var k = document.createElement('span');
      k.textContent = label + ' ';
      var v = document.createElement('span');
      v.textContent = value;
      if (label.indexOf('Key') === 0) v.style.cssText = 'word-break:break-all;font-family:ui-monospace,Menlo,monospace;';
      p.appendChild(k);
      p.appendChild(v);
      metaBox.appendChild(p);
    }
    metaLine('Status:', currentReceiptStatusLabel());
    metaLine('Consent given:', formatReceiptDate(meta.consentedAt));
    metaLine('Expires:', formatReceiptDate(meta.expiresAt));
    metaLine('Key:', meta.consentId);
    panel.appendChild(metaBox);

    var catLabel = document.createElement('div');
    catLabel.textContent = 'Active categories:';
    catLabel.style.cssText = 'font-size:12px;color:#475569;margin:4px 0 6px;';
    panel.appendChild(catLabel);

    var list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;gap:8px;margin-bottom:12px;';
    ((_config.purposes) || []).forEach(function(purpose) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13px;color:#0F172A;';
      var name = document.createElement('span');
      name.textContent = purpose.name || purpose.key || 'Purpose';
      var granted = !!(purpose.isRequired || currentPurposeGranted(purpose.id));
      var locked = !!purpose.isRequired || !!(childProtectionState() && childProtectionState().ageStatus === 'under');
      if (purpose.isRequired) locked = true;
      var toggle = renderToggle(granted, locked, function(next) {
        if (!_decisions.purposes) _decisions.purposes = {};
        _decisions.purposes[purpose.id] = next;
        saveCookiePreferenceToggles();
      });
      if (!locked) _submitButtons.push(toggle);
      row.appendChild(name);
      row.appendChild(toggle);
      list.appendChild(row);
    });
    panel.appendChild(list);

    var download = document.createElement('button');
    download.type = 'button';
    download.textContent = 'Download Receipt';
    download.style.cssText = 'width:100%;padding:10px 12px;border-radius:10px;border:1px solid #E2E8F0;background:#fff;color:#0F172A;font-size:13px;font-weight:600;cursor:pointer;margin-bottom:8px;';
    download.addEventListener('click', downloadConsentReceipt);
    _submitButtons.push(download);
    panel.appendChild(download);

    var revoke = document.createElement('button');
    revoke.type = 'button';
    revoke.textContent = 'Revoke Consent (DPDP Section 6(4))';
    revoke.style.cssText = 'width:100%;padding:10px 12px;border-radius:10px;border:none;background:#EF4444;color:#fff;font-size:13px;font-weight:700;cursor:pointer;';
    revoke.addEventListener('click', function() {
      revoke.disabled = true;
      window.CMP.withdrawConsent().then(function() {
        removeCookiePreferencesPanel();
      }).catch(function() {
        revoke.disabled = false;
        renderSubmissionState('Withdrawal could not be confirmed. Please retry.');
      });
    });
    _submitButtons.push(revoke);
    panel.appendChild(revoke);

    var status = document.createElement('div');
    status.id = '__cmp_prefs_status__';
    status.setAttribute('role', 'status');
    status.style.cssText = 'display:none;margin-top:8px;font-size:12px;font-weight:600;';
    panel.appendChild(status);

    var links = document.createElement('div');
    links.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin-top:10px;font-size:12px;';
    if (cfg.privacyPolicyUrl) {
      var pl = document.createElement('a');
      pl.href = safeHttpUrl(cfg.privacyPolicyUrl);
      pl.target = '_blank';
      pl.rel = 'noopener noreferrer';
      pl.textContent = (cfg.privacyPolicyText || 'Privacy Policy') + ' ↗';
      pl.style.cssText = 'color:#2563EB;text-decoration:none;';
      links.appendChild(pl);
    }
    if (cfg.cookiePolicyUrl) {
      var cl = document.createElement('a');
      cl.href = safeHttpUrl(cfg.cookiePolicyUrl);
      cl.target = '_blank';
      cl.rel = 'noopener noreferrer';
      cl.textContent = (cfg.cookiePolicyText || 'Cookie Policy') + ' ↗';
      cl.style.cssText = 'color:#2563EB;text-decoration:none;';
      links.appendChild(cl);
    }
    appendDataPrincipalRightsControl(links, 'color:#2563EB;text-decoration:none;font-weight:600;');
    if (links.childNodes.length) panel.appendChild(links);

    var dpoEmail = String(g.dpoEmail || g.grievanceOfficerEmail || '').trim();
    var dpo = document.createElement('div');
    dpo.style.cssText = 'margin-top:8px;font-size:11px;color:#64748B;';
    dpo.textContent = (dpoEmail ? ('DPO: ' + dpoEmail + ' · ') : '') + 'DPDP Act, 2023';
    panel.appendChild(dpo);

    (document.body || document.documentElement).appendChild(panel);
  }

  function dntRequested() {
    var nav = window.navigator || {};
    var n = nav.doNotTrack || window.doNotTrack || nav.msDoNotTrack;
    return n === '1' || n === 'yes';
  }

  function visitorRequestedDoNotTrack() {
    var cfg = (_config && _config.bannerConfig) || {};
    if (cfg.respectDoNotTrack === false) return false;
    return dntRequested();
  }

  function appendDoNotTrackNotice(parent) {
    if (!parent || !visitorRequestedDoNotTrack() || consentIsServerConfirmed()) return;
    var p = document.createElement('p');
    p.setAttribute('data-cmp-dnt-notice', 'true');
    p.textContent = 'Your browser sent a Do Not Track request. Optional cookies stay off unless you accept.';
    p.style.cssText = 'margin:0;font-size:12px;line-height:1.5;opacity:0.8;';
    parent.appendChild(p);
  }

  function appendChildProtectionNotice(parent) {
    var notice = childNoticeText();
    if (!notice || !parent) return;
    var p = document.createElement('p');
    p.setAttribute('data-cmp-child-notice', 'true');
    p.textContent = notice;
    p.style.cssText = 'margin:0;font-size:12px;line-height:1.5;opacity:0.8;';
    parent.appendChild(p);
  }

  function submitAgeAssertion(assertion, after) {
    if (!_config) return;
    fetch(API_BASE + '/api/age-assurance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteKey: SITE_KEY,
        websiteId: _config.websiteId,
        consentId: _consentId || undefined,
        assertion: assertion
      })
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || !data.success || !data.age) return;
        _config.childProtection = Object.assign({}, _config.childProtection || {}, data.age, {
          notice: data.notice,
          selfDeclarationIsNotVerified: true
        });
        if (data.ageContext) _config.ageContext = data.ageContext;
        applyChildRestrictions();
        if (after) after(data);
      })
      .catch(function() {});
  }

  function appendAgeAssuranceGate(parent) {
    var child = childProtectionState();
    if (!child.enabled || !child.ageAssuranceRequired) return;
    if (child.ageStatus && child.ageStatus !== 'unknown' && child.ageStatus !== 'expired') return;
    if (parent && parent.querySelector && parent.querySelector('[data-cmp-dpdp-age]')) return;
    var wrap = document.createElement('div');
    wrap.setAttribute('data-cmp-age-gate', 'true');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:8px;';
    var label = document.createElement('p');
    label.textContent = child.minimumAge
      ? 'Are you above the required age (' + child.minimumAge + ')?'
      : 'Are you above the required age?';
    label.style.cssText = 'margin:0;font-size:13px;font-weight:600;';
    var hint = document.createElement('p');
    hint.textContent = 'This is a self-declaration, not a verified age.';
    hint.style.cssText = 'margin:0;font-size:11px;opacity:0.7;';
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;';
    function ageBtn(text, assertion) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = text;
      b.style.cssText = 'cursor:pointer;border-radius:8px;padding:6px 12px;font-size:12px;border:1px solid rgba(15,23,42,0.18);background:#fff;';
      b.addEventListener('click', function() {
        submitAgeAssertion(assertion, function() {
          renderBanner();
        });
      });
      return b;
    }
    row.appendChild(ageBtn('Yes', 'over'));
    row.appendChild(ageBtn('No', 'under'));
    wrap.appendChild(label);
    wrap.appendChild(hint);
    wrap.appendChild(row);
    parent.appendChild(wrap);
  }

  function appendDpdpAgeNotice(parent) {
    if (!parent) return;
    var child = childProtectionState();
    if (child.ageStatus === 'under') return;
    var ui = uiStringsFor(_config && _config.resolvedLanguage);
    var box = document.createElement('p');
    box.setAttribute('data-cmp-dpdp-age', 'true');
    box.style.cssText = 'margin:0;padding:10px 12px;border-radius:10px;border:1px solid #F59E0B;background:rgba(245,158,11,0.08);color:#B45309;font-size:13px;line-height:1.5;';
    box.appendChild(document.createTextNode(ui.ageConfirmStart));
    var strong = document.createElement('strong');
    strong.textContent = ui.ageConfirmStrong;
    box.appendChild(strong);
    box.appendChild(document.createTextNode(ui.ageConfirmEnd));
    var link = document.createElement('button');
    link.type = 'button';
    link.textContent = ui.under18;
    link.style.cssText = 'display:inline;background:none;border:none;padding:0;margin:0;font:inherit;color:#B45309;text-decoration:underline;cursor:pointer;font-weight:600;';
    link.addEventListener('click', function(e) {
      if (e && e.preventDefault) e.preventDefault();
      if (e && e.stopPropagation) e.stopPropagation();
      showParentalConsentDialog();
    });
    box.appendChild(link);
    parent.appendChild(box);
  }

  function removeParentalConsentDialog() {
    var el = document.getElementById('__cmp_parental__');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    var overlay = document.getElementById('__cmp_banner_overlay__');
    if (overlay) overlay.style.pointerEvents = 'auto';
  }

  function appendPolicyAnchor(parent, href, label) {
    var url = safeHttpUrl(href);
    if (!url || !label) return false;
    var a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = label;
    a.style.cssText = 'color:#2563EB;font-weight:600;text-decoration:underline;';
    parent.appendChild(a);
    return true;
  }

  function dataPrincipalRightsHref() {
    var g = (_config && _config.grievance) || {};
    var configured = safeHttpUrl(g.grievancePortalUrl || '');
    if (configured) return configured;
    return String(API_BASE || '').replace(/[/]$/, '') + '/privacy-center/data-principal-request?siteKey=' + encodeURIComponent(SITE_KEY);
  }

  function appendDataPrincipalRightsControl(parent, style) {
    if (!parent) return null;
    var a = document.createElement('a');
    a.href = dataPrincipalRightsHref();
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = uiStringsFor(_config && _config.resolvedLanguage).dataPrincipalRights;
    a.style.cssText = style || 'font-weight:600;color:inherit;text-decoration:none;padding:8px;font-size:13px;white-space:normal;';
    parent.appendChild(a);
    return a;
  }

  function confirmUnder18() {
    removeParentalConsentDialog();
    _config.childProtection = Object.assign({}, childProtectionState(), {
      enabled: true,
      ageStatus: 'under',
      restrictedProcessingAllowed: false
    });
    applyChildRestrictions();
    submitAgeAssertion('under');
    if (submitConsent('reject-all', [], [], function(err) { finishChoice(err); })) {
      holdChoiceUi();
    }
  }

  function showParentalConsentDialog() {
    removeParentalConsentDialog();
    var cfg = (_config && _config.bannerConfig) || {};
    var g = (_config && _config.grievance) || {};
    var dpoEmail = String(g.dpoEmail || g.grievanceOfficerEmail || '').trim();

    var wrap = document.createElement('div');
    wrap.id = '__cmp_parental__';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', '__cmp_parental_title__');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(15,23,42,0.45);pointer-events:auto !important;touch-action:auto;';
    var bannerOverlay = document.getElementById('__cmp_banner_overlay__');
    if (bannerOverlay) bannerOverlay.style.pointerEvents = 'none';

    var card = document.createElement('div');
    card.style.cssText = 'position:relative;z-index:1;pointer-events:auto;width:min(560px,100%);background:#F8FBFF;border:1px solid #BFDBFE;border-radius:16px;padding:20px 20px 16px;box-shadow:0 20px 50px rgba(15,23,42,0.18);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#334155;';

    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:12px;align-items:flex-start;';

    var icon = document.createElement('div');
    icon.setAttribute('aria-hidden', 'true');
    icon.style.cssText = 'flex-shrink:0;width:40px;height:40px;border-radius:12px;background:#DBEAFE;display:flex;align-items:center;justify-content:center;color:#2563EB;';
    icon.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="9" cy="7" r="2.2"/><path d="M4.5 17.5c.4-2.6 2.3-4 4.5-4s4.1 1.4 4.5 4"/><circle cx="16.5" cy="8" r="2"/><path d="M13.2 17.5c.3-2 1.8-3.2 3.3-3.2 1.6 0 3.1 1.2 3.4 3.2"/></svg>';

    var copy = document.createElement('div');
    copy.style.minWidth = '0';

    var ui = uiStringsFor(_config && _config.resolvedLanguage);
    var title = document.createElement('h2');
    title.id = '__cmp_parental_title__';
    title.textContent = ui.parentalTitle;
    title.style.cssText = 'margin:0 0 8px;font-size:16px;font-weight:700;color:#0F172A;';

    var p1 = document.createElement('p');
    p1.textContent = ui.parentalBody;
    p1.style.cssText = 'margin:0 0 10px;font-size:13px;line-height:1.55;color:#64748B;';

    var p2 = document.createElement('p');
    p2.textContent = 'No analytics, marketing, or behavioral tracking data will be collected. If your parent or guardian wishes to provide consent on your behalf, please contact our Data Protection Officer.';
    p2.style.cssText = 'margin:0 0 10px;font-size:13px;line-height:1.55;color:#64748B;';

    copy.appendChild(title);
    copy.appendChild(p1);
    copy.appendChild(p2);

    var privacyUrl = safeHttpUrl(cfg.privacyPolicyUrl);
    var cookieUrl = safeHttpUrl(cfg.cookiePolicyUrl);
    if (privacyUrl || cookieUrl) {
      var links = document.createElement('p');
      links.style.cssText = 'margin:0 0 10px;font-size:13px;line-height:1.55;';
      var addedPrivacy = appendPolicyAnchor(links, privacyUrl, cfg.privacyPolicyText || 'Privacy Policy');
      if (addedPrivacy && cookieUrl) {
        var sep = document.createElement('span');
        sep.textContent = ' · ';
        sep.style.color = '#94A3B8';
        links.appendChild(sep);
      }
      appendPolicyAnchor(links, cookieUrl, cfg.cookiePolicyText || 'Cookie Policy');
      copy.appendChild(links);
    }

    var dpo = document.createElement('p');
    dpo.style.cssText = 'margin:0;font-size:12px;color:#64748B;';
    if (dpoEmail) {
      dpo.appendChild(document.createTextNode('DPO Contact: '));
      var mail = document.createElement('a');
      mail.href = 'mailto:' + encodeURIComponent(dpoEmail);
      mail.textContent = dpoEmail;
      mail.style.cssText = 'color:#334155;font-weight:600;text-decoration:none;';
      dpo.appendChild(mail);
      dpo.appendChild(document.createTextNode(' · Governed by DPDP Act, 2023'));
    } else {
      dpo.textContent = 'Governed by DPDP Act, 2023';
    }
    copy.appendChild(dpo);

    row.appendChild(icon);
    row.appendChild(copy);
    card.appendChild(row);

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;justify-content:space-between;gap:12px;margin-top:18px;pointer-events:auto;position:relative;z-index:2;';

    function bindParentalAction(el, fn) {
      var done = false;
      function run(e) {
        if (done) return;
        done = true;
        if (e) {
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
        }
        fn();
      }
      el.addEventListener('pointerup', run);
      el.addEventListener('click', run);
    }

    var back = document.createElement('button');
    back.type = 'button';
    back.textContent = 'Go Back';
    back.style.cssText = 'padding:8px 16px;border-radius:10px;border:1px solid #CBD5E1;background:#fff;color:#334155;cursor:pointer;font-size:13px;font-weight:500;pointer-events:auto;';
    bindParentalAction(back, function() {
      removeParentalConsentDialog();
    });

    var ok = document.createElement('button');
    ok.type = 'button';
    ok.textContent = 'I Understand';
    ok.style.cssText = 'padding:8px 16px;border-radius:10px;border:1px solid #CBD5E1;background:#fff;color:#334155;cursor:pointer;font-size:13px;font-weight:500;pointer-events:auto;';
    bindParentalAction(ok, function() {
      confirmUnder18();
    });

    actions.appendChild(back);
    actions.appendChild(ok);
    card.appendChild(actions);
    wrap.appendChild(card);
    wrap.addEventListener('click', function(e) {
      if (e.target === wrap) removeParentalConsentDialog();
    });
    (document.documentElement || document.body).appendChild(wrap);
    try { ok.focus(); } catch (eFocus) {}
  }

  function hexToRgbList(hex) {
    var h = String(hex || '').replace('#', '');
    if (h.length === 3) h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    if (h.length !== 6) return '44,74,124';
    var r = parseInt(h.slice(0, 2), 16);
    var g = parseInt(h.slice(2, 4), 16);
    var b = parseInt(h.slice(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return '44,74,124';
    return r + ',' + g + ',' + b;
  }

  function injectCmpScrollStyles(cfg) {
    var id = '__cmp_ui_css__';
    var el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      (document.head || document.documentElement).appendChild(el);
    }
    var rgb = hexToRgbList((cfg && (cfg.primaryColor || cfg.textColor)) || '#0B2C4A');
    el.textContent =
      '#__cmp_pc__ [data-cmp-scroll],#__cmp_banner__ [data-cmp-scroll]{' +
        'scrollbar-width:thin;' +
        'scrollbar-color:rgba(' + rgb + ',0.5) transparent;' +
      '}' +
      '#__cmp_pc__ [data-cmp-scroll]::-webkit-scrollbar,' +
      '#__cmp_banner__ [data-cmp-scroll]::-webkit-scrollbar{width:8px;height:8px;}' +
      '#__cmp_pc__ [data-cmp-scroll]::-webkit-scrollbar-track,' +
      '#__cmp_banner__ [data-cmp-scroll]::-webkit-scrollbar-track{background:rgba(15,23,42,0.06);border-radius:999px;margin:8px 2px;}' +
      '#__cmp_pc__ [data-cmp-scroll]::-webkit-scrollbar-thumb,' +
      '#__cmp_banner__ [data-cmp-scroll]::-webkit-scrollbar-thumb{' +
        'background:rgba(' + rgb + ',0.42);border-radius:999px;border:2px solid transparent;background-clip:content-box;' +
      '}' +
      '#__cmp_pc__ [data-cmp-scroll]::-webkit-scrollbar-thumb:hover,' +
      '#__cmp_banner__ [data-cmp-scroll]::-webkit-scrollbar-thumb:hover{' +
        'background:rgba(' + rgb + ',0.75);border:2px solid transparent;background-clip:content-box;' +
      '}';
  }

  function renderBanner() {
    if (!_config || !_config.bannerConfig) return;
    var cfg = _config.bannerConfig;
    cfg.primaryColor = safeCssColor(cfg.primaryColor) || '#171717';
    cfg.backgroundColor = safeCssColor(cfg.backgroundColor) || '#ffffff';
    cfg.textColor = safeCssColor(cfg.textColor) || '#171717';
    if (!cfg.showAcceptAll && !cfg.showRejectAll && !cfg.showCustomize && !cfg.showCloseButton) return;

    removePreferenceWidget();
    var existingBanner = document.getElementById('__cmp_banner__');
    if (existingBanner && existingBanner.parentNode) existingBanner.parentNode.removeChild(existingBanner);
    var existingOverlay = document.getElementById('__cmp_banner_overlay__');
    if (existingOverlay && existingOverlay.parentNode) existingOverlay.parentNode.removeChild(existingOverlay);

    var layout = cfg.layout || 'bar';
    var position = cfg.position || 'bottom';
    if (layout === 'dialog') position = 'center';
    var overlayOn = !!(cfg.overlayEnabled || cfg.blockPageUntilConsent || layout === 'dialog');
    var overlayTint = !!(cfg.overlayEnabled || layout === 'dialog');
    injectCmpScrollStyles(cfg);

    if (overlayOn) {
      var overlay = document.createElement('div');
      overlay.id = '__cmp_banner_overlay__';
      overlay.setAttribute(
        'style',
        'position:fixed;inset:0;background:' + (overlayTint ? 'rgba(15,23,42,0.45)' : 'transparent') + ';'
        + 'z-index:2147483644;pointer-events:auto;'
      );
      overlay.addEventListener('click', function() {
        if (cfg.closeOnOverlayClick && !cfg.blockPageUntilConsent) {
          removeBanner();
        }
      });
      document.body ? document.body.appendChild(overlay) : cmpMountRoot().appendChild(overlay);
    }

    var banner = document.createElement('div');
    banner.id = '__cmp_banner__';

    var pad = layout === 'bar' ? '16px 24px' : layout === 'dialog' ? '28px' : '20px';
    var radius = typeof cfg.borderRadius === 'number' ? cfg.borderRadius : 8;
    var dir = noticeDirection();
    banner.setAttribute('dir', dir);
    banner.setAttribute('lang', (_config.resolvedLanguage || 'en'));
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', cfg.title || 'Consent');
    banner.setAttribute('style',
      bannerPositionStyle(layout, position)
      + 'background:' + (cfg.backgroundColor || '#fff') + ';'
      + 'color:' + (cfg.textColor || '#171717') + ';'
      + 'border-radius:' + radius + 'px;'
      + 'padding:' + pad + ';'
      + 'box-shadow:0 8px 32px rgba(15,23,42,0.18);'
      + 'z-index:2147483645;'
      + 'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:14px;'
      + 'text-align:start;box-sizing:border-box;'
      + (layout === 'bar'
        ? 'display:flex;flex-wrap:wrap;align-items:center;gap:12px;'
        : 'display:flex;flex-direction:column;gap:14px;max-height:min(86vh,640px);overflow:hidden;')
    );

    if (cfg.showCloseButton) {
      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.setAttribute('aria-label', cfg.closeLabel || 'Close');
      closeBtn.textContent = '×';
      closeBtn.style.cssText = 'position:absolute;top:8px;right:10px;background:none;border:none;cursor:pointer;font-size:20px;line-height:1;opacity:0.5;color:inherit;';
      closeBtn.addEventListener('click', function() { removeBanner(); });
      banner.appendChild(closeBtn);
    }

    appendReconsentNotice(banner, layout === 'bar');

    if (cfg.title || cfg.description) {
      var text = document.createElement('div');
      text.style.flex = layout === 'bar' ? '1' : '1 1 auto';
      text.style.minWidth = layout === 'bar' ? '200px' : '0';
      if (layout !== 'bar') {
        text.setAttribute('data-cmp-scroll', '');
        text.style.minHeight = '0';
        text.style.overflowY = 'auto';
        text.style.overscrollBehavior = 'contain';
        text.style.scrollbarWidth = 'thin';
        text.style.paddingRight = '4px';
      }
      if (cfg.title) {
        var h = document.createElement(layout === 'bar' ? 'strong' : 'p');
        h.textContent = cfg.title;
        h.style.display = 'block';
        h.style.margin = '0 0 6px 0';
        h.style.fontWeight = '700';
        h.style.fontSize = layout === 'dialog' ? '18px' : '15px';
        text.appendChild(h);
      }
      if (cfg.description) {
        var p = document.createElement('span');
        p.textContent = cfg.description;
        p.style.opacity = '0.75';
        p.style.fontSize = '13px';
        p.style.display = 'block';
        p.style.lineHeight = '1.55';
        p.style.overflowWrap = 'anywhere';
        text.appendChild(p);
      }
      banner.appendChild(text);
    }

    appendDoNotTrackNotice(banner);
    appendChildProtectionNotice(banner);
    appendDpdpAgeNotice(banner);
    appendAgeAssuranceGate(banner);

    var policyRow = document.createElement('div');
    policyRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;font-size:12px;';
    var hasPrivacy = false;
    if (cfg.privacyPolicyUrl && cfg.privacyPolicyText) {
      var pol = document.createElement('a');
      pol.href = safeHttpUrl(cfg.privacyPolicyUrl);
      pol.target = '_blank';
      pol.rel = 'noopener noreferrer';
      pol.textContent = cfg.privacyPolicyText;
      pol.style.cssText = 'text-decoration:underline;color:' + (cfg.primaryColor || '#171717') + ';';
      policyRow.appendChild(pol);
      hasPrivacy = true;
    }
    if (cfg.cookiePolicyUrl) {
      var cook = document.createElement('a');
      cook.href = safeHttpUrl(cfg.cookiePolicyUrl);
      cook.target = '_blank';
      cook.rel = 'noopener noreferrer';
      cook.textContent = cfg.cookiePolicyText || uiStringsFor(_config && _config.resolvedLanguage).cookiePolicy;
      cook.style.cssText = 'text-decoration:underline;color:' + (cfg.primaryColor || '#171717') + ';';
      policyRow.appendChild(cook);
      hasPrivacy = true;
    }
    if (hasPrivacy) banner.appendChild(policyRow);

    var actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = layout === 'bar' ? '8px' : '12px';
    actions.style.flexWrap = 'wrap';
    actions.style.alignItems = 'center';
    actions.style.width = '100%';
    if (layout !== 'bar') actions.style.justifyContent = 'space-between';

    var leftBtns = document.createElement('div');
    leftBtns.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;';
    var rightBtns = document.createElement('div');
    rightBtns.style.cssText = 'display:flex;flex-wrap:wrap;align-items:center;gap:8px;' + (layout === 'bar' ? '' : 'margin-inline-start:auto;');

    function btn(label, variant, onclick) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      var radiusBtn = Math.max(4, radius - 2);
      var base = 'cursor:pointer;border-radius:' + radiusBtn + 'px;padding:8px 16px;font-size:13px;white-space:normal;max-width:100%;';
      if (variant === 'primary') {
        b.style.cssText = base + 'font-weight:600;border:none;background:' + (cfg.primaryColor || '#171717') + ';color:#fff;';
      } else if (variant === 'ghost') {
        b.style.cssText = base + 'font-weight:400;background:transparent;border:none;color:' + (cfg.primaryColor || '#171717') + ';text-decoration:underline;padding:8px;';
      } else {
        b.style.cssText = base + 'font-weight:600;background:transparent;border:1.5px solid ' + (cfg.primaryColor || '#171717')
          + ';color:' + (cfg.primaryColor || '#171717') + ';';
      }
      b.addEventListener('click', onclick);
      b.setAttribute('data-cmp-submit-control', 'true');
      _submitButtons.push(b);
      return b;
    }

    if (cfg.showCustomize) {
      leftBtns.appendChild(btn(cfg.customizeLabel || 'Customize', layout === 'bar' ? 'ghost' : 'ghost', function() {
        _hostScroll.beginTransition();
        removeBanner();
        window.CMP.openPreferenceCenter();
        _hostScroll.endTransition();
      }));
    }
    appendDataPrincipalRightsControl(
      leftBtns,
      'font-weight:600;color:' + (cfg.textColor || '#171717') + ';text-decoration:none;padding:8px;font-size:13px;white-space:normal;max-width:100%;'
    );

    if (layout === 'bar') {
      if (cfg.showAcceptAll) {
        rightBtns.appendChild(btn(cfg.acceptAllLabel || 'Accept all', 'primary', function() {
          if (submitConsent('accept-all', [], [], function(err) { finishChoice(err); })) {
            holdChoiceUi();
          }
        }));
      }
      if (cfg.showRejectAll) {
        rightBtns.appendChild(btn(cfg.rejectAllLabel || 'Reject all', 'outline', function() {
          if (submitConsent('reject-all', [], [], function(err) { finishChoice(err); })) {
            holdChoiceUi();
          }
        }));
      }
    } else {
      if (cfg.showRejectAll) {
        rightBtns.appendChild(btn(cfg.rejectAllLabel || 'Reject all', 'outline', function() {
          if (submitConsent('reject-all', [], [], function(err) { finishChoice(err); })) {
            holdChoiceUi();
          }
        }));
      }
      if (cfg.showAcceptAll) {
        rightBtns.appendChild(btn(cfg.acceptAllLabel || 'Accept all', 'primary', function() {
          if (submitConsent('accept-all', [], [], function(err) { finishChoice(err); })) {
            holdChoiceUi();
          }
        }));
      }
    }

    var locales = availableLocales();
    if (locales.length) {
      var langSelect = document.createElement('select');
      langSelect.setAttribute('aria-label', uiStringsFor(_config && _config.resolvedLanguage).language);
      langSelect.style.cssText = 'font-size:12px;padding:6px 8px;border-radius:8px;border:1.5px solid rgba(15,23,42,0.18);background:transparent;color:inherit;max-width:14rem;';
      locales.forEach(function(code) {
        var opt = document.createElement('option');
        opt.value = code;
        opt.textContent = languageDisplayName(code);
        if (code === (_config.resolvedLanguage || 'en') || localeBase(code) === localeBase(_config.resolvedLanguage || 'en')) opt.selected = true;
        langSelect.appendChild(opt);
      });
      langSelect.addEventListener('change', function() {
        window.CMP.setLanguage(langSelect.value);
      });
      leftBtns.appendChild(langSelect);
    }

    actions.appendChild(leftBtns);
    actions.appendChild(rightBtns);
    banner.appendChild(actions);
    var submitStatus = document.createElement('div');
    submitStatus.id = '__cmp_banner_status__';
    submitStatus.setAttribute('role', 'status');
    submitStatus.setAttribute('aria-live', 'polite');
    submitStatus.style.cssText = 'display:none;width:100%;font-size:12px;line-height:1.45;font-weight:600;';
    banner.appendChild(submitStatus);

    if (cfg.showPoweredBy && cfg.poweredByText) {
      var powered = document.createElement('div');
      var poweredLabel = String(cfg.poweredByText || '').trim();
      if (!poweredLabel || /^powered by cmp$/i.test(poweredLabel)) poweredLabel = 'Powered by Consent Guru';
      powered.textContent = poweredLabel;
      powered.style.cssText = 'font-size:11px;opacity:0.4;text-align:end;' + (layout === 'bar' ? 'width:100%;' : '');
      banner.appendChild(powered);
    }

    cmpMountRoot().appendChild(banner);
    _hostScroll.sync();
  }

  function removeBanner() {
    var el = document.getElementById('__cmp_banner__');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    var overlay = document.getElementById('__cmp_banner_overlay__');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    removeParentalConsentDialog();
    _hostScroll.sync();
    syncPreferenceWidget();
  }

  function getConsent() {
    return {
      consentId: _consentId,
      state: _consentState,
      confirmed: consentIsServerConfirmed(),
      stateVersion: _stateVersion,
      decisions: _decisions,
      websiteId: _config ? _config.websiteId : null,
      california: _california
    };
  }

  // -------------------------------------------------------------------------
  // Preference Center modal
  // -------------------------------------------------------------------------
  function pcFocusables(root) {
    if (!root || !root.querySelectorAll) return [];
    var nodes = root.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].disabled) continue;
      out.push(nodes[i]);
    }
    return out;
  }

  function onPcKeyDown(e) {
    if (!e || e.key !== 'Tab') return;
    var pc = document.getElementById('__cmp_pc__');
    if (!pc) return;
    var list = pcFocusables(pc);
    if (!list.length) {
      if (e.preventDefault) e.preventDefault();
      return;
    }
    var first = list[0];
    var last = list[list.length - 1];
    var active = document.activeElement;
    if (e.shiftKey && active === first) {
      if (e.preventDefault) e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      if (e.preventDefault) e.preventDefault();
      first.focus();
    }
  }

  function releasePcFocus() {
    document.removeEventListener('keydown', onPcKeyDown, true);
    var restore = _pcLastFocus;
    _pcLastFocus = null;
    if (restore && typeof restore.focus === 'function' && document.contains && document.contains(restore)) {
      try { restore.focus(); } catch (eFocus) {}
    }
  }

  function removePreferenceCenterNodes() {
    var el = document.getElementById('__cmp_pc__');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    var overlay = document.getElementById('__cmp_pc_overlay__');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }

  function removePreferenceCenter() {
    releasePcFocus();
    removePreferenceCenterNodes();
    _hostScroll.sync();
    syncPreferenceWidget();
  }

  function currentPurposeGranted(purposeId) {
    return !!(
      _decisions && _decisions.purposes && _decisions.purposes[purposeId]
    );
  }

  function currentVendorGranted(vendorId) {
    return !!(
      _decisions && _decisions.vendors && _decisions.vendors[vendorId]
    );
  }

  function renderPreferenceCenter() {
    if (!_config) return;
    var cfg = _config.bannerConfig || {};
    injectCmpScrollStyles(cfg);
    removePreferenceWidget();
    _hostScroll.beginTransition();
    removePreferenceCenterNodes();

    // Backdrop overlay
    var overlay = document.createElement('div');
    overlay.id = '__cmp_pc_overlay__';
    overlay.setAttribute(
      'style',
      'position:fixed;inset:0;background:rgba(15,23,42,0.45);backdrop-filter:blur(6px);z-index:2147483646;'
    );
    overlay.addEventListener('click', function() {
      if (cfg.closeOnOverlayClick) removePreferenceCenter();
    });
    document.body.appendChild(overlay);

    // Dialog
    var pc = document.createElement('div');
    pc.id = '__cmp_pc__';
    pc.setAttribute('role', 'dialog');
    pc.setAttribute('aria-modal', 'true');
    pc.setAttribute('aria-labelledby', '__cmp_pc_title__');
    var radius = (typeof cfg.borderRadius === 'number' ? cfg.borderRadius : 8) + 'px';
    pc.setAttribute('dir', noticeDirection());
    pc.setAttribute('lang', (_config.resolvedLanguage || 'en'));
    pc.setAttribute('style',
      'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;'
      + 'width:min(620px,calc(100vw - 32px));max-height:min(82vh,720px);overflow:hidden;'
      + 'display:flex;flex-direction:column;gap:0;'
      + 'background:' + (cfg.backgroundColor || '#ffffff') + ';'
      + 'color:' + (cfg.textColor || '#171717') + ';'
      + 'border-radius:' + radius + ';'
      + 'box-shadow:0 30px 80px -20px rgba(15,23,42,0.35),0 10px 30px -10px rgba(15,23,42,0.2);'
      + 'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:14px;'
    );

    // Header
    var header = document.createElement('div');
    header.setAttribute('style',
      'padding:22px 24px 14px 24px;border-bottom:1px solid rgba(15,23,42,0.08);'
      + 'display:flex;align-items:flex-start;justify-content:space-between;gap:16px;'
    );
    var titleBox = document.createElement('div');
    titleBox.style.minWidth = '0';
    var pcTitle = document.createElement('h2');
    pcTitle.id = '__cmp_pc_title__';
    pcTitle.textContent = cfg.preferenceCenterTitle || 'Manage your preferences';
    pcTitle.setAttribute('style',
      'margin:0;font-size:18px;font-weight:700;letter-spacing:-0.01em;color:'
      + (cfg.textColor || '#171717') + ';'
    );
    var pcSub = document.createElement('p');
    pcSub.textContent = cfg.preferenceCenterDescription ||
      'Customize which purposes and vendors you allow. You can change your choices at any time.';
    pcSub.setAttribute('style',
      'margin:6px 0 0 0;font-size:13px;opacity:0.7;line-height:1.5;'
    );
    titleBox.appendChild(pcTitle);
    titleBox.appendChild(pcSub);
    appendDoNotTrackNotice(titleBox);
    appendChildProtectionNotice(titleBox);
    appendReconsentNotice(titleBox, false);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', cfg.closeLabel || 'Close');
    closeBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    closeBtn.setAttribute('style',
      'flex-shrink:0;width:36px;height:36px;border-radius:12px;border:none;cursor:pointer;'
      + 'background:transparent;display:inline-flex;align-items:center;justify-content:center;'
      + 'color:' + (cfg.textColor || '#171717') + ';opacity:0.55;'
    );
    closeBtn.addEventListener('mouseenter', function() { closeBtn.style.opacity = '1'; closeBtn.style.background = 'rgba(15,23,42,0.06)'; });
    closeBtn.addEventListener('mouseleave', function() { closeBtn.style.opacity = '0.55'; closeBtn.style.background = 'transparent'; });
    closeBtn.addEventListener('click', removePreferenceCenter);

    header.appendChild(titleBox);
    var pcLocales = availableLocales();
    if (pcLocales.length) {
      var pcLang = document.createElement('select');
      pcLang.setAttribute('aria-label', uiStringsFor(_config && _config.resolvedLanguage).language);
      pcLang.style.cssText = 'font-size:12px;padding:6px 8px;border-radius:8px;border:1.5px solid rgba(15,23,42,0.18);background:transparent;color:inherit;max-width:12rem;margin-top:2px;';
      pcLocales.forEach(function(code) {
        var opt = document.createElement('option');
        opt.value = code;
        opt.textContent = languageDisplayName(code);
        if (code === (_config.resolvedLanguage || 'en') || localeBase(code) === localeBase(_config.resolvedLanguage || 'en')) opt.selected = true;
        pcLang.appendChild(opt);
      });
      pcLang.addEventListener('change', function() {
        window.CMP.setLanguage(pcLang.value);
      });
      header.appendChild(pcLang);
    }
    if (cfg.showCloseButton !== false) header.appendChild(closeBtn);

    // Body (scrollable)
    var body = document.createElement('div');
    body.setAttribute('data-cmp-scroll', '');
    body.setAttribute('style',
      'flex:1 1 auto;min-height:0;overflow-y:auto;padding:10px 20px 20px 18px;scrollbar-width:thin;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;'
    );

    // Track local toggles independently so we can cancel.
    var localDecisions = { purposes: {}, vendors: {} };
    function setPurposeLocal(pid, val) { localDecisions.purposes[pid] = !!val; }
    function setVendorLocal(vid, val)  { localDecisions.vendors[vid]  = !!val; }

    // Seed from current state, defaulting non-essential to reject
    if (_config.purposes) _config.purposes.forEach(function(p) {
      var allowed = p.isRequired || currentPurposeGranted(p.id);
      if (purposeIsChildRestricted(p) && !childRestrictedProcessingAllowed()) allowed = false;
      setPurposeLocal(p.id, allowed);
    });
    if (_config.vendors) _config.vendors.forEach(function(v) {
      setVendorLocal(v.id, currentVendorGranted(v.id));
    });

    // --- Purposes list ---
    if (_config.purposes && _config.purposes.length > 0) {
      var sec = document.createElement('section');
      sec.style.padding = '12px 0 4px 0';
      var h3 = document.createElement('h3');
      h3.textContent = cfg.purposesHeading || 'Purposes';
      h3.setAttribute('style',
        'margin:0 0 10px 0;font-size:12px;font-weight:700;letter-spacing:0.08em;'
        + 'text-transform:uppercase;opacity:0.6;'
      );
      sec.appendChild(h3);

      _config.purposes.forEach(function(p) {
        var row = document.createElement('div');
        row.setAttribute('style',
          'display:flex;align-items:flex-start;gap:14px;padding:12px 14px;border-radius:14px;'
          + 'border:1px solid rgba(15,23,42,0.08);margin-bottom:8px;'
          + 'background:rgba(15,23,42,0.02);'
        );

        var toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.setAttribute('role', 'switch');
        toggle.setAttribute('aria-checked', localDecisions.purposes[p.id] ? 'true' : 'false');
        toggle.setAttribute('aria-label', 'Toggle ' + p.name);
        function paintToggle() {
          var on = !!localDecisions.purposes[p.id];
          toggle.setAttribute('aria-checked', on ? 'true' : 'false');
          toggle.style.background = p.isRequired
            ? (cfg.primaryColor || '#171717')
            : (on ? (cfg.primaryColor || '#171717') : 'rgba(15,23,42,0.18)');
        }
        toggle.setAttribute('style',
          'flex-shrink:0;width:40px;height:24px;border-radius:999px;border:none;cursor:pointer;'
          + 'position:relative;transition:background .15s;'
        );
        var knob = document.createElement('span');
        knob.setAttribute('style',
          'position:absolute;top:3px;inset-inline-start:3px;width:18px;height:18px;border-radius:999px;'
          + 'background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.25);transition:inset-inline-start .15s;'
        );
        function paintKnob() {
          var on = !!localDecisions.purposes[p.id];
          knob.style.insetInlineStart = on ? '19px' : '3px';
        }
        toggle.appendChild(knob);
        paintToggle();
        paintKnob();
        var childLocked = purposeIsChildRestricted(p) && !childRestrictedProcessingAllowed();
        if (!p.isRequired && !childLocked) {
          toggle.addEventListener('click', function() {
            setPurposeLocal(p.id, !localDecisions.purposes[p.id]);
            paintToggle();
            paintKnob();
          });
        }
        if (childLocked) {
          toggle.disabled = true;
          toggle.style.cursor = 'not-allowed';
          toggle.style.opacity = '0.55';
        }

        var meta = document.createElement('div');
        meta.style.flex = '1';
        meta.style.minWidth = '0';
        var nameRow = document.createElement('div');
        nameRow.setAttribute('style', 'display:flex;align-items:center;gap:8px;');
        var n = document.createElement('div');
        n.style.fontWeight = '600';
        n.textContent = p.name;
        nameRow.appendChild(n);
        if (p.isRequired) {
          var reqTag = document.createElement('span');
          reqTag.textContent = cfg.requiredLabel || 'Required';
          reqTag.setAttribute('style',
            'font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;'
            + 'background:rgba(0,196,167,0.16);color:#0B2C4A;'
          );
          nameRow.appendChild(reqTag);
        }
        if (purposeIsChildRestricted(p) && !childRestrictedProcessingAllowed()) {
          var childTag = document.createElement('span');
          childTag.textContent = 'Age-restricted';
          childTag.setAttribute('style',
            'font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;'
            + 'background:rgba(180,83,9,0.12);color:#9a3412;'
          );
          nameRow.appendChild(childTag);
        }
        if (_reconsentNotice && !_ackedPurposeIds[p.id]) {
          appendNewTag(nameRow);
        }
        meta.appendChild(nameRow);
        if (cfg.showPurposeDescriptions !== false && p.description) {
          var d = document.createElement('div');
          d.style.marginTop = '4px';
          d.style.fontSize = '12.5px';
          d.style.opacity = '0.72';
          d.style.lineHeight = '1.5';
          d.textContent = p.description;
          meta.appendChild(d);
        }
        if (cfg.showLegalBasis && p.legalBasis) {
          var lb = document.createElement('div');
          lb.style.marginTop = '4px';
          lb.style.fontSize = '11px';
          lb.style.opacity = '0.55';
          lb.textContent = p.legalBasis;
          meta.appendChild(lb);
        }

        row.appendChild(toggle);
        row.appendChild(meta);
        sec.appendChild(row);
      });
      body.appendChild(sec);
    }

    // --- Vendors list ---
    if (cfg.showVendorList !== false && _config.vendors && _config.vendors.length > 0) {
      var vsep = document.createElement('div');
      vsep.style.height = '4px';
      body.appendChild(vsep);
      var vsec = document.createElement('section');
      vsec.style.padding = '12px 0 4px 0';
      var vh3 = document.createElement('h3');
      vh3.textContent = (cfg.vendorsHeading || 'Vendors') + ' (' + _config.vendors.length + ')';
      vh3.setAttribute('style',
        'margin:0 0 10px 0;font-size:12px;font-weight:700;letter-spacing:0.08em;'
        + 'text-transform:uppercase;opacity:0.6;'
      );
      vsec.appendChild(vh3);

      _config.vendors.forEach(function(v) {
        var vrow = document.createElement('div');
        vrow.setAttribute('style',
          'display:flex;align-items:center;gap:14px;padding:10px 14px;border-radius:12px;'
          + 'border:1px solid rgba(15,23,42,0.06);margin-bottom:6px;'
        );
        var vtoggle = document.createElement('button');
        vtoggle.type = 'button';
        vtoggle.setAttribute('role', 'switch');
        vtoggle.setAttribute('aria-checked', localDecisions.vendors[v.id] ? 'true' : 'false');
        vtoggle.setAttribute('aria-label', 'Toggle vendor ' + v.name);
        var vknob = document.createElement('span');
        vknob.setAttribute('style',
          'position:absolute;top:3px;inset-inline-start:3px;width:18px;height:18px;border-radius:999px;'
          + 'background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.25);transition:inset-inline-start .15s;'
        );
        function paintVendorToggle() {
          var on = !!localDecisions.vendors[v.id];
          vtoggle.setAttribute('aria-checked', on ? 'true' : 'false');
          vtoggle.style.background = on ? (cfg.primaryColor || '#171717') : 'rgba(15,23,42,0.18)';
          vknob.style.insetInlineStart = on ? '19px' : '3px';
        }
        vtoggle.setAttribute('style',
          'flex-shrink:0;width:40px;height:24px;border-radius:999px;border:none;cursor:pointer;'
          + 'position:relative;transition:background .15s;'
        );
        vtoggle.appendChild(vknob);
        paintVendorToggle();
        vtoggle.addEventListener('click', function() {
          setVendorLocal(v.id, !localDecisions.vendors[v.id]);
          paintVendorToggle();
        });

        var vname = document.createElement('div');
        vname.style.flex = '1';
        vname.style.minWidth = '0';
        var vn = document.createElement('div');
        vn.style.fontWeight = '600';
        vn.textContent = v.name;
        var vnameRow = document.createElement('div');
        vnameRow.setAttribute('style', 'display:flex;align-items:center;gap:8px;');
        vnameRow.appendChild(vn);
        if (_reconsentNotice && _hasVendorSnapshot && !_ackedVendorIds[v.id]) {
          appendNewTag(vnameRow);
        }
        vname.appendChild(vnameRow);
        if (v.domain || v.privacyPolicyUrl) {
          var vlink = document.createElement('a');
          vlink.href = safeHttpUrl(v.privacyPolicyUrl) || (v.domain ? safeHttpUrl('https://' + v.domain) : '');
          vlink.target = '_blank';
          vlink.rel = 'noopener noreferrer';
          vlink.textContent = v.domain || 'Privacy policy';
          vlink.setAttribute('style',
            'font-size:12px;opacity:0.6;text-decoration:underline;text-underline-offset:2px;color:inherit;'
          );
          var vmeta = document.createElement('div');
          vmeta.style.marginTop = '2px';
          vmeta.appendChild(vlink);
          vname.appendChild(vmeta);
        }

        vrow.appendChild(vtoggle);
        vrow.appendChild(vname);
        vsec.appendChild(vrow);
      });
      body.appendChild(vsec);
    }

    // Optional, operator-configured alternatives. Standard controls remain
    // available and required purposes are never changed by an offer.
    if (_config.negotiation && _config.negotiation.enabled && _config.negotiation.offers) {
      var osec = document.createElement('section');
      osec.setAttribute('style', 'padding:12px 0 4px 0;');
      var oh = document.createElement('h3');
      oh.textContent = 'Optional alternatives';
      oh.setAttribute('style', 'margin:0 0 4px;font-size:12px;font-weight:700;');
      osec.appendChild(oh);
      var od = document.createElement('p');
      od.textContent = _config.negotiation.disclosure || 'You can ignore these offers and use the standard choices.';
      od.setAttribute('style', 'margin:0 0 10px;font-size:12px;opacity:.7;');
      osec.appendChild(od);
      _config.negotiation.offers.forEach(function(offer) {
        var ob = document.createElement('button');
        ob.type = 'button';
        ob.textContent = offer.title + ' — ' + offer.actionLabel;
        ob.setAttribute('style', 'display:block;width:100%;text-align:left;padding:10px 12px;margin:6px 0;border:1px solid rgba(15,23,42,.12);border-radius:10px;background:transparent;color:inherit;cursor:pointer;');
        ob.addEventListener('click', function() {
          (_config.purposes || []).forEach(function(p) {
            if (!p.isRequired && offer.purposeKeys.indexOf(p.key) !== -1) setPurposeLocal(p.id, true);
          });
          fetch(API_BASE + '/api/sdk/' + encodeURIComponent(SITE_KEY) + '/negotiation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ offerKey: offer.key, outcome: 'selected', purposeKeys: offer.purposeKeys })
          }).catch(function() {});
          var offeredPurposes = Object.keys(localDecisions.purposes).map(function(id) {
            return { purposeId: id, granted: !!localDecisions.purposes[id] };
          });
          var offeredVendors = Object.keys(localDecisions.vendors).map(function(id) {
            return { vendorId: id, granted: !!localDecisions.vendors[id] };
          });
          if (submitConsent('granular', offeredPurposes, offeredVendors, function(err) { finishChoice(err); })) {
            holdChoiceUi();
          }
        });
        osec.appendChild(ob);
      });
      body.appendChild(osec);
    }

    if (californiaEnabled()) {
      var caSec = document.createElement('section');
      caSec.setAttribute('style', 'padding:14px 0 6px 0;border-top:1px solid rgba(15,23,42,.08);');
      var caH = document.createElement('h3');
      caH.textContent = 'California privacy choices';
      caH.setAttribute('style', 'margin:0 0 6px;font-size:13px;font-weight:700;');
      caSec.appendChild(caH);
      var caHelp = document.createElement('p');
      caHelp.textContent = 'These controls are separate from consent preferences. A valid Global Privacy Control signal is honored automatically.';
      caHelp.setAttribute('style', 'margin:0 0 10px;font-size:12px;opacity:.7;line-height:1.45;');
      caSec.appendChild(caHelp);
      var caState = _california && _california.ui ? _california.ui.label : (navigatorGpc() || (_config.california && _config.california.gpcRecognized) ? 'GPC detected' : 'Not opted out');
      var caBadge = document.createElement('p');
      caBadge.textContent = caState;
      caBadge.setAttribute('style', 'margin:0 0 10px;font-size:12px;font-weight:600;');
      caSec.appendChild(caBadge);
      if (_config.california.doNotSellEnabled || _config.california.doNotShareEnabled) {
        var dnsBtn = document.createElement('button');
        dnsBtn.type = 'button';
        dnsBtn.textContent = 'Do Not Sell or Share My Personal Information';
        dnsBtn.setAttribute('style', 'display:block;width:100%;text-align:left;padding:10px 12px;margin:6px 0;border:1px solid rgba(15,23,42,.12);border-radius:10px;background:transparent;color:inherit;cursor:pointer;');
        dnsBtn.addEventListener('click', function() {
          syncCaliforniaOptOut({ doNotSell: true, doNotShare: true }, function() {
            renderPreferenceCenter();
          });
        });
        caSec.appendChild(dnsBtn);
      }
      if (_config.california.limitSensitivePiEnabled) {
        var spiBtn = document.createElement('button');
        spiBtn.type = 'button';
        spiBtn.textContent = 'Limit Use of Sensitive Personal Information';
        spiBtn.setAttribute('style', 'display:block;width:100%;text-align:left;padding:10px 12px;margin:6px 0;border:1px solid rgba(15,23,42,.12);border-radius:10px;background:transparent;color:inherit;cursor:pointer;');
        spiBtn.addEventListener('click', function() {
          syncCaliforniaOptOut({ limitSensitive: true }, function() {
            renderPreferenceCenter();
          });
        });
        caSec.appendChild(spiBtn);
      }
      body.appendChild(caSec);
    }

    // Footer (actions)
    var footer = document.createElement('div');
    footer.setAttribute('style',
      'padding:14px 24px 22px 24px;border-top:1px solid rgba(15,23,42,0.08);'
      + 'display:flex;align-items:center;justify-content:space-between;gap:12px;'
      + 'flex-wrap:wrap;'
    );

    var pcLinks = document.createElement('div');
    pcLinks.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;align-items:center;';
    var pcLinkStyle = 'font-size:12.5px;font-weight:500;color:inherit;opacity:0.7;text-decoration:underline;text-underline-offset:2px;';
    if (cfg.privacyPolicyText && cfg.privacyPolicyUrl) {
      var pl = document.createElement('a');
      pl.href = safeHttpUrl(cfg.privacyPolicyUrl);
      pl.target = '_blank';
      pl.rel = 'noopener noreferrer';
      pl.textContent = cfg.privacyPolicyText;
      pl.setAttribute('style', pcLinkStyle);
      pcLinks.appendChild(pl);
    }
    if (cfg.cookiePolicyUrl) {
      var cl = document.createElement('a');
      cl.href = safeHttpUrl(cfg.cookiePolicyUrl);
      cl.target = '_blank';
      cl.rel = 'noopener noreferrer';
      cl.textContent = cfg.cookiePolicyText || 'Cookie Policy';
      cl.setAttribute('style', pcLinkStyle);
      pcLinks.appendChild(cl);
    }
    appendDataPrincipalRightsControl(pcLinks, pcLinkStyle);
    footer.appendChild(pcLinks);

    var actionRow = document.createElement('div');
    actionRow.style.display = 'flex';
    actionRow.style.flexWrap = 'wrap';
    actionRow.style.gap = '8px';
    actionRow.style.justifyContent = 'flex-end';
    actionRow.style.flex = '1';
    actionRow.style.minWidth = '240px';

    function pcBtn(label, primary, onclick) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.setAttribute('style',
        'cursor:pointer;border-radius:12px;padding:10px 16px;font-size:13.5px;font-weight:600;border:none;'
        + (primary
          ? 'background:' + (cfg.primaryColor || '#171717') + ';color:#fff;'
            + 'box-shadow:0 6px 16px -8px ' + (cfg.primaryColor || '#171717') + ';'
          : 'background:rgba(15,23,42,0.06);color:' + (cfg.textColor || '#171717') + ';'
            + 'border:1px solid rgba(15,23,42,0.08);background:transparent;'
        )
      );
      b.addEventListener('click', onclick);
      b.setAttribute('data-cmp-submit-control', 'true');
      _submitButtons.push(b);
      return b;
    }

    actionRow.appendChild(pcBtn(cfg.rejectAllLabel || 'Reject all', false, function() {
      if (submitConsent('reject-all', [], [], function(err) { finishChoice(err); })) {
        holdChoiceUi();
      }
    }));
    actionRow.appendChild(pcBtn(cfg.savePreferencesLabel || 'Save preferences', true, function() {
      // Build decision arrays for buildDecisionRows
      var purposeDecisions = [];
      var keys = Object.keys(localDecisions.purposes);
      for (var i = 0; i < keys.length; i++) {
        purposeDecisions.push({
          purposeId: keys[i],
          granted: !!localDecisions.purposes[keys[i]]
        });
      }
      var vendorDecisions = [];
      var vkeys = Object.keys(localDecisions.vendors);
      for (var j = 0; j < vkeys.length; j++) {
        vendorDecisions.push({
          vendorId: vkeys[j],
          granted: !!localDecisions.vendors[vkeys[j]]
        });
      }
      if (submitConsent('granular', purposeDecisions, vendorDecisions, function(err) { finishChoice(err); })) {
        holdChoiceUi();
      }
    }));
    actionRow.appendChild(pcBtn(cfg.acceptAllLabel || 'Accept all', false, function() {
      if (submitConsent('accept-all', [], [], function(err) { finishChoice(err); })) {
        holdChoiceUi();
      }
    }));

    var pcStatus = document.createElement('div');
    pcStatus.id = '__cmp_pc_status__';
    pcStatus.setAttribute('role', 'status');
    pcStatus.setAttribute('aria-live', 'polite');
    pcStatus.style.cssText = 'display:none;width:100%;font-size:12px;line-height:1.45;font-weight:600;';
    footer.appendChild(pcStatus);
    footer.appendChild(actionRow);

    pc.appendChild(header);
    pc.appendChild(body);
    pc.appendChild(footer);
    document.body.appendChild(pc);
    _hostScroll.endTransition();

    try { _pcLastFocus = document.activeElement || null; } catch (eAf) { _pcLastFocus = null; }
    document.addEventListener('keydown', onPcKeyDown, true);
    var firstFocus = pcFocusables(pc)[0];
    if (firstFocus && typeof firstFocus.focus === 'function') {
      try { firstFocus.focus(); } catch (eFf) {}
    }

    window.dispatchEvent(new CustomEvent('cmp:openPreferenceCenter'));
  }

  window.CMP = {
    getConsent: getConsent,
    getCaliforniaOptOut: function() { return _california; },
    getEnforcementDiagnostics: function() {
      return {
        metrics: {
          bootstrapMs: _enforcementMetrics.bootstrapMs,
          inspected: _enforcementMetrics.inspected,
          blocked: _enforcementMetrics.blocked,
          allowed: _enforcementMetrics.allowed,
          observerBatches: _enforcementMetrics.observerBatches,
          inspectionMs: _enforcementMetrics.inspectionMs
        },
        unknownTrackerBehavior: unknownTrackerBehavior(),
        events: enforcementDebugEnabled()
          ? (window.__CMP_ENFORCEMENT_LOG__ || []).slice()
          : []
      };
    },
    rescanTrackers: function() {
      applyTrackerEnforcement();
      return this.getEnforcementDiagnostics();
    },
    onConsentChange: function(fn) { _listeners.push(fn); },
    showBanner: function() {
      _hostScroll.beginTransition();
      removeBanner();
      renderBanner();
      _hostScroll.endTransition();
    },
    openPreferenceCenter: function() {
      if (!_config) {
        log('openPreferenceCenter called before config loaded');
        return;
      }
      renderPreferenceCenter();
    },
    downloadReceipt: function() {
      downloadConsentReceipt();
    },
    acceptAll: function() {
      return new Promise(function(resolve, reject) {
        var queued = submitConsent('accept-all', [], [], function(err, consentId) {
          if (err) { restoreChoiceUi(); reject(err); return; }
          _choiceUiHeld = false;
          resolve(consentId);
        });
        if (queued) holdChoiceUi();
        else reject(new Error('A consent request is already being submitted'));
      });
    },
    rejectAll: function() {
      return new Promise(function(resolve, reject) {
        var queued = submitConsent('reject-all', [], [], function(err, consentId) {
          if (err) { restoreChoiceUi(); reject(err); return; }
          _choiceUiHeld = false;
          resolve(consentId);
        });
        if (queued) holdChoiceUi();
        else reject(new Error('A consent request is already being submitted'));
      });
    },
    saveGranular: function(purposeDecisions, vendorDecisions) {
      return new Promise(function(resolve, reject) {
        var queued = submitConsent('granular', purposeDecisions || [], vendorDecisions || [], function(err, consentId) {
          if (err) { restoreChoiceUi(); reject(err); return; }
          _choiceUiHeld = false;
          resolve(consentId);
        });
        if (queued) holdChoiceUi();
        else reject(new Error('A consent request is already being submitted'));
      });
    },
    exportPortableConsent: function(targetWebsiteId) {
      return new Promise(function(resolve, reject) {
        if (!_config || !_consentId || !targetWebsiteId) {
          reject(new Error('Active consent and targetWebsiteId are required'));
          return;
        }
        var query = new URLSearchParams({
          consentId: _consentId,
          websiteId: _config.websiteId,
          targetWebsiteId: targetWebsiteId
        });
        fetch(API_BASE + '/api/consent/portable/export?' + query.toString(), { cache: 'no-store' })
          .then(function(r) { return r.json(); })
          .then(function(data) {
            if (!data || !data.success) throw new Error((data && data.message) || 'Portable export failed');
            resolve(data);
          })
          .catch(function(err) { reject(err); });
      });
    },
    // Import consent exported from a different website/domain.
    //
    // portableBundle: { token } or { code } or legacy-compatible { claims, proof }
    // targetWebsiteId: UUID of the site that will receive enforcement.
    importPortableConsent: function(portableBundle, targetWebsiteId) {
      return new Promise(function(resolve, reject) {
        try {
          var payload = portableBundle || {};
          var claims = payload.claims || null;
          var proof = payload.proof || null;
          var token = payload.token || null;
          var code = payload.code || null;
          var tid = targetWebsiteId || '';

          if ((!token && !code && (!claims || !proof)) || !tid) {
            reject(new Error('A portable token, code, or signed bundle and targetWebsiteId are required'));
            return;
          }

          fetch(API_BASE + '/api/consent/portable/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              claims: claims,
              proof: proof,
              token: token,
              code: code,
              targetWebsiteId: tid
            })
          })
            .then(function(r) { return r.json(); })
            .then(function(data) {
              if (!data || !data.success) throw new Error((data && data.message) || 'Portable import failed');
              // Save imported decisions into local storage so enforcement runs immediately.
              saveConsent(
                data.consentId,
                data.decisions || [],
                data.expiresAt,
                data.choice || 'granular',
                data.signals,
                data.confirmedAt,
                '',
                data.stateVersion
              );
              resolve(data);
            })
            .catch(function(err) { reject(err); });
        } catch (e) {
          reject(e);
        }
      });
    },
    setLanguage: function(lang, callback) {
      _explicitLang = String(lang || '').slice(0, 35);
      applyLocalNotice(_explicitLang);
      var bannerOpen = !!document.getElementById('__cmp_banner__');
      var pcOpen = !!document.getElementById('__cmp_pc__');
      var prefsOpen = !!document.getElementById('__cmp_prefs__');
      _hostScroll.beginTransition();
      if (bannerOpen) { removeBanner(); renderBanner(); }
      if (pcOpen) renderPreferenceCenter();
      if (prefsOpen) renderCookiePreferencesPanel();
      _hostScroll.endTransition();
      fetch(configRequestUrl(), { cache: 'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data.success) {
            if (callback) callback(new Error(data.message || 'Config load failed'));
            return;
          }
          _config = applyAssignedAbTest(data);
          if (data.noticeRoot) _noticeRoot = data.noticeRoot;
          rememberPolicyContext(presentedPolicyContext(data));
          applyLocalNotice(_explicitLang);
          _hostScroll.beginTransition();
          if (bannerOpen || document.getElementById('__cmp_banner__')) { removeBanner(); renderBanner(); }
          if (pcOpen || document.getElementById('__cmp_pc__')) renderPreferenceCenter();
          if (prefsOpen || document.getElementById('__cmp_prefs__')) renderCookiePreferencesPanel();
          _hostScroll.endTransition();
          if (callback) callback(null, data.resolvedLanguage);
        })
        .catch(function(err) {
          log('setLanguage failed: ' + err);
          if (callback) callback(err);
        });
    },
    withdrawConsent: function() {
      return new Promise(function(resolve, reject) {
        if (!_consentId || !_config) {
          reject(new Error('No confirmed consent is available to withdraw'));
          return;
        }
        if (_withdrawBusy) {
          reject(new Error('A withdrawal request is already being submitted'));
          return;
        }
        _withdrawBusy = true;
        var withdrawingConsentId = _consentId;
        var withdrawalJob = {
          submissionId: newSubmissionId(),
          startedAt: Date.now()
        };
        persistUnconfirmedState(
          'PENDING',
          withdrawalJob,
          'Withdrawing consent… Optional processing remains blocked.'
        );
        fetch(API_BASE + '/api/consent/withdraw', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            consentId: withdrawingConsentId,
            websiteId: _config.websiteId,
            siteKey: SITE_KEY,
            expectedStateVersion: _stateVersion
          })
        })
        .then(function(r) {
          return r.json().then(function(data) { return { ok: r.ok, data: data }; });
        })
        .then(function(result) {
          if (
            !result.ok ||
            !result.data.success ||
            !result.data.withdrawnAt ||
            !Number.isInteger(result.data.stateVersion)
          ) {
            throw new Error('Withdraw failed');
          }
          var revision = Date.parse(result.data.withdrawnAt) || Date.now();
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            status: 'withdrawn',
            serverConfirmed: true,
            consentId: withdrawingConsentId,
            submissionId: withdrawalJob.submissionId,
            revision: revision,
            stateVersion: result.data.stateVersion,
            decisions: []
          }));
          localStorage.removeItem(EXPIRY_KEY);
          _confirmedRevision = revision;
          _stateVersion = result.data.stateVersion;
          _consentId = null;
          _tcString = null;
          _gppString = null;
          _gppSections = {};
          blockOptionalProcessing('DENIED', 'Consent withdrawn');
          fireIabEvents('useractioncomplete');
          _listeners.forEach(function(fn) { try { fn(getConsent()); } catch(e) {} });
          removeCookiePreferencesPanel();
          renderBanner();
          _withdrawBusy = false;
          resolve(result.data);
        })
        .catch(function(err) {
          log('Withdraw consent failed: ' + err);
          persistUnconfirmedState(
            'FAILED',
            withdrawalJob,
            'Withdrawal could not be confirmed. Optional processing remains blocked.'
          );
          _withdrawBusy = false;
          reject(new Error('Withdrawal could not be confirmed. Please retry.'));
        });
      });
    }
  };

  function verifyStoredConsent(stored, callback) {
    if (
      !stored ||
      stored.status !== 'confirmed' ||
      stored.serverConfirmed !== true ||
      !stored.consentId
    ) {
      blockOptionalProcessing(
        stored && stored.status === 'pending' ? 'PENDING' : 'FAILED',
        stored && stored.status === 'pending'
          ? 'Consent confirmation is pending. Optional processing remains blocked.'
          : ''
      );
      if (callback) callback(false);
      return;
    }
    blockOptionalProcessing('PENDING', '');
    fetch(
      API_BASE + '/api/consent/record?consentId=' +
        encodeURIComponent(stored.consentId) +
        '&websiteId=' + encodeURIComponent(_config.websiteId) +
        '&siteKey=' + encodeURIComponent(SITE_KEY),
      { cache: 'no-store' }
    )
      .then(function(r) {
        return r.json().then(function(data) { return { ok: r.ok, data: data }; });
      })
      .then(function(result) {
        var data = result.data;
        if (
          !result.ok ||
          !data.success ||
          data.expired ||
          data.requiresReconsent ||
          !data.record ||
          data.record.status === 'withdrawn' ||
          data.record.policyVersionId !== stored.policyVersionId ||
          !Array.isArray(data.decisions)
        ) {
          throw new Error('Stored consent is not active');
        }
        if (data.california) persistCalifornia(data.california);
        var applied = saveConsent(
          data.record.consentId,
          data.decisions,
          data.record.expiresAt,
          stored.choice || '',
          {
            tcString: stored.tcString,
            gppString: stored.gppString,
            parsedSections: stored.gppSections
          },
          data.record.consentedAt,
          stored.submissionId || '',
          data.record.stateVersion
        );
        if (callback) callback(applied);
      })
      .catch(function(err) {
        log('Stored consent verification failed: ' + err);
        blockOptionalProcessing('FAILED', '');
        if (callback) callback(false);
      });
  }

  window.addEventListener('storage', function(event) {
    if (event && event.key === CA_OPT_OUT_KEY) {
      _california = loadStoredCalifornia();
      applyTrackerEnforcement();
      return;
    }
    if (!event || event.key !== STORAGE_KEY) return;
    var stored = loadStoredConsent();
    if (!stored || stored.status === 'withdrawn') {
      _consentId = null;
      blockOptionalProcessing('DENIED', '');
      return;
    }
    if (stored.status === 'pending' || stored.status === 'failed') {
      if (stored.consentId) _consentId = stored.consentId;
      blockOptionalProcessing(
        stored.status === 'pending' ? 'PENDING' : 'FAILED',
        ''
      );
      return;
    }
    verifyStoredConsent(stored);
  });

  function refreshPublishedConfig() {
    if (document.hidden) return;
    fetch(configRequestUrl(), {
      cache: 'no-store',
      mode: 'cors',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' }
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.success) return;
        if (!_config) {
          applyLoadedConfig(data);
          return;
        }
        var nextConfig = applyAssignedAbTest(data);
        var nextRevision = configRevision(nextConfig);
        var bannerOpen = !!document.getElementById('__cmp_banner__');
        var pcOpen = !!document.getElementById('__cmp_pc__');
        if ((bannerOpen || pcOpen) && _policyContext) {
          log('Policy changed while consent UI is open; preserving the context currently shown');
          return;
        }
        if (nextRevision === _configRevision) {
          rememberPolicyContext(presentedPolicyContext(data));
          return;
        }
        var stored = loadStoredConsent();
        _config = nextConfig;
        rememberPolicyContext(presentedPolicyContext(data));
        _configRevision = nextRevision;
        _configHash = (data.policy && data.policy.configHash) || _configHash;
        applyTrackerEnforcement();
        publishExternalSignals();

        if (stored && consentScopeChanged(stored, nextConfig)) {
          _reconsentNotice = 'This consent policy has changed. Please review your choices.';
          showBannerWhenReady();
        } else if (!stored || shouldReshowBanner(stored, nextConfig.bannerConfig) || bannerOpen) {
          showBannerWhenReady();
        } else {
          syncPreferenceWidget();
        }
        if (pcOpen) showPreferenceCenterWhenReady();
        log('Applied refreshed policy configuration');
      })
      .catch(function(err) { warn('Policy refresh failed: ' + err); });
  }

  function scheduleConfigRefresh() {
    if (typeof window.setInterval !== 'function') return;
    var requestedMs = Number(window.__CMP_CONFIG_REFRESH_MS);
    var refreshMs = isFinite(requestedMs)
      ? Math.max(5000, Math.min(300000, requestedMs))
      : 15000;
    if (window.__CMP_CONFIG_REFRESH_TIMER__) {
      window.clearInterval(window.__CMP_CONFIG_REFRESH_TIMER__);
    }
    if (window.__CMP_CONFIG_VISIBILITY_HANDLER__) {
      document.removeEventListener('visibilitychange', window.__CMP_CONFIG_VISIBILITY_HANDLER__);
    }
    window.__CMP_CONFIG_REFRESH_TIMER__ = window.setInterval(refreshPublishedConfig, refreshMs);
    window.__CMP_CONFIG_VISIBILITY_HANDLER__ = function() {
      if (!document.hidden) refreshPublishedConfig();
    };
    document.addEventListener('visibilitychange', window.__CMP_CONFIG_VISIBILITY_HANDLER__);
  }

  function pauseTaggedScripts() {
    var tags = document.querySelectorAll('script[data-cmp-purpose]');
    tags.forEach(function(el) {
      if (el.getAttribute('type') !== 'text/plain') {
        el.setAttribute('type', 'text/plain');
      }
    });
  }
  function fetchConfigJson() {
    var headers = { 'Cache-Control': 'no-cache', Pragma: 'no-cache' };
    if (_configHash) headers['If-None-Match'] = '"' + _configHash + '"';
    return fetch(configRequestUrl(), {
      cache: 'no-store',
      mode: 'cors',
      headers: headers
    }).then(function(r) {
      if (r.status === 304) return { success: true, unchanged: true };
      return r.json().then(function(data) {
        return data;
      }, function() {
        throw new Error('Config response was not JSON (HTTP ' + r.status + ')');
      });
    });
  }

  function bannerVisualKey(cfg) {
    var b = cfg && cfg.bannerConfig;
    if (!b) return '';
    return [
      b.layout || '',
      b.position || '',
      b.title || '',
      b.description || '',
      b.acceptAllLabel || '',
      b.rejectAllLabel || '',
      b.customizeLabel || '',
      b.showAcceptAll ? '1' : '0',
      b.showRejectAll ? '1' : '0',
      b.showCustomize ? '1' : '0',
      b.showPoweredBy ? '1' : '0',
      b.showCloseButton ? '1' : '0',
      b.primaryColor || '',
      b.backgroundColor || '',
      b.textColor || '',
      String(b.borderRadius == null ? '' : b.borderRadius),
      b.overlayEnabled ? '1' : '0',
      b.blockPageUntilConsent ? '1' : '0',
      b.privacyPolicyUrl || '',
      b.cookiePolicyUrl || ''
    ].join('\x1f');
  }

  function applyLoadedConfig(data) {
    var previousVisualKey = bannerVisualKey(_config);
    var bannerWasOpen = !!document.getElementById('__cmp_banner__');
    if (data.noticeRoot) _noticeRoot = data.noticeRoot;
    _config = applyAssignedAbTest(data);
    if (_explicitLang) applyLocalNotice(_explicitLang);
    rememberPolicyContext(presentedPolicyContext(data));
    _configRevision = configRevision(_config);
    _configHash = (data.policy && data.policy.configHash) || '';
    scheduleConfigRefresh();
    initExternalSignals();
    _california = loadStoredCalifornia();

    if (_choiceUiHeld || _submitBusy || _queuedSubmit) {
      flushConsentSubmit();
      return;
    }

    var stored = loadStoredConsent();
    if (
      stored &&
      stored.status === 'confirmed' &&
      stored.serverConfirmed === true &&
      stored.consentId &&
      stored.decisions
    ) {
      _consentId = stored.consentId;
      rememberAckedScope(stored);
      if (consentScopeChanged(stored, data)) {
        blockOptionalProcessing('FAILED', '');
        _reconsentNotice = 'Some changes were made since you last visited this site. Please review your consent choices.';
        showBannerWhenReady();
        showPreferenceCenterWhenReady();
      } else {
        verifyStoredConsent(stored, function(applied) {
          if (!applied || shouldReshowBanner(stored, data.bannerConfig)) {
            showBannerWhenReady();
          } else {
            syncPreferenceWidget();
          }
        });
      }
      syncCaliforniaOptOut({}, function() {
        applyTrackerEnforcement();
        publishExternalSignals();
      });
      return;
    }

    // UNKNOWN, PENDING, FAILED, legacy, and withdrawn local states all fail
    // closed. Operator defaults never create server-confirmed consent.
    if (
      stored &&
      (stored.status === 'pending' || stored.status === 'failed') &&
      stored.submissionId
    ) {
      _consentId = stored.consentId || null;
      _retryJob = {
        submissionId: stored.submissionId,
        signature: stored.signature || '',
        choice: stored.choice || '',
        purposeDecisions: stored.purposeDecisions || [],
        vendorDecisions: stored.vendorDecisions || [],
        startedAt: stored.startedAt || Date.now()
      };
    }
    blockOptionalProcessing(
      stored && stored.status === 'pending'
        ? 'PENDING'
        : (
            stored && stored.status === 'withdrawn'
              ? 'DENIED'
              : (stored && stored.status === 'failed' ? 'FAILED' : 'UNKNOWN')
          ),
      stored && stored.status === 'pending'
        ? 'Consent confirmation is pending. Optional processing remains blocked.'
        : (
            stored && stored.status === 'failed'
              ? 'Consent could not be confirmed. Optional processing remains blocked. Please retry.'
              : ''
          )
    );
    var sameVisual = bannerWasOpen && previousVisualKey && previousVisualKey === bannerVisualKey(_config);
    if (!sameVisual || _reconsentNotice) {
      showBannerWhenReady();
    }
    if (stored && (stored.status === 'pending' || stored.status === 'failed')) {
      renderSubmissionState(
        stored.status === 'pending'
          ? 'Consent confirmation is pending. Optional processing remains blocked.'
          : 'Consent could not be confirmed. Optional processing remains blocked. Please retry.'
      );
    }
    syncCaliforniaOptOut({}, function() {
      applyTrackerEnforcement();
      publishExternalSignals();
    });
    flushConsentSubmit();
  }

  pauseTaggedScripts();

  // ── Instant paint ────────────────────────────────────────────────────────
  // First paint must not wait on the network when we already know this site's
  // published banner. Use a still-valid cached config when we can submit from
  // it; otherwise paint the last cached design and attach a fresh policy
  // context when config arrives. Never paint a generic default notice — that
  // flashes the wrong layout before the chosen design loads.
  var CONFIG_CACHE_KEY = '__cmp_cfg_' + SITE_KEY;
  var CONFIG_CACHE_MIN_CONTEXT_MS = 2 * 60 * 1000;
  var CONFIG_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

  function cachedConfigHasBanner(cfg) {
    return !!(cfg && cfg.success && cfg.bannerConfig);
  }

  function cachedConfigUsable(cfg) {
    if (!cachedConfigHasBanner(cfg) || !cfg.websiteId) return false;
    var age = Date.now() - (cfg.__cmpCachedAt || 0);
    if (!(age >= 0 && age < CONFIG_CACHE_MAX_AGE_MS)) return false;
    var ctx = presentedPolicyContext(cfg);
    var expiresAt = ctx && ctx.claims ? ctx.claims.expiresAt : (ctx && ctx.expiresAt);
    if (!ctx || !ctx.token || !expiresAt) return false;
    var expires = Date.parse(expiresAt);
    return isFinite(expires) && expires - Date.now() > CONFIG_CACHE_MIN_CONTEXT_MS;
  }

  function readAnyCachedConfig() {
    var raw = null;
    try { raw = localStorage.getItem(CONFIG_CACHE_KEY); } catch (e1) {}
    if (!raw) {
      try { raw = sessionStorage.getItem(CONFIG_CACHE_KEY); } catch (e2) {}
    }
    if (!raw) return null;
    try {
      var cfg = JSON.parse(raw);
      var age = Date.now() - (cfg && cfg.__cmpCachedAt || 0);
      if (!cachedConfigHasBanner(cfg) || !(age >= 0 && age < CONFIG_CACHE_MAX_AGE_MS)) return null;
      return cfg;
    } catch (e3) {
      return null;
    }
  }

  function writeCachedConfig(data) {
    try {
      data.__cmpCachedAt = Date.now();
      var serialized = JSON.stringify(data);
      try { localStorage.setItem(CONFIG_CACHE_KEY, serialized); } catch (e1) {}
      try { sessionStorage.setItem(CONFIG_CACHE_KEY, serialized); } catch (e2) {}
    } catch (eWrite) {}
  }

  function hasConfirmedLocalConsent() {
    var stored = loadStoredConsent();
    return !!(
      stored &&
      stored.status === 'confirmed' &&
      stored.serverConfirmed === true &&
      stored.consentId
    );
  }

  function paintVisualBanner(cfg, extras) {
    extras = extras || {};
    _config = {
      success: true,
      websiteId: extras.websiteId || '',
      bannerConfig: cfg,
      purposes: extras.purposes || [],
      vendors: extras.vendors || [],
      resolvedLanguage: extras.resolvedLanguage || '',
      childProtection: extras.childProtection || null,
      california: extras.california || null
    };
    showBannerWhenReady();
  }

  var paintedFromCache = false;
  var cachedCfg = readAnyCachedConfig();
  if (cachedCfg && cachedConfigUsable(cachedCfg)) {
    try {
      applyLoadedConfig(cachedCfg);
      paintedFromCache = !!_config;
    } catch (eCache) {}
  } else if (!hasConfirmedLocalConsent()) {
    try {
      if (cachedCfg && cachedCfg.bannerConfig) {
        paintVisualBanner(cachedCfg.bannerConfig, cachedCfg);
      }
    } catch (eVisual) {}
  }

  fetchConfigJson()
    .then(function(data) {
      if (!data || data.unchanged) {
        if (data && data.unchanged && _config) {
          flushConsentSubmit();
          return;
        }
        warn('Config load failed: ' + ((data && data.message) || 'unknown error'));
        scheduleConfigRefresh();
        return;
      }
      if (!data.success) {
        warn('Config load failed: ' + ((data && data.message) || 'unknown error'));
        scheduleConfigRefresh();
        return;
      }
      writeCachedConfig(data);
      if (paintedFromCache && _config) {
        var liveRevision = configRevision(applyAssignedAbTest(data));
        if (liveRevision === _configRevision) {
          rememberPolicyContext(presentedPolicyContext(data));
          flushConsentSubmit();
          return;
        }
      }
      applyLoadedConfig(data);
    })
    .catch(function(err) { warn('Failed to initialise CMP: ' + err); scheduleConfigRefresh(); });

})(window, document);
`.trim();
}

// ---------------------------------------------------------------------------
// buildEmbedSnippet
// Returns the small loader snippet that goes in <head>.
// The main SDK is loaded async from the CDN URL.
// ---------------------------------------------------------------------------

export function buildEmbedSnippet(options: {
  siteKey: string;
  cdnUrl: string;
}): string {
  let preconnect = "";
  try {
    const origin = new URL(options.cdnUrl).origin;
    if (origin) {
      preconnect = `<link rel="preconnect" href="${origin}" crossorigin>\n<link rel="dns-prefetch" href="${origin}">\n`;
    }
  } catch {
    /* relative cdn URLs skip preconnect */
  }
  return `<!-- Consent Management Platform -->
<!-- Load synchronously before optional trackers. -->
${preconnect}<script src="${options.cdnUrl}" data-site-key="${options.siteKey}"></script>
<!-- /CMP -->`;
}

// ---------------------------------------------------------------------------
// buildInlineSnippet
// Returns the full SDK embedded inline for testing / development — no CDN.
// The siteKey and apiBase are baked in at generation time.
// ---------------------------------------------------------------------------

export function buildInlineSnippet(options: {
  siteKey: string;
  apiBase: string;
}): string {
  return `<script>\n${buildCmpSdkScript(options)}\n</script>`;
}
