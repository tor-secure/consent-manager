const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "../..");
const compiledCandidates = [
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

console.log("dashboard-search.test.cjs passed");
