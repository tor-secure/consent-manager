const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const root = path.resolve(__dirname, "../../..");
execSync("npx tsc -p tsconfig.tests.json", { cwd: root, stdio: "pipe" });

const compiled = path.join(root, ".tmp/test-libs/lib/sdk/scroll-lock.js");
if (!fs.existsSync(compiled)) {
  throw new Error("Compiled scroll-lock.js not found");
}

const {
  installHostScrollLock,
  HOST_SCROLL_LOCK_ATTR,
  HOST_SCROLL_LOCK_STYLE_ID,
} = require(compiled);

function createHost(initialScroll = 320) {
  const listeners = {};
  const html = {
    id: "",
    attributes: {},
    style: {
      _p: Object.create(null),
      getPropertyValue(name) { return this._p[name] || ""; },
      setProperty(name, value) { this._p[name] = String(value); },
      removeProperty(name) { const prev = this._p[name] || ""; delete this._p[name]; return prev; },
    },
    clientWidth: 1008,
    scrollTop: initialScroll,
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] ?? null; },
    removeAttribute(name) { delete this.attributes[name]; },
  };
  const nodes = new Map();
  const body = {
    id: "",
    style: {
      _p: Object.create(null),
      overflow: "auto",
      getPropertyValue(name) { return this._p[name] || this[name] || ""; },
      setProperty(name, value) { this._p[name] = String(value); },
      removeProperty(name) { const prev = this._p[name] || ""; delete this._p[name]; return prev; },
    },
    children: [],
    appendChild(child) { this.children.push(child); if (child.id) nodes.set(child.id, child); return child; },
    removeChild(child) {
      this.children = this.children.filter((item) => item !== child);
      if (child.id) nodes.delete(child.id);
      return child;
    },
  };
  body.style._p.overflow = "auto";
  const head = {
    children: [],
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      if (child.id) nodes.set(child.id, child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((item) => item !== child);
      child.parentNode = null;
      if (child.id) nodes.delete(child.id);
      return child;
    },
  };
  const document = {
    documentElement: html,
    body,
    head,
    getElementById(id) {
      if (html.id === id) return html;
      return nodes.get(id) || null;
    },
    createElement(tag) {
      return { tagName: tag, id: "", textContent: "", setAttribute() {}, parentNode: null };
    },
  };
  const windowObj = {
    pageYOffset: initialScroll,
    scrollY: initialScroll,
    innerWidth: 1024,
    scrollTo(_x, y) {
      this.pageYOffset = y;
      this.scrollY = y;
      html.scrollTop = y;
    },
    addEventListener(type, handler) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      listeners[type] = (listeners[type] || []).filter((item) => item !== handler);
    },
    listeners,
  };
  return { window: windowObj, document, html, body, head, nodes };
}

function mount(id, host) {
  const el = { id, parentNode: host.document.body, style: {} };
  host.document.body.appendChild(el);
  host.nodes.set(id, el);
  return el;
}

const host = createHost(320);
const lock = installHostScrollLock(host.window, host.document);
assert.equal(lock.isLocked(), false);

lock.lock();
lock.lock();
assert.equal(lock.isLocked(), true);
assert.equal(host.html.getAttribute(HOST_SCROLL_LOCK_ATTR), "true");
assert.equal(host.body.style.getPropertyValue("position"), "fixed");
assert.equal(host.body.style.getPropertyValue("top"), "-320px");
assert.equal(host.body.style.getPropertyValue("padding-right"), "16px");
assert.equal(host.head.children.length, 1);
assert.equal(host.head.children[0].id, HOST_SCROLL_LOCK_STYLE_ID);
assert.equal(host.window.listeners.wheel.length, 1);
assert.equal(host.window.listeners.touchmove.length, 1);

host.window.pageYOffset = 0;
lock.lock();
assert.equal(lock.getSavedScrollY(), 320);

const prevented = [];
host.window.listeners.wheel[0]({ target: host.body, cancelable: true, preventDefault() { prevented.push("wheel"); } });
host.window.listeners.touchmove[0]({ target: host.body, cancelable: true, preventDefault() { prevented.push("touch"); } });
host.window.listeners.keydown[0]({ key: "PageDown", target: host.body, cancelable: true, preventDefault() { prevented.push("key"); } });
assert.deepEqual(prevented, ["wheel", "touch", "key"]);

const pc = mount("__cmp_pc__", host);
host.window.listeners.wheel[0]({ target: pc, cancelable: true, preventDefault() { prevented.push("pc"); } });
assert.equal(prevented.includes("pc"), false);
assert.ok(String(host.head.children[0].textContent).includes("#__cmp_pc__"));

host.document.body.removeChild(pc);

lock.unlock();
lock.unlock();
assert.equal(lock.isLocked(), false);
assert.equal(host.html.getAttribute(HOST_SCROLL_LOCK_ATTR), null);
assert.equal(host.body.style.getPropertyValue("position"), "");
assert.equal(host.body.style.getPropertyValue("overflow"), "auto");
assert.equal(host.window.scrollY, 320);
assert.equal(host.window.listeners.wheel.length, 0);

mount("__cmp_banner__", host);
lock.sync();
assert.equal(lock.isLocked(), true);
host.document.body.removeChild(host.nodes.get("__cmp_banner__"));
lock.sync();
assert.equal(lock.isLocked(), false);

lock.beginTransition();
assert.equal(lock.isLocked(), true);
lock.endTransition();
assert.equal(lock.isLocked(), false);

lock.lock();
const second = installHostScrollLock(host.window, host.document);
second.teardown();
lock.teardown();
assert.equal(host.head.children.length, 0);
assert.equal(host.html.getAttribute(HOST_SCROLL_LOCK_ATTR), null);

console.log("host scroll-lock tests passed");
