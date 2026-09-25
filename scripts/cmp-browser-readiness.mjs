import { createRequire } from "node:module";
import { spawnSync, spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import Module from "node:module";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, ".tmp", "playwright-sdk");
const resultsPath = path.join(root, ".tmp", "cmp-browser-results.json");

const IDS = {
  websiteA: "33333333-3333-4333-8333-333333333333",
  websiteB: "44444444-4444-4444-8444-444444444444",
  orgA: "11111111-1111-4111-8111-111111111111",
  orgB: "22222222-2222-4222-8222-222222222222",
  policy: "55555555-5555-4555-8555-555555555555",
  version: "66666666-6666-4666-8666-666666666666",
  version2: "66666666-6666-4666-8666-666666666667",
  essential: "99999999-9999-4999-8999-999999999999",
  analytics: "77777777-7777-4777-8777-777777777777",
  marketing: "88888888-8888-4888-8888-888888888888",
  extraPurpose: "12121212-1212-4121-8121-121212121212",
  extraVendor: "13131313-1313-4131-8131-131313131313",
};
const SITE_A = "site_browser_a_0001";
const SITE_B = "site_browser_b_0001";

const TRACKER_HOSTS = [
  "google-analytics.com",
  "googletagmanager.com",
  "googleadservices.com",
  "doubleclick.net",
  "connect.facebook.net",
  "facebook.com",
  "facebook.net",
  "youtube.com",
];

function compileSdk() {
  fs.mkdirSync(path.join(root, ".tmp"), { recursive: true });
  const configPath = path.join(root, ".tmp", "tsconfig.playwright-sdk.json");
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "commonjs",
        moduleResolution: "node",
        esModuleInterop: true,
        skipLibCheck: true,
        strict: false,
        noEmit: false,
        outDir,
        rootDir: path.join(root, "src"),
        baseUrl: root,
        paths: { "@/*": ["src/*"] },
      },
      files: [path.join(root, "src/lib/sdk/cmp-sdk-script.ts")],
    }),
  );
  const tsc = path.join(root, "node_modules", "typescript", "bin", "tsc");
  const compiled = spawnSync(process.execPath, [tsc, "-p", configPath], {
    cwd: root,
    encoding: "utf8",
  });
  if (compiled.status !== 0) {
    throw new Error(compiled.stdout + "\n" + compiled.stderr);
  }
}

function loadSdkBuilders() {
  const original = Module._load;
  Module._load = function patched(request, parent, isMain) {
    if (request === "server-only") return {};
    if (request.startsWith("@/")) {
      const rel = request.slice(2).replace(/\.ts$/, "");
      return original.call(this, path.join(outDir, `${rel}.js`), parent, isMain);
    }
    return original.call(this, request, parent, isMain);
  };
  return require(path.join(outDir, "lib/sdk/cmp-sdk-script.js"));
}

function purposes(extra = false) {
  const rows = [
    { id: IDS.essential, key: "essential", name: "Essential", isRequired: true },
    { id: IDS.analytics, key: "analytics", name: "Analytics", isRequired: false },
    { id: IDS.marketing, key: "marketing", name: "Marketing", isRequired: false },
  ];
  if (extra) {
    rows.push({ id: IDS.extraPurpose, key: "functional", name: "Functional", isRequired: false });
  }
  return rows;
}

function configFor(websiteId, siteKey, state) {
  return {
    success: true,
    websiteId,
    policy: {
      id: IDS.policy,
      name: "Browser validation policy",
      versionId: state.policyVersionId,
      version: state.policyVersionId === IDS.version2 ? 2 : 1,
      isPublished: true,
      configHash: state.policyVersionId,
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
      borderRadius: 12,
      consentExpireDays: 180,
      defaultConsent: "none",
      showVendorList: false,
      showCloseButton: true,
      language: "en",
      translations: {},
    },
    resolvedLanguage: "en",
    purposes: purposes(state.extraPurpose),
    vendors: state.extraVendor
      ? [{ id: IDS.extraVendor, name: "Extra Vendor", domain: "extra.example" }]
      : [],
    trackerRules: [],
    trackerEnforcement: { unknownTrackerBehavior: "BLOCK", debugMode: true },
    signals: {
      googleConsentMode: {
        enabled: true,
        waitForUpdateMs: 500,
        adsDataRedaction: true,
        urlPassthrough: false,
        purposeSignals: {
          analytics: ["analytics_storage"],
          marketing: ["ad_storage", "ad_user_data", "ad_personalization"],
        },
      },
      iabTcf: { enabled: false },
      iabGpp: { enabled: false },
    },
    policyContext: {
      token: `ctx-${siteKey}-${state.policyVersionId}`,
      claims: {
        websiteId,
        policyVersionId: state.policyVersionId,
        organizationId: websiteId === IDS.websiteA ? IDS.orgA : IDS.orgB,
      },
    },
  };
}

function decisionsFor(body, state) {
  const available = purposes(state.extraPurpose);
  const choice = body?.submission?.choice;
  if (choice === "accept-all") {
    return available.map((purpose) => ({
      purposeId: purpose.id,
      vendorId: null,
      granted: true,
      decision: "accept-all",
    }));
  }
  if (choice === "reject-all") {
    return available.map((purpose) => ({
      purposeId: purpose.id,
      vendorId: null,
      granted: purpose.isRequired,
      decision: "reject-all",
    }));
  }
  const incoming = new Map(
    (body?.submission?.purposeDecisions || []).map((row) => [row.purposeId, row.granted === true]),
  );
  return available.map((purpose) => ({
    purposeId: purpose.id,
    vendorId: null,
    granted: purpose.isRequired ? true : incoming.get(purpose.id) === true,
    decision: "granular",
  }));
}

function createStore() {
  const records = [];
  const state = {
    policyVersionId: IDS.version,
    extraPurpose: false,
    extraVendor: false,
    forceExpired: false,
  };
  return { records, state };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": type,
    "access-control-allow-origin": "*",
    "cache-control": "no-store",
  });
  res.end(payload);
}

function trackerScript(name) {
  return `window.__exec=window.__exec||[];window.__exec.push(${JSON.stringify(name)});fetch(${JSON.stringify(`/__probe/${name}`)});`;
}

