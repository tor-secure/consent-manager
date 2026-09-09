const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const compiledCandidates = [
  path.join(root, ".tmp/compiled/src/lib/dashboard-search.js"),
  path.join(root, ".tmp/dashboard-search/dashboard-search.js"),
  path.join(root, ".tmp/dashboard-search/src/lib/dashboard-search.js"),
];
const compiledPath = compiledCandidates.find((candidate) => fs.existsSync(candidate));

if (!compiledPath) {
  throw new Error(
    "Compiled dashboard-search.js not found. Run: npx tsc --outDir .tmp/dashboard-search --module commonjs --moduleResolution node --target ES2022 --esModuleInterop --skipLibCheck src/lib/dashboard-search.ts",
  );
}

const { matchDashboardPages } = require(compiledPath);

const empty = matchDashboardPages("");
assert.ok(empty.length > 0);
assert.equal(empty[0].href, "/dashboard");

const websites = matchDashboardPages("website");
assert.ok(websites.some((hit) => hit.href === "/dashboard/websites"));
assert.ok(websites.some((hit) => hit.href === "/dashboard/websites/new"));

const none = matchDashboardPages("zzzz-not-a-page");
assert.equal(none.length, 0);

for (const [query, href] of [
  ["autopilot", "/dashboard/autopilot"],
  ["digital twin", "/dashboard/digital-twin"],
  ["portable", "/dashboard/cross-domain"],
  ["redaction", "/dashboard/data-redaction"],
  ["agent permission", "/dashboard/agent-permissioning"],
]) {
  assert.ok(matchDashboardPages(query, 20).some((hit) => hit.href === href), `${query} should find ${href}`);
}

const all = matchDashboardPages("dashboard", 100);
assert.equal(new Set(all.map((hit) => hit.id)).size, all.length, "search result ids must be unique");

console.log("dashboard-search.test.cjs passed");
