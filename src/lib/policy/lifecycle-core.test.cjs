const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");

const compiled = [
  path.join(__dirname, "../../../.tmp/compiled/src/lib/policy/lifecycle-core.js"),
  path.join(__dirname, "../../../.tmp/policy-lifecycle/lifecycle-core.js"),
].find((candidate) => fs.existsSync(candidate));
if (!compiled) {
  throw new Error("lifecycle-core.js was not compiled");
}
const {
  etagMatches,
  hashForPublishedVersion,
  hashPublishedConfig,
  pickLatestPublished,
  quotedEtag,
  SDK_CONFIG_CACHE_CONTROL,
  stickyUnitInterval,
} = require(compiled);

assert.equal(SDK_CONFIG_CACHE_CONTROL.includes("no-store"), true);
assert.equal(quotedEtag("abc"), '"abc"');
assert.equal(etagMatches('"abc"', "abc"), true);
assert.equal(etagMatches('W/"abc"', "abc"), true);
assert.equal(etagMatches('"nope"', "abc"), false);

const hash = hashPublishedConfig({ a: 1, b: { c: 2 } });
assert.equal(hash, createHash("sha256").update('{"a":1,"b":{"c":2}}').digest("hex"));
assert.equal(
  hashPublishedConfig({ b: { c: 2 }, a: 1 }),
  hash,
);

const versionHash = hashForPublishedVersion({
  id: "version-1",
  configuration: { banner: "a", purposes: [1] },
  processingSnapshot: { vendors: ["x"] },
});
assert.equal(
  hashForPublishedVersion({
    id: "version-1",
    processingSnapshot: { vendors: ["x"] },
    configuration: { purposes: [1], banner: "a" },
  }),
  versionHash,
);
assert.notEqual(
  hashForPublishedVersion({
    id: "version-1",
    configuration: { banner: "b", purposes: [1] },
    processingSnapshot: { vendors: ["x"] },
  }),
  versionHash,
);

const latest = pickLatestPublished([
  { isPublished: false, version: 3 },
  { isPublished: true, version: 1 },
  { isPublished: true, version: 2 },
]);
assert.equal(latest.version, 2);
assert.equal(pickLatestPublished([{ isPublished: false, version: 1 }]), null);

const a = stickyUnitInterval("visitor-1");
const b = stickyUnitInterval("visitor-1");
const c = stickyUnitInterval("visitor-2");
assert.equal(a, b);
assert.notEqual(a, c);
assert.ok(a >= 0 && a < 1);

const {
  requestMatchesTracker,
} = require(path.join(__dirname, "../../../.tmp/compiled/src/lib/sdk/enforcement.js"));
assert.equal(
  requestMatchesTracker("https://ads.example.com/pixel", {
    id: "1",
    name: "ads",
    type: "pixel",
    domain: "example.com",
    identifier: null,
    purposeKey: "ads",
    purposeId: "p",
    vendorId: "v",
    isEssential: false,
    status: "active",
  }, "fetch"),
  true,
);
