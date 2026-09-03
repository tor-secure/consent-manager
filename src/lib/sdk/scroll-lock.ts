/**
 * Host-page scroll lock for the visitor-facing CMP UI.
 *
 * The runtime below is vanilla JS so it can be inlined into the SDK script.
 * Tests import `installHostScrollLock` / `HOST_SCROLL_LOCK_RUNTIME`.
 *
 * Consent-engine code must not import this module.
 */

export type HostScrollLock = {
  lock: () => void;
  unlock: () => void;
  sync: () => void;
  beginTransition: () => void;
  endTransition: () => void;
  teardown: () => void;
  isLocked: () => boolean;
  getSavedScrollY: () => number;
};

export const HOST_SCROLL_LOCK_STYLE_ID = "__cmp_host_lock_css";
export const HOST_SCROLL_LOCK_ATTR = "data-cmp-scroll-lock";

export const HOST_SCROLL_LOCK_RUNTIME = `
function createHostScrollLock(window, document) {
  var STYLE_ID = '__cmp_host_lock_css';
  var ATTR = 'data-cmp-scroll-lock';
  var applied = false;
  var hold = 0;
  var saved = null;
  var listenersBound = false;

  function htmlEl() { return document.documentElement || document.body; }
  function bodyEl() { return document.body; }

  function cmpRoot(node) {
    var n = node;
    while (n && n !== document && n !== window) {
      var id = n.id || (n.getAttribute && n.getAttribute('id'));
      if (id === '__cmp_banner__' || id === '__cmp_pc__' || id === '__cmp_pc_overlay__') return true;
      n = n.parentNode || n.parentElement;
    }
    return false;
  }

  function isEditable(node) {
    if (!node || !node.tagName) return false;
    var tag = String(node.tagName).toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (node.isContentEditable) return true;
    return false;
  }

  function consentUiOpen() {
    return !!(
      (document.getElementById && document.getElementById('__cmp_banner__')) ||
      (document.getElementById && document.getElementById('__cmp_pc__'))
    );
  }

  function readInline(el, prop) {
    if (!el || !el.style) return '';
    if (typeof el.style.getPropertyValue === 'function') {
      return el.style.getPropertyValue(prop) || '';
    }
    return el.style[prop] || '';
  }

  function writeInline(el, prop, value) {
    if (!el || !el.style) return;
    if (typeof el.style.setProperty === 'function') {
      if (value) el.style.setProperty(prop, value);
      else el.style.removeProperty(prop);
      return;
    }
    el.style[prop] = value || '';
  }

  function scrollbarWidth() {
    var html = htmlEl();
    var inner = window.innerWidth || (html && html.clientWidth) || 0;
    var client = (html && html.clientWidth) || inner;
    var width = inner - client;
    return width > 0 ? width : 0;
  }

  function supportsGutter() {
    var html = htmlEl();
    return !!(html && html.style && ('scrollbarGutter' in html.style || 'scrollbar-gutter' in html.style));
  }

  function ensureCss() {
    if (!document.getElementById) return;
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.setAttribute('data-cmp', 'host-scroll-lock');
    style.textContent =
      'html[' + ATTR + ']{overflow:hidden !important;overscroll-behavior:none;scrollbar-gutter:stable;}' +
      'html[' + ATTR + '] body{overflow:hidden !important;overscroll-behavior:none;pointer-events:none;touch-action:none;}' +
      'html[' + ATTR + '] #__cmp_banner__,' +
      'html[' + ATTR + '] #__cmp_pc__,' +
      'html[' + ATTR + '] #__cmp_pc_overlay__{pointer-events:auto !important;touch-action:auto;}';
    var head = document.head || htmlEl();
    if (head && head.appendChild) head.appendChild(style);
  }

  function currentScrollY() {
    if (typeof window.pageYOffset === 'number') return window.pageYOffset;
    if (typeof window.scrollY === 'number') return window.scrollY;
    var html = htmlEl();
    return (html && html.scrollTop) || 0;
  }

  function restoreScroll(y) {
    if (typeof window.scrollTo === 'function') {
      window.scrollTo(0, y);
      return;
    }
    var html = htmlEl();
    if (html) html.scrollTop = y;
    if (document.body) document.body.scrollTop = y;
  }

  function onWheel(e) {
    if (cmpRoot(e.target)) return;
    if (e.cancelable && e.preventDefault) e.preventDefault();
  }

  function onTouchMove(e) {
    if (cmpRoot(e.target)) return;
    if (e.cancelable && e.preventDefault) e.preventDefault();
  }

  function onKeyDown(e) {
    var key = e.key || e.code;
    var keys = {
      ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1,
      PageUp: 1, PageDown: 1, Home: 1, End: 1, ' ': 1, Spacebar: 1, Space: 1
    };
    if (!keys[key]) return;
    if (isEditable(e.target)) return;
    if (cmpRoot(e.target)) return;
    if (e.cancelable && e.preventDefault) e.preventDefault();
  }

  function bindListeners() {
    if (listenersBound) return;
    var opts = { capture: true, passive: false };
    if (window.addEventListener) {
      window.addEventListener('wheel', onWheel, opts);
      window.addEventListener('touchmove', onTouchMove, opts);
      window.addEventListener('keydown', onKeyDown, true);
    }
    listenersBound = true;
  }

  function unbindListeners() {
    if (!listenersBound) return;
    if (window.removeEventListener) {
      window.removeEventListener('wheel', onWheel, true);
      window.removeEventListener('touchmove', onTouchMove, true);
      window.removeEventListener('keydown', onKeyDown, true);
    }
    listenersBound = false;
  }

  function applyLock() {
    if (applied) return;
    var html = htmlEl();
    var body = bodyEl();
    var y = currentScrollY();
    var gap = scrollbarWidth();
    saved = {
      scrollY: y,
      htmlOverflow: readInline(html, 'overflow'),
      htmlGutter: readInline(html, 'scrollbar-gutter'),
      bodyOverflow: readInline(body, 'overflow'),
      bodyPosition: readInline(body, 'position'),
      bodyTop: readInline(body, 'top'),
      bodyLeft: readInline(body, 'left'),
      bodyRight: readInline(body, 'right'),
      bodyWidth: readInline(body, 'width'),
      bodyPaddingRight: readInline(body, 'padding-right'),
      compensated: false,
      gap: gap
    };
    ensureCss();
    if (html && html.setAttribute) html.setAttribute(ATTR, 'true');
    writeInline(body, 'position', 'fixed');
    writeInline(body, 'top', '-' + y + 'px');
    writeInline(body, 'left', '0px');
    writeInline(body, 'right', '0px');
    writeInline(body, 'width', '100%');
    if (gap > 0 && !supportsGutter()) {
      var existing = parseFloat(saved.bodyPaddingRight) || 0;
      writeInline(body, 'padding-right', (existing + gap) + 'px');
      saved.compensated = true;
    }
    bindListeners();
    applied = true;
  }

  function applyUnlock() {
    if (!applied) return;
    var html = htmlEl();
    var body = bodyEl();
    var y = saved ? saved.scrollY : 0;
    writeInline(body, 'position', saved ? saved.bodyPosition : '');
    writeInline(body, 'top', saved ? saved.bodyTop : '');
    writeInline(body, 'left', saved ? saved.bodyLeft : '');
    writeInline(body, 'right', saved ? saved.bodyRight : '');
    writeInline(body, 'width', saved ? saved.bodyWidth : '');
    writeInline(body, 'padding-right', saved ? saved.bodyPaddingRight : '');
    writeInline(body, 'overflow', saved ? saved.bodyOverflow : '');
    writeInline(html, 'overflow', saved ? saved.htmlOverflow : '');
    writeInline(html, 'scrollbar-gutter', saved ? saved.htmlGutter : '');
    if (html && html.removeAttribute) html.removeAttribute(ATTR);
    unbindListeners();
    applied = false;
    restoreScroll(y);
    saved = null;
  }

  function sync() {
    if (hold > 0 || consentUiOpen()) applyLock();
    else applyUnlock();
  }

  return {
    lock: function() { applyLock(); },
    unlock: function() { applyUnlock(); },
    sync: sync,
    beginTransition: function() { hold += 1; applyLock(); },
    endTransition: function() { hold = hold > 0 ? hold - 1 : 0; sync(); },
    teardown: function() {
      hold = 0;
      applyUnlock();
      var style = document.getElementById && document.getElementById(STYLE_ID);
      if (style && style.parentNode) style.parentNode.removeChild(style);
    },
    isLocked: function() { return applied; },
    getSavedScrollY: function() { return saved ? saved.scrollY : currentScrollY(); }
  };
}
`;

export function installHostScrollLock(
  windowObj: object,
  documentObj: object,
): HostScrollLock {
  const factory = new Function(
    "window",
    "document",
    `${HOST_SCROLL_LOCK_RUNTIME}\nreturn createHostScrollLock(window, document);`,
  );
  return factory(windowObj, documentObj) as HostScrollLock;
}
