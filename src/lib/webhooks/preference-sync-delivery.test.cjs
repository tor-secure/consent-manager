const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const { describe, it } = require("node:test");

const root = path.resolve(__dirname, "../../..");
const compiledCandidates = [
  path.join(root, ".tmp/preference-sync/preference-sync-delivery.js"),
  path.join(root, ".tmp/preference-sync/src/lib/webhooks/preference-sync-delivery.js"),
];
const compiledPath = compiledCandidates.find((candidate) => fs.existsSync(candidate));
const corePath = [
  path.join(root, ".tmp/preference-sync/preference-sync-core.js"),
  path.join(root, ".tmp/preference-sync/src/lib/webhooks/preference-sync-core.js"),
].find((candidate) => fs.existsSync(candidate));
const deliveryUtilPath = [
  path.join(root, ".tmp/webhook-delivery/delivery.js"),
  path.join(root, ".tmp/webhook-delivery/src/lib/webhooks/delivery.js"),
].find((candidate) => fs.existsSync(candidate));

if (!compiledPath || !corePath || !deliveryUtilPath) {
  throw new Error("Compiled preference-sync modules not found. Run npm test.");
}

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === "server-only") return {};
  if (request === "@/db") return { db: {} };
  if (request === "@/lib/logger") {
    return { logger: { error() {}, warn() {}, info() {}, debug() {} } };
  }
  if (request === "@/lib/webhooks/preference-sync-core") return require(corePath);
  if (request === "@/lib/webhooks/delivery") return require(deliveryUtilPath);
  if (request === "@/lib/webhooks/secret-crypto") {
    return {
      hmacKeyFromStoredWebhookSecret: (value) => value,
      encryptWebhookSigningSecret: (value) => value,
    };
  }
  if (request === "@/lib/redaction-core") {
    return {
      redactValue: (value) => ({ value }),
    };
  }
  if (request.includes("ssrf-guard")) {
    return {
      assertSafeScanUrl: async (url) => new URL(url),
      ScannerUrlError: class ScannerUrlError extends Error {},
    };
  }
  if (request.startsWith("@/db/schema/")) return {};
  if (request === "@/lib/consent/revocation-notification-core") {
    return require(path.join(root, ".tmp/revocation-notification/revocation-notification-core.js"));
  }
  return originalLoad.call(this, request, parent, isMain);
};

const { createWebhookSignature, verifyWebhookSignature } = require(deliveryUtilPath);
const { deliverPreferenceSyncEnvelope } = require(compiledPath);
const { buildPreferenceSyncEnvelope } = require(corePath);

function response(status, body = "") {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  };
}

describe("preference sync delivery", () => {
  it("retries temporary failures with a stable eventId then succeeds", async () => {
    const attempts = [];
    const requests = [];
    let calls = 0;

    const built = buildPreferenceSyncEnvelope({
      organizationId: "org-1",
      siteId: "site-1",
      subjectKey: "user_abc",
      preferenceRevision: 2,
      previous: [{ purposeId: "p-marketing", vendorId: null, granted: true }],
      next: [{ purposeId: "p-marketing", vendorId: null, granted: false }],
      names: { purposes: { "p-marketing": "Marketing" }, vendors: {} },
      eventId: "evt-stable",
      hadPreviousRecord: true,
      occurredAt: new Date("2026-01-15T12:00:00.000Z"),
    });
    assert.equal(built.shouldEmit, true);

    const result = await deliverPreferenceSyncEnvelope({
      endpoint: {
        id: "eps-1",
        organizationId: "org-1",
        url: "https://client.example/api/cmp/preference-sync",
        signingSecretEnc: "whsec_test_secret",
      },
      envelope: built.envelope,
      deps: {
        maxAttempts: 3,
        backoffMs: [0, 0],
        sleep: async () => {},
        fetchImpl: async (_url, init) => {
          calls += 1;
          requests.push(init);
          if (calls < 3) return response(503, "busy");
          return response(200, "ok");
        },
        recordAttempt: async (attempt) => {
          attempts.push(attempt);
        },
        markEndpointDelivered: async () => {},
      },
    });

    assert.equal(result.status, "success");
    assert.equal(result.eventId, "evt-stable");
    assert.equal(attempts.length, 3);
    assert.ok(attempts.every((row) => row.eventId === "evt-stable"));
    assert.equal(requests.length, 3);
    assert.equal(requests[0].headers["X-CMP-Event-Id"], "evt-stable");
    assert.equal(requests[2].headers["X-CMP-Event-Type"], "consent.preferences.updated");
  });

  it("signs payload with whsec secret fixture for client verification", () => {
    const secret = "whsec_fixture_example_secret";
    const payload = JSON.stringify({
      id: "evt-fixture",
      type: "consent.preferences.updated",
      organizationId: "org-1",
      data: {
        siteId: "site-1",
        subjectKey: "user_abc",
        eventId: "evt-fixture",
        preferenceRevision: 1,
        changeKind: "established",
      },
    });
    const timestamp = "1700000000";
    const signature = createWebhookSignature({
      payload,
      timestamp,
      signingSecretHash: secret,
    });
    assert.equal(
      verifyWebhookSignature({
        payload,
        timestamp,
        signingSecretHash: secret,
        signature,
      }),
      true,
    );
    assert.equal(
      verifyWebhookSignature({
        payload,
        timestamp,
        signingSecretHash: secret,
        signature: "0".repeat(64),
      }),
      false,
    );
  });
});
