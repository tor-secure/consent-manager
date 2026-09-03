// ---------------------------------------------------------------------------
// CMP SDK Script Generator
//
// Generates the self-contained browser JavaScript string that is served from
// a CDN (or embedded inline for testing). The script:
//
//  1. Loads the CMP config from /api/sdk/{siteKey}/config
//  2. Checks localStorage for stored consent (consentId)
//  3. If consent exists and is not expired: loads stored decisions, computes
//     the blocklist, and fires enforcement immediately — before DOMContentLoaded
//     so third-party scripts added via data-cmp-purpose are paused.
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
//  Cookies set by unknown third-party code cannot be intercepted client-side
//  without a proxy; we only enforce on scripts here. Full cookie enforcement
//  requires a server-side proxy or header-based approach — documented as a
//  future task.
//
// NOTE: This file produces a TypeScript string literal, not a compiled bundle.
// The actual browser script is embedded verbatim via the template literal
// below. A future task will set up a Rollup/esbuild pipeline to compile a
// proper optimised bundle.
// ---------------------------------------------------------------------------

import { HOST_SCROLL_LOCK_RUNTIME } from "@/lib/sdk/scroll-lock";

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

  var _config      = null;
  var _decisions   = {};
  var _consentId   = null;
  var _abVariantId = null;
  var _listeners   = [];
  var _explicitLang = '';
  var _pcLastFocus = null;
  var _reconsentNotice = '';
  var _ackedPurposeIds = {};
  var _ackedVendorIds = {};
  var _hasVendorSnapshot = false;
  var _submitBusy = false;
  var _queuedSubmit = null;