function startServer(sdkScript, localeScript, embedSnippet) {
  const store = createStore();
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type",
      });
      res.end();
      return;
    }
    try {
      if (url.pathname === "/api/sdk/script") {
        send(res, 200, sdkScript, "application/javascript; charset=utf-8");
        return;
      }
      if (url.pathname === "/api/sdk/locale") {
        send(res, 200, localeScript, "application/javascript; charset=utf-8");
        return;
      }
      const configMatch = url.pathname.match(/^\/api\/sdk\/([^/]+)\/config$/);
      if (configMatch && req.method === "GET") {
        const siteKey = decodeURIComponent(configMatch[1]);
        const websiteId = siteKey === SITE_B ? IDS.websiteB : IDS.websiteA;
        send(res, 200, configFor(websiteId, siteKey, store.state));
        return;
      }
      if (url.pathname === "/api/consent/record" && req.method === "POST") {
        const body = await readBody(req);
        const websiteId = body.websiteId;
        if (websiteId !== IDS.websiteA && websiteId !== IDS.websiteB) {
          send(res, 404, { success: false, message: "Website not found" });
          return;
        }
        if (body.consentId) {
          const existing = store.records.find(
            (row) => row.consentId === body.consentId && row.websiteId === websiteId,
          );
          if (!existing) {
            send(res, 404, { success: false, message: "Consent record not found" });
            return;
          }
          if (existing.status === "withdrawn") {
            send(res, 409, { success: false, message: "Consent record already withdrawn" });
            return;
          }
          if (body.expectedStateVersion !== existing.stateVersion) {
            send(res, 409, { success: false, message: "Consent state changed" });
            return;
          }
          existing.stateVersion += 1;
          existing.decisions = decisionsFor(body, store.state);
          existing.status = existing.decisions.some((row) => row.granted && row.purposeId !== IDS.essential)
            ? "accepted"
            : "rejected";
          existing.updatedAt = new Date().toISOString();
          send(res, 200, confirmed(existing));
          return;
        }
        const created = {
          id: randomUUID(),
          consentId: `cid_${randomUUID()}`,
          websiteId,
          organizationId: websiteId === IDS.websiteA ? IDS.orgA : IDS.orgB,
          status: "accepted",
          stateVersion: 1,
          decisions: decisionsFor(body, store.state),
          policyVersionId: store.state.policyVersionId,
          consentedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          withdrawnAt: null,
        };
        created.status = created.decisions.some((row) => row.granted && row.purposeId !== IDS.essential)
          ? "accepted"
          : "rejected";
        store.records.push(created);
        send(res, 201, confirmed(created));
        return;
      }
      if (url.pathname === "/api/consent/record" && req.method === "GET") {
        const consentId = url.searchParams.get("consentId");
        const websiteId = url.searchParams.get("websiteId");
        const record = store.records.find(
          (row) => row.consentId === consentId && row.websiteId === websiteId,
        );
        if (!record) {
          send(res, 404, { success: false, message: "Consent record not found" });
          return;
        }
        const expired = store.state.forceExpired || new Date(record.expiresAt).getTime() < Date.now();
        send(res, 200, {
          success: true,
          expired,
          requiresReconsent: expired || record.status === "withdrawn",
          record: {
            consentId: record.consentId,
            status: expired ? "expired" : record.status,
            stateVersion: record.stateVersion,
            consentedAt: record.consentedAt,
            expiresAt: record.expiresAt,
            withdrawnAt: record.withdrawnAt,
            policyVersionId: record.policyVersionId,
          },
          decisions: expired || record.status === "withdrawn" ? [] : record.decisions,
        });
        return;
      }
      if (url.pathname === "/api/consent/withdraw" && req.method === "POST") {
        const body = await readBody(req);
        const record = store.records.find(
          (row) => row.consentId === body.consentId && row.websiteId === body.websiteId,
        );
        if (!record) {
          send(res, 404, { success: false, message: "Consent record not found" });
          return;
        }
        if (record.status === "withdrawn") {
          send(res, 409, { success: false, message: "Consent has already been withdrawn" });
          return;
        }
        record.status = "withdrawn";
        record.withdrawnAt = new Date().toISOString();
        record.stateVersion += 1;
        send(res, 200, {
          success: true,
          withdrawnAt: record.withdrawnAt,
          stateVersion: record.stateVersion,
        });
        return;
      }
      if (url.pathname === "/__test/state" && req.method === "POST") {
        Object.assign(store.state, await readBody(req));
        send(res, 200, { success: true });
        return;
      }
      if (url.pathname === "/__test/records") {
        send(res, 200, store.records.map((row) => ({
          consentId: row.consentId,
          websiteId: row.websiteId,
          organizationId: row.organizationId,
          status: row.status,
          stateVersion: row.stateVersion,
        })));
        return;
      }
      if (url.pathname === "/analytics.js" || url.pathname === "/app.js") {
        const name = url.pathname === "/app.js" ? "app" : "same-origin-analytics";
        send(res, 200, trackerScript(name), "application/javascript; charset=utf-8");
        return;
      }
      if (url.pathname.startsWith("/__probe/")) {
        send(res, 204, "");
        return;
      }
      if (url.pathname === "/bare") {
        send(res, 200, "<!doctype html><html><head><title>Bare</title></head><body><h1>Bare page</h1><p>No CMP.</p></body></html>", "text/html; charset=utf-8");
        return;
      }
      const pageMatch = url.pathname === "/" || url.pathname === "/fixture"
        || ["/home", "/about", "/pricing", "/contact", "/client-spa"].includes(url.pathname);
      if (pageMatch) {
        const origin = `http://127.0.0.1:${server.address().port}`;
        const snippet = embedSnippet({ siteKey: SITE_A, cdnUrl: `${origin}/api/sdk/script` });
        send(res, 200, renderPage(url.pathname, url.searchParams.get("case") || "main", snippet), "text/html; charset=utf-8");
        return;
      }
      send(res, 404, "not found", "text/plain");
    } catch (error) {
      send(res, 500, { success: false, message: error instanceof Error ? error.message : "error" });
    }
  });
  function confirmed(record) {
    return {
      success: true,
      confirmed: true,
      consentId: record.consentId,
      confirmedAt: record.consentedAt,
      stateVersion: record.stateVersion,
      expiresAt: record.expiresAt,
      evidenceSnapshotId: randomUUID(),
      decisions: record.decisions,
      confirmation: {
        policyContextValidated: true,
        persisted: true,
        evidenceSnapshotCreated: true,
      },
    };
  }
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, store, port: server.address().port }));
  });
}

