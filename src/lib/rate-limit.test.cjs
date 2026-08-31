const assert = require("node:assert/strict");
const Module = require("node:module");

// Run with:
// npx tsc --outDir .tmp/rate-limit --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck src/lib/rate-limit.ts
// node src/lib/rate-limit.test.cjs

const originalLoad = Module._load;
Module._load = function loadWithServerOnlyStub(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};

const {
  getClientIp,
  rateLimit,
  rateLimitResponse,
  resetRateLimitsForTests,
} = require("../../.tmp/rate-limit/rate-limit.js");

(async () => {
  resetRateLimitsForTests();

  const first = rateLimit({ key: "public:site-a:1.2.3.4", limit: 2, windowMs: 60_000 });
  assert.equal(first.allowed, true);
  assert.equal(first.remaining, 1);

  const second = rateLimit({ key: "public:site-a:1.2.3.4", limit: 2, windowMs: 60_000 });
  assert.equal(second.allowed, true);
  assert.equal(second.remaining, 0);

  const exceeded = rateLimit({ key: "public:site-a:1.2.3.4", limit: 2, windowMs: 60_000 });
  assert.equal(exceeded.allowed, false);
  assert.equal(exceeded.remaining, 0);
  assert.equal(exceeded.retryAfterSeconds > 0, true);

  const separateKey = rateLimit({ key: "public:site-b:1.2.3.4", limit: 2, windowMs: 60_000 });
  assert.equal(separateKey.allowed, true);

  const request = new Request("https://cmp.example.test/api", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.2",
      "x-real-ip": "198.51.100.20",
    },
  });
  assert.equal(getClientIp(request), "203.0.113.10");

  const response = rateLimitResponse(exceeded, { "Access-Control-Allow-Origin": "*" });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After") !== null, true);
  assert.equal(response.headers.get("X-RateLimit-Limit"), "2");
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.deepEqual(await response.json(), {
    success: false,
    message: "Too many requests",
  });

  console.log("Rate limit tests passed");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