${HOST_SCROLL_LOCK_RUNTIME}
  if (window.__CMP_HOST_SCROLL_LOCK__ && typeof window.__CMP_HOST_SCROLL_LOCK__.teardown === 'function') {
    try { window.__CMP_HOST_SCROLL_LOCK__.teardown(); } catch (eLock) {}
  }
  var _hostScroll = createHostScrollLock(window, document);
  window.__CMP_HOST_SCROLL_LOCK__ = _hostScroll;

  function log(msg) {
    if (window.__CMP_DEBUG) console.log('[CMP]', msg);
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
    try { id = sessionStorage.getItem(storeKey); } catch (eAb) {}
    for (i = 0; i < variants.length; i++) {
      if (variants[i] && variants[i].id === id) { selected = variants[i]; break; }
    }
    if (!selected) {
      var total = 0;
      for (i = 0; i < variants.length; i++) total += Math.max(0, Number(variants[i].weight) || 0);
      if (total <= 0) {
        selected = variants[Math.min(variants.length - 1, Math.floor(Math.random() * variants.length))];
      } else {
        var cursor = Math.random() * total;
        for (i = 0; i < variants.length; i++) {
          cursor -= Math.max(0, Number(variants[i].weight) || 0);
          if (cursor <= 0) { selected = variants[i]; break; }
        }
        if (!selected) selected = variants[variants.length - 1];
      }
      try { if (selected && selected.id) sessionStorage.setItem(storeKey, selected.id); } catch (eStore) {}
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

  function noticeDirection() {
    if (_config && _config.locale && _config.locale.direction) return _config.locale.direction;
    var lang = (_config && _config.resolvedLanguage) || '';
    var base = String(lang).split('-')[0].toLowerCase();
    return (base === 'ar' || base === 'he' || base === 'fa' || base === 'ur') ? 'rtl' : 'ltr';
  }

  function availableLocales() {
    var supported = (_config && _config.locale && _config.locale.supported) || [];
    var translations = (_config && _config.bannerConfig && _config.bannerConfig.translations) || {};
    var codes = supported.length ? supported.slice() : Object.keys(translations);
    if (codes.indexOf('en') === -1) codes.unshift('en');
    return codes;
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
    if (_config.signals.iabTcf && _config.signals.iabTcf.enabled && typeof window.__tcfapi !== 'function') {
      window.__tcfapi = function(command, version, callback) {
        if (typeof callback !== 'function') return;
        if (command === 'ping') {
          callback({
            gdprApplies: true,
            cmpLoaded: false,
            cmpStatus: 'stub',
            displayStatus: 'hidden',
            apiVersion: '2.2',
            cmpId: 0,
            cmpVersion: 0,
            tcfPolicyVersion: 4
          }, true);
          return;
        }
        callback({ cmpStatus: 'stub', tcString: null }, false);
      };
    }
    if (_config.signals.iabGpp && _config.signals.iabGpp.enabled && typeof window.__gpp !== 'function') {
      window.__gpp = function(command, callback) {
        if (typeof callback !== 'function') return;
        if (command === 'ping') {
          callback({
            gppVersion: '1.1',
            cmpStatus: 'stub',
            cmpDisplayStatus: 'hidden',
            signalStatus: 'not ready',
            supportedAPIs: [],
            sectionList: [],
            applicableSections: [-1],
            gppString: ''
          }, true);
          return;
        }
        callback({ cmpStatus: 'stub', gppString: null }, false);
      };
    }
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
        var signals = map[p.key] || [];
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

  function isBlocked(rule) {
    if (rule.isEssential) return false;
    if (rule.status !== 'active') return false;
    if (rule.purposeId) {
      if (!_decisions.purposes || !_decisions.purposes[rule.purposeId]) return true;
    }
    if (rule.vendorId) {
      if (!_decisions.vendors || !_decisions.vendors[rule.vendorId]) return true;
    }
    if (!rule.purposeId && !rule.vendorId) return true;
    return false;
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
      var purposeKey = el.getAttribute('data-cmp-purpose');
      var granted = false;

      if (_config && _config.purposes) {
        _config.purposes.forEach(function(p) {
          if (p.key === purposeKey && _decisions.purposes && _decisions.purposes[p.id]) {
            granted = true;
          }
        });
      }

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
    _decisions = { purposes: {}, vendors: {} };
    if (!decisionsArray) return;
    decisionsArray.forEach(function(d) {
      if (d.purposeId) _decisions.purposes[d.purposeId] = d.granted;
      if (d.vendorId)  _decisions.vendors[d.vendorId]   = d.granted;
    });
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

  function shouldReshowBanner(stored, cfg) {
    if (cfg && cfg.showOnEveryVisit) return true;
    return storedChoiceIsReject(stored);
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

  function showPreferenceCenterWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { renderPreferenceCenter(); });
    } else {
      renderPreferenceCenter();
    }
  }

  function showBannerWhenReady() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', renderBanner);
    } else {
      renderBanner();
    }
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

  function saveConsent(consentId, decisionsArray, expiresAt, choice) {
    try {
      _consentId = consentId;
      applyDecisions(decisionsArray);
      var scope = currentScopeSnapshot(_config);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        consentId: consentId,
        decisions: decisionsArray,
        choice: choice || '',
        policyVersionId: scope.policyVersionId,
        purposeIds: scope.purposeIds,
        vendorIds: scope.vendorIds
      }));
      _reconsentNotice = '';
      rememberAckedScope({ purposeIds: scope.purposeIds, vendorIds: scope.vendorIds });
      if (expiresAt) {
        localStorage.setItem(EXPIRY_KEY, String(new Date(expiresAt).getTime()));
      }
      enforceScriptTags();
      publishExternalSignals();
      _listeners.forEach(function(fn) { try { fn(getConsent()); } catch(e) {} });
      syncPreferenceWidget();
    } catch(e) { log('Failed to save consent: ' + e); }
  }

  function buildOptimisticDecisions(choice, purposeDecisions, vendorDecisions) {
    var out = [];
    var i;
    if (choice === 'granular') {
      (purposeDecisions || []).forEach(function(d) {
        if (!d || !d.purposeId) return;
        out.push({ purposeId: d.purposeId, vendorId: null, granted: !!d.granted, decision: 'granular' });
      });
      (vendorDecisions || []).forEach(function(d) {
        if (!d || !d.vendorId) return;
        out.push({ purposeId: null, vendorId: d.vendorId, granted: !!d.granted, decision: 'granular' });
      });
      return out;
    }
    var grantAll = choice === 'accept-all';
    var purposes = (_config && _config.purposes) || [];
    var vendors = (_config && _config.vendors) || [];
    for (i = 0; i < purposes.length; i++) {
      out.push({
        purposeId: purposes[i].id,
        vendorId: null,
        granted: grantAll || !!purposes[i].isRequired,
        decision: choice
      });
    }
    for (i = 0; i < vendors.length; i++) {
      out.push({
        purposeId: null,
        vendorId: vendors[i].id,
        granted: grantAll,
        decision: choice
      });
    }
    return out;
  }

  function persistLatestChoice(choice, decisionsArray) {
    applyDecisions(decisionsArray);
    try {
      var scope = currentScopeSnapshot(_config);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        consentId: _consentId || '',
        decisions: decisionsArray,
        choice: choice || '',
        policyVersionId: scope.policyVersionId,
        purposeIds: scope.purposeIds,
        vendorIds: scope.vendorIds
      }));
    } catch (ePersist) {}
    enforceScriptTags();
    publishExternalSignals();
    _listeners.forEach(function(fn) { try { fn(getConsent()); } catch(e) {} });
  }

  function flushConsentSubmit() {
    if (_submitBusy || !_queuedSubmit || !_config) return;
    var job = _queuedSubmit;
    _queuedSubmit = null;
    _submitBusy = true;

    var body = {
      websiteId: _config.websiteId,
      consentId: _consentId || undefined,
      language: (_config && _config.resolvedLanguage) || detectRequestedLang() || 'en',
      abVariant: _abVariantId || undefined,
      submission: {
        choice: job.choice,
        purposeDecisions: job.purposeDecisions || [],
        vendorDecisions: job.vendorDecisions || []
      }
    };

    fetch(API_BASE + '/api/consent/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) throw new Error(data.message || 'Submit failed');
      if (data.consentId) _consentId = data.consentId;
      if (_queuedSubmit) return;
      var decisions = (data.decisions && data.decisions.length)
        ? data.decisions
        : job.optimistic;
      saveConsent(data.consentId, decisions, data.expiresAt, job.choice);
      if (job.callback) job.callback(null, data.consentId);
    })
    .catch(function(err) {
      log('Submit consent failed: ' + err);
      if (!_queuedSubmit && job.callback) job.callback(err);
    })
    .then(function() {
      _submitBusy = false;
      flushConsentSubmit();
    });
  }

  function submitConsent(choice, purposeDecisions, vendorDecisions, callback) {
    var optimistic = buildOptimisticDecisions(choice, purposeDecisions, vendorDecisions);
    persistLatestChoice(choice, optimistic);
    _queuedSubmit = {
      choice: choice,
      purposeDecisions: purposeDecisions || [],
      vendorDecisions: vendorDecisions || [],
      callback: callback,
      optimistic: optimistic
    };
    flushConsentSubmit();
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
    if (document.getElementById('__cmp_banner__') || document.getElementById('__cmp_pc__')) return;
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
      + 'background:' + (cfg.primaryColor || '#4f46e5') + ';color:#fff;'
      + 'box-shadow:0 8px 24px rgba(15,23,42,0.25);'
      + 'display:flex;align-items:center;justify-content:center;padding:0;'
    );
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10"/><circle cx="8" cy="10" r="1.1" fill="currentColor"/><circle cx="15" cy="9" r="1.3" fill="currentColor"/><circle cx="12" cy="15" r="1.1" fill="currentColor"/></svg>';
    btn.addEventListener('click', function() {
      if (window.CMP && window.CMP.openPreferenceCenter) window.CMP.openPreferenceCenter();
    });
    if (document.body) document.body.appendChild(btn);
  }

  function dntRequested() {
    var n = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
    return n === '1' || n === 'yes';
  }

  function renderBanner() {
    if (!_config || !_config.bannerConfig) return;
    var cfg = _config.bannerConfig;
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

    if (overlayOn) {
      var overlay = document.createElement('div');
      overlay.id = '__cmp_banner_overlay__';
      overlay.setAttribute(
        'style',
        'position:fixed;inset:0;background:' + (overlayTint ? 'rgba(15,23,42,0.45)' : 'transparent') + ';'
        + 'z-index:2147483646;pointer-events:auto;'
      );
      overlay.addEventListener('click', function() {
        if (cfg.closeOnOverlayClick && !cfg.blockPageUntilConsent) {
          removeBanner();
        }
      });
      document.body.appendChild(overlay);
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
      + 'z-index:2147483647;'
      + 'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;font-size:14px;'
      + 'text-align:start;box-sizing:border-box;'
      + (layout === 'bar'
        ? 'display:flex;flex-wrap:wrap;align-items:center;gap:12px;'
        : 'display:flex;flex-direction:column;gap:14px;')
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
      text.style.flex = layout === 'bar' ? '1' : 'unset';
      text.style.minWidth = layout === 'bar' ? '200px' : '0';
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

    if (cfg.privacyPolicyUrl && cfg.privacyPolicyText) {
      var pol = document.createElement('a');
      pol.href = cfg.privacyPolicyUrl;
      pol.target = '_blank';
      pol.rel = 'noopener noreferrer';
      pol.textContent = cfg.privacyPolicyText;
      pol.style.cssText = 'display:block;font-size:12px;text-decoration:underline;color:' + (cfg.primaryColor || '#171717') + ';';
      banner.appendChild(pol);
    }

    var btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.gap = '8px';
    btns.style.flexWrap = 'wrap';
    btns.style.alignItems = 'center';

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
      return b;
    }

    if (cfg.showAcceptAll) {
      btns.appendChild(btn(cfg.acceptAllLabel || 'Accept all', 'primary', function() {
        removeBanner();
        submitConsent('accept-all', [], []);
      }));
    }
    if (cfg.showRejectAll) {
      btns.appendChild(btn(cfg.rejectAllLabel || 'Reject all', 'outline', function() {
        removeBanner();
        submitConsent('reject-all', [], []);
      }));
    }
    if (cfg.showCustomize) {
      btns.appendChild(btn(cfg.customizeLabel || 'Customize', layout === 'bar' ? 'ghost' : 'ghost', function() {
        _hostScroll.beginTransition();
        removeBanner();
        window.CMP.openPreferenceCenter();
        _hostScroll.endTransition();
      }));
    }

    var locales = availableLocales();
    if (locales.length > 1) {
      var langSelect = document.createElement('select');
      langSelect.setAttribute('aria-label', 'Language');
      langSelect.style.cssText = 'font-size:12px;padding:6px 8px;border-radius:8px;border:1px solid rgba(15,23,42,0.15);background:transparent;color:inherit;max-width:11rem;';
      locales.forEach(function(code) {
        var opt = document.createElement('option');
        opt.value = code;
        opt.textContent = code;
        if (code === (_config.resolvedLanguage || '')) opt.selected = true;
        langSelect.appendChild(opt);
      });
      langSelect.addEventListener('change', function() {
        window.CMP.setLanguage(langSelect.value);
      });
      btns.appendChild(langSelect);
    }

    banner.appendChild(btns);

    if (cfg.showPoweredBy && cfg.poweredByText) {
      var powered = document.createElement('div');
      powered.textContent = cfg.poweredByText;
      powered.style.cssText = 'font-size:11px;opacity:0.4;text-align:end;' + (layout === 'bar' ? 'width:100%;' : '');
      banner.appendChild(powered);
    }

    document.body.appendChild(banner);
    _hostScroll.sync();
  }

  function removeBanner() {
    var el = document.getElementById('__cmp_banner__');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    var overlay = document.getElementById('__cmp_banner_overlay__');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    _hostScroll.sync();
    syncPreferenceWidget();
  }

  function getConsent() {
    return {
      consentId: _consentId,
      decisions: _decisions,
      websiteId: _config ? _config.websiteId : null
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
    if (cfg.showCloseButton !== false) header.appendChild(closeBtn);

    // Body (scrollable)
    var body = document.createElement('div');
    body.setAttribute('style',
      'flex:1 1 auto;overflow-y:auto;padding:10px 24px 20px 24px;scrollbar-width:thin;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;'
    );

    // Track local toggles independently so we can cancel.
    var localDecisions = { purposes: {}, vendors: {} };
    function setPurposeLocal(pid, val) { localDecisions.purposes[pid] = !!val; }
    function setVendorLocal(vid, val)  { localDecisions.vendors[vid]  = !!val; }

    // Seed from current state, defaulting non-essential to reject
    if (_config.purposes) _config.purposes.forEach(function(p) {
      setPurposeLocal(p.id, p.isRequired ? true : currentPurposeGranted(p.id));
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
        if (!p.isRequired) {
          toggle.addEventListener('click', function() {
            setPurposeLocal(p.id, !localDecisions.purposes[p.id]);
            paintToggle();
            paintKnob();
          });
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
            + 'background:rgba(99,102,241,0.12);color:#4338ca;'
          );
          nameRow.appendChild(reqTag);
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
          vlink.href = v.privacyPolicyUrl || ('https://' + v.domain);
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

    // Footer (actions)
    var footer = document.createElement('div');
    footer.setAttribute('style',
      'padding:14px 24px 22px 24px;border-top:1px solid rgba(15,23,42,0.08);'
      + 'display:flex;align-items:center;justify-content:space-between;gap:12px;'
      + 'flex-wrap:wrap;'
    );

    if (cfg.privacyPolicyText && cfg.privacyPolicyUrl) {
      var pl = document.createElement('a');
      pl.href = cfg.privacyPolicyUrl;
      pl.target = '_blank';
      pl.rel = 'noopener noreferrer';
      pl.textContent = cfg.privacyPolicyText;
      pl.setAttribute('style',
        'font-size:12.5px;font-weight:500;color:inherit;opacity:0.7;text-decoration:underline;text-underline-offset:2px;'
      );
      footer.appendChild(pl);
    } else {
      var sp = document.createElement('span');
      footer.appendChild(sp);
    }

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
      return b;
    }

    actionRow.appendChild(pcBtn(cfg.rejectAllLabel || 'Reject all', false, function() {
      submitConsent('reject-all', [], []);
      removePreferenceCenter();
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
      window.CMP.saveGranular(purposeDecisions, vendorDecisions);
      removePreferenceCenter();
    }));
    actionRow.appendChild(pcBtn(cfg.acceptAllLabel || 'Accept all', false, function() {
      submitConsent('accept-all', [], []);
      removePreferenceCenter();
    }));

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
    acceptAll: function() { submitConsent('accept-all', [], []); removeBanner(); removePreferenceCenter(); },
    rejectAll: function() { submitConsent('reject-all', [], []); removeBanner(); removePreferenceCenter(); },
    saveGranular: function(purposeDecisions, vendorDecisions) {
      submitConsent('granular', purposeDecisions || [], vendorDecisions || []);
      _hostScroll.beginTransition();
      removePreferenceCenter();
      removeBanner();
      _hostScroll.endTransition();
    },
    // Import consent exported from a different website/domain.
    //
    // portableBundle: { claims, proof }
    // targetWebsiteId: UUID of the site that will receive enforcement.
    importPortableConsent: function(portableBundle, targetWebsiteId) {
      return new Promise(function(resolve, reject) {
        try {
          var payload = portableBundle || {};
          var claims = payload.claims || null;
          var proof = payload.proof || null;
          var tid = targetWebsiteId || '';

          if (!claims || !proof || !tid) {
            reject(new Error('portableBundle.claims/proof and targetWebsiteId are required'));
            return;
          }

          fetch(API_BASE + '/api/consent/portable/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              claims: claims,
              proof: proof,
              targetWebsiteId: tid
            })
          })
            .then(function(r) { return r.json(); })
            .then(function(data) {
              if (!data || !data.success) throw new Error((data && data.message) || 'Portable import failed');
              // Save imported decisions into local storage so enforcement runs immediately.
              saveConsent(data.consentId, data.decisions || [], data.expiresAt, data.choice || 'granular');
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
      var bannerOpen = !!document.getElementById('__cmp_banner__');
      var pcOpen = !!document.getElementById('__cmp_pc__');
      fetch(configRequestUrl(), { cache: 'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (!data.success) {
            if (callback) callback(new Error(data.message || 'Config load failed'));
            return;
          }
          _config = applyAssignedAbTest(data);
          _hostScroll.beginTransition();
          if (bannerOpen) { removeBanner(); renderBanner(); }
          if (pcOpen) renderPreferenceCenter();
          _hostScroll.endTransition();
          if (callback) callback(null, data.resolvedLanguage);
        })
        .catch(function(err) {
          log('setLanguage failed: ' + err);
          if (callback) callback(err);
        });
    },
    withdrawConsent: function() {
      if (!_consentId || !_config) return;
      fetch(API_BASE + '/api/consent/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consentId: _consentId, websiteId: _config.websiteId })
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data.success) throw new Error(data.message || 'Withdraw failed');
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(EXPIRY_KEY);
        _consentId = null;
        _decisions = { purposes: {}, vendors: {} };
        enforceScriptTags();
        publishExternalSignals();
        _listeners.forEach(function(fn) { try { fn(getConsent()); } catch(e) {} });
        renderBanner();
      })
      .catch(function(err) {
        log('Withdraw consent failed: ' + err);
      });
    }
  };

  function pauseTaggedScripts() {
    var tags = document.querySelectorAll('script[data-cmp-purpose]');
    tags.forEach(function(el) {
      if (el.getAttribute('type') !== 'text/plain') {
        el.setAttribute('type', 'text/plain');
      }
    });
  }
  pauseTaggedScripts();

  fetch(configRequestUrl(), { cache: 'no-store' })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) { log('Config load failed: ' + data.message); return; }
      _config = applyAssignedAbTest(data);
      initExternalSignals();

      var stored = loadStoredConsent();
      if (stored && stored.consentId && stored.decisions) {
        applyDecisions(stored.decisions);
        _consentId = stored.consentId;
        enforceScriptTags();
        publishExternalSignals();
        log('Loaded stored consent: ' + stored.consentId);
        rememberAckedScope(stored);
        if (consentScopeChanged(stored, data)) {
          _reconsentNotice = 'Some changes were made since you last visited this site. Please review your consent choices.';
          showBannerWhenReady();
          showPreferenceCenterWhenReady();
        } else if (shouldReshowBanner(stored, data.bannerConfig)) {
          showBannerWhenReady();
        } else {
          syncPreferenceWidget();
        }
        return;
      }

      var defaultConsent = (data.bannerConfig && data.bannerConfig.defaultConsent) || 'none';
      var respectDnt = data.bannerConfig && data.bannerConfig.respectDoNotTrack;
      if (defaultConsent === 'opt-in' && !(respectDnt && dntRequested())) {
        _decisions = { purposes: {}, vendors: {} };
        if (data.purposes) data.purposes.forEach(function(p) { _decisions.purposes[p.id] = true; });
        if (data.vendors)  data.vendors.forEach(function(v)  { _decisions.vendors[v.id]   = true; });
        enforceScriptTags();
      }
      publishExternalSignals();
      showBannerWhenReady();
    })
    .catch(function(err) { log('Failed to initialise CMP: ' + err); });

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
  return `<!-- Consent Management Platform -->
<script>
  (function(w,d,s,k){
    w.__CMP_SITE_KEY = k;
    var el = d.createElement(s);
    el.async = true;
    el.src = '${options.cdnUrl}';
    el.setAttribute('data-site-key', k);
    d.head.appendChild(el);
  })(window, document, 'script', '${options.siteKey}');
</script>
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
