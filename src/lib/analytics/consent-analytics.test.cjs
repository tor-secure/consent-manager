const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const root = path.resolve(__dirname, "../../..");
execSync("npx tsc -p tsconfig.tests.json", { cwd: root, stdio: "pipe" });

const compiledCandidates = [
  path.join(root, ".tmp/test-libs/lib/analytics/consent-metrics.js"),
  path.join(root, ".tmp/consent-analytics/consent-metrics.js"),
  path.join(root, ".tmp/consent-analytics/src/lib/analytics/consent-metrics.js"),
];
const compiledPath = compiledCandidates.find((candidate) => fs.existsSync(candidate));
const hintsCandidates = [
  path.join(root, ".tmp/test-libs/lib/analytics/client-hints.js"),
  path.join(root, ".tmp/consent-analytics/client-hints.js"),
  path.join(root, ".tmp/consent-analytics/src/lib/analytics/client-hints.js"),
];
const hintsPath = hintsCandidates.find((candidate) => fs.existsSync(candidate));
if (!compiledPath || !hintsPath) {
  throw new Error(
    "Compiled analytics modules not found. Run: npx tsc --outDir .tmp/consent-analytics --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck src/lib/analytics/consent-metrics.ts src/lib/analytics/client-hints.ts",
  );
}

const {
  bucketTrendsByDay,
  collectForbiddenAnalyticsKeys,
  groupDimension,
  parseAnalyticsPeriod,
  summarizeInteractions,
  summarizeOutcomes,
  uniqueById,
} = require(compiledPath);
const {
  buildAnalyticsHints,
  classifyBrowser,
  classifyDevice,
  countryFromRequestHeaders,
  mergeAnalyticsMetadata,
  normalizeCountryCode,
} = require(hintsPath);

const day = (value) => new Date(`${value}T12:00:00.000Z`);

{
  const records = [
    { id: "r1", status: "accepted", createdAt: day("2026-09-01") },
    { id: "r1", status: "accepted", createdAt: day("2026-09-01") },
    { id: "r2", status: "rejected", createdAt: day("2026-09-01") },
    { id: "r3", status: "partial", createdAt: day("2026-09-02") },
    { id: "r4", status: "withdrawn", createdAt: day("2026-09-02") },
  ];
  const summary = summarizeOutcomes(records);
  assert.equal(summary.total, 4);
  assert.equal(summary.accepted, 1);
  assert.equal(summary.rejected, 1);
  assert.equal(summary.partial, 1);
  assert.equal(summary.withdrawn, 1);
  assert.equal(summary.acceptRate, 25);
  assert.equal(summary.granularRate, 25);
  assert.equal(summary.withdrawalRate, 25);
}

{
  const events = [
    { id: "e1", eventType: "consent.created", choice: "accept-all", occurredAt: day("2026-09-01"), consentRecordId: "r1" },
    { id: "e1", eventType: "consent.created", choice: "accept-all", occurredAt: day("2026-09-01"), consentRecordId: "r1" },
    { id: "e2", eventType: "consent.created", choice: "reject-all", occurredAt: day("2026-09-01"), consentRecordId: "r2" },
    { id: "e3", eventType: "consent.updated", choice: "granular", occurredAt: day("2026-09-02"), consentRecordId: "r3" },
    { id: "e4", eventType: "consent.withdrawn", choice: null, occurredAt: day("2026-09-02"), consentRecordId: "r4" },
  ];
  const summary = summarizeInteractions(events);
  assert.equal(summary.interactions, 4);
  assert.equal(summary.acceptAll, 1);
  assert.equal(summary.rejectAll, 1);
  assert.equal(summary.granular, 1);
  assert.equal(summary.withdrawals, 1);
  const trends = bucketTrendsByDay(events);
  assert.equal(trends.length, 2);
  assert.equal(trends[0].interactions, 2);
  assert.equal(uniqueById(events).length, 4);
}

{
  const empty = summarizeOutcomes([]);
  assert.equal(empty.total, 0);
  assert.equal(empty.acceptRate, 0);
}

