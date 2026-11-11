const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { describe, it } = require("node:test");

const root = path.resolve(__dirname, "../../..");

function readSrc(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("public SDK CORS for subject-session account calls", () => {
  it("allows X-CMP-Subject-Session and Authorization in PUBLIC_CORS_ALLOWED_HEADERS", () => {
    const source = readSrc("src/lib/sdk/public-http.ts");
    assert.match(source, /X-CMP-Subject-Session/);
    assert.match(source, /Authorization/);
    assert.match(source, /Access-Control-Allow-Origin:\s*\*/);
    assert.match(source, /sdkOriginGuard/);
    assert.doesNotMatch(source, /Origin is not used as an allowlist/);

    const headersMatch = source.match(
      /export const PUBLIC_CORS_ALLOWED_HEADERS = \[([\s\S]*?)\]\.join/,
    );
    assert.ok(headersMatch, "PUBLIC_CORS_ALLOWED_HEADERS array missing");
    const headersBlock = headersMatch[1];
    assert.match(headersBlock, /"X-CMP-Subject-Session"/);
    assert.match(headersBlock, /"Authorization"/);
    assert.match(headersBlock, /"Cache-Control"/);
    assert.match(headersBlock, /"If-None-Match"/);
  });

  it("OPTIONS helper reuses publicCorsHeaders", () => {
    const source = readSrc("src/lib/sdk/public-http.ts");
    assert.match(
      source,
      /export function publicOptionsResponse\(methods:\s*string\):\s*NextResponse/,
    );
    assert.match(source, /headers:\s*publicCorsHeaders\(methods\)/);
  });

  it("SDK account fetch uses credentials omit with subject-session header", () => {
    const sdk = readSrc("src/lib/sdk/cmp-sdk-script.ts");
    assert.match(sdk, /X-CMP-Subject-Session/);
    assert.match(sdk, /credentials:\s*'omit'/);
    assert.doesNotMatch(sdk, /credentials:\s*'include'/);
  });

  it("first-party ConsentGuruInstall does not load the SDK with async", () => {
    const install = readSrc("src/components/site/consent-guru-install.tsx");
    assert.match(install, /id="cmp-sdk"/);
    assert.doesNotMatch(install, /\basync\b/);
  });
});
