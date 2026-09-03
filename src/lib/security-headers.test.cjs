const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

const root = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

const originalLoad = Module._load;
Module._load = function loadWithServerOnlyStub(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};

const compiledCandidates = [
  path.join(root, ".tmp/security-headers/security-headers.js"),
  path.join(root, ".tmp/security-headers/src/lib/security-headers.js"),
];
const compiledPath = compiledCandidates.find((candidate) => fs.existsSync(candidate));
if (!compiledPath) {
  throw new Error(
    "Compiled security-headers.js not found. Run: npx tsc --outDir .tmp/security-headers --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck src/lib/security-headers.ts",
  );
}

const {
  BASELINE_SECURITY_HEADERS,
  CLERK_CSP_EXTRA_DIRECTIVES,
  HSTS_HEADER_VALUE,
  applyBaselineSecurityHeaders,
  isPublicCrossOriginApiPath,
  isTrustedDashboardMutation,
  originIsAllowed,
  shouldEnforceCsrfOrigin,
  shouldSendHsts,
} = require(compiledPath);

assert.equal(BASELINE_SECURITY_HEADERS["X-Content-Type-Options"], "nosniff");
assert.equal(BASELINE_SECURITY_HEADERS["Referrer-Policy"], "strict-origin-when-cross-origin");
assert.equal(BASELINE_SECURITY_HEADERS["X-Frame-Options"], "SAMEORIGIN");
assert.match(BASELINE_SECURITY_HEADERS["Permissions-Policy"], /camera=\(\)/);
assert.match(BASELINE_SECURITY_HEADERS["Permissions-Policy"], /geolocation=\(\)/);
assert.equal(HSTS_HEADER_VALUE.includes("max-age="), true);

assert.deepEqual(CLERK_CSP_EXTRA_DIRECTIVES["frame-ancestors"], ["self"]);
assert.deepEqual(CLERK_CSP_EXTRA_DIRECTIVES["object-src"], ["none"]);
assert.ok(CLERK_CSP_EXTRA_DIRECTIVES["frame-src"].includes("https:"));

assert.equal(isPublicCrossOriginApiPath("/api/sdk/script"), true);
assert.equal(isPublicCrossOriginApiPath("/api/sdk/abc/config"), true);
assert.equal(isPublicCrossOriginApiPath("/api/consent/record"), true);
assert.equal(isPublicCrossOriginApiPath("/api/consent/withdraw"), true);
assert.equal(isPublicCrossOriginApiPath("/api/consent/policy"), true);
assert.equal(isPublicCrossOriginApiPath("/api/rights-request"), true);
assert.equal(isPublicCrossOriginApiPath("/api/health"), true);
assert.equal(isPublicCrossOriginApiPath("/api/cron/scans"), true);
assert.equal(isPublicCrossOriginApiPath("/api/websites"), false);
assert.equal(isPublicCrossOriginApiPath("/api/rights-request/uuid"), false);

assert.equal(shouldEnforceCsrfOrigin("POST", "/api/websites"), true);
assert.equal(shouldEnforceCsrfOrigin("DELETE", "/api/api-keys/1"), true);
assert.equal(shouldEnforceCsrfOrigin("GET", "/api/websites"), false);
assert.equal(shouldEnforceCsrfOrigin("OPTIONS", "/api/websites"), false);
assert.equal(shouldEnforceCsrfOrigin("POST", "/api/consent/record"), false);
assert.equal(shouldEnforceCsrfOrigin("POST", "/api/sdk/script"), false);
assert.equal(shouldEnforceCsrfOrigin("POST", "/api/rights-request"), false);
assert.equal(shouldEnforceCsrfOrigin("POST", "/api/cron/scans"), false);
assert.equal(shouldEnforceCsrfOrigin("POST", "/dashboard"), false);

const requestOrigin = "https://cmp.example.test";

assert.equal(
  isTrustedDashboardMutation({
    origin: "https://evil.example",
    referer: null,
    secFetchSite: "cross-site",
    requestOrigin,
  }),
  false,
  "cross-site dashboard mutations must be rejected",
);

assert.equal(
  isTrustedDashboardMutation({
    origin: requestOrigin,
    referer: null,
    secFetchSite: "same-origin",
    requestOrigin,
  }),
  true,
  "same-origin dashboard mutations must be allowed",
);

assert.equal(
  isTrustedDashboardMutation({
    origin: "https://evil.example",
    referer: null,
    secFetchSite: null,
    requestOrigin,
  }),
  false,
  "mismatched Origin without Sec-Fetch-Site must be rejected",
);

assert.equal(
  isTrustedDashboardMutation({
    origin: null,
    referer: null,
    secFetchSite: null,
    requestOrigin,
  }),
  true,
  "non-browser clients without Origin remain usable",
);

assert.equal(originIsAllowed(requestOrigin, requestOrigin), true);
assert.equal(originIsAllowed("https://evil.example", requestOrigin), false);

const previousEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "production";
assert.equal(shouldSendHsts("https:", null), true);
assert.equal(shouldSendHsts("http:", "https"), true);
assert.equal(shouldSendHsts("http:", "http"), false);
process.env.NODE_ENV = "development";
assert.equal(shouldSendHsts("https:", "https"), false);
process.env.NODE_ENV = previousEnv;

const headers = new Headers();
applyBaselineSecurityHeaders(headers, { protocol: "https:", forwardedProto: "https" });
assert.equal(headers.get("X-Content-Type-Options"), "nosniff");
assert.equal(headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
assert.equal(headers.get("X-Frame-Options"), "SAMEORIGIN");
assert.ok(headers.get("Permissions-Policy"));

const publicHttp = read("src/lib/sdk/public-http.ts");
assert.match(publicHttp, /Access-Control-Allow-Origin": "\*"/);
assert.doesNotMatch(publicHttp, /Access-Control-Allow-Credentials/);
assert.match(publicHttp, /X-Content-Type-Options": "nosniff"/);

const proxy = read("src/proxy.ts");
assert.match(proxy, /clerkMiddleware/);
assert.match(proxy, /contentSecurityPolicy:\s*\{[\s\S]*strict:\s*true/);
assert.match(proxy, /CLERK_CSP_EXTRA_DIRECTIVES/);
assert.match(proxy, /shouldEnforceCsrfOrigin/);
assert.doesNotMatch(proxy, /unsafe-eval/);

const layout = read("src/app/layout.tsx");
assert.match(layout, /ClerkProvider\s+dynamic/);
assert.match(layout, /x-nonce/);
assert.match(layout, /nonce=\{nonce\}/);

const nextConfig = read("next.config.ts");
assert.match(nextConfig, /BASELINE_SECURITY_HEADERS/);
assert.match(nextConfig, /X-Content-Type-Options|BASELINE_SECURITY_HEADERS/);

const clerkCsp = read("node_modules/@clerk/nextjs/dist/esm/server/content-security-policy.js");
assert.match(clerkCsp, /strict-dynamic/);
assert.match(clerkCsp, /challenges\.cloudflare\.com/);
assert.match(clerkCsp, /protect\.clerk\.com/);
assert.match(clerkCsp, /unsafe-inline/);
assert.match(clerkCsp, /NODE_ENV !== "production"/);
assert.match(clerkCsp, /unsafe-eval/);

console.log("security-headers.test.cjs passed");
