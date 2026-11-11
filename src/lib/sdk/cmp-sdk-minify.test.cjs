const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { describe, it } = require("node:test");

const root = path.resolve(__dirname, "../../..");
const generatedTs = path.join(
  root,
  "src/lib/sdk/generated/generic-cmp-sdk.min.ts",
);
const sizesJson = path.join(
  root,
  "src/lib/sdk/generated/generic-cmp-sdk.sizes.json",
);

const UNMINIFIED_BASELINE = {
  bytes: 244818,
  gzip: 51810,
  brotli: 41796,
};

function compress(source) {
  const raw = Buffer.from(source, "utf8");
  return {
    bytes: raw.length,
    gzip: zlib.gzipSync(raw, { level: 9 }).length,
    brotli: zlib.brotliCompressSync(raw, {
      params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
    }).length,
  };
}

function extractMinifiedExport(source) {
  const match = source.match(
    /export const GENERIC_CMP_SDK_SCRIPT_MINIFIED = ("(?:\\.|[^"\\])*");/,
  );
  assert.ok(match, "GENERIC_CMP_SDK_SCRIPT_MINIFIED export missing");
  return JSON.parse(match[1]);
}

describe("hosted CMP SDK build-time minify", () => {
  it("ships a generated minified artifact smaller than the unminified baseline", () => {
    assert.ok(fs.existsSync(generatedTs), "run npm run build:cmp-sdk first");
    assert.ok(fs.existsSync(sizesJson), "sizes sidecar missing");

    const minified = extractMinifiedExport(fs.readFileSync(generatedTs, "utf8"));
    const measured = compress(minified);
    const report = JSON.parse(fs.readFileSync(sizesJson, "utf8"));

    assert.equal(report.after.bytes, measured.bytes);
    assert.ok(measured.bytes < UNMINIFIED_BASELINE.bytes);
    assert.ok(measured.gzip < UNMINIFIED_BASELINE.gzip);
    assert.ok(measured.brotli < UNMINIFIED_BASELINE.brotli);
    assert.ok(report.before.bytes >= UNMINIFIED_BASELINE.bytes - 2048);
  });

  it("preserves public globals and consent endpoints as substrings", () => {
    const minified = extractMinifiedExport(fs.readFileSync(generatedTs, "utf8"));
    // Script is (function(window,document){...})(window,document) so the
    // parameter name may be mangled; public API is still assigned on that arg.
    assert.ok(/\.CMP\s*=/.test(minified), "missing CMP API assignment");
    assert.match(minified, /\(window,\s*document\)\s*;?\s*$/);
    for (const token of [
      "__tcfapi",
      "__gpp",
      "data-site-key",
      "/api/consent/record",
      "openPreferenceCenter",
      "withdrawConsent",
      "setSubjectSession",
    ]) {
      assert.ok(minified.includes(token), `missing public surface: ${token}`);
    }
  });

  it("route serves the generated artifact instead of live minify", () => {
    const route = fs.readFileSync(
      path.join(root, "src/app/api/sdk/script/route.ts"),
      "utf8",
    );
    assert.match(route, /getServedGenericCmpSdkScript/);
    assert.doesNotMatch(route, /buildGenericCmpSdkScript\s*\(/);
    assert.doesNotMatch(route, /minify\s*\(/);
  });
});
