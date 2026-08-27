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
  var _listeners   = [];

  function log(msg) {
    if (window.__CMP_DEBUG) console.log('[CMP]', msg);
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

  function saveConsent(consentId, decisionsArray, expiresAt) {
    try {
      _consentId = consentId;
      applyDecisions(decisionsArray);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ consentId: consentId, decisions: decisionsArray }));
      if (expiresAt) {
        localStorage.setItem(EXPIRY_KEY, String(new Date(expiresAt).getTime()));
      }
      enforceScriptTags();
      _listeners.forEach(function(fn) { try { fn(getConsent()); } catch(e) {} });
    } catch(e) { log('Failed to save consent: ' + e); }
  }

  function submitConsent(choice, purposeDecisions, vendorDecisions, callback) {
    var body = {
      websiteId: _config.websiteId,
      consentId: _consentId || undefined,
      submission: {
        choice: choice,
        purposeDecisions: purposeDecisions || [],
        vendorDecisions:  vendorDecisions  || []
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

      return fetch(API_BASE + '/api/consent/record?consentId=' + data.consentId
        + '&websiteId=' + _config.websiteId)
        .then(function(r) { return r.json(); })
        .then(function(rec) {
          saveConsent(data.consentId, rec.decisions || [], data.expiresAt);
          if (callback) callback(null, data.consentId);
        });
    })
    .catch(function(err) {
      log('Submit consent failed: ' + err);
      if (callback) callback(err);
    });
  }

  function renderBanner() {
    if (!_config || !_config.bannerConfig) return;
    var cfg = _config.bannerConfig;
    if (!cfg.showAcceptAll && !cfg.showRejectAll && !cfg.showCustomize) return;

    var banner = document.createElement('div');
    banner.id = '__cmp_banner__';

    var positionStyle = {
      bottom: 'position:fixed;bottom:0;left:0;right:0;',
      top:    'position:fixed;top:0;left:0;right:0;',
      'bottom-left':  'position:fixed;bottom:16px;left:16px;',
      'bottom-right': 'position:fixed;bottom:16px;right:16px;',
      center: 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);'
    }[cfg.position || 'bottom'] || 'position:fixed;bottom:0;left:0;right:0;';

    banner.setAttribute('style',
      positionStyle
      + 'background:' + (cfg.backgroundColor || '#fff') + ';'
      + 'color:' + (cfg.textColor || '#171717') + ';'
      + 'border-radius:' + (cfg.borderRadius || 0) + 'px;'
      + 'padding:16px 24px;'
      + 'box-shadow:0 -2px 12px rgba(0,0,0,0.1);'
      + 'z-index:2147483647;'
      + 'display:flex;flex-wrap:wrap;align-items:center;gap:12px;'
      + 'font-family:system-ui,sans-serif;font-size:14px;'
    );

    if (cfg.title || cfg.description) {
      var text = document.createElement('div');
      text.style.flex = '1';
      text.style.minWidth = '200px';
      if (cfg.title) {
        var h = document.createElement('strong');
        h.textContent = cfg.title;
        h.style.display = 'block';
        h.style.marginBottom = '4px';
        text.appendChild(h);
      }
      if (cfg.description) {
        var p = document.createElement('span');
        p.textContent = cfg.description.length > 120
          ? cfg.description.slice(0, 120) + '...' : cfg.description;
        p.style.opacity = '0.75';
        p.style.fontSize = '12px';
        text.appendChild(p);
      }
      banner.appendChild(text);
    }

    var btns = document.createElement('div');
    btns.style.display = 'flex';
    btns.style.gap = '8px';
    btns.style.flexWrap = 'wrap';

    function btn(label, primary, onclick) {
      var b = document.createElement('button');
      b.textContent = label;
      b.style.cssText = 'cursor:pointer;border-radius:' + (cfg.borderRadius || 4) + 'px;'
        + 'padding:8px 16px;font-size:13px;font-weight:600;border:none;'
        + (primary
          ? 'background:' + (cfg.primaryColor || '#171717') + ';color:#fff;'
          : 'background:transparent;border:1px solid ' + (cfg.primaryColor || '#171717')
            + ';color:' + (cfg.primaryColor || '#171717') + ';');
      b.addEventListener('click', onclick);
      return b;
    }

    if (cfg.showAcceptAll) {
      btns.appendChild(btn(cfg.acceptAllLabel || 'Accept all', true, function() {
        removeBanner();
        submitConsent('accept-all', [], []);
      }));
    }
    if (cfg.showRejectAll) {
      btns.appendChild(btn(cfg.rejectAllLabel || 'Reject all', false, function() {
        removeBanner();
        submitConsent('reject-all', [], []);
      }));
    }
    if (cfg.showCustomize) {
      btns.appendChild(btn(cfg.customizeLabel || 'Customize', false, function() {
        removeBanner();
        window.CMP.openPreferenceCenter();
      }));
    }

    banner.appendChild(btns);
    document.body.appendChild(banner);
  }

  function removeBanner() {
    var el = document.getElementById('__cmp_banner__');
    if (el) el.parentNode.removeChild(el);
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
  function removePreferenceCenter() {
    var el = document.getElementById('__cmp_pc__');
    if (el && el.parentNode) el.parentNode.removeChild(el);
    var overlay = document.getElementById('__cmp_pc_overlay__');
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
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
    removePreferenceCenter();

    // Backdrop overlay
    var overlay = document.createElement('div');
    overlay.id = '__cmp_pc_overlay__';
    overlay.setAttribute(
      'style',
      'position:fixed;inset:0;background:rgba(15,23,42,0.45);backdrop-filter:blur(6px);z-index:2147483646;'
    );
    overlay.addEventListener('click', function() {
      if (cfg.closeOnOverlayClick !== false) removePreferenceCenter();
    });
    document.body.appendChild(overlay);

    // Dialog
    var pc = document.createElement('div');
    pc.id = '__cmp_pc__';
    pc.setAttribute('role', 'dialog');
    pc.setAttribute('aria-modal', 'true');
    pc.setAttribute('aria-labelledby', '__cmp_pc_title__');
    var radius = (typeof cfg.borderRadius === 'number' ? cfg.borderRadius : 8) + 'px';
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
    pcTitle.textContent = 'Manage your preferences';
    pcTitle.setAttribute('style',
      'margin:0;font-size:18px;font-weight:700;letter-spacing:-0.01em;color:'
      + (cfg.textColor || '#171717') + ';'
    );
    var pcSub = document.createElement('p');
    pcSub.textContent =
      'Customize which purposes and vendors you allow. You can change your choices at any time.';
    pcSub.setAttribute('style',
      'margin:6px 0 0 0;font-size:13px;opacity:0.7;line-height:1.5;'
    );
    titleBox.appendChild(pcTitle);
    titleBox.appendChild(pcSub);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close preferences');
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
      'flex:1 1 auto;overflow-y:auto;padding:10px 24px 20px 24px;scrollbar-width:thin;'
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
      h3.textContent = 'Purposes';
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
          'position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:999px;'
          + 'background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.25);transition:left .15s;'
        );
        function paintKnob() {
          var on = !!localDecisions.purposes[p.id];
          knob.style.left = on ? '19px' : '3px';
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
          reqTag.textContent = 'Required';
          reqTag.setAttribute('style',
            'font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;'
            + 'background:rgba(99,102,241,0.12);color:#4338ca;'
          );
          nameRow.appendChild(reqTag);
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
      vh3.textContent = 'Vendors (' + _config.vendors.length + ')';
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
          'position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:999px;'
          + 'background:#fff;box-shadow:0 1px 2px rgba(0,0,0,0.25);transition:left .15s;'
        );
        function paintVendorToggle() {
          var on = !!localDecisions.vendors[v.id];
          vtoggle.setAttribute('aria-checked', on ? 'true' : 'false');
          vtoggle.style.background = on ? (cfg.primaryColor || '#171717') : 'rgba(15,23,42,0.18)';
          vknob.style.left = on ? '19px' : '3px';
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
        vname.appendChild(vn);
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

    window.dispatchEvent(new CustomEvent('cmp:openPreferenceCenter'));
  }

  window.CMP = {
    getConsent: getConsent,
    onConsentChange: function(fn) { _listeners.push(fn); },
    showBanner: function() {
      // Remove existing banner if any, then render a fresh one.
      removeBanner();
      // If a stored consent already exists, still show the banner so the user
      // can manage it — but this way the demo's "Show banner" button works.
      renderBanner();
    },
    openPreferenceCenter: function() {
      if (!_config) {
        log('openPreferenceCenter called before config loaded');
        return;
      }
      renderPreferenceCenter();
    },
    acceptAll: function() { submitConsent('accept-all', [], []); removeBanner(); },
    rejectAll: function() { submitConsent('reject-all', [], []); removeBanner(); },
    saveGranular: function(purposeDecisions, vendorDecisions) {
      submitConsent('granular', purposeDecisions || [], vendorDecisions || []);
      removePreferenceCenter();
      removeBanner();
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

  fetch(API_BASE + '/api/sdk/' + SITE_KEY + '/config')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (!data.success) { log('Config load failed: ' + data.message); return; }
      _config = data;

      var stored = loadStoredConsent();
      if (stored && stored.consentId && stored.decisions) {
        applyDecisions(stored.decisions);
        _consentId = stored.consentId;
        enforceScriptTags();
        log('Loaded stored consent: ' + stored.consentId);
        return;
      }

      var defaultConsent = (data.bannerConfig && data.bannerConfig.defaultConsent) || 'none';
      if (defaultConsent === 'opt-in') {
        _decisions = { purposes: {}, vendors: {} };
        if (data.purposes) data.purposes.forEach(function(p) { _decisions.purposes[p.id] = true; });
        if (data.vendors)  data.vendors.forEach(function(v)  { _decisions.vendors[v.id]   = true; });
        enforceScriptTags();
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderBanner);
      } else {
        renderBanner();
      }
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
