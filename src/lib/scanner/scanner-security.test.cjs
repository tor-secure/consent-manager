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

  console.log("Scanner security tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
