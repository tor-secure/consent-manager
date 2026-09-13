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
    return { NextResponse, after(task) { void Promise.resolve(typeof task === "function" ? task() : task); } };
  }
  if (request === "@/db") return { db: {} };
  if (request === "@/lib/logger") return { logger: { error() {}, warn() {}, info() {}, debug() {} } };
  if (request.startsWith("@/db/schema/")) return {};
  if (request.startsWith("@/")) {
    return originalLoad.call(this, findCompiled(`src/${request.slice(2)}.ts`), parent, isMain);
  }
  return originalLoad.call(this, request, parent, isMain);
};

const {
  buildCmpSdkScript,
  buildEmbedSnippet,
} = require(findCompiled("src/lib/sdk/cmp-sdk-script.ts"));
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
  publicCorsHeaders,
  PUBLIC_CORS_ALLOWED_HEADERS,
  readPublicJsonObject,
} = require(findCompiled("src/lib/sdk/public-http.ts"));
const {
  resolvePublicAppOrigin,
} = require(findCompiled("src/lib/sdk/public-origin.ts"));
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
      { id: ids.requiredPurpose, key: "essential", name: "Essential", isRequired: true, iabTcfPurposeId: 1 },
      { id: ids.analyticsPurpose, key: "analytics", name: "Analytics", isRequired: false, iabTcfPurposeId: 7 },
      { id: ids.adsPurpose, key: "ads", name: "Advertising", isRequired: false, iabTcfPurposeId: 4 },
    ],
    vendors: [
      { id: ids.analyticsVendor, name: "Analytics Vendor", domain: "analytics.example", iabVendorId: 100 },
      { id: ids.adsVendor, name: "Ads Vendor", domain: "ads.example", iabVendorId: 200 },
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
        cookieNames: ["_analytics", "_analytics_*"],
        localStorageKeys: ["analytics_*"],
        sessionStorageKeys: ["analytics_session"],
        indexedDbNames: ["analytics-db"],
        scriptUrlPatterns: ["analytics.example"],
        iframeUrlPatterns: ["analytics.example/embed"],
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
    evidenceSnapshots: [],
    submissions: new Map(),
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
    trackerEnforcement: {
      unknownTrackerBehavior: "BLOCK",
      debugMode: false,
    },
    locale: { language: "en", region: "IN" },
    grievance: {},
    signals: {
      googleConsentMode: { enabled: false, status: "disabled", purposeSignals: {} },
      iabTcf: { enabled: false, status: "disabled" },
      iabGpp: { enabled: false, status: "disabled" },
    },
  };
  store.config.policyContext = {
    token: "signed-test-policy-context-v1",
    claims: {
      version: 1,
      algorithm: "HMAC-SHA256",
      contextId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      organizationId: store.organization.id,
      websiteId: store.website.id,
      siteKey: store.website.siteKey,
      policyId: store.policy.id,
      policyVersionId: store.policyVersion.id,
      policyVersionNumber: store.policyVersion.version,
      jurisdiction: "dpdp",
      locale: "en",
      variantId: null,
      noticeHash: "a".repeat(64),
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    },
    noticeSnapshot: {
      policy: {
        id: store.policy.id,
        name: store.config.policy.name,
        versionId: store.policyVersion.id,
        version: store.policyVersion.version,
      },
      jurisdiction: "dpdp",
      locale: "en",
      variantId: null,
      bannerConfig: store.config.bannerConfig,
      purposes: store.purposes,
      vendors: store.vendors,
      grievance: {},
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
    const context = body.policyContext;
    if (!context?.token || !context.claims || !context.noticeSnapshot) {
      return { status: 400, body: { success: false, message: "A valid policy context is required" } };
    }
    if (
      context.claims.organizationId !== store.organization.id ||
      context.claims.websiteId !== store.website.id ||
      context.claims.siteKey !== store.website.siteKey
    ) {
      return { status: 403, body: { success: false, message: "Policy context scope mismatch" } };
    }
    if (!body.submission || !["accept-all", "reject-all", "granular"].includes(body.submission.choice)) {
      return {
        status: 400,
        body: { success: false, message: "submission.choice must be accept-all, reject-all, or granular" },
      };
    }
    if (!/^[0-9a-f-]{36}$/i.test(String(body.submissionId || ""))) {
      return { status: 400, body: { success: false, message: "A valid submissionId is required" } };
    }
    if (
      !Number.isInteger(body.expectedStateVersion) ||
      (body.consentId ? body.expectedStateVersion < 1 : body.expectedStateVersion !== 0)
    ) {
      return { status: 400, body: { success: false, message: "Invalid expectedStateVersion" } };
    }
    const requestSignature = JSON.stringify({
      websiteId: body.websiteId,
      consentId: body.consentId || null,
      expectedStateVersion: body.expectedStateVersion,
      policyContextId: context.claims.contextId,
      submission: body.submission,
    });
    const existingSubmission = store.submissions.get(body.submissionId);
    if (existingSubmission) {
      if (existingSubmission.requestSignature !== requestSignature) {
        return { status: 409, body: { success: false, message: "Submission conflict" } };
      }
      return {
        status: 200,
        body: { ...existingSubmission.response, idempotent: true },
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
        policyVersionId: context.claims.policyVersionId,
        visitorId: "visitor-e2e",
        status,
        stateVersion: 1,
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
      if (body.expectedStateVersion !== record.stateVersion) {
        return { status: 409, body: { success: false, message: "Consent state changed" } };
      }
      record.status = status;
      record.stateVersion += 1;
      record.policyVersionId = context.claims.policyVersionId;
      record.consentedAt = new Date().toISOString();
      record.expiresAt = expiresAt;
      emitSideEffects(store, record, "consent.updated", { status, choice: body.submission.choice });
    }

    store.decisions.set(record.id, decisions);
    const evidenceSnapshot = {
      id: `evidence-${body.submissionId}`,
      consentId,
      policyId: context.claims.policyId,
      policyVersionId: context.claims.policyVersionId,
      policyVersionNumber: context.claims.policyVersionNumber,
      policyContextId: context.claims.contextId,
      jurisdiction: context.claims.jurisdiction,
      noticeHash: context.claims.noticeHash,
      decisions,
    };
    store.evidenceSnapshots.push(evidenceSnapshot);
    const response = {
      success: true,
      confirmed: true,
      consentId,
      status,
      stateVersion: record.stateVersion,
      policyVersionId: context.claims.policyVersionId,
      policyContextId: context.claims.contextId,
      evidenceSnapshotId: evidenceSnapshot.id,
      confirmedAt: record.consentedAt,
      expiresAt,
      decisions,
      signals: {},
      confirmation: {
        policyContextValidated: true,
        persisted: true,
        evidenceSnapshotCreated: true,
      },
    };
    store.submissions.set(body.submissionId, { requestSignature, response });
    return {
      status: body.consentId ? 200 : 201,
      body: response,
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
    if (body.expectedStateVersion !== record.stateVersion) {
      return { status: 409, body: { success: false, message: "Consent state changed" } };
    }
    const previousStatus = record.status;
    record.status = "withdrawn";
    record.stateVersion += 1;
    record.withdrawnAt = new Date().toISOString();
    emitSideEffects(store, record, "consent.withdrawn", { previousStatus, withdrawnAt: record.withdrawnAt });
    return {
      status: 200,
      body: {
        success: true,
        withdrawnAt: record.withdrawnAt,
        stateVersion: record.stateVersion,
      },
    };
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
      const scriptIndex = this.ownerDocument.scripts.indexOf(previous);
      if (scriptIndex >= 0 && next.tagName === "SCRIPT") {
        this.ownerDocument.scripts[scriptIndex] = next;
      }
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

  querySelectorAll(selector) {
    const tags = String(selector).split(",").map((value) => value.trim().toUpperCase());
    const hits = [];
    for (const child of this.children) {
      collect(child, (element) => tags.includes(element.tagName), hits);
    }
    return hits;
  }

  focus() {}

  click() {
    if (this.disabled) return;
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

function createBrowser(store, storageSeed = {}, options = {}) {
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
      if (selector === "script,iframe,img") {
        const hits = [];
        collect(this.head, (element) => ["SCRIPT", "IFRAME", "IMG"].includes(element.tagName), hits);
        collect(this.body, (element) => ["SCRIPT", "IFRAME", "IMG"].includes(element.tagName), hits);
        return hits;
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

  const storage =
    storageSeed instanceof Map
      ? storageSeed
      : new Map(Object.entries(storageSeed));
  const sessionValues = new Map();
  function storageApi(values) {
    const api = {
      getItem(key) {
        return values.has(key) ? values.get(key) : null;
      },
      setItem(key, value) {
        values.set(key, String(value));
      },
      removeItem(key) {
        values.delete(key);
      },
      key(index) {
        return [...values.keys()][index] ?? null;
      },
    };
    Object.defineProperty(api, "length", {
      get() {
        return values.size;
      },
    });
    return api;
  }
  const localStorageApi = storageApi(storage);
  const sessionStorageApi = storageApi(sessionValues);
  const cookieJar = new Map();
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get() {
      return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
    },
    set(serialized) {
      const [pair] = String(serialized).split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1);
      if (/max-age\s*=\s*0/i.test(serialized) || /expires\s*=\s*thu,\s*01\s+jan\s+1970/i.test(serialized)) {
        cookieJar.delete(name);
      } else {
        cookieJar.set(name, value);
      }
    },
  });
  const windowListeners = {};
  const intervals = new Map();
  let nextIntervalId = 1;
  const window = {
    __CMP_DEBUG: false,
    __CMP_CONFIRMATION_DISPLAY_MS: 0,
    location: {
      search: "",
      href: "https://example.com/",
      hostname: "example.com",
      origin: "https://example.com",
    },
    navigator: {
      language: "en-US",
      languages: ["en-US", "en"],
      doNotTrack: options.doNotTrack ?? null,
      msDoNotTrack: options.doNotTrack ?? null,
    },
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
    setInterval(handler) {
      const id = nextIntervalId++;
      intervals.set(id, handler);
      return id;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
    setTimeout,
    clearTimeout,
    AbortController,
    __gtagCalls: [],
    gtag(...args) {
      this.__gtagCalls.push(args);
    },
    __tcfapi: undefined,
    __gpp: undefined,
    console: { ...console, debug() {} },
    document,
    URL,
    CustomEvent: class CustomEvent {
      constructor(type) {
        this.type = type;
      }
    },
    dispatchEvent() {},
    localStorage: localStorageApi,
    sessionStorage: sessionStorageApi,
    fetch: async (url, init = {}) => {
      const parsed = new URL(url);
      let result;
      if (parsed.pathname === `/api/sdk/${store.website.siteKey}/config`) {
        result = { status: 200, body: localizedConfig(store, parsed.searchParams.get("lang")) };
      } else if (parsed.pathname.startsWith("/api/sdk/")) {
        result = { status: 404, body: { success: false, message: "Website not found" } };
      } else if (parsed.pathname === "/api/consent/record" && init.method === "POST") {
        const body = JSON.parse(init.body);
        result = store.consentPostInterceptor
          ? await store.consentPostInterceptor(body, init, api)
          : api.submitConsent(body);
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

  return {
    adsScript,
    analyticsScript,
    api,
    document,
    cookieJar,
    sessionValues,
    storage,
    store,
    window,
    runConfigRefresh() {
      for (const handler of intervals.values()) handler();
    },
    dispatchStorage(key) {
      for (const handler of windowListeners.storage ?? []) {
        handler({ key });
      }
    },
  };
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
      sessionStorage: browser.window.sessionStorage,
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

async function testBannerPaintsBeforeConfigReturns() {
  const store = createStore();
  const browser = createBrowser(store);
  vm.runInNewContext(
    buildCmpSdkScript({ siteKey: browser.store.website.siteKey, apiBase: "https://cmp.example" }),
    {
      window: browser.window,
      document: browser.document,
      console,
      fetch: browser.window.fetch,
      localStorage: browser.window.localStorage,
      sessionStorage: browser.window.sessionStorage,
      URL,
      URLSearchParams,
      CustomEvent: browser.window.CustomEvent,
      setTimeout,
      clearTimeout,
    },
  );
  assert.ok(
    browser.document.getElementById("__cmp_banner__"),
    "banner must paint before /api/sdk/{siteKey}/config returns",
  );
  buttonByText(browser, "Accept all").click();
  assert.equal(
    browser.document.getElementById("__cmp_banner__"),
    null,
    "Accept must close the banner before config or the server respond",
  );
  await flush();
  assert.equal(
    browser.document.getElementById("__cmp_banner__"),
    null,
    "live config must not bring the banner back after Accept",
  );
  assert.ok(store.records[0], "accept before config should still persist once config arrives");

  const reload = createBrowser(store, Object.fromEntries(browser.storage.entries()));
  vm.runInNewContext(
    buildCmpSdkScript({ siteKey: reload.store.website.siteKey, apiBase: "https://cmp.example" }),
    {
      window: reload.window,
      document: reload.document,
      console,
      fetch: reload.window.fetch,
      localStorage: reload.window.localStorage,
      sessionStorage: reload.window.sessionStorage,
      URL,
      URLSearchParams,
      CustomEvent: reload.window.CustomEvent,
      setTimeout,
      clearTimeout,
    },
  );
  assert.equal(
    reload.document.getElementById("__cmp_banner__"),
    null,
    "confirmed consent must not flash a banner while config loads",
  );
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
  assert.equal(store.records[0].policyVersionId, ids.versionA);
  assert.equal(store.evidenceSnapshots[0].policyVersionId, ids.versionA);
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

  const reload = createBrowser(store, Object.fromEntries(browser.storage.entries()));
  await loadSdk(reload);
  assert.equal(
    reload.document.getElementById("__cmp_banner__"),
    null,
    "reject-all is a valid decision and must not reopen the banner on the next page load",
  );
  assert.ok(
    reload.document.getElementById("__cmp_reopen__"),
    "returning reject-all visitors must still be able to reopen the preference center",
  );
  assert.equal(reload.window.CMP.getConsent().decisions.purposes[ids.requiredPurpose], true);
  assert.equal(reload.window.CMP.getConsent().decisions.purposes[ids.analyticsPurpose], false);
  assert.equal(reload.analyticsScript.getAttribute("type"), "text/plain");
}

async function testPublishedPolicyRefresh() {
  const store = createStore();
  const browser = createBrowser(store);
  await loadSdk(browser);

  const versionTwoId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  store.config.policy.versionId = versionTwoId;
  store.config.policy.version = 2;
  store.config.bannerConfig.title = "Updated privacy policy";
  store.config.policyContext = {
    ...store.config.policyContext,
    token: "signed-test-policy-context-v2",
    claims: {
      ...store.config.policyContext.claims,
      contextId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
      policyVersionId: versionTwoId,
      policyVersionNumber: 2,
      noticeHash: "b".repeat(64),
    },
    noticeSnapshot: {
      ...store.config.policyContext.noticeSnapshot,
      policy: {
        ...store.config.policyContext.noticeSnapshot.policy,
        versionId: versionTwoId,
        version: 2,
      },
      bannerConfig: store.config.bannerConfig,
    },
  };
  browser.runConfigRefresh();
  await flush();

  const banner = browser.document.getElementById("__cmp_banner__");
  const title = collect(banner, (el) => el.tagName === "STRONG")[0];
  assert.equal(
    title.textContent,
    "Privacy choices",
    "an open banner must preserve the policy context already shown",
  );
  buttonByText(browser, "Accept all").click();
  await flush();
  assert.equal(
    store.records[0].policyVersionId,
    ids.versionA,
    "publishing v2 while v1 is open must still record v1",
  );
  assert.equal(store.evidenceSnapshots[0].policyVersionId, ids.versionA);
}

async function testServerConfirmedConsentStateMachine() {
  const store = createStore();
  store.config.signals.googleConsentMode = {
    enabled: true,
    waitForUpdateMs: 500,
    purposeSignals: { analytics: ["analytics_storage"] },
  };
  let releaseConsent;
  let requestCount = 0;
  store.consentPostInterceptor = (body, _init, api) =>
    new Promise((resolve) => {
      requestCount += 1;
      releaseConsent = () => resolve(api.submitConsent(body));
    });
  const browser = createBrowser(store);
  await loadSdk(browser);

  const accept = buttonByText(browser, "Accept all");
  accept.click();
  await flush();

  assert.equal(requestCount, 1);
  assert.equal(accept.disabled, true, "submit controls must be disabled while pending");
  assert.equal(browser.window.CMP.getConsent().state, "PENDING");
  assert.equal(browser.window.CMP.getConsent().confirmed, false);
  assert.equal(browser.analyticsScript.getAttribute("type"), "text/plain");
  const pendingSignal = [...browser.window.__gtagCalls]
    .reverse()
    .find((call) => call[0] === "consent" && call[1] === "update");
  assert.equal(pendingSignal[2].analytics_storage, "denied");
  assert.equal(store.records.length, 0);
  assert.equal(store.evidenceSnapshots.length, 0);
  assert.equal(
    JSON.parse(browser.storage.get(`cmp_consent_${store.website.siteKey}`)).status,
    "pending",
  );

  // A second click while the first request is pending must be ignored.
  accept.click();
  assert.equal(requestCount, 1);

  releaseConsent();
  await flush();
  assert.equal(browser.window.CMP.getConsent().state, "GRANTED");
  assert.equal(browser.window.CMP.getConsent().confirmed, true);
  assert.notEqual(
    browser.document.scripts
      .find((script) => script.getAttribute("src") === "https://analytics.example/analytics.js")
      .getAttribute("type"),
    "text/plain",
  );
  const confirmedSignal = [...browser.window.__gtagCalls]
    .reverse()
    .find((call) => call[0] === "consent" && call[1] === "update");
  assert.equal(confirmedSignal[2].analytics_storage, "granted");
  assert.equal(store.records.length, 1);
  assert.equal(store.evidenceSnapshots.length, 1);
  assert.equal(
    JSON.parse(browser.storage.get(`cmp_consent_${store.website.siteKey}`)).status,
    "confirmed",
  );
}

async function testConsentFailuresRemainBlocked() {
  const failures = [
    ["HTTP 400", async () => ({ status: 400, body: { success: false } })],
    ["HTTP 403", async () => ({ status: 403, body: { success: false } })],
    ["HTTP 409", async () => ({ status: 409, body: { success: false } })],
    ["database persistence failure", async () => ({ status: 500, body: { success: false } })],
    ["evidence creation failure", async () => ({ status: 500, body: { success: false } })],
    ["network failure", async () => { throw new Error("network unavailable"); }],
    [
      "HTTP success without explicit server confirmation",
      async () => ({ status: 200, body: { success: true } }),
    ],
  ];

  for (const [label, interceptor] of failures) {
    const store = createStore();
    store.consentPostInterceptor = interceptor;
    const browser = createBrowser(store);
    await loadSdk(browser);
    buttonByText(browser, "Accept all").click();
    await flush();

    assert.equal(browser.window.CMP.getConsent().state, "FAILED", label);
    assert.equal(browser.window.CMP.getConsent().confirmed, false, label);
    assert.equal(browser.analyticsScript.getAttribute("type"), "text/plain", label);
    assert.equal(store.records.length, 0, label);
    assert.equal(store.evidenceSnapshots.length, 0, label);
    assert.equal(
      JSON.parse(browser.storage.get(`cmp_consent_${store.website.siteKey}`)).status,
      "failed",
      label,
    );
    assert.ok(browser.document.getElementById("__cmp_banner__"), label);
  }
}

async function testExpiredPolicyContextRetriesOnce() {
  const store = createStore();
  let posts = 0;
  store.consentPostInterceptor = (body, _init, api) => {
    posts += 1;
    if (posts === 1) {
      return {
        status: 409,
        body: {
          success: false,
          code: "POLICY_CONTEXT_EXPIRED",
          message: "Policy context expired; reload the consent notice and try again",
        },
      };
    }
    return api.submitConsent(body);
  };
  const browser = createBrowser(store);
  await loadSdk(browser);
  buttonByText(browser, "Accept all").click();
  await flush();
  await flush();
  await flush();

  assert.equal(posts, 2, "expired policy context should refresh config and retry once");
  assert.equal(store.records.length, 1);
  assert.equal(browser.window.CMP.getConsent().confirmed, true);
  assert.equal(browser.document.getElementById("__cmp_banner__"), null);
}

async function testConsentTimeoutRemainsBlocked() {
  const store = createStore();
  store.consentPostInterceptor = (_body, init) =>
    new Promise((_resolve, reject) => {
      init.signal.addEventListener("abort", () => reject(new Error("aborted")));
    });
  const browser = createBrowser(store);
  browser.window.__CMP_SUBMIT_TIMEOUT_MS = 250;
  await loadSdk(browser);
  buttonByText(browser, "Accept all").click();
  await new Promise((resolve) => setTimeout(resolve, 300));
  await flush();

  assert.equal(browser.window.CMP.getConsent().state, "FAILED");
  assert.equal(browser.analyticsScript.getAttribute("type"), "text/plain");
  assert.equal(store.records.length, 0);
}

async function testPendingReloadAndCrossTabWithdrawal() {
  const store = createStore();
  const sharedStorage = new Map();
  let releaseConsent;
  store.consentPostInterceptor = (body, _init, api) =>
    new Promise((resolve) => {
      releaseConsent = () => resolve(api.submitConsent(body));
    });
  const tabA = createBrowser(store, sharedStorage);
  await loadSdk(tabA);
  buttonByText(tabA, "Accept all").click();
  await flush();

  const tabB = createBrowser(store, sharedStorage);
  await loadSdk(tabB);
  assert.equal(tabB.window.CMP.getConsent().state, "PENDING");
  assert.equal(tabB.analyticsScript.getAttribute("type"), "text/plain");

  releaseConsent();
  await flush();
  tabB.dispatchStorage(`cmp_consent_${store.website.siteKey}`);
  await flush();
  assert.equal(tabB.window.CMP.getConsent().state, "GRANTED");
  assert.notEqual(
    tabB.document.scripts
      .find((script) => script.getAttribute("src") === "https://analytics.example/analytics.js")
      .getAttribute("type"),
    "text/plain",
  );

  // Start a stale update in A, then withdraw from B before A receives a response.
  let releaseStaleUpdate;
  store.consentPostInterceptor = (body, _init, api) =>
    new Promise((resolve) => {
      releaseStaleUpdate = () => resolve(api.submitConsent(body));
    });
  const stalePromise = tabA.window.CMP.acceptAll().catch(() => undefined);
  await flush();
  await tabB.window.CMP.withdrawConsent();
  await flush();
  releaseStaleUpdate();
  await stalePromise;
  await flush();
  tabA.dispatchStorage(`cmp_consent_${store.website.siteKey}`);
  await flush();

  assert.equal(
    JSON.parse(sharedStorage.get(`cmp_consent_${store.website.siteKey}`)).status,
    "withdrawn",
  );
  assert.equal(tabA.window.CMP.getConsent().confirmed, true);
  assert.equal(tabA.window.CMP.getConsent().state, "DENIED");
  assert.equal(tabA.analyticsScript.getAttribute("type"), "text/plain");
  assert.equal(tabB.analyticsScript.getAttribute("type"), "text/plain");
  const staleTabTracker = appendResource(
    tabA,
    "script",
    "https://analytics.example/stale-tab.js",
  );
  assert.equal(staleTabTracker.getAttribute("type"), "text/plain");
}

async function testPendingStorageNeverActivatesProcessing() {
  const store = createStore();
  const browser = createBrowser(store, {
    [`cmp_consent_${store.website.siteKey}`]: JSON.stringify({
      status: "pending",
      serverConfirmed: false,
      consentId: "",
      submissionId: "12121212-1212-4121-8121-121212121212",
      revision: Date.now(),
    }),
  });
  await loadSdk(browser);
  assert.equal(browser.window.CMP.getConsent().state, "PENDING");
  assert.equal(browser.window.CMP.getConsent().confirmed, false);
  assert.equal(browser.analyticsScript.getAttribute("type"), "text/plain");
}

function appendResource(browser, tagName, src, attributes = {}) {
  const element = browser.document.createElement(tagName);
  element.setAttribute("src", src);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value);
  }
  browser.document.body.appendChild(element);
  return element;
}

async function testDynamicTrackerAndIframeEnforcement() {
  const store = createStore();
  const browser = createBrowser(store);
  await loadSdk(browser);

  const beforeConsent = appendResource(
    browser,
    "script",
    "https://analytics.example/dynamic.js",
  );
  assert.equal(beforeConsent.getAttribute("src"), null);
  assert.equal(beforeConsent.getAttribute("type"), "text/plain");
  assert.equal(beforeConsent.getAttribute("data-cmp-blocked"), "true");

  const iframe = appendResource(
    browser,
    "iframe",
    "https://analytics.example/embed/dashboard",
  );
  assert.equal(iframe.getAttribute("src"), "about:blank");
  assert.equal(iframe.getAttribute("data-cmp-blocked"), "true");
  const pixel = appendResource(
    browser,
    "img",
    "https://analytics.example/collect.gif",
  );
  assert.ok(pixel.getAttribute("src").startsWith("data:image/gif"));

  const unknown = appendResource(
    browser,
    "script",
    "https://unmapped-third-party.example/tracker.js",
  );
  assert.equal(unknown.getAttribute("type"), "text/plain");
  assert.equal(
    unknown.getAttribute("data-cmp-block-reason"),
    "unknown-tracker-fail-closed",
  );

  buttonByText(browser, "Accept all").click();
  await flush();
  const restoredAnalytics = collect(
    browser.document.body,
    (element) =>
      element.tagName === "SCRIPT" &&
      element.getAttribute("src") === "https://analytics.example/dynamic.js",
  );
  assert.equal(restoredAnalytics.length, 1);
  assert.equal(iframe.getAttribute("src"), "https://analytics.example/embed/dashboard");
  assert.equal(pixel.getAttribute("src"), "https://analytics.example/collect.gif");
  assert.equal(unknown.getAttribute("type"), "text/plain");

  const afterConsent = appendResource(
    browser,
    "script",
    "https://analytics.example/after-confirmation.js",
  );
  assert.equal(
    afterConsent.getAttribute("src"),
    "https://analytics.example/after-confirmation.js",
  );

  await browser.window.CMP.withdrawConsent();
  await flush();
  const futureTracker = appendResource(
    browser,
    "script",
    "https://analytics.example/after-withdrawal.js",
  );
  assert.equal(futureTracker.getAttribute("src"), null);
  assert.equal(futureTracker.getAttribute("type"), "text/plain");
  assert.equal(iframe.getAttribute("src"), "about:blank");
  const metrics = browser.window.CMP.getEnforcementDiagnostics().metrics;
  assert.ok(metrics.inspected > 0);
  assert.ok(metrics.blocked > 0);
  assert.ok(metrics.inspectionMs >= 0);
}

async function testDeclaredScriptAndUnknownWarnPolicy() {
  const deniedStore = createStore();
  const deniedBrowser = createBrowser(deniedStore);
  await loadSdk(deniedBrowser);
  buttonByText(deniedBrowser, "Reject all").click();
  await flush();
  const declared = appendResource(
    deniedBrowser,
    "script",
    "https://custom.example/declared.js",
    { "data-cmp-purpose": "analytics", "data-cmp-tracker": "Custom analytics" },
  );
  assert.equal(declared.getAttribute("type"), "text/plain");

  const warnStore = createStore();
  warnStore.config.trackerEnforcement = {
    unknownTrackerBehavior: "WARN",
    debugMode: true,
  };
  const warnBrowser = createBrowser(warnStore);
  await loadSdk(warnBrowser);
  const warned = appendResource(
    warnBrowser,
    "script",
    "https://unknown-warn.example/widget.js",
  );
  assert.equal(warned.getAttribute("src"), "https://unknown-warn.example/widget.js");
  const diagnostics = warnBrowser.window.CMP.getEnforcementDiagnostics();
  assert.equal(diagnostics.unknownTrackerBehavior, "WARN");
  assert.ok(
    diagnostics.events.some(
      (event) =>
        event.action === "ALLOWED" &&
        event.reason === "unknown-tracker-warn",
    ),
  );
}

async function testCookieAndStorageEnforcementCleanup() {
  const store = createStore();
  const browser = createBrowser(store);
  await loadSdk(browser);

  browser.document.cookie = "_analytics=blocked-before-consent";
  browser.window.localStorage.setItem("analytics_client", "blocked");
  browser.window.sessionStorage.setItem("analytics_session", "blocked");
  assert.equal(browser.cookieJar.has("_analytics"), false);
  assert.equal(browser.storage.has("analytics_client"), false);
  assert.equal(browser.sessionValues.has("analytics_session"), false);

  buttonByText(browser, "Accept all").click();
  await flush();
  browser.document.cookie = "_analytics=allowed";
  browser.window.localStorage.setItem("analytics_client", "allowed");
  browser.window.sessionStorage.setItem("analytics_session", "allowed");
  assert.equal(browser.cookieJar.get("_analytics"), "allowed");
  assert.equal(browser.storage.get("analytics_client"), "allowed");
  assert.equal(browser.sessionValues.get("analytics_session"), "allowed");

  await browser.window.CMP.withdrawConsent();
  await flush();
  assert.equal(browser.cookieJar.has("_analytics"), false);
  assert.equal(browser.storage.has("analytics_client"), false);
  assert.equal(browser.sessionValues.has("analytics_session"), false);
}

async function testDynamicTrackerPendingAndFailedStates() {
  const store = createStore();
  let rejectConsent;
  store.consentPostInterceptor = (_body, _init, _api) =>
    new Promise((_resolve, reject) => {
      rejectConsent = reject;
    });
  const browser = createBrowser(store);
  await loadSdk(browser);
  buttonByText(browser, "Accept all").click();
  await flush();

  const pendingTracker = appendResource(
    browser,
    "script",
    "https://analytics.example/pending.js",
  );
  assert.equal(browser.window.CMP.getConsent().state, "PENDING");
  assert.equal(pendingTracker.getAttribute("type"), "text/plain");

  rejectConsent(new Error("network failure"));
  await flush();
  const failedTracker = appendResource(
    browser,
    "script",
    "https://analytics.example/failed.js",
  );
  assert.equal(browser.window.CMP.getConsent().state, "FAILED");
  assert.equal(failedTracker.getAttribute("type"), "text/plain");
}

function testConsentSubmissionIdempotency() {
  const store = createStore();
  const api = createApi(store);
  const body = {
    websiteId: store.website.id,
    expectedStateVersion: 0,
    submissionId: "13131313-1313-4131-8131-131313131313",
    policyContext: store.config.policyContext,
    submission: { choice: "accept-all" },
  };
  const first = api.submitConsent(body);
  const repeated = api.submitConsent(body);
  assert.equal(first.status, 201);
  assert.equal(repeated.status, 200);
  assert.equal(repeated.body.idempotent, true);
  assert.equal(first.body.consentId, repeated.body.consentId);
  assert.equal(store.records.length, 1);
  assert.equal(store.evidenceSnapshots.length, 1);

  const conflict = api.submitConsent({
    ...body,
    submission: { choice: "reject-all" },
  });
  assert.equal(conflict.status, 409);
  assert.equal(store.evidenceSnapshots.length, 1);
}

function testSynchronousBootstrapSnippet() {
  const snippet = buildEmbedSnippet({
    siteKey: "site_bootstrap_test",
    cdnUrl: "https://cmp.example/api/sdk/script",
  });
  assert.match(snippet, /<script src="https:\/\/cmp\.example\/api\/sdk\/script"/);
  assert.match(snippet, /data-site-key="site_bootstrap_test"/);
  assert.match(snippet, /rel="preconnect"/);
  assert.doesNotMatch(snippet, /\basync\b|\bdefer\b/);
}

function testPublicSdkCorsAllowsExternalCachePreflight() {
  const headers = publicCorsHeaders("GET, OPTIONS");
  assert.equal(headers["Access-Control-Allow-Origin"], "*");
  assert.equal(headers["Cross-Origin-Resource-Policy"], "cross-origin");
  assert.match(PUBLIC_CORS_ALLOWED_HEADERS, /Cache-Control/);
  assert.match(headers["Access-Control-Allow-Headers"], /Cache-Control/);
  assert.match(headers["Access-Control-Allow-Headers"], /Pragma/);
  const sdk = buildCmpSdkScript({
    siteKey: "site_e2e_1234567890",
    apiBase: "https://cmp.example",
  });
  assert.match(sdk, /['"]Cache-Control['"]:\s*['"]no-cache['"]/);
}

function testPublicAppOriginPrefersExplicitEnv() {
  assert.equal(
    resolvePublicAppOrigin({
      host: "localhost:3000",
      envOrigin: "https://cmp.example.com/app/",
    }),
    "https://cmp.example.com",
  );
  assert.equal(
    resolvePublicAppOrigin({
      host: "localhost:3000",
      forwardedHost: "cmp.example.com, localhost:3000",
      forwardedProto: "https, http",
    }),
    "https://cmp.example.com",
  );
}

async function testMissingRequiredPurposeRePrompt() {
  const store = createStore();
  const browser = createBrowser(store, {
    [`cmp_consent_${store.website.siteKey}`]: JSON.stringify({
      consentId: "cid_e2e_incomplete",
      choice: "granular",
      policyVersionId: store.policyVersion.id,
      purposeIds: store.purposes.map((purpose) => purpose.id),
      vendorIds: store.vendors.map((vendor) => vendor.id),
      decisions: [
        { purposeId: ids.analyticsPurpose, vendorId: null, granted: true, decision: "granular" },
      ],
    }),
    [`cmp_expiry_${store.website.siteKey}`]: String(Date.now() + 86_400_000),
  });
  await loadSdk(browser);
  assert.ok(
    browser.document.getElementById("__cmp_banner__"),
    "missing required-purpose acceptance should require another consent prompt",
  );
}

async function testGranularPersistenceWithdrawalAndExpiry() {
  const store = createStore();
  const browser = createBrowser(store);
  await loadSdk(browser);

  browser.window.CMP.saveGranular(
    [
      { purposeId: ids.requiredPurpose, granted: true },
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
  assert.equal(
    JSON.parse(reload.storage.get(`cmp_consent_${store.website.siteKey}`)).status,
    "withdrawn",
  );
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
  assert.equal(
    api.submitConsent({
      websiteId: ids.websiteA,
      policyContext: {
        ...store.config.policyContext,
        claims: {
          ...store.config.policyContext.claims,
          organizationId: ids.orgB,
        },
      },
      submission: { choice: "accept-all" },
    }).status,
    403,
  );

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
  let beforeConsentTcf;
  browser.window.__tcfapi("getTCData", 2, (data) => {
    beforeConsentTcf = data;
  });
  assert.equal(beforeConsentTcf.purpose.consents[1], false);
  assert.equal(browser.window.__gpp("getGPPString"), "");

  buttonByText(browser, "Accept all").click();
  await flush();
  const updates = browser.window.__gtagCalls.filter((call) => call[0] === "consent" && call[1] === "update");
  const update = updates[updates.length - 1];
  assert.ok(update);
  assert.equal(update[2].analytics_storage, "granted");
  assert.equal(update[2].ad_storage, "granted");
  let confirmedTcf;
  browser.window.__tcfapi("getTCData", 2, (data) => {
    confirmedTcf = data;
  });
  assert.equal(confirmedTcf.eventStatus, "useractioncomplete");
  assert.equal(Object.values(confirmedTcf.purpose.consents).every(Boolean), true);

  browser.window.CMP.withdrawConsent();
  await flush();
  const withdrawn = [...browser.window.__gtagCalls].reverse().find((call) => call[0] === "consent" && call[1] === "update");
  assert.equal(withdrawn[2].analytics_storage, "denied");
  assert.equal(withdrawn[2].security_storage, "granted");
  let withdrawnTcf;
  browser.window.__tcfapi("getTCData", 2, (data) => {
    withdrawnTcf = data;
  });
  assert.equal(Object.values(withdrawnTcf.purpose.consents).some(Boolean), false);
  assert.equal(browser.window.__gpp("getGPPString"), "");
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

function testChildProtectionEndToEnd() {
  const {
    nextStateFromAssertion,
    restrictedProcessingAllowed,
    applyGuardianContactVerified,
    applyGuardianStaffVerified,
    applyGuardianFailure,
  } = require(findCompiled("src/lib/children/state.ts"));
  const { applyChildRestrictionsToGrants } = require(findCompiled("src/lib/children/evaluate.ts"));
  const { evaluatePolicyCompliance } = require(findCompiled("src/lib/compliance/evaluate.ts"));
  const { verifyAgeContext, issueAgeContext } = require(findCompiled("src/lib/children/context.ts"));

  const config = {
    enabled: true,
    childDirected: true,
    ageAssuranceRequired: true,
    minimumAge: 16,
    childMaxAge: 13,
    guardianConsentRequired: true,
    restrictedPurposeKeys: ["advertising", "ads", "marketing", "profiling"],
    minimumAssurance: "assured",
    sessionTtlHours: 24,
  };

  const incomplete = evaluatePolicyCompliance({
    policy: { id: ids.policyA, name: "Child policy", websiteId: ids.websiteA, organizationId: ids.orgA },
    website: { id: ids.websiteA, name: "Child site", defaultRegulationKey: "gdpr", defaultRegion: "DE" },
    organization: {
      id: ids.orgA, name: "E2E Organization", dpoName: "Ada", dpoEmail: "ada@example.com",
      grievanceOfficerName: "Ada", grievanceOfficerEmail: "g@example.com", grievancePortalUrl: null, settings: {},
    },
    version: { id: ids.versionA, version: 1, isPublished: false },
    banner: {
      title: "Notice", description: "Choose", privacyPolicyUrl: "https://example.com/privacy",
      defaultConsent: "none", showRejectAll: true, showCustomize: true, showPreferenceWidget: true,
      showPurposeDescriptions: true, showVendorList: true, preferenceCenterDescription: "Manage",
    },
    declarations: { childDirected: true, childAgeThreshold: null, guardianConsentRequired: false },
    childProtection: { enabled: true, childDirected: true, ageAssuranceRequired: false, minimumAge: null, guardianConsentRequired: false, restrictedPurposeKeys: [] },
    purposes: [
      { id: ids.requiredPurpose, key: "necessary", name: "Necessary", description: "Required", isRequired: true, legalBasis: "legal_obligation", dataCategories: ["Device"], retentionPeriod: "Session" },
      { id: ids.adsPurpose, key: "advertising", name: "Ads", description: "Ads", isRequired: false, legalBasis: "consent", dataCategories: ["Usage"], retentionPeriod: "13 months" },
    ],
    vendors: [{ id: ids.adsVendor, name: "Ads Co", privacyPolicyUrl: "https://vendor.example/privacy", country: "DE", role: "independent_controller", status: "active", dpaStatus: "not_applicable" }],
    trackers: [{ id: "tracker-ads", name: "ads.js", status: "active", isEssential: false, purposeId: ids.adsPurpose, vendorId: ids.adsVendor, scannerClassification: "mapped" }],
    consentIntegrations: { iabTcfEnabled: false, iabGppEnabled: false },
    assignedRegulationKeys: ["gdpr"],
    rightsByJurisdiction: { gdpr: ["access", "correction", "erasure", "restriction", "objection", "portability", "withdraw_consent"] },
    gpcRuntimeSupported: false,
    optOutPropagationImplemented: false,
  });
  assert.equal(incomplete.valid, false);

  const published = evaluatePolicyCompliance({
    policy: { id: ids.policyA, name: "Child policy", websiteId: ids.websiteA, organizationId: ids.orgA },
    website: { id: ids.websiteA, name: "Child site", defaultRegulationKey: "gdpr", defaultRegion: "DE" },
    organization: {
      id: ids.orgA, name: "E2E Organization", dpoName: "Ada", dpoEmail: "ada@example.com",
      grievanceOfficerName: "Ada", grievanceOfficerEmail: "g@example.com", grievancePortalUrl: null, settings: {},
    },
    version: { id: ids.versionA, version: 1, isPublished: false },
    banner: {
      title: "Notice", description: "Choose", privacyPolicyUrl: "https://example.com/privacy",
      defaultConsent: "none", showRejectAll: true, showCustomize: true, showPreferenceWidget: true,
      showPurposeDescriptions: true, showVendorList: true, preferenceCenterDescription: "Manage",
    },
    declarations: { childDirected: true, childAgeThreshold: 16, guardianConsentRequired: true },
    childProtection: config,
    purposes: [
      { id: ids.requiredPurpose, key: "necessary", name: "Necessary", description: "Required", isRequired: true, legalBasis: "legal_obligation", dataCategories: ["Device"], retentionPeriod: "Session" },
      { id: ids.adsPurpose, key: "advertising", name: "Ads", description: "Ads", isRequired: false, legalBasis: "consent", dataCategories: ["Usage"], retentionPeriod: "13 months" },
    ],
    vendors: [{ id: ids.adsVendor, name: "Ads Co", privacyPolicyUrl: "https://vendor.example/privacy", country: "DE", role: "independent_controller", status: "active", dpaStatus: "not_applicable" }],
    trackers: [{ id: "tracker-ads", name: "ads.js", status: "active", isEssential: false, purposeId: ids.adsPurpose, vendorId: ids.adsVendor, scannerClassification: "mapped" }],
    consentIntegrations: { iabTcfEnabled: false, iabGppEnabled: false },
    assignedRegulationKeys: ["gdpr"],
    rightsByJurisdiction: { gdpr: ["access", "correction", "erasure", "restriction", "objection", "portability", "withdraw_consent"] },
    gpcRuntimeSupported: false,
    optOutPropagationImplemented: false,
  });
  assert.equal(published.valid, true);

  const minor = nextStateFromAssertion({ config, assertedOverThreshold: false, method: "self_declaration" });
  const grants = applyChildRestrictionsToGrants(
    { purposes: { [ids.adsPurpose]: true, [ids.requiredPurpose]: true }, vendors: { [ids.adsVendor]: true } },
    [
      { id: ids.adsPurpose, key: "advertising", isRequired: false },
      { id: ids.requiredPurpose, key: "necessary", isRequired: true },
    ],
    config,
    minor,
  );
  assert.equal(shouldBlock(storeTracker(ids.adsPurpose, ids.adsVendor), grants), true);
  assert.equal(restrictedProcessingAllowed(config, applyGuardianContactVerified(minor)), false);
  assert.equal(restrictedProcessingAllowed(config, applyGuardianFailure(minor)), false);
  const unlocked = applyGuardianStaffVerified(minor);
  const unlockedGrants = applyChildRestrictionsToGrants(
    { purposes: { [ids.adsPurpose]: true, [ids.requiredPurpose]: true }, vendors: { [ids.adsVendor]: true } },
    [
      { id: ids.adsPurpose, key: "advertising", isRequired: false },
      { id: ids.requiredPurpose, key: "necessary", isRequired: true },
    ],
    config,
    unlocked,
  );
  assert.equal(shouldBlock(storeTracker(ids.adsPurpose, ids.adsVendor), unlockedGrants), false);

  const context = issueAgeContext({
    organizationId: ids.orgA,
    websiteId: ids.websiteA,
    sessionId: "sess-child",
    ageStatus: "minor",
    guardianStatus: "pending",
    restrictedProcessingAllowed: false,
  });
  assert.equal(verifyAgeContext(context.token, { organizationId: ids.orgB, websiteId: ids.websiteA }).ok, false);
  assert.equal(verifyAgeContext(context.token, { organizationId: ids.orgA, websiteId: ids.websiteA }).ok, true);
}

function storeTracker(purposeId, vendorId) {
  return {
    id: "tracker-ads",
    name: "ads.js",
    type: "script",
    domain: "ads.example",
    identifier: "ads.js",
    purposeKey: "advertising",
    purposeId,
    vendorId,
    isEssential: false,
    status: "active",
  };
}

function testCaliforniaGpcRuntimeEnforcement() {
  const { parseSecGpcHeader, gpcSignalIsActive } = require(findCompiled("src/lib/ccpa/gpc.ts"));
  const { resolveCaliforniaOptOut, evidenceCaliforniaOptOut } = require(findCompiled("src/lib/ccpa/state.ts"));
  const { collectCaliforniaMappingIssues } = require(findCompiled("src/lib/ccpa/validate.ts"));

  assert.equal(parseSecGpcHeader("1"), "valid_1");
  assert.equal(parseSecGpcHeader("0"), "invalid");
  assert.equal(gpcSignalIsActive("valid_1", "false"), true);

  const ads = {
    ...storeTracker(ids.adsPurpose, ids.adsVendor),
    ccpaSale: "not_applicable",
    ccpaShare: "applicable",
  };
  const essential = {
    id: "tracker-essential",
    name: "essential.js",
    type: "script",
    domain: "cdn.example",
    identifier: "essential.js",
    purposeKey: "essential",
    purposeId: ids.requiredPurpose,
    vendorId: null,
    isEssential: true,
    status: "active",
    ccpaSale: "not_applicable",
    ccpaShare: "not_applicable",
  };
  const grants = {
    purposes: { [ids.adsPurpose]: true, [ids.requiredPurpose]: true },
    vendors: { [ids.adsVendor]: true },
    california: { applicable: true, saleOptOut: false, shareOptOut: false, sensitivePiLimit: false },
  };
  assert.equal(shouldBlock(ads, grants), false);
  assert.equal(shouldBlock(essential, grants), false);

  const gpcOn = {
    ...grants,
    california: {
      applicable: true,
      saleOptOut: true,
      shareOptOut: true,
      sensitivePiLimit: false,
      gpcActive: true,
      state: "gpc_opted_out",
      source: "gpc",
    },
  };
  assert.equal(shouldBlock(ads, gpcOn), true);
  assert.equal(shouldBlock(essential, gpcOn), false);
  assert.equal(shouldBlock(ads, { ...gpcOn, purposes: { [ids.adsPurpose]: true, [ids.requiredPurpose]: true } }), true);

  const withdrawn = {
    purposes: { [ids.adsPurpose]: false, [ids.requiredPurpose]: true },
    vendors: { [ids.adsVendor]: false },
    california: { applicable: true, saleOptOut: true, shareOptOut: true, sensitivePiLimit: false, state: "withdrawn" },
  };
  assert.equal(shouldBlock(ads, withdrawn), true);

  const childAndGpc = { ...gpcOn, childRestrictedPurposeIds: [ids.adsPurpose] };
  assert.equal(shouldBlock(ads, childAndGpc), true);

  const firstEvidence = evidenceCaliforniaOptOut(resolveCaliforniaOptOut({
    regulationKey: "ccpa",
    region: "US-CA",
    header: "absent",
    client: "unknown",
  }));
  const frozen = { ...firstEvidence };
  const laterEvidence = evidenceCaliforniaOptOut(resolveCaliforniaOptOut({
    regulationKey: "ccpa",
    region: "US-CA",
    header: "valid_1",
    client: "unknown",
  }));
  assert.deepEqual(firstEvidence, frozen);
  assert.equal(laterEvidence.gpcActive, true);

  const mapping = collectCaliforniaMappingIssues({
    doNotSellEnabled: true,
    doNotShareEnabled: true,
    limitSensitivePiEnabled: false,
    specialCategoryProcessing: false,
    hasSaleSharePurpose: false,
    vendors: [{ id: ids.adsVendor, status: "active", ccpaSale: "unknown", ccpaShare: "unknown" }],
    trackers: [{ id: "tracker-ads", status: "active", isEssential: false, ccpaSale: "unknown", ccpaShare: "unknown" }],
  });
  assert.ok(mapping.some((row) => row.code === "CCPA_OPT_OUT_VENDOR_MAPPING_MISSING"));
}

async function testClosePopupCreatesNoConsent() {
  const store = createStore();
  store.config.bannerConfig.showCloseButton = true;
  const browser = createBrowser(store);
  await loadSdk(browser);
  const close = collect(browser.document.body, (el) => el.getAttribute("aria-label") === "Close")[0];
  assert.ok(close, "close control should render when enabled");
  close.click();
  await flush();
  assert.equal(store.records.length, 0);
  assert.equal(browser.window.CMP.getConsent().confirmed, false);
  assert.equal(browser.analyticsScript.getAttribute("type"), "text/plain");

  const reload = createBrowser(store, Object.fromEntries(browser.storage.entries()));
  await loadSdk(reload);
  assert.ok(reload.document.getElementById("__cmp_banner__"), "closing the banner is not a decision");
  assert.equal(reload.store.records.length, 0);
}

async function testCustomPurposeKeysAndExplicitMappings() {
  const {
    bindTrackerRuleToPurposes,
    purposeKeysEquivalent,
    resolvePurposeForTrackerKey,
  } = require(findCompiled("src/lib/sdk/purpose-aliases.ts"));
  const { BUILTIN_TRACKER_CATALOG } = require(findCompiled("src/lib/sdk/tracker-catalog.ts"));

  const advertising = { id: ids.adsPurpose, key: "advertising", isRequired: false };
  const functional = { id: "functional-purpose", key: "functional", isRequired: false };
  const custom = { id: ids.analyticsPurpose, key: "site-stats", isRequired: false };
  const required = { id: ids.requiredPurpose, key: "necessary", isRequired: true };

  assert.equal(purposeKeysEquivalent("marketing", "advertising"), true);
  assert.equal(purposeKeysEquivalent("functionality", "functional"), true);
  assert.equal(purposeKeysEquivalent("analytics", "site-stats"), false);
  assert.equal(resolvePurposeForTrackerKey("marketing", [advertising, required]).id, ids.adsPurpose);
  assert.equal(resolvePurposeForTrackerKey("functionality", [functional, required]).key, "functional");
  assert.equal(resolvePurposeForTrackerKey("analytics", [custom, required]), null);

  const ga = BUILTIN_TRACKER_CATALOG.find((rule) => rule.id === "builtin-google-analytics");
  const ads = BUILTIN_TRACKER_CATALOG.find((rule) => rule.id === "builtin-google-ads");
  const maps = BUILTIN_TRACKER_CATALOG.find((rule) => rule.id === "builtin-google-maps");
  const boundAds = bindTrackerRuleToPurposes(ads, [advertising, required]);
  const boundMaps = bindTrackerRuleToPurposes(maps, [functional, required]);
  const unboundGa = bindTrackerRuleToPurposes(ga, [custom, required]);
  assert.equal(boundAds.purposeId, ids.adsPurpose);
  assert.equal(boundMaps.purposeId, "functional-purpose");
  assert.equal(unboundGa.purposeId, null, "custom keys require an explicit tracker mapping");

  const mappedCustom = bindTrackerRuleToPurposes({
    ...ga,
    purposeId: ids.analyticsPurpose,
    purposeKey: "analytics",
  }, [custom, required]);
  assert.equal(mappedCustom.purposeId, ids.analyticsPurpose);
  assert.equal(mappedCustom.purposeKey, "site-stats");

  const vendorOnly = {
    id: "vendor-pixel",
    name: "Vendor pixel",
    type: "script",
    domain: "ads.example",
    identifier: "pixel.js",
    purposeKey: null,
    purposeId: null,
    vendorId: ids.adsVendor,
    isEssential: false,
    status: "active",
  };
  const grants = {
    purposes: { [ids.adsPurpose]: true, [ids.requiredPurpose]: true, [ids.analyticsPurpose]: false },
    vendors: { [ids.adsVendor]: true },
  };
  assert.equal(shouldBlock(boundAds, grants), false);
  assert.equal(shouldBlock(unboundGa, grants), true);
  assert.equal(shouldBlock({ ...unboundGa, purposeId: ids.analyticsPurpose, purposeKey: "site-stats" }, grants), true);
  assert.equal(shouldBlock({ ...unboundGa, purposeId: ids.analyticsPurpose, purposeKey: "site-stats" }, {
    ...grants,
    purposes: { ...grants.purposes, [ids.analyticsPurpose]: true },
  }), false);
  assert.equal(shouldBlock(vendorOnly, { purposes: {}, vendors: { [ids.adsVendor]: false } }), true);
  assert.equal(shouldBlock(vendorOnly, { purposes: {}, vendors: { [ids.adsVendor]: true } }), false);
  assert.equal(shouldBlock({
    id: "required-script",
    name: "Required",
    type: "script",
    domain: "cdn.example",
    identifier: "required.js",
    purposeKey: "necessary",
    purposeId: ids.requiredPurpose,
    vendorId: null,
    isEssential: false,
    status: "active",
  }, { purposes: { [ids.requiredPurpose]: true }, vendors: {} }), false);

  const store = createStore();
  store.purposes[1] = { ...store.purposes[1], key: "site-stats", name: "Site stats" };
  store.trackerRules[1] = { ...store.trackerRules[1], purposeKey: "site-stats" };
  store.config.purposes = store.purposes;
  store.config.trackerRules = store.trackerRules;
  const browser = createBrowser(store);
  browser.analyticsScript.setAttribute("data-cmp-purpose", "site-stats");
  await loadSdk(browser);
  buttonByText(browser, "Accept all").click();
  await flush();
  assert.equal(browser.window.CMP.getConsent().decisions.purposes[ids.analyticsPurpose], true);
  assert.notEqual(
    browser.document.scripts.find((script) => script.getAttribute("src") === "https://analytics.example/analytics.js").getAttribute("type"),
    "text/plain",
  );
}

async function testGtmLoaderAndGoogleConsentMode() {
  const store = createStore();
  store.config.signals.googleConsentMode = {
    enabled: true,
    waitForUpdateMs: 500,
    purposeSignals: { analytics: ["analytics_storage"], advertising: ["ad_storage"] },
  };
  const browser = createBrowser(store);
  await loadSdk(browser);
  const gtm = appendResource(browser, "script", "https://www.googletagmanager.com/gtm.js?id=GTM-TEST");
  assert.equal(gtm.getAttribute("type"), "text/plain");
  assert.equal(gtm.getAttribute("src"), null);
  const defaultSignal = browser.window.__gtagCalls.find((call) => call[0] === "consent" && call[1] === "default");
  assert.equal(defaultSignal[2].analytics_storage, "denied");
  assert.equal(defaultSignal[2].ad_storage, "denied");
  assert.equal(defaultSignal[2].security_storage, "granted");

  buttonByText(browser, "Reject all").click();
  await flush();
  const rejected = [...browser.window.__gtagCalls].reverse().find((call) => call[0] === "consent" && call[1] === "update");
  assert.equal(rejected[2].analytics_storage, "denied");
  const afterReject = appendResource(browser, "script", "https://www.googletagmanager.com/gtm.js?id=GTM-LATER");
  assert.equal(afterReject.getAttribute("type"), "text/plain");

  const acceptStore = createStore();
  acceptStore.config.signals.googleConsentMode = store.config.signals.googleConsentMode;
  const acceptBrowser = createBrowser(acceptStore);
  await loadSdk(acceptBrowser);
  buttonByText(acceptBrowser, "Accept all").click();
  await flush();
  const granted = [...acceptBrowser.window.__gtagCalls].reverse().find((call) => call[0] === "consent" && call[1] === "update");
  assert.equal(granted[2].analytics_storage, "granted");
  const afterAccept = appendResource(acceptBrowser, "script", "https://www.googletagmanager.com/gtm.js?id=GTM-OK");
  assert.equal(afterAccept.getAttribute("src"), "https://www.googletagmanager.com/gtm.js?id=GTM-OK");
}

async function testDoNotTrackNeverCreatesConsent() {
  const store = createStore();
  store.config.bannerConfig.respectDoNotTrack = true;
  const browser = createBrowser(store, {}, { doNotTrack: "1" });
  await loadSdk(browser);
  assert.ok(browser.document.getElementById("__cmp_banner__"));
  const notice = collect(browser.document.body, (el) => el.getAttribute("data-cmp-dnt-notice") === "true")[0];
  assert.ok(notice, "DNT notice should appear when the setting is on");
  assert.equal(store.records.length, 0);
  assert.equal(browser.window.CMP.getConsent().confirmed, false);
  assert.equal(browser.analyticsScript.getAttribute("type"), "text/plain");

  const ignored = createStore();
  ignored.config.bannerConfig.respectDoNotTrack = false;
  const ignoredBrowser = createBrowser(ignored, {}, { doNotTrack: "1" });
  await loadSdk(ignoredBrowser);
  assert.equal(
    collect(ignoredBrowser.document.body, (el) => el.getAttribute("data-cmp-dnt-notice") === "true").length,
    0,
  );
  assert.equal(ignored.records.length, 0);
  assert.equal(ignoredBrowser.analyticsScript.getAttribute("type"), "text/plain");
}

async function testServerVerificationFailureKeepsOptionalBlocked() {
  const store = createStore();
  const browser = createBrowser(store);
  await loadSdk(browser);
  buttonByText(browser, "Accept all").click();
  await flush();
  const snapshot = Object.fromEntries(browser.storage.entries());
  store.records[0].policyVersionId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  const reload = createBrowser(store, snapshot);
  await loadSdk(reload);
  assert.ok(reload.document.getElementById("__cmp_banner__"));
  assert.equal(reload.window.CMP.getConsent().confirmed, false);
  assert.equal(reload.analyticsScript.getAttribute("type"), "text/plain");
}

async function testPurposeAndVendorScopeChangeRequiresReconsent() {
  const store = createStore();
  const browser = createBrowser(store);
  await loadSdk(browser);
  buttonByText(browser, "Accept all").click();
  await flush();
  const snapshot = Object.fromEntries(browser.storage.entries());

  store.config.purposes = [
    ...store.config.purposes,
    { id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee", key: "personalization", name: "Personalization", isRequired: false },
  ];
  const purposeReload = createBrowser(store, snapshot);
  await loadSdk(purposeReload);
  assert.ok(purposeReload.document.getElementById("__cmp_banner__"), "new purposes require re-consent");
  assert.equal(purposeReload.analyticsScript.getAttribute("type"), "text/plain");

  store.config.purposes = store.purposes;
  store.config.vendors = [
    ...store.vendors,
    { id: "ffffffff-ffff-4fff-8fff-ffffffffffff", name: "New Vendor", domain: "new.example", iabVendorId: 300 },
  ];
  const vendorReload = createBrowser(store, snapshot);
  await loadSdk(vendorReload);
  assert.ok(vendorReload.document.getElementById("__cmp_banner__"), "new vendors require re-consent");
}

async function testRejectAllGoogleConsentModeStaysDenied() {
  const store = createStore();
  store.config.signals.googleConsentMode = {
    enabled: true,
    waitForUpdateMs: 500,
    purposeSignals: { analytics: ["analytics_storage"], ads: ["ad_storage"] },
  };
  const browser = createBrowser(store);
  await loadSdk(browser);
  buttonByText(browser, "Reject all").click();
  await flush();
  const update = [...browser.window.__gtagCalls].reverse().find((call) => call[0] === "consent" && call[1] === "update");
  assert.equal(update[2].analytics_storage, "denied");
  assert.equal(update[2].ad_storage, "denied");
  assert.equal(update[2].security_storage, "granted");
  assert.equal(browser.document.getElementById("__cmp_banner__"), null);
}

async function main() {
  await testBannerPaintsBeforeConfigReturns();
  await testAcceptAllFlow();
  await testRejectAllFlow();
  await testPublishedPolicyRefresh();
  await testServerConfirmedConsentStateMachine();
  await testConsentFailuresRemainBlocked();
  await testExpiredPolicyContextRetriesOnce();
  await testConsentTimeoutRemainsBlocked();
  await testPendingReloadAndCrossTabWithdrawal();
  await testPendingStorageNeverActivatesProcessing();
  await testDynamicTrackerAndIframeEnforcement();
  await testDeclaredScriptAndUnknownWarnPolicy();
  await testCookieAndStorageEnforcementCleanup();
  await testDynamicTrackerPendingAndFailedStates();
  testConsentSubmissionIdempotency();
  testSynchronousBootstrapSnippet();
  testPublicSdkCorsAllowsExternalCachePreflight();
  testPublicAppOriginPrefersExplicitEnv();
  await testMissingRequiredPurposeRePrompt();
  await testGranularPersistenceWithdrawalAndExpiry();
  testNegativeCasesAndEnforcement();
  await testInvalidJsonPayload();
  await testGoogleAndIabSignalPropagation();
  await testBannerLocalizationAndEvidenceLocale();
  await testHostScrollLockSurfaces();
  testChildProtectionEndToEnd();
  testCaliforniaGpcRuntimeEnforcement();
  await testClosePopupCreatesNoConsent();
  await testCustomPurposeKeysAndExplicitMappings();
  await testGtmLoaderAndGoogleConsentMode();
  await testDoNotTrackNeverCreatesConsent();
  await testServerVerificationFailureKeepsOptionalBlocked();
  await testPurposeAndVendorScopeChangeRequiresReconsent();
  await testRejectAllGoogleConsentModeStaysDenied();

  console.log("consent manager e2e regression tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