{
  const grouped = groupDimension(
    [
      { id: "a", status: "accepted", createdAt: day("2026-09-01"), country: "IN" },
      { id: "b", status: "rejected", createdAt: day("2026-09-01"), country: "IN" },
      { id: "c", status: "accepted", createdAt: day("2026-09-01"), country: "US" },
      { id: "d", status: "accepted", createdAt: day("2026-09-01"), country: null },
    ],
    "country",
  );
  const india = grouped.find((row) => row.key === "IN");
  const us = grouped.find((row) => row.key === "US");
  assert.equal(india.total, 2);
  assert.equal(india.consentRate, 50);
  assert.equal(us.consentRate, 100);
}

{
  const purposes = groupDimension(
    [
      { id: "a", status: "accepted", createdAt: day("2026-09-01"), policyVersionId: "v1" },
      { id: "b", status: "rejected", createdAt: day("2026-09-01"), policyVersionId: "v2" },
    ],
    "policyVersionId",
  );
  assert.equal(purposes.length, 2);
}

assert.equal(classifyDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), "mobile");
assert.equal(classifyDevice("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)"), "tablet");
assert.equal(classifyDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"), "desktop");
assert.equal(classifyBrowser("Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36"), "chrome");
assert.equal(classifyBrowser("Mozilla/5.0 Edg/120.0.0.0 Chrome/120.0.0.0"), "edge");
assert.equal(classifyBrowser("Mozilla/5.0 Firefox/121.0"), "firefox");
assert.equal(
  classifyBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"),
  "safari",
);

assert.equal(normalizeCountryCode("in"), "IN");
assert.equal(normalizeCountryCode("EUU"), null);
assert.equal(normalizeCountryCode("XX"), null);
assert.equal(
  countryFromRequestHeaders({ get: (name) => (name === "cf-ipcountry" ? "GB" : null) }),
  "GB",
);

const hints = buildAnalyticsHints({
  headers: { get: (name) => (name === "x-vercel-ip-country" ? "US" : null) },
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
  jurisdiction: "IN",
});
assert.equal(hints.country, "US");
assert.equal(hints.device, "desktop");
assert.equal(hints.browser, "chrome");
const merged = mergeAnalyticsMetadata({ noticeTitle: "Notice" }, hints);
assert.equal(merged.analytics.country, "US");
assert.equal(merged.userAgent, undefined);

const period = parseAnalyticsPeriod({ days: "7", now: new Date("2026-09-03T00:00:00.000Z") });
assert.equal(period.label, "Last 7 days");
const custom = parseAnalyticsPeriod({ from: "2026-08-01", to: "2026-08-31" });
assert.match(custom.label, /2026-08-01/);

const payload = {
  overview: { total: 2 },
  countries: [{ key: "IN", consentRate: 78 }],
};
assert.deepEqual(collectForbiddenAnalyticsKeys(payload), []);
assert.ok(
  collectForbiddenAnalyticsKeys({ visitors: [{ visitorId: "abc", ip: "1.1.1.1" }] }).length > 0,
);

const api = fs.readFileSync(path.join(root, "src/app/api/analytics/consent/route.ts"), "utf8");
assert.match(api, /loadConsentAnalytics\(organization\.id/);
assert.doesNotMatch(api, /searchParams\.get\(["']organizationId["']\)/);
assert.match(api, /analytics: aggregated/);

const queries = fs.readFileSync(path.join(root, "src/lib/analytics/queries.ts"), "utf8");
assert.match(queries, /eq\(consentRecords\.organizationId, organizationId\)/);
assert.match(queries, /Promise\.all/);
assert.match(queries, /groupBy/);
assert.doesNotMatch(queries, /\.all\(\)/);

const recordRoute = fs.readFileSync(path.join(root, "src/app/api/consent/record/route.ts"), "utf8");
assert.match(recordRoute, /buildAnalyticsHints/);
assert.match(recordRoute, /mergeAnalyticsMetadata/);

console.log("consent analytics tests passed");
