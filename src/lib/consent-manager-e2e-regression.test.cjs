const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const compiledRoot = path.join(root, ".tmp/consent-manager-e2e");

function findCompiled(relativePath) {
  const candidates = [
    path.join(compiledRoot, relativePath.replace(/\.ts$/, ".js")),
    path.join(compiledRoot, "src", relativePath.replace(/\.ts$/, ".js")),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Compiled file not found for ${relativePath}`);
  }
  return found;
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "next/server") {
    class NextResponse extends Response {
      static json(body, init) {
        return Response.json(body, init);
      }
    }
    return { NextResponse };
  }
  if (request === "@/db") return { db: {} };
  if (request === "@/lib/logger") return { logger: { error() {}, warn() {}, info() {}, debug() {} } };
  if (request.startsWith("@/db/schema/")) return {};
  if (request.startsWith("@/")) {
    return originalLoad.call(this, findCompiled(`src/${request.slice(2)}.ts`), parent, isMain);
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { buildCmpSdkScript } = require(findCompiled("src/lib/sdk/cmp-sdk-script.ts"));
const {
  buildBlocklist,
  buildGrantsFromDecisions,
  domainMatches,
  shouldBlock,
} = require(findCompiled("src/lib/sdk/enforcement.ts"));
const {
  isValidConsentId,
  isValidSiteKey,
  isValidWebsiteId,
  readPublicJsonObject,
} = require(findCompiled("src/lib/sdk/public-http.ts"));
const {
  createWebhookSignature,
  verifyWebhookSignature,
} = require(findCompiled("src/lib/webhooks/delivery.ts"));

const ids = {
  orgA: "11111111-1111-4111-8111-111111111111",
  orgB: "22222222-2222-4222-8222-222222222222",
  websiteA: "33333333-3333-4333-8333-333333333333",
  websiteB: "44444444-4444-4444-8444-444444444444",
  policyA: "55555555-5555-4555-8555-555555555555",
  versionA: "66666666-6666-4666-8666-666666666666",
  analyticsPurpose: "77777777-7777-4777-8777-777777777777",
  adsPurpose: "88888888-8888-4888-8888-888888888888",
  requiredPurpose: "99999999-9999-4999-8999-999999999999",
  analyticsVendor: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  adsVendor: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
};

function createStore() {
  const store = {
    organization: { id: ids.orgA, name: "E2E Organization" },
    otherOrganization: { id: ids.orgB, name: "Other Organization" },
    website: {
      id: ids.websiteA,
      organizationId: ids.orgA,
      siteKey: "site_e2e_1234567890",
      status: "active",
    },
    otherWebsite: {
      id: ids.websiteB,
      organizationId: ids.orgB,
      siteKey: "site_other_1234567890",
      status: "active",
    },
    policy: { id: ids.policyA, websiteId: ids.websiteA, status: "active" },
    policyVersion: { id: ids.versionA, policyId: ids.policyA, version: 1, isPublished: true },
    purposes: [
      { id: ids.requiredPurpose, key: "essential", name: "Essential", isRequired: true },
      { id: ids.analyticsPurpose, key: "analytics", name: "Analytics", isRequired: false },
      { id: ids.adsPurpose, key: "ads", name: "Advertising", isRequired: false },
    ],
    vendors: [
      { id: ids.analyticsVendor, name: "Analytics Vendor", domain: "analytics.example" },
      { id: ids.adsVendor, name: "Ads Vendor", domain: "ads.example" },
    ],
    trackerRules: [
      {
        id: "tracker-essential",
        name: "Essential script",
        type: "script",
        domain: "cdn.example",
        identifier: "essential.js",
        purposeKey: "essential",
        purposeId: ids.requiredPurpose,
        vendorId: null,
        isEssential: true,
        status: "active",
      },
      {
        id: "tracker-analytics",
        name: "Analytics script",
        type: "script",
        domain: "analytics.example",
        identifier: "analytics.js",
        purposeKey: "analytics",
        purposeId: ids.analyticsPurpose,
        vendorId: ids.analyticsVendor,
        isEssential: false,
        status: "active",
      },
      {
        id: "tracker-ads",
        name: "Ads script",
        type: "script",
        domain: "ads.example",
        identifier: "ads.js",
        purposeKey: "ads",
        purposeId: ids.adsPurpose,
        vendorId: ids.adsVendor,
        isEssential: false,
        status: "active",
      },
      {
        id: "tracker-unclassified",
        name: "Unknown tracker",
        type: "script",
        domain: "unknown.example",
        identifier: "unknown.js",
        purposeKey: null,
        purposeId: null,
        vendorId: null,
        isEssential: false,
        status: "active",
      },
    ],
    records: [],
    decisions: new Map(),
    events: [],
    auditLogs: [],
    webhookDeliveries: [],
    nextConsentNumber: 1,
  };

  store.config = {
    success: true,
    websiteId: store.website.id,
    policy: {
      id: store.policy.id,
      name: "Published E2E Policy",
      versionId: store.policyVersion.id,
      version: store.policyVersion.version,
      isPublished: true,
    },
    bannerConfig: {
      title: "Privacy choices",
      description: "Choose how this site may use cookies.",
      showAcceptAll: true,
      showRejectAll: true,
      showCustomize: true,
      acceptAllLabel: "Accept all",
      rejectAllLabel: "Reject all",
      customizeLabel: "Customize",
      savePreferencesLabel: "Save preferences",
      position: "bottom",
      backgroundColor: "#ffffff",
      textColor: "#111827",
      primaryColor: "#4f46e5",
      borderRadius: 8,
      consentExpireDays: 180,
      defaultConsent: "none",
      showVendorList: true,
      language: "en",
      translations: {},
    },
    resolvedLanguage: "en",
    locale: { language: "en", region: "IN", direction: "ltr", resolved: "en", supported: [] },
    purposes: store.purposes,
    vendors: store.vendors,
    trackerRules: store.trackerRules,
    locale: { language: "en", region: "IN" },
    grievance: {},
    signals: {
      googleConsentMode: { enabled: false, status: "disabled", purposeSignals: {} },
      iabTcf: { enabled: false, status: "disabled" },
      iabGpp: { enabled: false, status: "disabled" },
    },
  };

  return store;
}

function buildDecisions(store, choice, purposeDecisions = [], vendorDecisions = []) {
  const purposeMap = new Map(purposeDecisions.map((d) => [d.purposeId, Boolean(d.granted)]));
  const vendorMap = new Map(vendorDecisions.map((d) => [d.vendorId, Boolean(d.granted)]));
  const grantedForChoice = choice === "accept-all";

  return [
    ...store.purposes.map((purpose) => ({
      purposeId: purpose.id,
      vendorId: null,
      granted: purpose.isRequired
        ? true
        : choice === "granular"
          ? purposeMap.get(purpose.id) === true
          : grantedForChoice,
      decision: choice,
      decidedAt: new Date().toISOString(),
    })),
    ...store.vendors.map((vendor) => ({
      purposeId: null,
      vendorId: vendor.id,
      granted: choice === "granular"
        ? vendorMap.get(vendor.id) === true
        : grantedForChoice,
      decision: choice,
      decidedAt: new Date().toISOString(),
    })),
  ];
}

function deriveStatus(decisions) {
  const nonRequired = decisions.filter((d) => d.purposeId !== ids.requiredPurpose);
  if (nonRequired.every((d) => d.granted)) return "accepted";
  if (nonRequired.every((d) => !d.granted)) return "rejected";
  return "partial";
}

function emitSideEffects(store, record, eventType, eventData) {
  const event = {
    id: `event-${store.events.length + 1}`,
    consentRecordId: record.id,
    policyVersionId: record.policyVersionId,
    eventType,
    eventData,
    source: "web",
    occurredAt: new Date().toISOString(),
  };
  store.events.push(event);
  store.auditLogs.push({
    organizationId: record.organizationId,
    action: eventType,
    resourceType: "consent_record",
    resourceId: record.id,
  });

  const webhookType =
    eventType === "consent.withdrawn"
      ? "consent.withdrawn"
      : record.status === "accepted"
        ? "consent.granted"
        : record.status === "rejected"
          ? "consent.declined"
          : null;

  if (webhookType) {
    const payload = JSON.stringify({
      id: event.id,
      type: webhookType,
      organizationId: record.organizationId,
      data: { consentId: record.consentId, websiteId: record.websiteId, status: record.status },
    });
    const timestamp = "1700000000";
    const signingSecretHash = "test-webhook-secret-hash";
    const signature = createWebhookSignature({ payload, timestamp, signingSecretHash });
    assert.equal(
      verifyWebhookSignature({ payload, timestamp, signingSecretHash, signature }),
      true,
    );
    store.webhookDeliveries.push({
      webhookEndpointId: "endpoint-e2e",
      eventId: event.id,
      eventType: webhookType,
      status: "success",
      attemptNumber: 1,
      requestPayload: JSON.parse(payload),
      signature,
    });
  }
}

function createApi(store) {
  function submitConsent(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { status: 400, body: { success: false, message: "Request body must be a JSON object" } };
    }
    if (body.websiteId !== store.website.id) {
      return { status: 404, body: { success: false, message: "Website not found" } };
    }
    if (!body.submission || !["accept-all", "reject-all", "granular"].includes(body.submission.choice)) {
      return {
        status: 400,
        body: { success: false, message: "submission.choice must be accept-all, reject-all, or granular" },
      };
    }

    const consentId = body.consentId || `cid_e2e_${store.nextConsentNumber++}`;
    let record = store.records.find((row) => row.consentId === consentId);
    if (record?.status === "withdrawn") {
      return { status: 409, body: { success: false, message: "Consent record already withdrawn" } };
    }

    const decisions = buildDecisions(
      store,
      body.submission.choice,
      body.submission.purposeDecisions,
      body.submission.vendorDecisions,
    );
    const status = deriveStatus(decisions);
    const expiresAt = new Date(Date.now() + 180 * 24 * 60 * 60_000).toISOString();

    if (!record) {
      record = {
        id: `record-${consentId}`,
        consentId,
        organizationId: store.organization.id,
        websiteId: store.website.id,
        policyVersionId: store.policyVersion.id,
        visitorId: "visitor-e2e",
        status,
        source: "web",
        consentedAt: new Date().toISOString(),
        expiresAt,
        withdrawnAt: null,
        metadata: (() => {
          const localized = localizedConfig(store, body.language);
          return {
            noticeTitle: localized.bannerConfig.title,
            noticeLanguage: localized.resolvedLanguage,
          };
        })(),
      };
      store.records.push(record);
      emitSideEffects(store, record, "consent.created", { status, choice: body.submission.choice });
    } else {
      record.status = status;
      record.consentedAt = new Date().toISOString();
      record.expiresAt = expiresAt;
      emitSideEffects(store, record, "consent.updated", { status, choice: body.submission.choice });
    }

    store.decisions.set(record.id, decisions);
    return {
      status: body.consentId ? 200 : 201,
      body: { success: true, consentId, status, policyVersionId: store.policyVersion.id, expiresAt },
    };
  }

  function getConsent(consentId, websiteId) {
    const record = store.records.find((row) => row.consentId === consentId && row.websiteId === websiteId);
    if (!record) return { status: 404, body: { success: false, message: "Consent record not found" } };
    if (new Date(record.expiresAt).getTime() < Date.now() && record.status !== "withdrawn") {
      return {
        status: 200,
        body: { success: true, expired: true, requiresReconsent: true, record: { ...record, status: "expired" }, decisions: [] },
      };
    }
    return {
      status: 200,
      body: { success: true, expired: false, requiresReconsent: false, record, decisions: store.decisions.get(record.id) ?? [] },
    };
  }

  function withdraw(body) {
    const record = store.records.find((row) => row.consentId === body.consentId && row.websiteId === body.websiteId);
    if (!record) return { status: 404, body: { success: false, message: "Consent record not found" } };
    if (record.status === "withdrawn") {
      return { status: 409, body: { success: false, message: "Consent has already been withdrawn" } };
    }
    const previousStatus = record.status;
    record.status = "withdrawn";
    record.withdrawnAt = new Date().toISOString();
    emitSideEffects(store, record, "consent.withdrawn", { previousStatus, withdrawnAt: record.withdrawnAt });
    return { status: 200, body: { success: true, withdrawnAt: record.withdrawnAt } };
  }

  function analytics() {
    return {
      total: store.records.length,
      accepted: store.records.filter((row) => row.status === "accepted").length,
      rejected: store.records.filter((row) => row.status === "rejected").length,
      partial: store.records.filter((row) => row.status === "partial").length,
      withdrawn: store.records.filter((row) => row.status === "withdrawn").length,
      eventCount: store.events.length,
    };
  }

  function evidence(consentId, organizationId) {
    const record = store.records.find((row) => row.consentId === consentId);
    if (!record || record.organizationId !== organizationId) {
      return { status: 404, body: { success: false, message: "Consent record not found" } };
    }
    return {
      status: 200,
      body: {
        success: true,
        evidence: {
          consentId: record.consentId,
          status: record.status,
          policyVersion: { id: record.policyVersionId, isPublished: true },
          noticeSnapshot: record.metadata,
          decisions: store.decisions.get(record.id) ?? [],
          events: store.events.filter((event) => event.consentRecordId === record.id),
        },
      },
    };
  }

  return { analytics, evidence, getConsent, submitConsent, withdraw };
}

class FakeElement {
  constructor(tagName, document) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = document;
    this.attributes = [];
    this.children = [];
    this.parentNode = null;
    this.listeners = {};
    this.style = {
      _p: Object.create(null),
      getPropertyValue(name) { return this._p[name] || ""; },
      setProperty(name, value) { this._p[name] = String(value); },
      removeProperty(name) {
        const prev = this._p[name] || "";
        delete this._p[name];
        return prev;
      },
    };
    this.textContent = "";
    this.id = "";
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    const existing = this.attributes.find((attr) => attr.name === name);
    if (existing) existing.value = stringValue;
    else this.attributes.push({ name, value: stringValue });
    if (name === "id") this.id = stringValue;
  }

  getAttribute(name) {
    return this.attributes.find((attr) => attr.name === name)?.value ?? null;
  }

  removeAttribute(name) {
    this.attributes = this.attributes.filter((attr) => attr.name !== name);
    if (name === "id") this.id = "";
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    this.children = this.children.filter((item) => item !== child);
    child.parentNode = null;
    return child;
  }

  replaceChild(next, previous) {
    const index = this.children.indexOf(previous);
    if (index >= 0) {
      next.parentNode = this;
      previous.parentNode = null;
      this.children[index] = next;
    }
    return previous;
  }

  addEventListener(type, handler) {
    this.listeners[type] = this.listeners[type] ?? [];
    this.listeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    this.listeners[type] = (this.listeners[type] ?? []).filter((item) => item !== handler);
  }

  querySelectorAll() {
    return [];
  }

  focus() {}

  click() {
    for (const handler of this.listeners.click ?? []) handler();
  }
}

function collect(rootElement, predicate, out = []) {
  if (predicate(rootElement)) out.push(rootElement);
  for (const child of rootElement.children ?? []) collect(child, predicate, out);
  return out;
}

function localizedConfig(store, requestedLang) {
  const body = JSON.parse(JSON.stringify(store.config));
  const packs = body.bannerConfig.translations || {};
  const raw = String(requestedLang || "").trim();
  const exact = packs[raw];
  const base = raw.split("-")[0];
  const pack = exact || packs[base];
  if (pack) {
    Object.assign(body.bannerConfig, pack);
    body.resolvedLanguage = exact ? raw : base;
  } else if (!raw || base === "en") {
    body.resolvedLanguage = raw || "en";
  } else {
    body.resolvedLanguage = "en";
  }
  const langBase = String(body.resolvedLanguage).split("-")[0];
  body.locale = {
    ...(body.locale || {}),
    resolved: body.resolvedLanguage,
    direction: ["ar", "he", "fa", "ur"].includes(langBase) ? "rtl" : "ltr",
    supported: Object.keys(packs),
  };
  return body;
}

function createBrowser(store, storageSeed = {}) {
  const api = createApi(store);
  const document = {
    readyState: "complete",
    listeners: {},
    scripts: [],
    body: null,
    head: null,
    currentScript: null,
    createElement(tagName) {
      return new FakeElement(tagName, document);
    },
    getElementsByTagName(tagName) {
      return tagName === "script" ? this.scripts : [];
    },
    querySelectorAll(selector) {
      if (selector === "script[data-cmp-purpose]") {
        return this.scripts.filter((script) => script.getAttribute("data-cmp-purpose"));
      }
      return [];
    },
    getElementById(id) {
      const hits = [];
      if (this.body) collect(this.body, (el) => el.id === id || el.getAttribute("id") === id, hits);
      if (hits[0]) return hits[0];
      if (this.head) collect(this.head, (el) => el.id === id || el.getAttribute("id") === id, hits);
      if (this.documentElement && (this.documentElement.id === id || this.documentElement.getAttribute("id") === id)) {
        return this.documentElement;
      }
      return hits[0] ?? null;
    },
    contains(node) {
      if (!node) return false;
      if (node === this.documentElement || node === this.head || node === this.body) return true;
      return (
        collect(this.head, (el) => el === node).length > 0 ||
        collect(this.body, (el) => el === node).length > 0
      );
    },
    addEventListener(type, handler) {
      this.listeners[type] = this.listeners[type] ?? [];
      this.listeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      this.listeners[type] = (this.listeners[type] ?? []).filter((item) => item !== handler);
    },
  };
  document.body = new FakeElement("body", document);
  document.head = new FakeElement("head", document);
  document.documentElement = new FakeElement("html", document);
  document.documentElement.clientWidth = 1008;

  function script(attrs) {
    const el = new FakeElement("script", document);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    document.scripts.push(el);
    document.body.appendChild(el);
    return el;
  }

  const loaderScript = script({
    src: "https://cmp.example/api/sdk/script.js",
    "data-site-key": store.website.siteKey,
  });
  document.currentScript = loaderScript;
  const analyticsScript = script({
    src: "https://analytics.example/analytics.js",
    type: "text/javascript",
    "data-cmp-purpose": "analytics",
  });
  const adsScript = script({
    src: "https://ads.example/ads.js",
    type: "text/javascript",
    "data-cmp-purpose": "ads",
  });

  const storage = new Map(Object.entries(storageSeed));
  const windowListeners = {};
  const window = {
    __CMP_DEBUG: false,
    location: { search: "", href: "https://example.com/" },
    navigator: { language: "en-US", languages: ["en-US", "en"] },
    pageYOffset: 240,
    scrollY: 240,
    innerWidth: 1024,
    scrollTo(_x, y) {
      this.pageYOffset = y;
      this.scrollY = y;
    },
    addEventListener(type, handler) {
      windowListeners[type] = windowListeners[type] ?? [];
      windowListeners[type].push(handler);
    },
    removeEventListener(type, handler) {
      windowListeners[type] = (windowListeners[type] ?? []).filter((item) => item !== handler);
    },
    __gtagCalls: [],
    gtag(...args) {
      this.__gtagCalls.push(args);
    },
    __tcfapi: undefined,
    __gpp: undefined,
    console,
    document,
    URL,
    CustomEvent: class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    },
    dispatchEvent() {},
    localStorage: {
      getItem(key) {
        return storage.has(key) ? storage.get(key) : null;
      },
      setItem(key, value) {
        storage.set(key, String(value));
      },
      removeItem(key) {
        storage.delete(key);
      },
    },
    fetch: async (url, init = {}) => {
      const parsed = new URL(url);
      let result;
      if (parsed.pathname === `/api/sdk/${store.website.siteKey}/config`) {
        result = { status: 200, body: localizedConfig(store, parsed.searchParams.get("lang")) };
      } else if (parsed.pathname.startsWith("/api/sdk/")) {
        result = { status: 404, body: { success: false, message: "Website not found" } };
      } else if (parsed.pathname === "/api/consent/record" && init.method === "POST") {
        result = api.submitConsent(JSON.parse(init.body));
      } else if (parsed.pathname === "/api/consent/record") {
        result = api.getConsent(parsed.searchParams.get("consentId"), parsed.searchParams.get("websiteId"));
      } else if (parsed.pathname === "/api/consent/withdraw") {
        result = api.withdraw(JSON.parse(init.body));
      } else {
        result = { status: 404, body: { success: false, message: "Not found" } };
      }
      return {
        ok: result.status >= 200 && result.status < 300,
        status: result.status,
        json: async () => result.body,
      };
    },
  };
  window.window = window;
  window.document = document;
  document.defaultView = window;

  return { adsScript, analyticsScript, api, document, storage, store, window };
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function loadSdk(browser) {
  vm.runInNewContext(
    buildCmpSdkScript({ siteKey: browser.store.website.siteKey, apiBase: "https://cmp.example" }),
    {
      window: browser.window,
      document: browser.document,
      console,
      fetch: browser.window.fetch,
      localStorage: browser.window.localStorage,
      URL,
      URLSearchParams,
      CustomEvent: browser.window.CustomEvent,
      setTimeout,
      clearTimeout,
    },
  );
  await flush();
}

function buttonByText(browser, text) {
  const buttons = collect(browser.document.body, (el) => el.tagName === "BUTTON");
  const found = buttons.find((button) => button.textContent === text);
  assert.ok(found, `Expected button "${text}" to exist`);
  return found;
}

async function testAcceptAllFlow() {
  const store = createStore();
  const browser = createBrowser(store);
  await loadSdk(browser);

  assert.equal(browser.analyticsScript.getAttribute("type"), "text/plain");
  assert.ok(browser.document.getElementById("__cmp_banner__"), "banner should render");
  assert.equal(browser.document.documentElement.getAttribute("data-cmp-scroll-lock"), "true");
  assert.equal(browser.document.body.style.getPropertyValue("position"), "fixed");
  assert.equal(browser.document.body.style.getPropertyValue("top"), "-240px");

  buttonByText(browser, "Accept all").click();
  await flush();

  assert.equal(store.records[0].status, "accepted");
  assert.equal(browser.window.CMP.getConsent().consentId, "cid_e2e_1");
  assert.equal(browser.window.CMP.getConsent().decisions.purposes[ids.analyticsPurpose], true);
  assert.notEqual(browser.document.scripts.find((s) => s.getAttribute("src") === "https://analytics.example/analytics.js").getAttribute("type"), "text/plain");
  assert.equal(store.events.length, 1);
  assert.equal(store.auditLogs.length, 1);
  assert.equal(store.webhookDeliveries[0].eventType, "consent.granted");
  assert.equal(browser.document.getElementById("__cmp_banner__"), null);
  assert.equal(browser.document.documentElement.getAttribute("data-cmp-scroll-lock"), null);
  assert.equal(browser.document.body.style.getPropertyValue("position"), "");
  assert.equal(browser.window.scrollY, 240);
  assert.deepEqual(browser.api.analytics(), {
    total: 1,
    accepted: 1,
    rejected: 0,
    partial: 0,
    withdrawn: 0,
    eventCount: 1,
  });

  const evidence = browser.api.evidence("cid_e2e_1", ids.orgA);
  assert.equal(evidence.status, 200);
  assert.equal(evidence.body.evidence.policyVersion.isPublished, true);
  assert.equal(evidence.body.evidence.decisions.length, 5);
  assert.equal(browser.api.evidence("cid_e2e_1", ids.orgB).status, 404);
}

async function testRejectAllFlow() {
  const store = createStore();
  const browser = createBrowser(store);
  await loadSdk(browser);
  buttonByText(browser, "Reject all").click();
  await flush();

  assert.equal(store.records[0].status, "rejected");
  assert.equal(browser.window.CMP.getConsent().decisions.purposes[ids.requiredPurpose], true);
  assert.equal(browser.window.CMP.getConsent().decisions.purposes[ids.analyticsPurpose], false);
  assert.equal(browser.analyticsScript.getAttribute("type"), "text/plain");
  assert.equal(store.webhookDeliveries[0].eventType, "consent.declined");
  assert.equal(browser.document.documentElement.getAttribute("data-cmp-scroll-lock"), null);
}

async function testGranularPersistenceWithdrawalAndExpiry() {
  const store = createStore();
  const browser = createBrowser(store);
  await loadSdk(browser);

  browser.window.CMP.saveGranular(
    [
      { purposeId: ids.analyticsPurpose, granted: true },
      { purposeId: ids.adsPurpose, granted: false },
    ],
    [
      { vendorId: ids.analyticsVendor, granted: true },
      { vendorId: ids.adsVendor, granted: false },
    ],
  );
  await flush();

  assert.equal(store.records[0].status, "partial");
  assert.equal(browser.document.documentElement.getAttribute("data-cmp-scroll-lock"), null);
  assert.notEqual(browser.document.scripts.find((s) => s.getAttribute("src") === "https://analytics.example/analytics.js").getAttribute("type"), "text/plain");
  assert.equal(browser.adsScript.getAttribute("type"), "text/plain");

  const storageSnapshot = Object.fromEntries(browser.storage.entries());
  const reload = createBrowser(store, storageSnapshot);
  await loadSdk(reload);
  assert.equal(reload.document.getElementById("__cmp_banner__"), null);
  assert.notEqual(reload.document.scripts.find((s) => s.getAttribute("src") === "https://analytics.example/analytics.js").getAttribute("type"), "text/plain");
  assert.equal(reload.adsScript.getAttribute("type"), "text/plain");

  reload.window.CMP.withdrawConsent();
  await flush();
  assert.equal(store.records[0].status, "withdrawn");
  assert.equal(reload.storage.get(`cmp_consent_${store.website.siteKey}`), undefined);
  assert.ok(reload.document.getElementById("__cmp_banner__"), "banner should return after withdrawal");
  assert.equal(reload.document.documentElement.getAttribute("data-cmp-scroll-lock"), "true");
  assert.equal(store.webhookDeliveries.at(-1).eventType, "consent.withdrawn");
  assert.equal(reload.api.withdraw({ consentId: "cid_e2e_1", websiteId: ids.websiteA }).status, 409);

  const expired = createBrowser(store, {
    [`cmp_consent_${store.website.siteKey}`]: JSON.stringify({ consentId: "cid_expired", decisions: [] }),
    [`cmp_expiry_${store.website.siteKey}`]: String(Date.now() - 1_000),
  });
  await loadSdk(expired);
  assert.ok(expired.document.getElementById("__cmp_banner__"), "expired stored consent should require re-consent");
  assert.equal(expired.storage.get(`cmp_consent_${store.website.siteKey}`), undefined);
}

function testNegativeCasesAndEnforcement() {
  const store = createStore();
  const api = createApi(store);

  assert.equal(isValidSiteKey("bad"), false);
  assert.equal(isValidSiteKey(store.website.siteKey), true);
  assert.equal(isValidWebsiteId("not-a-uuid"), false);
  assert.equal(isValidConsentId("cid_e2e_12345678"), true);
  assert.equal(api.submitConsent({ websiteId: ids.websiteA, submission: { choice: "invalid" } }).status, 400);
  assert.equal(api.submitConsent({ websiteId: ids.websiteB, submission: { choice: "accept-all" } }).status, 404);

  const decisions = buildDecisions(store, "granular", [
    { purposeId: ids.analyticsPurpose, granted: true },
    { purposeId: ids.adsPurpose, granted: false },
  ], [
    { vendorId: ids.analyticsVendor, granted: true },
    { vendorId: ids.adsVendor, granted: false },
  ]);
  const grants = buildGrantsFromDecisions(decisions);
  const blocklist = buildBlocklist(store.trackerRules, grants);

  assert.equal(shouldBlock(store.trackerRules[0], grants), false);
  assert.equal(shouldBlock(store.trackerRules[1], grants), false);
  assert.equal(shouldBlock(store.trackerRules[2], grants), true);
  assert.equal(shouldBlock(store.trackerRules[3], grants), true);
  assert.equal(blocklist.domains.has("ads.example"), true);
  assert.equal(blocklist.domains.has("unknown.example"), true);
  assert.equal(domainMatches("https://cdn.ads.example/pixel.js", "ads.example"), true);
}

async function testInvalidJsonPayload() {
  const result = await readPublicJsonObject(new Request("https://cmp.example/api/consent/record", {
    method: "POST",
    body: "{invalid",
  }));
  assert.deepEqual(result, { ok: false, status: 400, message: "Invalid JSON" });
}

async function testGoogleAndIabSignalPropagation() {
  const store = createStore();
  store.config.signals = {
    googleConsentMode: {
      enabled: true,
      waitForUpdateMs: 500,
      adsDataRedaction: true,
      urlPassthrough: false,
      purposeSignals: {
        analytics: ["analytics_storage"],
        ads: ["ad_storage", "ad_user_data", "ad_personalization"],
        essential: ["security_storage"],
      },
    },
    iabTcf: { enabled: true, status: "foundation" },
    iabGpp: { enabled: true, status: "foundation" },
  };
  const browser = createBrowser(store);
  await loadSdk(browser);
  assert.equal(typeof browser.window.__tcfapi, "function");
  assert.equal(typeof browser.window.__gpp, "function");
  assert.ok(browser.window.__gtagCalls.some((call) => call[0] === "consent" && call[1] === "default"));

  buttonByText(browser, "Accept all").click();
  await flush();
  const updates = browser.window.__gtagCalls.filter((call) => call[0] === "consent" && call[1] === "update");
  const update = updates[updates.length - 1];
  assert.ok(update);
  assert.equal(update[2].analytics_storage, "granted");
  assert.equal(update[2].ad_storage, "granted");

  browser.window.CMP.withdrawConsent();
  await flush();
  const withdrawn = [...browser.window.__gtagCalls].reverse().find((call) => call[0] === "consent" && call[1] === "update");
  assert.equal(withdrawn[2].analytics_storage, "denied");
  assert.equal(withdrawn[2].security_storage, "granted");
}

async function testBannerLocalizationAndEvidenceLocale() {
  const translations = {
    hi: { title: "आपकी गोपनीयता", description: "हिंदी सूचना", acceptAllLabel: "सभी स्वीकार करें", rejectAllLabel: "सभी अस्वीकार करें", customizeLabel: "वरीयताएँ", savePreferencesLabel: "सहेजें", preferenceCenterTitle: "वरीयता केंद्र" },
    es: { title: "Su privacidad", acceptAllLabel: "Aceptar todo" },
    fr: { title: "Votre vie privée", acceptAllLabel: "Tout accepter", description: "Avis en français" },
    de: { title: "Ihre Privatsphäre", acceptAllLabel: "Alle akzeptieren" },
    pt: { title: "A sua privacidade", acceptAllLabel: "Aceitar tudo" },
    ar: { title: "خصوصيتك", acceptAllLabel: "قبول الكل", description: "إشعار عربي" },
    zh: { title: "您的隐私", acceptAllLabel: "全部接受" },
    ja: { title: "プライバシー", acceptAllLabel: "すべて許可" },
  };

  async function visit(lang) {
    const store = createStore();
    store.config.bannerConfig.translations = translations;
    const browser = createBrowser(store);
    browser.window.location.search = `?lang=${encodeURIComponent(lang)}`;
    await loadSdk(browser);
    const banner = browser.document.getElementById("__cmp_banner__");
    assert.ok(banner, `banner should render for ${lang}`);
    return { store, browser, banner };
  }

  const hi = await visit("hi");
  assert.equal(hi.banner.getAttribute("lang"), "hi");
  assert.equal(hi.banner.getAttribute("dir"), "ltr");
  assert.ok(buttonByText(hi.browser, "सभी स्वीकार करें"));
  const hiTitle = collect(hi.banner, (el) => el.tagName === "STRONG")[0];
  assert.equal(hiTitle.textContent, "आपकी गोपनीयता");
  buttonByText(hi.browser, "सभी स्वीकार करें").click();
  await flush();
  assert.equal(hi.store.records[0].metadata.noticeLanguage, "hi");
  assert.equal(hi.store.records[0].metadata.noticeTitle, "आपकी गोपनीयता");

  const fr = await visit("fr-FR");
  assert.ok(buttonByText(fr.browser, "Tout accepter"));
  buttonByText(fr.browser, "Tout accepter").click();
  await flush();
  assert.equal(fr.store.records[0].metadata.noticeLanguage, "fr");

  const pt = await visit("pt-BR");
  assert.ok(buttonByText(pt.browser, "Aceitar tudo"));

  const ar = await visit("ar");
  assert.equal(ar.banner.getAttribute("dir"), "rtl");
  assert.ok(buttonByText(ar.browser, "قبول الكل"));
  buttonByText(ar.browser, "قبول الكل").click();
  await flush();
  assert.equal(ar.store.records[0].metadata.noticeLanguage, "ar");

  const unsupported = await visit("xx-YY");
  assert.ok(buttonByText(unsupported.browser, "Accept all"));
  assert.equal(unsupported.banner.getAttribute("lang"), "en");

  const switchLang = createStore();
  switchLang.config.bannerConfig.translations = translations;
  const browser = createBrowser(switchLang);
  browser.window.location.search = "?lang=en";
  await loadSdk(browser);
  assert.ok(buttonByText(browser, "Accept all"));
  const before = browser.window.CMP.getConsent();
  browser.window.CMP.setLanguage("de");
  await flush();
  assert.ok(buttonByText(browser, "Alle akzeptieren"));
  const after = browser.window.CMP.getConsent();
  assert.deepEqual(after.decisions, before.decisions);
  assert.equal(switchLang.records.length, 0);

  browser.window.CMP.openPreferenceCenter();
  const pc = browser.document.getElementById("__cmp_pc__");
  assert.ok(pc);
  const pcTitle = collect(pc, (el) => el.id === "__cmp_pc_title__")[0];
  assert.ok(pcTitle);
}

async function testHostScrollLockSurfaces() {
  const store = createStore();
  const browser = createBrowser(store);
  browser.window.scrollY = 480;
  browser.window.pageYOffset = 480;
  await loadSdk(browser);

  assert.equal(browser.document.documentElement.getAttribute("data-cmp-scroll-lock"), "true");
  assert.ok(browser.document.getElementById("__cmp_host_lock_css"), "lock stylesheet should be injected once");

  await loadSdk(browser);
  const sheetsAfterReinit = collect(browser.document.head, (el) => el.id === "__cmp_host_lock_css");
  assert.equal(sheetsAfterReinit.length, 1, "reinitialization must not duplicate lock stylesheets");
  assert.equal(browser.document.documentElement.getAttribute("data-cmp-scroll-lock"), "true");

  buttonByText(browser, "Customize").click();
  assert.ok(browser.document.getElementById("__cmp_pc__"));
  assert.equal(browser.document.getElementById("__cmp_banner__"), null);
  assert.equal(browser.document.documentElement.getAttribute("data-cmp-scroll-lock"), "true");
  const pcBody = collect(browser.document.getElementById("__cmp_pc__"), (el) =>
    String(el.getAttribute("style") || "").includes("overflow-y:auto"),
  )[0];
  assert.ok(pcBody, "preference center body should remain scrollable");

  browser.window.CMP.setLanguage("en");
  await flush();
  assert.equal(browser.document.documentElement.getAttribute("data-cmp-scroll-lock"), "true");
  assert.equal(store.records.length, 0);

  buttonByText(browser, "Save preferences").click();
  await flush();
  assert.equal(browser.document.getElementById("__cmp_pc__"), null);
  assert.equal(browser.document.documentElement.getAttribute("data-cmp-scroll-lock"), null);
  assert.equal(browser.window.scrollY, 480);
}

async function main() {
  await testAcceptAllFlow();
  await testRejectAllFlow();
  await testGranularPersistenceWithdrawalAndExpiry();
  testNegativeCasesAndEnforcement();
  await testInvalidJsonPayload();
  await testGoogleAndIabSignalPropagation();
  await testBannerLocalizationAndEvidenceLocale();
  await testHostScrollLockSurfaces();

  console.log("consent manager e2e regression tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