function renderPage(pathname, testCase, snippet) {
  const title = pathname === "/" ? "Home" : pathname.replace("/", "");
  const ga = `<script src="https://www.google-analytics.com/analytics.js?case=${testCase}"></script>`;
  const gtm = `<script src="https://www.googletagmanager.com/gtm.js?id=GTM-TEST"></script>`;
  const meta = `<script src="https://connect.facebook.net/en_US/fbevents.js"></script>`;
  const pixel = `<img src="https://ad.doubleclick.net/pixel" width="1" height="1" alt="">`;
  const frame = `<iframe src="https://www.youtube.com/embed/example" title="embed"></iframe>`;
  const same = `<script src="/analytics.js"></script>`;
  const app = `<script src="/app.js"></script>`;
  const plain = `<script type="text/plain" data-cmp-purpose="analytics" src="https://www.google-analytics.com/analytics.js?safe=1"></script>`;
  let head = snippet;
  let body = `<h1>${title}</h1><p id="app">Application content</p>`;
  if (pathname === "/client-spa") {
    body += `<button id="go-about" type="button">About</button><button id="insert-after-nav" type="button">Insert tracker</button>`;
  } else if (["/home", "/about", "/pricing", "/contact"].includes(pathname)) {
    body += `<nav><a href="/home">Home</a> <a href="/about">About</a> <a href="/pricing">Pricing</a> <a href="/contact">Contact</a></nav>${app}`;
  } else if (testCase === "a") {
    body += ga;
  } else if (testCase === "b") {
    head = `${ga}${snippet}`;
  } else if (testCase === "c") {
    body += plain;
  } else if (testCase === "d") {
    body += `<script>var s=document.createElement("script");s.src="https://www.google-analytics.com/analytics.js?assigned=1";document.head.appendChild(s);</script>`;
  } else if (testCase === "e") {
    body += `<script>var s=document.createElement("script");s.src="https://www.googletagmanager.com/gtm.js?id=GTM-INLINE";document.head.appendChild(s);</script>`;
  } else if (testCase === "main") {
    body += `<script type="text/plain" data-cmp-purpose="analytics" src="/analytics.js"></script>
<script type="text/plain" data-cmp-purpose="analytics" data-cmp-src="https://www.googletagmanager.com/gtm.js?id=GTM-SAFE"></script>
<iframe data-cmp-purpose="marketing" data-cmp-src="https://www.youtube.com/embed/example" title="embed"></iframe>
<img alt="" width="1" height="1" data-cmp-purpose="marketing" data-cmp-src="https://ad.doubleclick.net/pixel">
${app}<button id="insert-dynamic" type="button">Insert dynamic</button>`;
  } else if (testCase === "unsafe") {
    body += `${ga}${gtm}${meta}${pixel}${frame}${same}`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${head}</head><body>${body}</body></html>`;
}

function isTrackerUrl(url) {
  try {
    const host = new URL(url).hostname;
    return TRACKER_HOSTS.some((item) => host === item || host.endsWith(`.${item}`));
  } catch {
    return false;
  }
}

function categoryOf(url) {
  const value = url.toLowerCase();
  if (value.includes("/api/sdk/") || value.includes("/api/consent/")) return "cmp";
  if (value.includes("/__probe/")) return "probe";
  if (value.includes("/app.js")) return "app";
  if (value.includes("/analytics.js") || value.includes("google-analytics.com")) return "analytics";
  if (value.includes("gtm.js") || value.includes("/gtag/js")) return "gtm";
  if (value.includes("fbevents") || value.includes("connect.facebook.net") || value.includes("facebook.com/tr")) return "meta";
  if (value.includes("doubleclick") || value.includes("googleadservices")) return "advertising";
  if (value.includes("youtube.com/embed")) return "iframe";
  return "other";
}

async function attach(page) {
  const network = [];
  const consoleMessages = [];
  page.on("request", (request) => {
    network.push({
      url: request.url(),
      type: request.resourceType(),
      method: request.method(),
      category: categoryOf(request.url()),
    });
  });
  page.on("console", (message) => {
    consoleMessages.push({ type: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) => {
    consoleMessages.push({ type: "pageerror", text: error.message });
  });
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (!isTrackerUrl(url)) {
      await route.continue();
      return;
    }
    const type = route.request().resourceType();
    if (type === "image") {
      await route.fulfill({ status: 200, contentType: "image/gif", body: Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64") });
      return;
    }
    if (type === "document" || type === "iframe" || url.includes("youtube.com")) {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `<!doctype html><script>${trackerScript("iframe")}</script>`,
      });
      return;
    }
    const name = categoryOf(url);
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: trackerScript(name),
    });
  });
  return { network, consoleMessages };
}

async function readState(page) {
  return page.evaluate(() => ({
    exec: window.__exec || [],
    warnings: window.__CMP_INSTALL_WARNINGS || [],
    consent: window.CMP && window.CMP.getConsent ? window.CMP.getConsent() : null,
    stored: localStorage.getItem(Object.keys(localStorage).find((key) => key.startsWith("cmp_consent_")) || ""),
    diagnostics: window.CMP && window.CMP.getEnforcementDiagnostics ? window.CMP.getEnforcementDiagnostics() : null,
    dataLayer: (window.dataLayer || []).map((entry) => {
      try { return Array.from(entry); } catch { return null; }
    }).filter(Boolean),
    banner: !!document.getElementById("__cmp_banner__"),
    cookies: document.cookie,
  }));
}

function counts(network, category) {
  return network.filter((entry) => entry.category === category && entry.category !== "probe");
}

function probes(network, name) {
  return network.filter((entry) => entry.url.includes(`/__probe/${name}`));
}

async function resetFixture(origin) {
  await fetch(`${origin}/__test/state`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      policyVersionId: IDS.version,
      extraPurpose: false,
      extraVendor: false,
      forceExpired: false,
    }),
  });
}

async function openFresh(browser, origin, target, viewport) {
  await resetFixture(origin);
  const context = await browser.newContext({ viewport: viewport || { width: 1280, height: 800 } });
  const page = await context.newPage();
  const logs = await attach(page);
  const started = Date.now();
  await page.goto(`${origin}${target}`, { waitUntil: "domcontentloaded" });
  return { context, page, logs, started };
}

async function waitForBanner(page) {
  await page.waitForSelector("#__cmp_banner__", { timeout: 20000 });
}

function consentSignals(dataLayer) {
  const updates = dataLayer.filter((entry) => entry[0] === "consent");
  return updates.map((entry) => ({ command: entry[1], state: entry[2] }));
}

async function runChromeSuite(browser, origin, report) {
  const add = (row) => report.tests.push(row);

  {
    const session = await openFresh(browser, origin, "/fixture?case=main");
    try {
      await waitForBanner(session.page);
      const keyboard = await session.page.evaluate(() => {
        const banner = document.getElementById("__cmp_banner__");
        const before = document.activeElement;
        return {
          role: banner && banner.getAttribute("role"),
          modal: banner && banner.getAttribute("aria-modal"),
          labelledBy: banner && banner.getAttribute("aria-labelledby"),
          focusInside: !!(before && before.closest && before.closest("#__cmp_banner__")),
        };
      });
      await session.page.keyboard.press("Tab");
      const afterTab = await session.page.evaluate(() => {
        const active = document.activeElement;
        return !!(active && active.closest && active.closest("#__cmp_banner__"));
      });
      await session.page.waitForTimeout(300);
      const state = await readState(session.page);
      const before = session.logs.network.slice();
      const executed = new Set(state.exec);
      add({
        test: "Correct installation does not request optional resources",
        browser: "Chrome",
        expected: "Inert optional resources are not requested. app.js may run.",
        actual: {
          banner: state.banner,
          executed: [...executed],
          requests: before.filter((entry) => entry.category !== "other").map((entry) => `${entry.method} ${entry.type} ${entry.url}`),
          consentSignals: consentSignals(state.dataLayer),
          warnings: state.warnings.map((item) => item.message),
          keyboard: { ...keyboard, tabStaysInBanner: afterTab },
        },
        result: executed.has("app")
          && !executed.has("same-origin-analytics")
          && !executed.has("gtm")
          && counts(before, "analytics").length === 0
          && counts(before, "gtm").length === 0
          && counts(before, "advertising").length === 0
          && counts(before, "iframe").length === 0
          ? "PASS"
          : "FAIL",
      });
      report.performance.firstVisit = await measure(session.page, before);

      await session.page.getByRole("button", { name: "Accept all" }).click();
      await session.page.waitForFunction(() => {
        const raw = Object.keys(localStorage).find((key) => key.startsWith("cmp_consent_"));
        if (!raw) return false;
        const stored = JSON.parse(localStorage.getItem(raw) || "{}");
        return stored.status === "confirmed" && stored.serverConfirmed === true;
      }, null, { timeout: 15000 });
      await session.page.waitForTimeout(800);
      const accepted = await readState(session.page);
      const acceptedNet = session.logs.network.slice();
      const post = acceptedNet.find((entry) => entry.url.includes("/api/consent/record") && entry.method === "POST");
      add({
        test: "Accept All",
        browser: "Chrome",
        expected: "POST succeeds, banner closes, and the inert same-origin analytics script executes",
        actual: {
          postSeen: Boolean(post),
          banner: accepted.banner,
          consentId: accepted.consent && accepted.consent.consentId,
          storedStatus: accepted.stored ? JSON.parse(accepted.stored).status : null,
          executed: accepted.exec,
          trackerRequests: acceptedNet.filter((entry) => ["analytics", "gtm", "meta", "advertising", "iframe"].includes(entry.category)).map((entry) => entry.url),
          consentSignals: consentSignals(accepted.dataLayer),
        },
        result: post && !accepted.banner && accepted.exec.includes("same-origin-analytics") ? "PASS" : "FAIL",
      });

      await session.page.reload({ waitUntil: "domcontentloaded" });
      await session.page.waitForTimeout(1500);
      const refreshed = await readState(session.page);
      add({
        test: "Refresh preserves Accept All",
        browser: "Chrome",
        expected: "Banner stays closed and stored consent remains confirmed",
        actual: { banner: refreshed.banner, consentId: refreshed.consent && refreshed.consent.consentId },
        result: !refreshed.banner && refreshed.consent && refreshed.consent.consentId ? "PASS" : "FAIL",
      });

      await session.page.evaluate(() => window.CMP.openPreferenceCenter());
      await session.page.waitForSelector("#__cmp_pc__");
      await session.page.getByRole("switch", { name: "Toggle Analytics" }).click();
      await session.page.getByRole("button", { name: "Save preferences" }).click();
      await session.page.waitForTimeout(800);
      const dynamicAnalytics = await insert(session.page, "https://www.google-analytics.com/analytics.js?dynamic=analytics-off");
      const dynamicMarketing = await insert(session.page, "https://connect.facebook.net/en_US/fbevents.js?dynamic=marketing-on");
      add({
        test: "After Accept All, turn analytics off and keep marketing on",
        browser: "Chrome",
        expected: "New analytics script stays blocked. New marketing script can run.",
        actual: { dynamicAnalytics, dynamicMarketing, consent: (await readState(session.page)).consent },
        result: dynamicAnalytics.executed === false && dynamicMarketing.executed === true ? "PASS" : "FAIL",
      });

      const beforeWithdraw = (await readState(session.page)).consent.consentId;
      await session.page.evaluate(() => window.CMP.withdrawConsent());
      await session.page.waitForSelector("#__cmp_banner__");
      const withdrawnState = await readState(session.page);
      const networkBeforeFuture = session.logs.network.length;
      const futureAnalytics = await insert(session.page, "/analytics.js?after=withdraw");
      const futureRequested = session.logs.network.slice(networkBeforeFuture).some((entry) => String(entry.url).includes("after=withdraw"));
      add({
        test: "Withdrawal blocks a later analytics script",
        browser: "Chrome",
        expected: "A script inserted after withdrawal is not requested and does not execute.",
        actual: {
          executed: futureAnalytics.executed,
          requested: futureRequested,
          signals: consentSignals(withdrawnState.dataLayer).slice(-1),
        },
        result: futureAnalytics.executed === false && futureRequested === false ? "PASS" : "FAIL",
      });
      await session.page.getByRole("button", { name: "Accept all" }).click();
      await session.page.waitForFunction((previous) => {
        const raw = Object.keys(localStorage).find((key) => key.startsWith("cmp_consent_"));
        const stored = JSON.parse(localStorage.getItem(raw) || "{}");
        return stored.status === "confirmed" && stored.consentId && stored.consentId !== previous;
      }, beforeWithdraw, { timeout: 15000 });
      const records = await session.page.evaluate(async () => (await fetch("/__test/records")).json());
      const after = await readState(session.page);
      add({
        test: "Withdraw then Accept creates a new consent id",
        browser: "Chrome",
        expected: "Old record remains withdrawn. New consent id is current.",
        actual: { previous: beforeWithdraw, current: after.consent.consentId, records },
        result: records.some((row) => row.consentId === beforeWithdraw && row.status === "withdrawn")
          && after.consent.consentId !== beforeWithdraw
          ? "PASS"
          : "FAIL",
      });
    } catch (error) {
      add({ test: "Chrome main flow", browser: "Chrome", expected: "Flow completes", actual: error.stack || error.message, result: "FAIL" });
      await session.page.screenshot({ path: path.join(root, ".tmp", "cmp-chrome-failure.png"), fullPage: true }).catch(() => {});
    } finally {
      await session.context.close();
    }
  }

  await granular(browser, origin, add, "Analytics on, marketing off", true, false);
  await granular(browser, origin, add, "Analytics off, marketing on", false, true);
  await granular(browser, origin, add, "Analytics off, marketing off", false, false);

  {
    const session = await openFresh(browser, origin, "/fixture?case=main");
    try {
      await waitForBanner(session.page);
      await session.page.getByRole("button", { name: "Reject all" }).click();
      await session.page.waitForFunction(() => {
        const raw = Object.keys(localStorage).find((key) => key.startsWith("cmp_consent_"));
        return raw && JSON.parse(localStorage.getItem(raw) || "{}").status === "confirmed";
      });
      await session.page.waitForTimeout(500);
      const state = await readState(session.page);
      const optionalRequests = session.logs.network.filter((entry) =>
        ["analytics", "gtm", "meta", "advertising", "iframe"].includes(entry.category));
      add({
        test: "Reject All",
        browser: "Chrome",
        expected: "Choice is stored, banner closes, app.js ran, optional technologies did not",
        actual: {
          banner: state.banner,
          executed: state.exec,
          optionalRequests: optionalRequests.map((entry) => entry.url),
          consentSignals: consentSignals(state.dataLayer),
        },
        result: !state.banner
          && state.exec.includes("app")
          && !state.exec.includes("analytics")
          && !state.exec.includes("gtm")
          && !state.exec.includes("meta")
          && optionalRequests.length === 0
          ? "PASS"
          : "FAIL",
      });
    } catch (error) {
      add({ test: "Reject All", browser: "Chrome", expected: "Reject stays blocked", actual: error.message, result: "FAIL" });
    } finally {
      await session.context.close();
    }
  }

  for (const spec of [
    ["A", "/fixture?case=a", "CMP first, then classic analytics.js"],
    ["B", "/fixture?case=b", "Classic analytics.js before CMP"],
    ["C", "/fixture?case=c", "type=text/plain analytics script"],
    ["D", "/fixture?case=d", "Inline script assigns analytics src"],
    ["E", "/fixture?case=e", "Inline script assigns GTM src"],
    ["Unsafe", "/fixture?case=unsafe", "Executable trackers in HTML"],
  ]) {
    const session = await openFresh(browser, origin, spec[1]);
    try {
      await session.page.waitForTimeout(1500);
      const state = await readState(session.page);
      const trackerRequests = session.logs.network.filter((entry) =>
        ["analytics", "gtm", "meta", "advertising", "iframe"].includes(entry.category));
      add({
        test: `Parser ${spec[0]}: ${spec[2]}`,
        browser: "Chrome",
        expected: "Separate fetch and execution results",
        actual: {
          executed: state.exec,
          requested: trackerRequests.map((entry) => ({ url: entry.url, type: entry.type })),
          probes: session.logs.network.filter((entry) => entry.category === "probe").map((entry) => entry.url),
          warnings: state.warnings.map((item) => item.message),
        },
        result: "MEASURED",
      });
    } catch (error) {
      add({ test: `Parser ${spec[0]}`, browser: "Chrome", expected: "Measured", actual: error.message, result: "FAIL" });
    } finally {
      await session.context.close();
    }
  }

  {
    const session = await openFresh(browser, origin, "/fixture?case=main");
    try {
      await waitForBanner(session.page);
      await session.page.getByRole("button", { name: "Accept all" }).click();
      await session.page.waitForFunction(() => {
        const raw = Object.keys(localStorage).find((key) => key.startsWith("cmp_consent_"));
        return raw && JSON.parse(localStorage.getItem(raw) || "{}").serverConfirmed === true;
      });
      const response = await session.page.request.post(`${origin}/__test/state`, {
        data: { forceExpired: true },
      });
      if (!response.ok()) throw new Error("Could not flip expiry");
      await session.page.reload({ waitUntil: "domcontentloaded" });
      await session.page.waitForTimeout(1500);
      const expired = await readState(session.page);
      add({
        test: "Expired server consent",
        browser: "Chrome",
        expected: "Banner returns and optional execution is not restored from the stale record",
        actual: { banner: expired.banner, confirmed: expired.consent && expired.consent.confirmed },
        result: expired.banner && !(expired.consent && expired.consent.confirmed) ? "PASS" : "FAIL",
      });
    } catch (error) {
      add({ test: "Expired server consent", browser: "Chrome", expected: "Re-consent", actual: error.message, result: "FAIL" });
    } finally {
      await session.context.close();
    }
  }

  for (const change of [
    ["New policy version", { policyVersionId: IDS.version2 }],
    ["New purpose", { extraPurpose: true }],
    ["New vendor", { extraVendor: true }],
  ]) {
    const session = await openFresh(browser, origin, "/fixture?case=c");
    try {
      await waitForBanner(session.page);
      await session.page.getByRole("button", { name: "Accept all" }).click();
      await session.page.waitForFunction(() => !document.getElementById("__cmp_banner__"));
      const response = await session.page.request.post(`${origin}/__test/state`, { data: change[1] });
      if (!response.ok()) throw new Error(change[0]);
      await session.page.reload({ waitUntil: "domcontentloaded" });
      await session.page.waitForTimeout(1200);
      const next = await readState(session.page);
      add({
        test: change[0],
        browser: "Chrome",
        expected: "Stale consent is not reused and the banner returns",
        actual: { banner: next.banner, confirmed: next.consent && next.consent.confirmed },
        result: next.banner ? "PASS" : "FAIL",
      });
    } catch (error) {
      add({ test: change[0], browser: "Chrome", expected: "Re-consent", actual: error.message, result: "FAIL" });
    } finally {
      await session.context.close();
    }
  }

  {
    const session = await openFresh(browser, origin, "/home");
    try {
      await waitForBanner(session.page);
      await session.page.getByRole("button", { name: "Accept all" }).click();
      await session.page.waitForFunction(() => !document.getElementById("__cmp_banner__"));
      const first = (await readState(session.page)).consent.consentId;
      for (const href of ["/about", "/pricing", "/contact", "/home"]) {
        await session.page.goto(`${origin}${href}`, { waitUntil: "domcontentloaded" });
        await session.page.waitForTimeout(600);
      }
      await session.page.goBack();
      await session.page.waitForTimeout(400);
      await session.page.goForward();
      await session.page.waitForTimeout(400);
      await session.page.reload({ waitUntil: "domcontentloaded" });
      await session.page.waitForTimeout(800);
      const afterNav = await readState(session.page);
      add({
        test: "Fixture page navigation, back, forward, refresh",
        browser: "Chrome",
        expected: "Same confirmed consent id, banner stays closed",
        actual: { first, later: afterNav.consent && afterNav.consent.consentId, banner: afterNav.banner },
        result: afterNav.consent && afterNav.consent.consentId === first && !afterNav.banner ? "PASS" : "FAIL",
      });
    } catch (error) {
      add({ test: "Fixture navigation", browser: "Chrome", expected: "Consent persists", actual: error.message, result: "FAIL" });
    } finally {
      await session.context.close();
    }
  }

  {
    const session = await openFresh(browser, origin, "/client-spa");
    try {
      await waitForBanner(session.page);
      await session.page.getByRole("button", { name: "Accept all" }).click();
      await session.page.waitForFunction(() => !document.getElementById("__cmp_banner__"));
      await session.page.evaluate(() => history.pushState({}, "", "/about"));
      const inserted = await insert(session.page, "https://www.google-analytics.com/analytics.js?after-spa=1");
      add({
        test: "Client-side route change then dynamic script",
        browser: "Chrome",
        expected: "Accepted analytics script can execute after pushState",
        actual: inserted,
        result: inserted.executed ? "PASS" : "FAIL",
      });
    } catch (error) {
      add({ test: "Client-side navigation", browser: "Chrome", expected: "Enforcement remains", actual: error.message, result: "FAIL" });
    } finally {
      await session.context.close();
    }
  }

  {
    const session = await openFresh(browser, origin, "/fixture?case=main", { width: 390, height: 844 });
    try {
      await waitForBanner(session.page);
      const box = await session.page.locator("#__cmp_banner__").boundingBox();
      const buttons = await session.page.locator("#__cmp_banner__ button").allTextContents();
      add({
        test: "Mobile-sized Chrome viewport",
        browser: "Chrome",
        expected: "Banner and buttons fit a 390px viewport",
        actual: { box, buttons },
        result: box && box.width <= 390 && box.x >= -1 ? "PASS" : "FAIL",
      });
    } catch (error) {
      add({ test: "Mobile viewport", browser: "Chrome", expected: "Banner fits", actual: error.message, result: "FAIL" });
    } finally {
      await session.context.close();
    }
  }

  {
    const context = await browser.newContext();
    const page = await context.newPage();
    const started = Date.now();
    await page.goto(`${origin}/bare`, { waitUntil: "load" });
    report.performance.bare = await measure(page, []);
    report.performance.bare.wallMs = Date.now() - started;
    await context.close();
  }

  report.performance.samples = await collectPerformanceSamples(browser, origin, 5);
}

async function granular(browser, origin, add, label, analyticsOn, marketingOn) {
  const session = await openFresh(browser, origin, "/fixture?case=c");
  try {
    await waitForBanner(session.page);
    await session.page.getByRole("button", { name: "Customize" }).click();
    await session.page.waitForSelector("#__cmp_pc__");
    if (analyticsOn) await session.page.getByRole("switch", { name: "Toggle Analytics" }).click();
    if (marketingOn) await session.page.getByRole("switch", { name: "Toggle Marketing" }).click();
    await session.page.getByRole("button", { name: "Save preferences" }).click();
    await session.page.waitForFunction(() => !document.getElementById("__cmp_pc__"));
    await session.page.waitForTimeout(400);
    const analytics = await insert(session.page, "https://www.google-analytics.com/analytics.js?granular=1");
    const marketing = await insert(session.page, "https://connect.facebook.net/en_US/fbevents.js?granular=1");
    const signals = consentSignals((await readState(session.page)).dataLayer);
    const ok = analytics.executed === analyticsOn && marketing.executed === marketingOn;
    add({
      test: label,
      browser: "Chrome",
      expected: `analytics executed=${analyticsOn}, marketing executed=${marketingOn}`,
      actual: { analytics, marketing, signals },
      result: ok ? "PASS" : "FAIL",
    });
  } catch (error) {
    add({ test: label, browser: "Chrome", expected: "Granular enforcement", actual: error.message, result: "FAIL" });
  } finally {
    await session.context.close();
  }
}

async function insert(page, src) {
  const before = await page.evaluate(() => (window.__exec || []).slice());
  await page.evaluate((nextSrc) => {
    const script = document.createElement("script");
    script.src = nextSrc;
    document.body.appendChild(script);
  }, src);
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => window.__exec || []);
  return {
    src,
    executed: after.length > before.length,
    exec: after,
  };
}

async function measure(page, network) {
  return page.evaluate((seen) => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint").map((entry) => ({ name: entry.name, startTime: entry.startTime }));
    const resources = performance.getEntriesByType("resource").map((entry) => ({
      name: entry.name,
      startTime: Math.round(entry.startTime * 10) / 10,
      duration: Math.round(entry.duration * 10) / 10,
      transferSize: entry.transferSize,
    }));
    const sdk = resources.find((entry) => entry.name.includes("/api/sdk/script"));
    const config = resources.filter((entry) => entry.name.includes("/config"));
    let lcp = null;
    try {
      const lcpEntries = performance.getEntriesByType("largest-contentful-paint");
      if (lcpEntries.length) lcp = lcpEntries[lcpEntries.length - 1].startTime;
    } catch { /* LCP entry type is not available in every browser */ }
    return {
      ttfbMs: nav ? Math.round(nav.responseStart * 10) / 10 : null,
      fcpMs: paints.find((entry) => entry.name === "first-contentful-paint")?.startTime ?? null,
      dclMs: nav ? Math.round(nav.domContentLoadedEventEnd * 10) / 10 : null,
      loadMs: nav ? Math.round(nav.loadEventEnd * 10) / 10 : null,
      lcpMs: lcp == null ? null : Math.round(lcp * 10) / 10,
      inpMs: null,
      bootstrapMs: window.CMP && window.CMP.getEnforcementDiagnostics
        ? window.CMP.getEnforcementDiagnostics().metrics.bootstrapMs
        : null,
      sdk,
      config,
      cmpRequests: seen.filter((entry) => entry.category === "cmp").length,
      resourceCount: resources.length,
    };
  }, network);
}

function median(values) {
  const nums = values.filter((value) => typeof value === "number" && Number.isFinite(value)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : Math.round(((nums[mid - 1] + nums[mid]) / 2) * 10) / 10;
}

function summarizeSamples(rows) {
  const field = (key) => median(rows.map((row) => row[key]));
  return {
    ttfbMs: field("ttfbMs"),
    fcpMs: field("fcpMs"),
    lcpMs: field("lcpMs"),
    dclMs: field("dclMs"),
    loadMs: field("loadMs"),
    inpMs: field("inpMs"),
    bootstrapMs: field("bootstrapMs"),
    sdkTransferBytes: median(rows.map((row) => row.sdk && row.sdk.transferSize)),
    sdkDurationMs: median(rows.map((row) => row.sdk && row.sdk.duration)),
    configDurationMs: median(rows.map((row) => {
      const last = Array.isArray(row.config) ? row.config[row.config.length - 1] : null;
      return last ? last.duration : null;
    })),
    cmpRequests: median(rows.map((row) => row.cmpRequests)),
    consentPostMs: median(rows.map((row) => row.consentPostMs)),
    consentGetMs: median(rows.map((row) => row.consentGetMs)),
  };
}

async function collectPerformanceSamples(browser, origin, count) {
  const withCmp = [];
  const withoutCmp = [];
  for (let index = 0; index < count; index += 1) {
    const session = await openFresh(browser, origin, "/fixture?case=main");
    try {
      await waitForBanner(session.page);
      const sample = await measure(session.page, session.logs.network);
      const beforeConsent = await session.page.evaluate(() => performance.getEntriesByType("resource")
        .filter((entry) => entry.name.includes("/api/consent/record")).length);
      await session.page.getByRole("button", { name: "Accept all" }).click();
      await session.page.waitForFunction(() => {
        const raw = Object.keys(localStorage).find((key) => key.startsWith("cmp_consent_"));
        return raw && JSON.parse(localStorage.getItem(raw) || "{}").serverConfirmed === true;
      });
      const consentTiming = await session.page.evaluate((seen) => {
        const entries = performance.getEntriesByType("resource")
          .filter((entry) => entry.name.includes("/api/consent/record"))
          .slice(seen);
        return entries.map((entry) => ({ duration: entry.duration, transferSize: entry.transferSize }));
      }, beforeConsent);
      sample.consentPostMs = consentTiming.length ? Math.round(consentTiming[consentTiming.length - 1].duration * 10) / 10 : null;
      await session.page.reload({ waitUntil: "load" });
      await session.page.waitForFunction(() => !document.getElementById("__cmp_banner__"), { timeout: 15000 });
      sample.consentGetMs = await session.page.evaluate(() => {
        const entries = performance.getEntriesByType("resource")
          .filter((entry) => entry.name.includes("/api/consent/record"));
        return entries.length ? Math.round(entries[0].duration * 10) / 10 : null;
      });
      withCmp.push(sample);
    } finally {
      await session.context.close();
    }
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(`${origin}/bare`, { waitUntil: "load" });
    withoutCmp.push(await measure(page, []));
    await context.close();
  }
  return {
    sampleCount: count,
    withCmp: summarizeSamples(withCmp),
    withoutCmp: summarizeSamples(withoutCmp),
    note: "Local fixture responses are not compressed. transferSize is the uncompressed browser transfer. gzip and brotli sizes are computed from the SDK bytes separately.",
  };
}

async function smoke(browser, origin, browserName, report) {
  const session = await openFresh(browser, origin, "/fixture?case=main");
  try {
    await waitForBanner(session.page);
    await session.page.waitForTimeout(800);
    const before = await readState(session.page);
    const beforeRequests = session.logs.network.filter((entry) => entry.category !== "other" && entry.category !== "cmp" && entry.category !== "app" && entry.category !== "probe").map((entry) => entry.url);
    const blocked = !before.exec.includes("analytics")
      && !before.exec.includes("gtm")
      && !before.exec.includes("meta")
      && !before.exec.includes("same-origin-analytics")
      && beforeRequests.length === 0;
    await session.page.getByRole("button", { name: "Accept all" }).click();
    await session.page.waitForFunction(() => {
      const raw = Object.keys(localStorage).find((key) => key.startsWith("cmp_consent_"));
      return raw && JSON.parse(localStorage.getItem(raw) || "{}").serverConfirmed === true;
    });
    const after = await readState(session.page);
    report.tests.push({
      test: "First visit then Accept All",
      browser: browserName,
      expected: "Optional technologies stay inactive before the choice. Accept stores consent and closes the banner.",
      actual: {
        beforeExec: before.exec,
        beforeRequests,
        bannerAfter: after.banner,
        consentId: after.consent && after.consent.consentId,
      },
      result: blocked && !after.banner && after.consent && after.consent.consentId ? "PASS" : "FAIL",
    });
  } catch (error) {
    report.tests.push({
      test: "First visit then Accept All",
      browser: browserName,
      expected: "Smoke flow",
      actual: error.message,
      result: "FAIL",
    });
  } finally {
    await session.context.close();
  }
}

async function launchAvailable() {
  const { chromium, firefox } = require("playwright");
  const launched = [];
  for (const [name, factory] of [
    ["Chrome", () => chromium.launch({ channel: "chrome", headless: true })],
    ["Edge", () => chromium.launch({ channel: "msedge", headless: true })],
    ["Firefox", () => firefox.launch({ executablePath: "C:\\Program Files\\Mozilla Firefox\\firefox.exe", headless: true })],
  ]) {
    try {
      const browser = await factory();
      launched.push({ name, browser });
    } catch (error) {
      launched.push({ name, error: error.message });
    }
  }
  return launched;
}

async function realTenantProbe(report) {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) {
    report.tenants = { result: "NOT VERIFIED", reason: "No .env database configuration was available." };
    return;
  }
  const env = Object.fromEntries(
    fs.readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.trim().startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, "")];
      }),
  );
  if (!env.DATABASE_URL) {
    report.tenants = { result: "NOT VERIFIED", reason: "DATABASE_URL is not set." };
    return;
  }
  const postgres = require("postgres");
  const sql = postgres(env.DATABASE_URL, { max: 1, prepare: false });
  let child = null;
  let insertedProbe = false;
  let probeConsentId = "";
  try {
    const websites = await sql`
      select w.organization_id, w.id as website_id, w.site_key, w.domain,
        c.consent_id, v.policy_version_id
      from websites w
      left join lateral (
        select consent_id from consent_records
        where website_id = w.id
        order by created_at desc
        limit 1
      ) c on true
      left join lateral (
        select cpv.id as policy_version_id
        from consent_policy_versions cpv
        inner join consent_policies cp on cp.id = cpv.policy_id
        where cp.website_id = w.id
        order by cpv.created_at desc
        limit 1
      ) v on true
      order by w.created_at asc
      limit 10
    `;
    const orgCount = new Set(websites.map((row) => row.organization_id)).size;
    report.tenants = {
      websiteCount: websites.length,
      organizationCount: orgCount,
      consentCount: websites.filter((row) => row.consent_id).length,
      attempts: [],
    };
    if (websites.length < 2 || orgCount < 2) {
      report.tenants.result = "NOT VERIFIED";
      report.tenants.reason = "The database does not contain two organizations with websites, so a live cross-tenant exchange was not run.";
      return;
    }
    child = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "dev", "-p", "3456"], {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: "ignore",
    });
    const ready = await waitForHttp("http://127.0.0.1:3456/api/health");
    if (!ready) {
      report.tenants.result = "NOT VERIFIED";
      report.tenants.reason = "The local application server did not become ready.";
      return;
    }
    const a = websites[0];
    const b = websites.find((row) => row.organization_id !== a.organization_id);
    probeConsentId = `cid_browser_isolation_${randomUUID()}`;
    if (a && b && (!a.consent_id || !b.consent_id)) {
      const missing = !a.consent_id ? a : b;
      if (!missing.policy_version_id) {
        report.tenants.result = "NOT VERIFIED";
        report.tenants.reason = "The second organization has no policy version, so a temporary consent row was not created.";
        return;
      }
      await sql`
        insert into consent_records (
          organization_id, website_id, policy_version_id, consent_id, status, state_version, source, consented_at, metadata
        ) values (
          ${missing.organization_id}, ${missing.website_id}, ${missing.policy_version_id},
          ${probeConsentId}, 'accepted', 1, 'web', now(), ${sql.json({ probe: "browser-readiness" })}
        )
      `;
      missing.consent_id = probeConsentId;
      insertedProbe = true;
    }
    if (!a || !b || !a.consent_id || !b.consent_id) {
      report.tenants.result = "NOT VERIFIED";
      report.tenants.reason = "Two organizations exist, but both do not have a consent record to exchange.";
      return;
    }
    const swaps = [
      ["A reads B", a, b],
      ["B reads A", b, a],
    ];
    for (const [label, caller, target] of swaps) {
      const getUrl = `http://127.0.0.1:3456/api/consent/record?consentId=${encodeURIComponent(target.consent_id)}&websiteId=${encodeURIComponent(caller.website_id)}&siteKey=${encodeURIComponent(caller.site_key)}`;
      const getResponse = await fetch(getUrl);
      const getBody = await getResponse.json().catch(() => ({}));
      const postResponse = await fetch("http://127.0.0.1:3456/api/consent/record", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://127.0.0.1:3456" },
        body: JSON.stringify({
          websiteId: caller.website_id,
          consentId: target.consent_id,
          expectedStateVersion: 1,
          submissionId: randomUUID(),
          submission: { choice: "reject-all" },
        }),
      });
      const postBody = await postResponse.json().catch(() => ({}));
      report.tenants.attempts.push({
        label,
        getStatus: getResponse.status,
        getMessage: getBody.message || null,
        postStatus: postResponse.status,
        postMessage: postBody.message || null,
        leakedConsentId: getBody.record?.consentId === target.consent_id,
      });
    }
    const dashboard = await fetch(`http://127.0.0.1:3456/api/consent/evidence/${encodeURIComponent(a.consent_id)}`);
    report.tenants.dashboardUnauthenticatedStatus = dashboard.status;
    report.tenants.temporaryConsentInserted = insertedProbe;
    report.tenants.result = report.tenants.attempts.every((item) => item.getStatus === 404 && !item.leakedConsentId && item.postStatus >= 400)
      ? "PASS"
      : "FAIL";
  } catch (error) {
    report.tenants = { result: "NOT VERIFIED", reason: error.message };
  } finally {
    if (insertedProbe && probeConsentId) {
      await sql`delete from consent_records where consent_id = ${probeConsentId}`.catch(() => {});
    }
    await sql.end({ timeout: 5 }).catch(() => {});
    if (child) child.kill();
  }
}

