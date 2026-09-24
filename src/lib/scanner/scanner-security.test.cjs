const assert = require("node:assert/strict");
const Module = require("node:module");

// Run with:
// npx tsc --outDir .tmp/scanner-security --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck src/lib/scanner/ssrf-guard.ts src/lib/scanner/tracker-signatures.ts src/lib/scanner/html-analyser.ts
// node src/lib/scanner/scanner-security.test.cjs

const originalLoad = Module._load;
Module._load = function loadWithServerOnlyStub(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};

const {
  SCAN_URL_BLOCKED_MESSAGE,
  assertSafeScanUrl,
  toAbsoluteScanUrl,
} = require("../../../.tmp/scanner-security/ssrf-guard.js");
const { analyseUrl } = require("../../../.tmp/scanner-security/html-analyser.js");

async function expectBlocked(input) {
  await assert.rejects(
    async () => assertSafeScanUrl(toAbsoluteScanUrl(input)),
    (error) => error instanceof Error && error.message === SCAN_URL_BLOCKED_MESSAGE,
  );
}

async function withMockFetch(mock, test) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock;
  try {
    await test();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function htmlResponse(body, init = {}) {
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      ...init.headers,
    },
    ...init,
  });
}

(async () => {
  await assert.doesNotReject(() => assertSafeScanUrl("https://example.com"));

  await expectBlocked("http://localhost");
  await expectBlocked("http://127.0.0.1");
  await expectBlocked("http://10.0.0.1");
  await expectBlocked("http://172.16.0.1");
  await expectBlocked("http://192.168.1.1");
  await expectBlocked("http://169.254.169.254");
  await expectBlocked("http://[::1]");
  await expectBlocked("file:///etc/passwd");
  await expectBlocked("gopher://example.com");
  await expectBlocked("http://metadata.google.internal");
  await expectBlocked("http://service.internal");

  await withMockFetch(
    async () =>
      new Response(null, {
        status: 302,
        headers: { location: "http://127.0.0.1/admin" },
      }),
    async () => {
      const result = await analyseUrl("https://example.com");
      assert.equal(result.fetchError, SCAN_URL_BLOCKED_MESSAGE);
    },
  );

  await withMockFetch(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => {
          reject(new DOMException("The operation was aborted.", "AbortError"));
        });
      }),
    async () => {
      const result = await analyseUrl("https://example.com");
      assert.equal(
        result.fetchError,
        "Failed to fetch URL (network error, timeout, or non-HTML response)",
      );
    },
  );

  await withMockFetch(
    async () =>
      htmlResponse("", {
        headers: {
          "content-type": "text/html",
          "content-length": "2000001",
        },
      }),
    async () => {
      const result = await analyseUrl("https://example.com");
      assert.equal(
        result.fetchError,
        "Failed to fetch URL (network error, timeout, or non-HTML response)",
      );
    },
  );

  await withMockFetch(
    async () =>
      htmlResponse(
        '<html><head><title>OK</title><script src="https://www.google-analytics.com/analytics.js"></script></head></html>',
      ),
    async () => {
      const result = await analyseUrl("https://example.com");
      assert.equal(result.fetchError, null);
      assert.equal(result.rawTitle, "OK");
      assert.equal(result.items.some((item) => item.name === "Google Analytics"), true);
    },
  );

  const { diagnoseCmpInstall } = require("../../../.tmp/sdk/early-block.js");
  const beforeCmp = diagnoseCmpInstall(`
    <script src="https://www.googletagmanager.com/gtm.js?id=GTM-1"></script>
    <script src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>
    <script src="https://connect.facebook.net/en_US/fbevents.js"></script>
    <script src="https://example.com/analytics.js"></script>
    <img src="https://ad.doubleclick.net/pixel">
    <iframe src="https://www.youtube.com/embed/example"></iframe>
    <script src="https://cmp.example/api/sdk/script" data-site-key="site_test"></script>
  `);
  assert.ok(beforeCmp.some((item) => item.message.includes("Google Tag Manager was detected as an executable script before consent control.")));
  assert.ok(beforeCmp.some((item) => item.message.includes("Google tag (gtag.js) was detected as an executable script before consent control.")));
  assert.ok(beforeCmp.some((item) => item.message.includes("Meta Pixel was detected as an executable script before consent control.")));
  assert.ok(beforeCmp.some((item) => item.message.includes("An analytics script was detected as an executable script before consent control.")));
  assert.ok(beforeCmp.some((item) => item.message.includes("A known tracking pixel was detected as an executable tracking pixel before consent control.")));
  assert.ok(beforeCmp.some((item) => item.message.includes("An optional third-party iframe was detected as an executable iframe before consent control.")));

  const safeOptional = diagnoseCmpInstall(`
    <script src="https://cmp.example/api/sdk/script" data-site-key="site_test"></script>
    <script type="text/plain" data-cmp-purpose="analytics" src="https://www.google-analytics.com/analytics.js"></script>
  `);
  assert.equal(safeOptional.length, 0);

  const missingPurpose = diagnoseCmpInstall(`
    <script src="https://cmp.example/api/sdk/script" data-site-key="site_test"></script>
    <script type="text/plain" src="https://www.google-analytics.com/analytics.js"></script>
  `);
  assert.ok(missingPurpose.some((item) => item.message.includes("missing data-cmp-purpose")));

  console.log("Scanner security tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
