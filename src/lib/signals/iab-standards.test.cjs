const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const root = path.resolve(__dirname, "../../..");
const out = path.join(root, ".tmp/iab-standards");
fs.mkdirSync(out, { recursive: true });
execFileSync(process.execPath, [
  path.join(root, "node_modules/typescript/bin/tsc"),
  "--outDir", out, "--module", "commonjs", "--moduleResolution", "node",
  "--target", "ES2022", "--esModuleInterop", "--skipLibCheck", "--noEmit", "false",
  "src/lib/signals/iab-adapter.ts", "src/lib/signals/iab-gvl.ts",
], { cwd: root, stdio: "pipe" });

const adapter = require(path.join(out, "iab-adapter.js"));
const gvlTools = require(path.join(out, "iab-gvl.js"));

const fixture = {
  vendorListVersion: 42, gvlSpecificationVersion: 3, tcfPolicyVersion: 4,
  lastUpdated: "2026-01-01T00:00:00Z",
  purposes: { 1: { id: 1, name: "Store", description: "Store data", illustrations: [] } },
  specialPurposes: {}, features: {}, specialFeatures: {}, stacks: {},
  vendors: {
    1: {
      id: 1, name: "Vendor", purposes: [1], legIntPurposes: [], flexiblePurposes: [],
      specialPurposes: [], features: [], specialFeatures: [], policyUrl: "https://example.com",
      cookieMaxAgeSeconds: null, usesCookies: false, cookieRefresh: false,
      usesNonCookieAccess: false, dataRetention: { stdRetention: null, purposes: {}, specialPurposes: {} },
    },
  },
};

{
  const validated = gvlTools.validateGvlPayload(fixture);
  assert.equal(validated.vendorListVersion, 42);
  assert.equal(validated.sha256.length, 64);
  assert.throws(() => gvlTools.validateGvlPayload({ ...fixture, vendors: { x: { id: 1 } } }), /vendor entry/);
  assert.equal(gvlTools.OFFICIAL_GVL_URL, "https://vendor-list.consensu.org/v3/vendor-list.json");
}

{
  assert.equal(adapter.getIabRegistration({}).valid, false);
  assert.equal(adapter.getIabRegistration({ IAB_CMP_ID: "2", IAB_CMP_VERSION: "1" }).valid, true);
  const blocked = adapter.buildIabSignalSnapshot({
    tcf: { enabled: true, purposeMappings: {}, vendorMappings: {} },
    gpp: { enabled: true, sectionIds: [] },
    registration: { valid: false, cmpId: null, cmpVersion: null },
  });
  assert.equal(blocked.tcf.status, "blocked");
  assert.equal(blocked.tcf.tcString, null);
}

{
  const tcString = adapter.encodeTcString({
    cmpId: 2, cmpVersion: 1, gvl: fixture, purposeIds: [1], vendorIds: [1],
    grantedPurposeIds: [1], grantedVendorIds: [1], language: "en",
    now: new Date("2026-01-01T00:00:00Z"),
  });
  assert.match(tcString, /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*$/);
  assert.ok(tcString.length > 20);
  const gppString = adapter.encodeGppString({ sectionIds: [6], optedOut: true });
  assert.match(gppString, /^[A-Za-z0-9_~.-]+$/);
}

{
  const sdk = fs.readFileSync(path.join(root, "src/lib/sdk/cmp-sdk-script.ts"), "utf8");
  for (const command of ["getTCData", "addEventListener", "removeEventListener", "getVendorList", "getGPPData", "hasSection"]) {
    assert.match(sdk, new RegExp(command));
  }
  assert.match(sdk, /__tcfapiLocator/);
  assert.match(sdk, /stored\.tcString/);
  assert.match(sdk, /_tcString = null/);
}

console.log("iab-standards.test.cjs passed");