function pickTwoOrgs(rows) {
  const first = rows.find((row) => row.consent_id);
  const second = rows.find((row) => row.consent_id && row.organization_id !== first?.organization_id);
  return [first, second];
}

async function waitForHttp(url) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return true;
    } catch { /* server still booting */ }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

async function main() {
  compileSdk();
  const { buildGenericCmpSdkScript, buildCmpLocaleScript, buildEmbedSnippet } = loadSdkBuilders();
  const sdkScript = buildGenericCmpSdkScript();
  const localeScript = buildCmpLocaleScript();
  const { server, port } = await startServer(sdkScript, localeScript, buildEmbedSnippet);
  const origin = `http://127.0.0.1:${port}`;
  const zlib = require("zlib");
  const report = {
    sdkBytes: Buffer.byteLength(sdkScript),
    localeBytes: Buffer.byteLength(localeScript),
    bundle: {
      sdk: {
        raw: Buffer.byteLength(sdkScript),
        gzip: zlib.gzipSync(Buffer.from(sdkScript)).length,
        brotli: zlib.brotliCompressSync(Buffer.from(sdkScript)).length,
      },
      locale: {
        raw: Buffer.byteLength(localeScript),
        gzip: zlib.gzipSync(Buffer.from(localeScript)).length,
        brotli: zlib.brotliCompressSync(Buffer.from(localeScript)).length,
      },
    },
    tests: [],
    performance: {},
    browsersNotLaunched: [],
  };
  const launched = await launchAvailable();
  try {
    const chrome = launched.find((item) => item.name === "Chrome" && item.browser);
    if (!chrome) throw new Error(launched.find((item) => item.name === "Chrome")?.error || "Chrome did not launch");
    await runChromeSuite(chrome.browser, origin, report);
    for (const item of launched) {
      if (!item.browser) {
        report.browsersNotLaunched.push({ name: item.name, error: item.error || "not launched" });
        continue;
      }
      if (item.name === "Chrome") continue;
      await smoke(item.browser, origin, item.name, report);
    }
    const cross = await fetch(`${origin}/api/consent/record?consentId=cid_${randomUUID()}&websiteId=${IDS.websiteB}&siteKey=${SITE_B}`);
    report.fixtureIsolation = { emptyCrossStatus: cross.status };
    const recordsResponse = await fetch(`${origin}/__test/records`);
    report.fixtureRecords = await recordsResponse.json();
  } finally {
    for (const item of launched) {
      if (item.browser) await item.browser.close().catch(() => {});
    }
    await new Promise((resolve) => server.close(resolve));
  }
  await realTenantProbe(report);
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true });
  fs.writeFileSync(resultsPath, JSON.stringify(report, null, 2));
  const failed = report.tests.filter((test) => test.result === "FAIL");
  console.log(JSON.stringify({
    tests: report.tests.length,
    failed: failed.length,
    browsersNotLaunched: report.browsersNotLaunched,
    tenant: report.tenants && report.tenants.result,
    resultsPath,
  }, null, 2));
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
