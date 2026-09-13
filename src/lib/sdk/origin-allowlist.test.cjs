const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const originalLoad = Module._load;
Module._load = function loadStub(request, parent, isMain) {
  if (request === "next/server") {
    return {
      NextResponse: {
        json(body, init) {
          return { body, status: init?.status ?? 200, headers: init?.headers };
        },
      },
    };
  }
  if (request === "@/lib/safe-url") {
    return {
      isLoopbackHostname(hostname) {
        const host = String(hostname).toLowerCase();
        return host === "localhost" || host === "127.0.0.1" || host === "::1";
      },
    };
  }
  if (request === "@/lib/sdk/public-origin") {
    return {
      resolvePublicAppOrigin() {
        return "https://tor-consent-manager.vercel.app";
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

const compiled = path.join(__dirname, "../../../.tmp/origin-allowlist/origin-allowlist.js");
const { isSdkOriginAllowed } = require(compiled);

function requestFrom(origin) {
  return new Request("https://tor-consent-manager.vercel.app/api/sdk/site_test/config", {
    headers: origin ? { origin, host: "tor-consent-manager.vercel.app" } : { host: "tor-consent-manager.vercel.app" },
  });
}

const website = { domain: "sathwikkamath.vercel.app", verified: false };

assert.equal(
  isSdkOriginAllowed(requestFrom("http://localhost:3000"), website),
  true,
  "localhost is always allowed",
);

const previous = process.env.NODE_ENV;
process.env.NODE_ENV = "production";
assert.equal(
  isSdkOriginAllowed(requestFrom("https://sathwikkamath.vercel.app"), website),
  true,
  "production allows the registered host even when the domain is not verified",
);
assert.equal(
  isSdkOriginAllowed(requestFrom("https://other-app.vercel.app"), website),
  false,
  "production rejects a different host",
);
if (previous === undefined) delete process.env.NODE_ENV;
else process.env.NODE_ENV = previous;

console.log("origin-allowlist tests passed");
